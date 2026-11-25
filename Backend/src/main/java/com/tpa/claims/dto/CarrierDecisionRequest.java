package com.tpa.claims.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class CarrierDecisionRequest {
    private String decision; // APPROVE | REJECT
    private String reason;
    private BigDecimal approvedAmount;
}

