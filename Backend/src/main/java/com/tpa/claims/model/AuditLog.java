package com.tpa.claims.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_claim_id", columnList = "claim_id"),
    @Index(name = "idx_user_id", columnList = "user_id"),
    @Index(name = "idx_action", columnList = "action"),
    @Index(name = "idx_action_type", columnList = "action_type"),
    @Index(name = "idx_created_at", columnList = "created_at"),
    @Index(name = "idx_correlation_id", columnList = "correlation_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_id")
    private Claim claim;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String action;

    @NotBlank
    @Column(nullable = false, length = 50)
    private String actionType;

    @Column(columnDefinition = "LONGTEXT")
    private String previousValue;

    @Column(columnDefinition = "LONGTEXT")
    private String newValue;

    @Column(length = 45)
    private String ipAddress;

    @Column(length = 50)
    private String correlationId;

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
