package com.tpa.claims.rules;

import com.tpa.claims.model.Claim;
import com.tpa.claims.model.RuleResult;

import java.util.List;
import java.util.Map;

public interface RuleEngineService {
    List<RuleResult> executeRules(Claim claim, Map<String, Object> extractedData);
}
