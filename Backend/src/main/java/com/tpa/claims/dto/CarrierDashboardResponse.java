package com.tpa.claims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CarrierDashboardResponse {
    private long totalClaims;
    private long pending;
    private long approved;
    private long rejected;
}

