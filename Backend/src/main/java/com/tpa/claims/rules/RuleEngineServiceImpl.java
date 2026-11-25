package com.tpa.claims.rules;

import com.tpa.claims.model.Claim;
import com.tpa.claims.model.Document;
import com.tpa.claims.model.Policy;
import com.tpa.claims.model.RuleResult;
import com.tpa.claims.repository.ClaimRepository;
import com.tpa.claims.repository.DocumentRepository;
import com.tpa.claims.repository.RuleResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;

@Service
@RequiredArgsConstructor
public class RuleEngineServiceImpl implements RuleEngineService {

    private final RuleResultRepository ruleResultRepository;
    private final DocumentRepository documentRepository;
    private final ClaimRepository claimRepository;

    @Override
    public List<RuleResult> executeRules(Claim claim, Map<String, Object> extractedData) {
        List<RuleResult> results = new ArrayList<>();
        Map<String, Object> data = extractedData == null ? Map.of() : extractedData;
        List<Document> documents = documentRepository.findByClaimId(claim.getId());
        ruleResultRepository.deleteByClaimId(claim.getId());

        // RULE_001: Claim form missing -> Reject
        boolean missingClaimForm = documents.stream().noneMatch(d -> "CLAIM_FORM".equalsIgnoreCase(d.getDocumentType()));
        results.add(createResult(
                claim,
                "RULE_001",
                "Claim form missing",
                missingClaimForm,
                missingClaimForm ? "Claim form document is missing." : null,
                missingClaimForm ? "REJECT" : "NONE"));

        // RULE_002: Combined discharge summary + final bill missing -> Reject
        boolean missingCombinedDoc = documents.stream()
                .noneMatch(d -> "DISCHARGE_SUMMARY_AND_FINAL_BILL".equalsIgnoreCase(d.getDocumentType())
                        || "SUPPORTING_DOC".equalsIgnoreCase(d.getDocumentType()));
        results.add(createResult(
                claim,
                "RULE_002",
                "Combined document missing",
                missingCombinedDoc,
                missingCombinedDoc ? "Combined discharge summary and final bill document is missing." : null,
                missingCombinedDoc ? "REJECT" : "NONE"));

        // RULE_003: Policy inactive on admission date -> Reject
        LocalDate admissionDate = pickDate(data, "claim_form_admission_date", "combined_admission_date", "admission_date");
        boolean policyInactive = false;
        if (claim.getPolicy() != null && admissionDate != null) {
            Policy policy = claim.getPolicy();
            policyInactive = policy.getStatus() != Policy.PolicyStatus.ACTIVE
                    || admissionDate.isBefore(policy.getStartDate())
                    || (policy.getEndDate() != null && admissionDate.isAfter(policy.getEndDate()));
        }
        results.add(createResult(
                claim,
                "RULE_003",
                "Policy inactive on admission date",
                policyInactive,
                policyInactive ? "Policy is not active for the admission date." : null,
                policyInactive ? "REJECT" : "NONE"));

        // RULE_004: Policy number missing -> Manual review
        String policyNumber = pickString(data, "policy_number", "claim_form_policy_number");
        boolean missingPolicyNumber = isBlank(policyNumber);
        results.add(createResult(
                claim,
                "RULE_004",
                "Policy number missing",
                missingPolicyNumber,
                missingPolicyNumber ? "Policy number is missing from extracted data." : null,
                missingPolicyNumber ? "MANUAL_REVIEW" : "NONE"));

        // RULE_005: Patient mismatch -> Manual review
        String claimFormPatient = pickString(data, "claim_form_patient_name");
        String combinedPatient = pickString(data, "combined_patient_name");
        boolean patientMismatch = !isBlank(claimFormPatient)
                && !isBlank(combinedPatient)
                && !likelySameEntity(claimFormPatient, combinedPatient);
        results.add(createResult(
                claim,
                "RULE_005",
                "Patient mismatch across documents",
                patientMismatch,
                patientMismatch ? "Patient name mismatch between claim form and combined document." : null,
                patientMismatch ? "MANUAL_REVIEW" : "NONE"));

        // RULE_006: Hospital mismatch -> Manual review
        String claimFormHospital = pickString(data, "claim_form_hospital_name");
        String combinedHospital = pickString(data, "combined_hospital_name");
        boolean hospitalMismatch = !isBlank(claimFormHospital)
                && !isBlank(combinedHospital)
                && !likelySameEntity(claimFormHospital, combinedHospital);
        results.add(createResult(
                claim,
                "RULE_006",
                "Hospital mismatch across documents",
                hospitalMismatch,
                hospitalMismatch ? "Hospital name mismatch between claim form and combined document." : null,
                hospitalMismatch ? "MANUAL_REVIEW" : "NONE"));

        // RULE_007: Admission/discharge mismatch -> Manual review
        LocalDate claimFormAdmission = parseDate(data.get("claim_form_admission_date"));
        LocalDate combinedAdmission = parseDate(data.get("combined_admission_date"));
        LocalDate claimFormDischarge = parseDate(data.get("claim_form_discharge_date"));
        LocalDate combinedDischarge = parseDate(data.get("combined_discharge_date"));
        boolean admissionMismatch = claimFormAdmission != null && combinedAdmission != null
                && !claimFormAdmission.equals(combinedAdmission);
        boolean dischargeMismatch = claimFormDischarge != null && combinedDischarge != null
                && !claimFormDischarge.equals(combinedDischarge);
        boolean dateMismatch = admissionMismatch || dischargeMismatch;
        results.add(createResult(
                claim,
                "RULE_007",
                "Admission/discharge date mismatch",
                dateMismatch,
                dateMismatch ? "Admission or discharge date mismatch between documents." : null,
                dateMismatch ? "MANUAL_REVIEW" : "NONE"));

        // RULE_008: Claimed amount > total bill amount -> Manual review
        BigDecimal claimedAmount = pickAmount(data, "claimed_amount");
        BigDecimal finalBillAmount = pickAmount(data, "final_bill_amount");
        boolean claimedExceedsBill = claimedAmount != null && finalBillAmount != null
                && claimedAmount.compareTo(finalBillAmount) > 0;
        results.add(createResult(
                claim,
                "RULE_008",
                "Claimed amount exceeds bill amount",
                claimedExceedsBill,
                claimedExceedsBill ? "Claimed amount is greater than total final bill amount." : null,
                claimedExceedsBill ? "MANUAL_REVIEW" : "NONE"));

        // RULE_009: High claim amount > 50,000 -> Manual review
        boolean highClaimAmount = claimedAmount != null && claimedAmount.compareTo(new BigDecimal("50000")) > 0;
        results.add(createResult(
                claim,
                "RULE_009",
                "High claim amount",
                highClaimAmount,
                highClaimAmount ? "Claim amount exceeds 50,000 threshold." : null,
                highClaimAmount ? "MANUAL_REVIEW" : "NONE"));

        // RULE_010: Possible duplicate claim -> Manual review
        String duplicatePolicyNumber = pickString(data, "policy_number", "claim_form_policy_number");
        String duplicatePatient = pickString(data, "patient_name", "claim_form_patient_name", "combined_patient_name");
        String duplicateHospital = pickString(data, "hospital_name", "claim_form_hospital_name", "combined_hospital_name");
        LocalDate duplicateAdmissionDate = pickDate(data, "admission_date", "claim_form_admission_date", "combined_admission_date");

        boolean possibleDuplicate = !isBlank(duplicatePolicyNumber)
                && !isBlank(duplicatePatient)
                && !isBlank(duplicateHospital)
                && duplicateAdmissionDate != null
                && claimRepository.existsPotentialDuplicate(
                claim.getId(),
                duplicatePolicyNumber,
                duplicatePatient.trim(),
                duplicateHospital.trim(),
                duplicateAdmissionDate);

        results.add(createResult(
                claim,
                "RULE_010",
                "Possible duplicate claim",
                possibleDuplicate,
                possibleDuplicate ? "Potential duplicate claim found for same policy/patient/hospital/admission date." : null,
                possibleDuplicate ? "MANUAL_REVIEW" : "NONE"));

        return ruleResultRepository.saveAll(results);
    }

