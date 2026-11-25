package com.tpa.claims.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tpa.claims.carrier.CarrierSubmissionService;
import com.tpa.claims.dto.ClaimConfirmationRequest;
import com.tpa.claims.dto.ClaimRequest;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.DocumentPreviewDto;
import com.tpa.claims.dto.ManualReviewDecisionRequest;
import com.tpa.claims.dto.PaginatedResponse;
import com.tpa.claims.dto.TpaCallbackRequest;
import com.tpa.claims.model.Claim;
import com.tpa.claims.model.Document;
import com.tpa.claims.model.Policy;
import com.tpa.claims.model.RuleResult;
import com.tpa.claims.processing.ExtractionResult;
import com.tpa.claims.processing.PythonIntegrationService;
import com.tpa.claims.repository.AuditLogRepository;
import com.tpa.claims.repository.CarrierRepository;
import com.tpa.claims.repository.ClaimRepository;
import com.tpa.claims.repository.DocumentRepository;
import com.tpa.claims.repository.PolicyRepository;
import com.tpa.claims.repository.RuleResultRepository;
import com.tpa.claims.rules.RuleEngineService;
import com.tpa.claims.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClaimServiceImpl implements ClaimService {

    private final ClaimRepository claimRepository;
    private final DocumentRepository documentRepository;
    private final AuditLogRepository auditLogRepository;
    private final PolicyValidationService policyValidationService;
    private final PolicyRepository policyRepository;
    private final CarrierRepository carrierRepository;
    private final RuleResultRepository ruleResultRepository;
    private final RuleEngineService ruleEngineService;
    private final StorageService storageService;
    private final CarrierSubmissionService carrierSubmissionService;
    private final PdfExportService pdfExportService;
    private final PythonIntegrationService pythonIntegrationService;
    private final ObjectMapper objectMapper;
    private final ClaimResponseMapper claimResponseMapper;

    @Override
    @Transactional
    public ClaimResponse createClaim(ClaimRequest request) {
        log.info("Creating claim for extraction preview. Submission: {}", request.getSubmissionId());
        validateUploadedDocuments(request);
        String submissionId = request.getSubmissionId() == null || request.getSubmissionId().isBlank()
                ? "SUB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()
                : request.getSubmissionId();

        Claim claim = Claim.builder()
                .claimId("CLM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .submissionId(submissionId)
                .policy(null)
                .patientName("PENDING_OCR")
                .status(Claim.ClaimStatus.PROCESSING)
                .build();

        if (request.getCarrierId() != null) {
            carrierRepository.findById(request.getCarrierId()).ifPresent(claim::setCarrier);
        }

        claim = claimRepository.save(claim);

        if (request.getDocuments() != null) {
            for (ClaimRequest.DocumentDto docDto : request.getDocuments()) {
                byte[] content = Base64.getDecoder().decode(docDto.getBase64Content());
                String path = storageService.store(content, docDto.getFilename(), "claims/" + claim.getClaimId());

                Document document = Document.builder()
                        .claim(claim)
                        .submissionId(submissionId)
                        .documentType(docDto.getType())
                        .originalFilename(docDto.getFilename())
                        .storagePath(path)
                        .processingStatus(Document.ProcessingStatus.PENDING)
                        .build();
                documentRepository.save(document);
            }
        }

        createAuditLog(claim, "CLAIM_CREATED", "Claim submitted. Running OCR extraction.");

        ExtractionResult extractionResult = pythonIntegrationService.extractData(claim);
        Map<String, Object> extractedData = extractionResult.getData() == null
                ? new HashMap<>()
                : extractionResult.getData();

        claim.setExtractedDataJson(writeJson(extractedData));
        claim.setExtractionConfidence(BigDecimal.valueOf(
                extractionResult.getConfidence() == null ? 0.0 : extractionResult.getConfidence()));
        claim.setProcessingNotes(extractionResult.getWarnings() == null
                ? null
                : String.join(" | ", extractionResult.getWarnings()));
        claim.setStatus(Claim.ClaimStatus.REVIEW);

        String extractedPatient = asString(extractedData.get("patient_name"));
        if (extractedPatient != null) {
            claim.setPatientName(extractedPatient);
        }

        claim = claimRepository.save(claim);
        createAuditLog(claim, "EXTRACTION_COMPLETED", "Extraction completed. Awaiting user confirmation.");

        return claimResponseMapper.toResponse(claim, true);
    }

    @Override
    @Transactional
    public ClaimResponse confirmClaim(Long id, ClaimConfirmationRequest request) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));

        claim.setStatus(Claim.ClaimStatus.PROCESSING);
        claim.setManualReviewReason(null);
        claim.setRejectionReason(null);
        createAuditLog(claim, "CLAIM_CONFIRMATION_STARTED", "User confirmed extracted data.");

        Map<String, Object> extractedData = request != null ? request.getExtractedData() : null;
        if (extractedData == null || extractedData.isEmpty()) {
            extractedData = readJson(claim.getExtractedDataJson());
        }
        claim.setExtractedDataJson(writeJson(extractedData));

        applyExtractedDataToClaim(claim, extractedData);

        String policyNumber = pickString(extractedData, "policy_number", "claim_form_policy_number");
        if (policyNumber != null) {
            policyRepository.findByPolicyNumber(policyNumber).ifPresent(claim::setPolicy);
        }

        List<RuleResult> ruleResults = ruleEngineService.executeRules(claim, extractedData);
        List<RuleResult> rejectedByRules = ruleResults.stream()
                .filter(RuleResult::isViolated)
                .filter(rule -> "REJECT".equalsIgnoreCase(rule.getActionRequired()))
                .collect(Collectors.toList());
        List<RuleResult> manualByRules = ruleResults.stream()
                .filter(RuleResult::isViolated)
                .filter(rule -> "MANUAL_REVIEW".equalsIgnoreCase(rule.getActionRequired()))
                .collect(Collectors.toList());

        if (!rejectedByRules.isEmpty()) {
            claim.setStatus(Claim.ClaimStatus.REJECTED);
            claim.setRejectionReason(buildRuleViolationSummary(rejectedByRules));
            claim.setManualReviewReason(null);
            claim = claimRepository.save(claim);
            createAuditLog(claim, "PROCESSING_COMPLETED", "Workflow finished. Status: " + claim.getStatus());
            return claimResponseMapper.toResponse(claim, true);
        }

        if (!manualByRules.isEmpty()) {
            claim.setStatus(Claim.ClaimStatus.TPA_MANUAL_REVIEW);
            claim.setManualReviewReason(buildRuleViolationSummary(manualByRules));
            claim.setRejectionReason(null);
            claim = claimRepository.save(claim);
            createAuditLog(claim, "PROCESSING_COMPLETED", "Workflow finished. Status: " + claim.getStatus());
            return claimResponseMapper.toResponse(claim, true);
        }

        BigDecimal confidence = claim.getExtractionConfidence() == null
                ? BigDecimal.ZERO
                : claim.getExtractionConfidence();

        if (confidence.compareTo(BigDecimal.valueOf(0.9)) > 0) {
            claim.setStatus(Claim.ClaimStatus.TPA_APPROVED);
            claim.setRecommendedPayableAmount(claim.getClaimedAmount());
            claim.setManualReviewReason(null);
            claim.setRejectionReason(null);
        } else if (confidence.compareTo(BigDecimal.valueOf(0.6)) >= 0) {
            claim.setStatus(Claim.ClaimStatus.TPA_MANUAL_REVIEW);
            claim.setManualReviewReason("Rule engine passed but confidence " + confidence + " requires manual review.");
            claim.setRejectionReason(null);
        } else {
            claim.setStatus(Claim.ClaimStatus.REJECTED);
            claim.setRejectionReason("Rejected due to low extraction confidence: " + confidence);
            claim.setManualReviewReason(null);
        }

        claim = claimRepository.save(claim);
        createAuditLog(claim, "PROCESSING_COMPLETED", "Workflow finished. Status: " + claim.getStatus());
        return claimResponseMapper.toResponse(claim, true);
    }

    @Override
    @Transactional
    public ClaimResponse applyManualReviewDecision(Long id, ManualReviewDecisionRequest request) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));

        if (claim.getStatus() != Claim.ClaimStatus.MANUAL_REVIEW && claim.getStatus() != Claim.ClaimStatus.TPA_MANUAL_REVIEW) {
            throw new RuntimeException("Claim is not pending manual review: " + claim.getClaimId());
        }

        String decision = request == null ? null : asString(request.getDecision());
        if (decision == null) {
            throw new RuntimeException("Manual review decision is required.");
        }

        if ("APPROVE".equalsIgnoreCase(decision)) {
            claim.setStatus(Claim.ClaimStatus.TPA_APPROVED);
            claim.setManualReviewReason(null);
            claim.setRejectionReason(null);
            if (request.getApprovedAmount() != null) {
                claim.setRecommendedPayableAmount(request.getApprovedAmount());
            } else {
                claim.setRecommendedPayableAmount(claim.getClaimedAmount());
            }
            createAuditLog(claim, "MANUAL_REVIEW_APPROVED", "Manual reviewer approved claim.");
        } else if ("REJECT".equalsIgnoreCase(decision)) {
            claim.setStatus(Claim.ClaimStatus.REJECTED);
            claim.setRejectionReason(asString(request.getReason()) == null
                    ? "Rejected during manual review."
                    : request.getReason().trim());
            claim.setManualReviewReason(null);
            createAuditLog(claim, "MANUAL_REVIEW_REJECTED", "Manual reviewer rejected claim.");
        } else {
            throw new RuntimeException("Unsupported manual review decision: " + decision);
        }

        claim = claimRepository.save(claim);
        return claimResponseMapper.toResponse(claim, true);
    }

    @Override
    public List<ClaimResponse> getAllClaims() {
        return claimRepository.findAll().stream()
                .map(claim -> claimResponseMapper.toResponse(claim, false))
                .collect(Collectors.toList());
    }

    @Override
    public PaginatedResponse<ClaimResponse> getClaims(int page, int size, String status, String searchTerm) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        Page<Claim> claimPage;

        if (searchTerm != null && !searchTerm.isEmpty()) {
            claimPage = claimRepository.searchByClaim(searchTerm, searchTerm, pageable);
        } else if (status != null && !status.equalsIgnoreCase("All")) {
            String statusEnum = status.toUpperCase().replace(" ", "_");
            if (statusEnum.equals("NEEDS_MANUAL_REVIEW")) {
                statusEnum = "TPA_MANUAL_REVIEW";
            }
            if (statusEnum.equals("SUBMITTED_TO_CARRIER")) {
                statusEnum = "CARRIER_PENDING";
            }
            try {
                claimPage = claimRepository.findByStatus(Claim.ClaimStatus.valueOf(statusEnum), pageable);
            } catch (IllegalArgumentException e) {
                claimPage = claimRepository.findAll(pageable);
            }
        } else {
            claimPage = claimRepository.findAll(pageable);
        }

        List<ClaimResponse> data = claimPage.getContent().stream()
                .map(claim -> claimResponseMapper.toResponse(claim, false))
                .collect(Collectors.toList());

        return PaginatedResponse.<ClaimResponse>builder()
                .data(data)
                .total(claimPage.getTotalElements())
                .page(page)
                .size(size)
                .build();
    }

    @Override
    public ClaimResponse getClaimById(Long id) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
        return claimResponseMapper.toResponse(claim, true);
    }

    @Override
    public byte[] exportClaim(Long id) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
        return pdfExportService.generateClaimReport(claim);
    }

    @Override
    @Transactional
    public ClaimResponse submitToCarrier(Long id) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));

        if (claim.getStatus() != Claim.ClaimStatus.TPA_APPROVED && claim.getStatus() != Claim.ClaimStatus.APPROVED) {
            throw new RuntimeException("Only TPA_APPROVED claims can be submitted to carrier.");
        }

        createAuditLog(claim, "CARRIER_SUBMISSION_STARTED", "Submitting claim to carrier.");
        carrierSubmissionService.submitToCarrier(claim);

        Claim updated = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found after submission: " + id));
        createAuditLog(updated, "CARRIER_SUBMISSION_COMPLETED",
                "Claim submitted to carrier. Ref: " + (updated.getCarrierReferenceId() == null ? "N/A" : updated.getCarrierReferenceId()));
        return claimResponseMapper.toResponse(updated, true);
    }

    @Override
    @Transactional
    public void processCarrierCallback(TpaCallbackRequest request) {
        log.info("Processing callback for submission: {}", request.getSubmissionId());
        Claim claim = claimRepository.findBySubmissionId(request.getSubmissionId())
                .orElseThrow(() -> new RuntimeException("Claim not found: " + request.getSubmissionId()));

        claim.setCarrierReferenceId(request.getCarrierReferenceId());
        claim.setCarrierDecision(request.getDecision());
        claim.setCarrierDecisionDate(request.getDecisionDate());

        if ("APPROVED".equalsIgnoreCase(request.getDecision())) {
            claim.setStatus(Claim.ClaimStatus.APPROVED);
            claim.setRecommendedPayableAmount(request.getApprovedAmount());
        } else {
            claim.setStatus(Claim.ClaimStatus.REJECTED);
            claim.setRejectionReason(request.getReason());
        }

        claimRepository.save(claim);
        createAuditLog(claim, "CARRIER_CALLBACK", "Carrier decision: " + request.getDecision());
    }

    private void applyExtractedDataToClaim(Claim claim, Map<String, Object> extractedData) {
        if (extractedData == null || extractedData.isEmpty()) {
            return;
        }

        String patientName = pickString(extractedData, "patient_name", "claim_form_patient_name", "combined_patient_name");
        if (patientName != null) {
            claim.setPatientName(patientName);
        }

        String hospitalName = pickString(extractedData, "hospital_name", "claim_form_hospital_name", "combined_hospital_name");
        if (hospitalName != null) {
            claim.setHospitalName(hospitalName);
        }

        LocalDate admissionDate = pickDate(extractedData, "admission_date", "claim_form_admission_date", "combined_admission_date");
        if (admissionDate != null) {
            claim.setServiceDate(admissionDate);
        }

        BigDecimal billAmount = parseBigDecimal(extractedData.get("bill_amount"));
        if (billAmount == null) {
            billAmount = parseBigDecimal(extractedData.get("final_bill_amount"));
        }
        claim.setBillAmount(billAmount);
        claim.setClaimedAmount(parseBigDecimal(extractedData.get("claimed_amount")));
    }

    private String buildRuleViolationSummary(List<RuleResult> ruleResults) {
        List<String> violations = new ArrayList<>();
        for (RuleResult result : ruleResults) {
            if (result.isViolated() && result.getViolationMessage() != null) {
                violations.add(result.getViolationMessage());
            }
        }
        if (violations.isEmpty()) {
            return "Claim rejected due to failed rule validation.";
        }
        return String.join(" | ", violations);
    }

    private void createAuditLog(Claim claim, String action, String message) {
        com.tpa.claims.model.AuditLog logEntry = com.tpa.claims.model.AuditLog.builder()
                .claim(claim)
                .action(action)
                .actionType("SYSTEM")
                .newValue(message)
                .build();
        auditLogRepository.save(logEntry);
    }

    private ClaimResponse mapToResponse(Claim claim, boolean includeDocuments) {
        Map<String, Object> extractedData = readJson(claim.getExtractedDataJson());
        List<RuleResult> ruleResults = ruleResultRepository.findByClaimId(claim.getId());
        List<RuleResult> violatedRules = ruleResults.stream()
                .filter(RuleResult::isViolated)
                .collect(Collectors.toList());
        List<String> triggeredRuleIds = violatedRules.stream()
                .map(RuleResult::getRuleId)
                .collect(Collectors.toList());

        String mappedPolicyNumber = claim.getPolicy() != null
                ? claim.getPolicy().getPolicyNumber()
                : pickString(extractedData, "policy_number", "claim_form_policy_number");
        String mappedCarrierName = claim.getCarrier() != null
                ? claim.getCarrier().getCarrierName()
                : claim.getPolicy() != null
                ? claim.getPolicy().getCarrierName()
                : pickString(extractedData, "carrier_name");
        String mappedPolicyName = claim.getPolicy() != null
                ? claim.getPolicy().getPolicyType()
                : pickString(extractedData, "policy_name");
        String recommendationStatus = mapRecommendationStatus(claim.getStatus());
        String recommendationReason = claim.getStatus() == Claim.ClaimStatus.REJECTED
                ? claim.getRejectionReason()
                : claim.getStatus() == Claim.ClaimStatus.MANUAL_REVIEW
                ? claim.getManualReviewReason()
                : "Rule checks passed.";

        return ClaimResponse.builder()
                .id(claim.getId())
                .claimId(claim.getClaimId())
                .submissionId(claim.getSubmissionId())
                .policyNumber(mappedPolicyNumber)
                .status(claim.getStatus())
                .patientName(claim.getPatientName())
                .billAmount(claim.getBillAmount())
                .claimedAmount(claim.getClaimedAmount())
                .recommendedPayableAmount(claim.getRecommendedPayableAmount())
                .carrierName(mappedCarrierName)
                .policyName(mappedPolicyName)
                .carrierReferenceId(claim.getCarrierReferenceId())
                .carrierDecision(claim.getCarrierDecision())
                .carrierDecisionDate(claim.getCarrierDecisionDate())
                .rejectionReason(claim.getRejectionReason())
                .manualReviewReason(claim.getManualReviewReason())
                .extractionConfidence(claim.getExtractionConfidence())
                .extractedData(extractedData)
                .documents(includeDocuments ? mapDocuments(claim.getId()) : null)
                .rulesExecutedCount(ruleResults.size())
                .rulesFailedCount(violatedRules.size())
                .triggeredRules(triggeredRuleIds)
                .tpaRecommendationStatus(recommendationStatus)
                .tpaRecommendationReason(recommendationReason)
                .createdAt(claim.getCreatedAt())
                .updatedAt(claim.getUpdatedAt())
                .build();
    }

    private List<DocumentPreviewDto> mapDocuments(Long claimId) {
        return documentRepository.findByClaimId(claimId).stream()
                .map(document -> DocumentPreviewDto.builder()
                        .id(document.getId())
                        .type(document.getDocumentType())
                        .filename(document.getOriginalFilename())
                        .previewUrl("/api/claims/" + claimId + "/documents/" + document.getId() + "/content")
                        .build())
                .collect(Collectors.toList());
    }

    private String writeJson(Map<String, Object> data) {
        if (data == null || data.isEmpty()) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            log.warn("Failed to serialize extracted data", e);
            return "{}";
        }
    }

    private Map<String, Object> readJson(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return new HashMap<>();
        }
        try {
            return objectMapper.readValue(rawJson, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception e) {
            log.warn("Failed to parse extracted JSON: {}", rawJson, e);
            return new HashMap<>();
        }
    }

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String converted = value.toString().trim();
        return converted.isEmpty() ? null : converted;
    }

    private BigDecimal parseBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return new BigDecimal(value.toString().trim());
        } catch (Exception e) {
            return null;
        }
    }

    private String pickString(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            String value = asString(data.get(key));
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private LocalDate pickDate(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            LocalDate value = parseDate(data.get(key));
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private LocalDate parseDate(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return LocalDate.parse(value.toString().trim());
        } catch (Exception e) {
            return null;
        }
    }

    private String mapRecommendationStatus(Claim.ClaimStatus status) {
        if (status == null) {
            return "RECOMMEND_MANUAL_REVIEW";
        }
        return switch (status) {
            case APPROVED -> "RECOMMEND_APPROVE";
            case SUBMITTED_TO_CARRIER, CLOSED -> "RECOMMEND_APPROVE";
            case REJECTED -> "RECOMMEND_REJECT";
            case MANUAL_REVIEW -> "RECOMMEND_MANUAL_REVIEW";
            default -> "RECOMMEND_MANUAL_REVIEW";
        };
    }

    private void validateUploadedDocuments(ClaimRequest request) {
        if (request == null || request.getDocuments() == null || request.getDocuments().size() != 2) {
            throw new RuntimeException("Exactly two documents are required: CLAIM_FORM and DISCHARGE_SUMMARY_AND_FINAL_BILL.");
        }

        Set<String> uploadedTypes = request.getDocuments().stream()
                .map(ClaimRequest.DocumentDto::getType)
                .map(type -> type == null ? "" : type.trim().toUpperCase())
                .collect(Collectors.toSet());

        boolean hasClaimForm = uploadedTypes.contains("CLAIM_FORM");
        boolean hasCombined = uploadedTypes.contains("DISCHARGE_SUMMARY_AND_FINAL_BILL")
                || uploadedTypes.contains("SUPPORTING_DOC");

        if (!hasClaimForm || !hasCombined) {
            throw new RuntimeException("Required document types are CLAIM_FORM and DISCHARGE_SUMMARY_AND_FINAL_BILL.");
        }
    }
}
