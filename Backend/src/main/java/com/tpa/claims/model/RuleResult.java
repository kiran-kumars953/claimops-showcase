package com.tpa.claims.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "rule_results", indexes = {
        @Index(name = "idx_claim_id", columnList = "claim_id"),
        @Index(name = "idx_rule_id", columnList = "rule_id"),
        @Index(name = "idx_is_violated", columnList = "is_violated"),
        @Index(name = "idx_action_required", columnList = "action_required")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RuleResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_id", nullable = false)
    private Claim claim;

    @NotBlank
    @Column(nullable = false, length = 50)
    private String ruleId;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String ruleName;

    @Column(name = "is_violated", nullable = false)
    @Builder.Default
    private boolean violated = false;

    @Column(name = "violation_message", length = 500)
    private String violationMessage;

    @Column(columnDefinition = "JSON")
    private String ruleData;

    @Column(name = "action_required", length = 50)
    private String actionRequired;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
