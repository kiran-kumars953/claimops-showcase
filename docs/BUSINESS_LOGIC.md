# TPA Claim Processing System - Business Logic

## Goal
Provide a TPA operations workflow to:
1. Receive exactly two claim documents per case.
2. Extract structured data using OCR + LLM.
3. Allow an agent to review/edit extracted data.
4. Validate the claim using mandatory rules.
5. Decide the claim outcome (Approved / Rejected / Needs Manual Review).
6. Submit approved claims to the carrier (client) with a structured packet.
7. Track all claims on a dashboard and export a decision report PDF.

## Users And Responsibilities
- TPA Agent:
  - Upload documents.
  - Review extracted fields and correct mistakes.
  - Confirm to run validations.
  - For manual-review claims: decide approve/reject with reason.
  - For approved claims: submit to carrier.
- Carrier (external):
  - Receives a structured packet with extracted fields + decision context + document links.
  - Can send a callback with final decision (optional in this project).

## Mandatory Upload Requirement (Per Claim)
Exactly two documents must be uploaded together in one submission:
1. Document 1: `CLAIM_FORM` (PDF; image optional)
2. Document 2: `DISCHARGE_SUMMARY_AND_FINAL_BILL` (single combined PDF; image optional)

If either document is missing, the claim cannot pass validation.

## Data Extraction (What We Capture)
The system extracts and stores fields in JSON (canonical + per-document keys). Examples:
- Claim Form fields:
  - `policy_number`, `policy_id`, `customer_name`, `carrier_name`, `policy_name`, `product_type`
  - `claim_form_patient_name`, `claim_form_hospital_name`
  - `claim_form_admission_date`, `claim_form_discharge_date`
  - `claimed_amount`, `claim_type`
- Combined document fields:
  - `combined_patient_name`, `combined_hospital_name`
  - `combined_admission_date`, `combined_discharge_date`
  - `diagnosis`
  - `bill_number`, `bill_date`, `final_bill_amount`
- Canonical rollups (derived):
  - `patient_name`, `hospital_name`, `admission_date`, `discharge_date`

## Human-in-the-Loop Review (Editable Data)
After upload:
1. OCR/LLM extraction runs.
2. The UI shows:
  - Document preview (PDF) side-by-side with extracted data.
  - Extracted data in both table view and JSON view.
  - All extracted fields are editable to correct OCR/LLM mistakes.
3. Agent clicks "Confirm" to run the rule engine using the edited data.

## Rule Engine (Mandatory 10 Rules)
Rules are evaluated on confirm. Outcomes are stored as:
- `triggered_rules` (Rule IDs)
- `tpa_recommendation_status` (recommend approve/reject/manual review)
- `tpa_recommendation_reason`

Rule list (aligned to assignment):
1. `RULE_001` Claim form missing -> Reject
2. `RULE_002` Combined document missing -> Reject
3. `RULE_003` Policy inactive on admission date -> Reject
4. `RULE_004` Policy number missing -> Needs Manual Review
5. `RULE_005` Patient name mismatch across documents -> Needs Manual Review
6. `RULE_006` Hospital name mismatch across documents -> Needs Manual Review
7. `RULE_007` Admission/discharge date mismatch across documents -> Needs Manual Review
8. `RULE_008` Claimed amount > final bill amount -> Needs Manual Review
9. `RULE_009` High claim amount > 50,000 -> Needs Manual Review
10. `RULE_010` Possible duplicate claim (policy + patient + hospital + admission date) -> Needs Manual Review

Decision precedence:
1. Any Reject rule violated -> Final status = Rejected
2. Else any Manual Review rule violated -> Final status = Needs Manual Review
3. Else proceed to confidence gating.

## Extraction Confidence Gating
If rules do not force Reject/Manual Review, the system uses `extraction_confidence`:
- If confidence > 0.90 -> Final status = Approved
- If 0.60 <= confidence <= 0.90 -> Final status = Needs Manual Review
- If confidence < 0.60 -> Final status = Rejected

Important: Approval is not the same as carrier submission. Submission is an explicit step.

## Manual Review Decisions
If a claim status is "Needs Manual Review":
- Agent can decide:
  - Approve (optional approved amount; defaults to claimed amount)
  - Reject (rejection reason required)

If approved by manual review, the claim becomes "Approved" and can be submitted to carrier.

## Submission To Carrier (Client)
When a claim is Approved, the agent can click "Submit to Carrier".
This creates a carrier submission packet including:
- Claim metadata (`claim_id`, `submission_id`, policy, carrier, dates)
- Extracted fields JSON
- TPA recommendation summary and triggered rule IDs
- Document references as secure URLs (project uses internal URLs)

After submission:
- Claim status becomes "Submitted to Carrier"
- `carrierReferenceId` is generated and stored

## Dashboard (Operations View)
The dashboard supports:
- View all claims with status and reasons
- Search by Claim ID / Policy Number
- Filter by status (Approved / Rejected / Needs Manual Review / Submitted to Carrier)
- View claim detail in a modal (documents + extracted JSON + rules)
- Export decision report to PDF (per claim)
- Submit approved claims to carrier (per claim or from selection bar)

## Export To PDF
For each claim, the system exports a decision report containing:
- Claim ID, submission ID
- Policy details
- Final analysis (Approved / Rejected / Needs Manual Review / Submitted to Carrier)
- Reasons (reject/review)
- Triggered rule IDs

