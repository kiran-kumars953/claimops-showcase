package com.tpa.claims.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "carrier_submissions", indexes = {
    @Index(name = "idx_claim_id", columnList = "claim_id"),
    @Index(name = "idx_carrier_name", columnList = "carrier_name"),
    @Index(name = "idx_carrier_reference_id", columnList = "carrier_reference_id"),
    @Index(name = "idx_submission_status", columnList = "submission_status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CarrierSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_id", nullable = false)
    private Claim claim;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String carrierName;

    @Column(length = 100)
    private String carrierReferenceId;

    @NotBlank
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String submissionPayload;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SubmissionStatus submissionStatus = SubmissionStatus.PENDING;

    @Column(columnDefinition = "LONGTEXT")
    private String responsePayload;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

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

    public enum SubmissionStatus {
        PENDING, SUBMITTED, ACKNOWLEDGED, PROCESSED, FAILED
    }
}
