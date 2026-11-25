package com.tpa.claims.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.DocumentPreviewDto;
import com.tpa.claims.model.Claim;
import com.tpa.claims.model.Document;
import com.tpa.claims.model.RuleResult;
import com.tpa.claims.repository.DocumentRepository;
import com.tpa.claims.repository.RuleResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class ClaimResponseMapper {

    private final DocumentRepository documentRepository;
    private final RuleResultRepository ruleResultRepository;
    private final ObjectMapper objectMapper;

    public ClaimResponse toResponse(Claim claim, boolean includeDocuments) {
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
                .carrierDecisionReason(claim.getCarrierDecisionReason())
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

    private Map<String, Object> readJson(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return new HashMap<>();
        }
        try {
            return objectMapper.readValue(rawJson, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception e) {
            log.warn("Failed to parse extracted JSON for claim response mapping.", e);
            return new HashMap<>();
        }
    }

    private String pickString(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            Object value = data.get(key);
            if (value != null) {
                String text = value.toString().trim();
                if (!text.isEmpty()) {
                    return text;
                }
            }
        }
        return null;
    }

    private String mapRecommendationStatus(Claim.ClaimStatus status) {
        if (status == null) {
            return "RECOMMEND_MANUAL_REVIEW";
        }
        return switch (status) {
            case APPROVED, TPA_APPROVED, SUBMITTED_TO_CARRIER, CARRIER_PENDING, CARRIER_APPROVED, CLOSED -> "RECOMMEND_APPROVE";
            case REJECTED -> "RECOMMEND_REJECT";
            case MANUAL_REVIEW, TPA_MANUAL_REVIEW -> "RECOMMEND_MANUAL_REVIEW";
            default -> "RECOMMEND_MANUAL_REVIEW";
        };
    }
}
