"""Unit tests for the claim extraction service.

These tests cover the pure logic (JSON cleanup, regex fallback, merging,
date normalisation and confidence scoring). OCR and the LLM are mocked, so
no Tesseract binary or Hugging Face key is needed.
"""
import pytest

import extractor
from llm import clean_llm_json


# --- LLM output cleanup -----------------------------------------------------

def test_clean_llm_json_plain():
    assert clean_llm_json('{"policy_number": "POL-2024-001"}') == {"policy_number": "POL-2024-001"}


def test_clean_llm_json_fenced_block():
    raw = 'Here you go:\n```json\n{"claimed_amount": 12500}\n```'
    assert clean_llm_json(raw) == {"claimed_amount": 12500}


def test_clean_llm_json_with_trailing_chatter():
    raw = 'Sure! {"diagnosis": "Fracture"} Let me know if you need more.'
    assert clean_llm_json(raw) == {"diagnosis": "Fracture"}


def test_clean_llm_json_rejects_garbage():
    with pytest.raises(ValueError):
        clean_llm_json("no json here")


# --- Date normalisation -----------------------------------------------------

@pytest.mark.parametrize(
    "raw, expected",
    [
        ("2024-03-15", "2024-03-15"),
        ("15/03/2024", "2024-03-15"),
        ("15-03-2024", "2024-03-15"),
        ("not a date", "not a date"),
    ],
)
def test_normalize_date(raw, expected):
    assert extractor.normalize_date(raw) == expected


# --- Regex fallback when the LLM is unavailable ------------------------------

CLAIM_FORM_TEXT = """
Policy: POL-2024-001
Patient Name: Ravi Kumar
Hospital Name: City Care Hospital
Admission Date: 10/03/2024
Discharge Date: 15/03/2024
Claimed Amount: 45,000
Claim Type: Reimbursement
"""


def test_regex_fallback_claim_form():
    data = extractor.regex_fallback_extract("CLAIM_FORM", CLAIM_FORM_TEXT)
    assert data["policy_number"] == "POL-2024-001"
    assert data["claim_form_patient_name"] == "Ravi Kumar"
    assert data["claim_form_admission_date"] == "10/03/2024"
    assert data["claimed_amount"] == "45,000"


def test_merge_prefers_claim_form_and_normalises_dates():
    merged = extractor.merge_extracted_data(
        {"claim_form_patient_name": " Ravi Kumar ", "claim_form_admission_date": "10/03/2024"},
        {"combined_patient_name": "R. Kumar", "combined_hospital_name": "City Care"},
    )
    assert merged["patient_name"] == "Ravi Kumar"
    assert merged["hospital_name"] == "City Care"
    assert merged["admission_date"] == "2024-03-10"


# --- Confidence scoring -----------------------------------------------------

FULL_DATA = {
    "policy_number": "POL-2024-001",
    "claim_form_patient_name": "Ravi Kumar",
    "claim_form_hospital_name": "City Care",
    "claimed_amount": 45000,
    "combined_patient_name": "ravi kumar",
    "combined_hospital_name": "City Care",
    "final_bill_amount": 45000,
    "diagnosis": "Fracture",
}


def test_confidence_full_consistent_claim_is_1():
    assert extractor.calculate_confidence(FULL_DATA, 2, 2) == 1.0


def test_confidence_drops_when_names_disagree_and_ocr_partial():
    data = dict(FULL_DATA, combined_patient_name="Someone Else")
    score = extractor.calculate_confidence(data, 1, 2)
    assert score < 1.0
    assert score == pytest.approx(0.125 + 0.25 + 0.25 + 0.175)


def test_confidence_empty_is_zero():
    assert extractor.calculate_confidence({}, 0, 1) == 0.0


# --- End-to-end orchestration with OCR + LLM mocked ---------------------------

def test_process_claim_documents_uses_regex_fallback_when_llm_fails(monkeypatch):
    monkeypatch.setattr(extractor, "extract_content", lambda path, cid: CLAIM_FORM_TEXT)

    def boom(prompt, cid):
        raise RuntimeError("LLM offline")

    monkeypatch.setattr(extractor, "call_huggingface_llm", boom)

    result = extractor.process_claim_documents(
        "CLM-1", [{"path": "claim.pdf", "type": "CLAIM_FORM"}]
    )
    assert result["status"] == "SUCCESS"
    assert result["data"]["policy_number"] == "POL-2024-001"
    assert result["data"]["admission_date"] == "2024-03-10"
    assert 0 < result["confidence"] <= 1


def test_process_claim_documents_fails_cleanly_without_text(monkeypatch):
    monkeypatch.setattr(extractor, "extract_content", lambda path, cid: "")
    result = extractor.process_claim_documents(
        "CLM-2", [{"path": "blank.png", "type": "CLAIM_FORM"}]
    )
    assert result["status"] == "FAILED"
    assert result["confidence"] == 0.0
