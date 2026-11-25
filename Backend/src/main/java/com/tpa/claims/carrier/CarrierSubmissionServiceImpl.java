package com.tpa.claims.carrier;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tpa.claims.model.CarrierSubmission;
import com.tpa.claims.model.Claim;
import com.tpa.claims.model.Document;
import com.tpa.claims.model.RuleResult;
import com.tpa.claims.repository.CarrierSubmissionRepository;
import com.tpa.claims.repository.ClaimRepository;
import com.tpa.claims.repository.DocumentRepository;
import com.tpa.claims.repository.RuleResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CarrierSubmissionServiceImpl implements CarrierSubmissionService {

    private final CarrierSubmissionRepository carrierSubmissionRepository;
    private final ClaimRepository claimRepository;
    private final DocumentRepository documentRepository;
    private final RuleResultRepository ruleResultRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    @Override
    public void submitToCarrier(Claim claim) {
        String carrier = claim.getPolicy() != null ? claim.getPolicy().getCarrierName() : "UNKNOWN_CARRIER";
        log.info("Submitting claim {} to carrier {}", claim.getClaimId(), carrier);

        String submissionPayload = buildCarrierPayload(claim);

        CarrierSubmission submission = CarrierSubmission.builder()
                .claim(claim)
                .carrierName(carrier)
                .submissionPayload(submissionPayload)
                .submissionStatus(CarrierSubmission.SubmissionStatus.SUBMITTED)
                .submittedAt(LocalDateTime.now())
                .build();

        carrierSubmissionRepository.save(submission);

        claim.setStatus(Claim.ClaimStatus.CARRIER_PENDING);
        claim.setCarrierReferenceId("EXT-" + UUID.randomUUID().toString().substring(0, 8));
        claimRepository.save(claim);

        log.info("Claim {} submitted successfully", claim.getClaimId());
    }

    private String buildCarrierPayload(Claim claim) {
        try {
            Map<String, Object> extractedData = parseExtractedData(claim.getExtractedDataJson());
            List<Document> documents = documentRepository.findByClaimId(claim.getId());
            List<RuleResult> violatedRules = ruleResultRepository.findByClaimIdAndViolated(claim.getId(), true);

            Map<String, Object> payload = new HashMap<>();
            Map<String, Object> header = new HashMap<>();
            header.put("claim_id", claim.getClaimId());
            header.put("submission_id", claim.getSubmissionId());
            header.put("policy_number", claim.getPolicy() != null ? claim.getPolicy().getPolicyNumber() : extractedData.get("policy_number"));
            header.put("carrier_name", claim.getPolicy() != null ? claim.getPolicy().getCarrierName() : extractedData.get("carrier_name"));
            header.put("policy_name", claim.getPolicy() != null ? claim.getPolicy().getPolicyType() : extractedData.get("policy_name"));
            header.put("claim_created_date", claim.getCreatedAt());
            payload.put("claim_metadata", header);

            payload.put("extracted_fields", extractedData);

            Map<String, Object> recommendation = new HashMap<>();
            recommendation.put("status", mapRecommendationStatus(claim.getStatus()));
            recommendation.put("triggered_rules", violatedRules.stream().map(RuleResult::getRuleId).collect(Collectors.toList()));
            recommendation.put("reason", claim.getRejectionReason() != null ? claim.getRejectionReason() : claim.getManualReviewReason());
            payload.put("tpa_recommendation", recommendation);

            List<Map<String, Object>> docsPayload = documents.stream()
                    .map(doc -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("document_type", doc.getDocumentType());
                        map.put("file_name", doc.getOriginalFilename());
                        map.put("document_url", publicBaseUrl + "/api/claims/" + claim.getId() + "/documents/" + doc.getId() + "/content");
                        return map;
                    })
                    .collect(Collectors.toList());
            payload.put("documents", docsPayload);

            return objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            log.warn("Failed to construct carrier payload for claim {}. Falling back to minimal payload.", claim.getClaimId(), ex);
            return "{\"claim_id\":\"" + claim.getClaimId() + "\"}";
        }
    }

    private Map<String, Object> parseExtractedData(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return new HashMap<>();
        }
        try {
            return objectMapper.readValue(rawJson, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    private String mapRecommendationStatus(Claim.ClaimStatus status) {
        if (status == Claim.ClaimStatus.APPROVED) {
            return "RECOMMEND_APPROVE";
        }
        if (status == Claim.ClaimStatus.REJECTED) {
            return "RECOMMEND_REJECT";
        }
        return "RECOMMEND_MANUAL_REVIEW";
    }
}
