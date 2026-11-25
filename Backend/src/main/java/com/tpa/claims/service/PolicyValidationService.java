package com.tpa.claims.service;

import com.tpa.claims.model.Claim;
import com.tpa.claims.model.Policy;

public interface PolicyValidationService {
    Policy validatePolicy(String policyNumber);

    boolean checkCoverage(Claim claim, Policy policy);
}
