package com.tpa.claims.dto;

import com.tpa.claims.model.Claim.ClaimStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClaimResponse {
    private Long id;
    private String claimId;
    private String submissionId;
    private String policyNumber;
    private ClaimStatus status;
    private String patientName;
    private BigDecimal billAmount;
    private BigDecimal claimedAmount;
    private BigDecimal recommendedPayableAmount;
    private String carrierName;
    private String policyName;
    private String carrierReferenceId;
    private String carrierDecision;
    private LocalDateTime carrierDecisionDate;
    private String carrierDecisionReason;
    private String rejectionReason;
    private String manualReviewReason;
    private BigDecimal extractionConfidence;
    private Map<String, Object> extractedData;
    private List<DocumentPreviewDto> documents;
    private Integer rulesExecutedCount;
    private Integer rulesFailedCount;
    private List<String> triggeredRules;
    private String tpaRecommendationStatus;
    private String tpaRecommendationReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
