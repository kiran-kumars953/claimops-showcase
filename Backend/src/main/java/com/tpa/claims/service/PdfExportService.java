package com.tpa.claims.service;

import com.tpa.claims.model.Claim;

public interface PdfExportService {
    byte[] generateClaimReport(Claim claim);
}
