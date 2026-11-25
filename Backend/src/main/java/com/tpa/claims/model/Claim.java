package com.tpa.claims.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "claims", indexes = {
        @Index(name = "idx_claim_id", columnList = "claim_id"),
        @Index(name = "idx_submission_id", columnList = "submission_id"),
        @Index(name = "idx_policy_id", columnList = "policy_id"),
        @Index(name = "idx_status", columnList = "status"),
        @Index(name = "idx_service_date", columnList = "service_date"),
        @Index(name = "idx_created_at", columnList = "created_at"),
        @Index(name = "idx_patient_name", columnList = "patient_name"),
        @Index(name = "idx_provider_id", columnList = "provider_id"),
        @Index(name = "idx_hospital_id", columnList = "hospital_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Claim {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String claimId;

    @Column(nullable = false, unique = true, length = 50)
    private String submissionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_id", nullable = true)
    private Policy policy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "carrier_id", nullable = true)
    private Carrier carrier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ClaimStatus status = ClaimStatus.PENDING;

    @Column(length = 100)
    private String patientName;

    @Column(name = "patient_dob")
    private LocalDate patientDob;

    @Column(length = 100)
    private String providerName;

    @Column(name = "provider_id", length = 50)
    private String providerId;

    @Column(length = 100)
    private String hospitalName;

    @Column(name = "hospital_id", length = 50)
    private String hospitalId;

    @Column(name = "service_date")
    private LocalDate serviceDate;

    @Column(precision = 15, scale = 2)
    private BigDecimal billAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal claimedAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal recommendedPayableAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal nonPayableAmount;

    @Column(columnDefinition = "TEXT")
    private String processingNotes;

    @Column(length = 255)
    private String rejectionReason;

    @Column(length = 255)
    private String manualReviewReason;

    @Column(name = "extracted_data_json", columnDefinition = "LONGTEXT")
    private String extractedDataJson;

    @Column(name = "extraction_confidence", precision = 5, scale = 2)
    private BigDecimal extractionConfidence;

    @Column(length = 100)
    private String carrierReferenceId;

    @Column(name = "carrier_decision", length = 50)
    private String carrierDecision;

    @Column(name = "carrier_decision_date")
    private LocalDateTime carrierDecisionDate;

    @Column(name = "carrier_decision_reason", length = 255)
    private String carrierDecisionReason;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ClaimStatus {
        DRAFT,
        PENDING,
        PROCESSING,
        REVIEW,
        MANUAL_REVIEW,
        TPA_MANUAL_REVIEW,
        APPROVED,
        TPA_APPROVED,
        SUBMITTED_TO_CARRIER,
        CARRIER_PENDING,
        CARRIER_APPROVED,
        CARRIER_REJECTED,
        REJECTED,
        CLOSED
    }
}
