package com.tpa.claims.carrier;

import com.tpa.claims.model.Claim;

public interface CarrierSubmissionService {
    void submitToCarrier(Claim claim);
}