    private RuleResult createResult(Claim claim, String ruleId, String ruleName, boolean violated, String message,
                                    String actionRequired) {
        return RuleResult.builder()
                .claim(claim)
                .ruleId(ruleId)
                .ruleName(ruleName)
                .violated(violated)
                .violationMessage(message)
                .actionRequired(actionRequired)
                .build();
    }

    private String pickString(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            Object value = data.get(key);
            if (value != null) {
                String text = value.toString().trim();
                if (!text.isEmpty()) {
                    return text;
                }
            }
        }
        return null;
    }

    private BigDecimal pickAmount(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            Object value = data.get(key);
            if (value == null) {
                continue;
            }
            try {
                return new BigDecimal(value.toString().trim());
            } catch (Exception ignored) {
                // ignore malformed value and try next key
            }
        }
        return null;
    }

    private LocalDate pickDate(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            LocalDate date = parseDate(data.get(key));
            if (date != null) {
                return date;
            }
        }
        return null;
    }

    private LocalDate parseDate(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return LocalDate.parse(value.toString().trim());
        } catch (Exception ignored) {
            return null;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private boolean likelySameEntity(String left, String right) {
        String a = normalizeForCompare(left);
        String b = normalizeForCompare(right);
        if (a.isEmpty() || b.isEmpty()) {
            return false;
        }
        if (a.equals(b)) {
            return true;
        }
        // Common real-world case: one document includes location/suffix (e.g., "Apollo Hospital, Pune")
        if (a.contains(b) || b.contains(a)) {
            return true;
        }

        Set<String> aTokens = tokenize(a);
        Set<String> bTokens = tokenize(b);
        if (aTokens.isEmpty() || bTokens.isEmpty()) {
            return false;
        }

        int common = 0;
        for (String token : aTokens) {
            if (bTokens.contains(token)) {
                common++;
            }
        }

        int minSize = Math.min(aTokens.size(), bTokens.size());
        int maxSize = Math.max(aTokens.size(), bTokens.size());

        // If we share at least 2 meaningful tokens and the smaller name is largely covered, treat as same.
        if (common >= 2 && ((double) common / (double) minSize) >= 0.8) {
            return true;
        }

        // More permissive for longer strings.
        return common >= 3 && ((double) common / (double) maxSize) >= 0.6;
    }

    private String normalizeForCompare(String raw) {
        if (raw == null) {
            return "";
        }
        String value = raw.trim().toLowerCase();
        value = value.replace("&", "and");
        value = value.replace("hospitals", "hospital");
        // Drop punctuation to compare across OCR variants.
        value = value.replaceAll("[^a-z0-9 ]", " ");
        value = value.replaceAll("\\s+", " ").trim();
        return value;
    }

    private Set<String> tokenize(String normalized) {
        Set<String> tokens = new HashSet<>();
        for (String part : normalized.split(" ")) {
            String token = part.trim();
            if (token.isEmpty()) {
                continue;
            }
            if (isStopToken(token)) {
                continue;
            }
            tokens.add(token);
        }
        return tokens;
    }

    private boolean isStopToken(String token) {
        return token.equals("pvt")
                || token.equals("ltd")
                || token.equals("limited")
                || token.equals("private")
                || token.equals("co")
                || token.equals("company")
                || token.equals("inc")
                || token.equals("llp");
    }
}
