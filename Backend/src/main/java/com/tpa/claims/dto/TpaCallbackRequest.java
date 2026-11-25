package com.tpa.claims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TpaCallbackRequest {
    private String submissionId;
    private String carrierReferenceId;
    private String status;
    private String decision;
    private BigDecimal approvedAmount;
    private String reason;
    private LocalDateTime decisionDate;
}
