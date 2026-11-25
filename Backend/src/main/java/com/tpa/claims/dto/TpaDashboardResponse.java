package com.tpa.claims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TpaDashboardResponse {
    private long totalClaims;
    private long carrierApproved;
    private long carrierRejected;
    private long manualReview;
    private long rejectedTotal;
}

