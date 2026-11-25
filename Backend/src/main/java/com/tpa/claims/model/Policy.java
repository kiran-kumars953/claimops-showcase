package com.tpa.claims.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "policies", indexes = {
    @Index(name = "idx_policy_number", columnList = "policy_number"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_start_date", columnList = "start_date"),
    @Index(name = "idx_end_date", columnList = "end_date"),
    @Index(name = "idx_policyholder_name", columnList = "policy_holder_name")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Policy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true, length = 50)
    private String policyNumber;

    @NotBlank
    @Column(name = "policy_holder_name", nullable = false, length = 100)
    private String policyHolderName;

    @NotNull
    @Column(name = "policy_holder_dob", nullable = false)
    private LocalDate policyHolderDob;

    @NotBlank
    @Column(nullable = false, length = 50)
    private String policyType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PolicyStatus status = PolicyStatus.ACTIVE;

    @NotNull
    @Column(nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(precision = 15, scale = 2)
    private BigDecimal premiumAmount;

    @NotNull
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal coverageLimit;

    @Column(precision = 15, scale = 2)
    private BigDecimal deductible;

    @Column(length = 100)
    private String carrierName;

    @Column(name = "carrier_policy_ref", length = 100)
    private String carrierPolicyRef;

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

    public enum PolicyStatus {
        ACTIVE, INACTIVE, SUSPENDED, TERMINATED
    }
}
