package com.tpa.claims.repository;

import com.tpa.claims.model.RuleResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RuleResultRepository extends JpaRepository<RuleResult, Long> {
    List<RuleResult> findByClaimId(Long claimId);

    void deleteByClaimId(Long claimId);

    Optional<RuleResult> findByClaimIdAndRuleId(Long claimId, String ruleId);

    List<RuleResult> findByClaimIdAndViolated(Long claimId, boolean violated);
}
