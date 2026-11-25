package com.tpa.claims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClaimRequest {
    private String submissionId;
    private Long carrierId;
    private String policyNumber;
    private String patientName;
    private LocalDate patientDob;
    private String providerName;
    private String hospitalName;
    private LocalDate serviceDate;
    private BigDecimal billAmount;
    private BigDecimal claimedAmount;
    private List<DocumentDto> documents;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DocumentDto {
        private String type;
        private String filename;
        private String base64Content;
    }
}
