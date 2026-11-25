package com.tpa.claims.service;

import com.tpa.claims.model.Claim;
import com.tpa.claims.model.Policy;
import com.tpa.claims.repository.PolicyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class PolicyValidationServiceImpl implements PolicyValidationService {

    private final PolicyRepository policyRepository;

    @Override
    public Policy validatePolicy(String policyNumber) {
        Policy policy = policyRepository.findByPolicyNumber(policyNumber)
                .orElseThrow(() -> new RuntimeException("Policy not found: " + policyNumber));

        if (policy.getStatus() != Policy.PolicyStatus.ACTIVE) {
            throw new RuntimeException("Policy is not active: " + policyNumber);
        }

        if (policy.getEndDate() != null && policy.getEndDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Policy has expired: " + policyNumber);
        }

        return policy;
    }

    @Override
    public boolean checkCoverage(Claim claim, Policy policy) {
        if (claim.getClaimedAmount().compareTo(policy.getCoverageLimit()) > 0) {
            return false;
        }
        // Additional coverage logic can be added here
        return true;
    }
}
