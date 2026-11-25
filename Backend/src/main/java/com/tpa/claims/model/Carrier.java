package com.tpa.claims.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "carriers", indexes = {
        @Index(name = "idx_carrier_code", columnList = "carrier_code"),
        @Index(name = "idx_carrier_name", columnList = "carrier_name"),
        @Index(name = "idx_carrier_active", columnList = "is_active")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Carrier {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "carrier_code", nullable = false, unique = true, length = 50)
    private String carrierCode;

    @Column(name = "carrier_name", nullable = false, unique = true, length = 150)
    private String carrierName;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

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
}

