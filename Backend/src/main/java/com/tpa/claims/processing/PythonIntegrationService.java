package com.tpa.claims.processing;

import com.tpa.claims.model.Claim;

public interface PythonIntegrationService {
    ExtractionResult extractData(Claim claim);
}
