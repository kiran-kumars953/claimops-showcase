import logging
import re
from datetime import datetime
from ocr import extract_content
from llm import call_huggingface_llm, clean_llm_json

logger = logging.getLogger("extractor-service")

CLAIM_FORM_PROMPT_TEMPLATE = """You are an insurance claim form extraction expert.

Correct OCR mistakes and return only strict JSON.

Rules:
- Dates: YYYY-MM-DD
- Amounts: numbers only
- Return ONLY JSON.

Fields to extract:
1. policy_number
2. policy_id
3. customer_name
4. carrier_name
5. policy_name
6. product_type (HAP | AD&D | Recuperative Care)
7. claim_form_patient_name
8. claim_form_hospital_name
9. claim_form_admission_date
10. claim_form_discharge_date
11. claimed_amount
12. claim_type (Cashless | Reimbursement)
13. relationship_to_policyholder
14. member_id
15. mobile_number

Text:
{ocr_text}"""

COMBINED_DOC_PROMPT_TEMPLATE = """You are an expert at extracting discharge summary and final hospital bill data.

Correct OCR mistakes and return only strict JSON.

Rules:
- Dates: YYYY-MM-DD
- Amounts: numbers only
- Return ONLY JSON.

Fields to extract:
1. combined_patient_name
2. combined_hospital_name
3. combined_admission_date
4. combined_discharge_date
5. diagnosis
6. bill_number
7. bill_date
8. final_bill_amount

Text:
{ocr_text}"""

def process_claim_documents(claim_id: str, documents: list) -> dict:
    warnings = []
    ocr_success_count = 0
    claim_form_data = {}
    combined_doc_data = {}
    
    # OCR and per-document extraction
    for doc in documents:
        if isinstance(doc, dict):
            doc_path = doc.get("path")
            doc_type = doc.get("type")
        else:
            doc_path = getattr(doc, "path", None)
            doc_type = getattr(doc, "type", None)

        try:
            text = extract_content(doc_path, claim_id)
            if text:
                ocr_success_count += 1
                extracted = extract_for_document_type(claim_id, doc_type, text)
                if is_claim_form_type(doc_type):
                    claim_form_data.update(extracted)
                elif is_combined_doc_type(doc_type):
                    combined_doc_data.update(extracted)
                else:
                    warnings.append(f"Unsupported document type for LLM extraction: {doc_type}")
            else:
                warnings.append(f"No text extracted from {doc_path}")
        except Exception as e:
            logger.error(f"[{claim_id}] OCR Failed for {doc_path}: {str(e)}")
            warnings.append(f"Failed to process {doc_path}: {str(e)}")

    if ocr_success_count == 0:
        return {
            "claim_id": claim_id,
            "status": "FAILED",
            "confidence": 0.0,
            "data": {},
            "warnings": warnings + ["No text could be extracted from provided documents"]
        }

    data = merge_extracted_data(claim_form_data, combined_doc_data)
    confidence = calculate_confidence(data, ocr_success_count, len(documents))
    status = "SUCCESS" if data else "FAILED"

    return {
        "claim_id": claim_id,
        "status": status,
        "confidence": confidence,
        "data": data,
        "warnings": warnings
    }

def extract_for_document_type(claim_id: str, doc_type: str, text: str) -> dict:
    try:
        if is_claim_form_type(doc_type):
            prompt = CLAIM_FORM_PROMPT_TEMPLATE.format(ocr_text=text)
        elif is_combined_doc_type(doc_type):
            prompt = COMBINED_DOC_PROMPT_TEMPLATE.format(ocr_text=text)
        else:
            return {}

        raw_llm_output = call_huggingface_llm(prompt, claim_id)
        return clean_llm_json(raw_llm_output)
    except Exception as e:
        logger.warning(f"[{claim_id}] LLM extraction failed for {doc_type}. Using OCR regex fallback. Reason: {str(e)}")
        return regex_fallback_extract(doc_type, text)

def is_claim_form_type(doc_type: str) -> bool:
    return str(doc_type).upper() == "CLAIM_FORM"

def is_combined_doc_type(doc_type: str) -> bool:
    normalized = str(doc_type).upper()
    return normalized in {"DISCHARGE_SUMMARY_AND_FINAL_BILL", "SUPPORTING_DOC"}

def merge_extracted_data(claim_form_data: dict, combined_doc_data: dict) -> dict:
    data = {}
    if claim_form_data:
        data.update(claim_form_data)
    if combined_doc_data:
        data.update(combined_doc_data)

    data["patient_name"] = pick_first_non_empty(
        data.get("claim_form_patient_name"),
        data.get("combined_patient_name"),
        data.get("patient_name")
    )
    data["hospital_name"] = pick_first_non_empty(
        data.get("claim_form_hospital_name"),
        data.get("combined_hospital_name"),
        data.get("hospital_name")
    )
    data["admission_date"] = pick_first_non_empty(
        data.get("claim_form_admission_date"),
        data.get("combined_admission_date"),
        data.get("admission_date")
    )
    data["discharge_date"] = pick_first_non_empty(
        data.get("claim_form_discharge_date"),
        data.get("combined_discharge_date"),
        data.get("discharge_date")
    )

    return normalize_values(data)

def normalize_values(data: dict) -> dict:
    normalized = {}
    for key, value in data.items():
        if isinstance(value, str):
            cleaned = value.strip()
            if "date" in key.lower():
                cleaned = normalize_date(cleaned)
            normalized[key] = cleaned
        else:
            normalized[key] = value
    return normalized

def pick_first_non_empty(*values):
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None

def calculate_confidence(data: dict, ocr_count: int, total_docs: int) -> float:
    score = 0.0
    
    # Weight 1: OCR Success Rate (25%)
    if total_docs > 0:
        score += (ocr_count / total_docs) * 0.25
    
    # Weight 2: Claim form key fields (25%)
    claim_form_fields = ['policy_number', 'claim_form_patient_name', 'claim_form_hospital_name', 'claimed_amount']
    claim_form_present = [f for f in claim_form_fields if data.get(f)]
    score += (len(claim_form_present) / len(claim_form_fields)) * 0.25

    # Weight 3: Combined doc key fields (25%)
    combined_fields = ['combined_patient_name', 'combined_hospital_name', 'final_bill_amount', 'diagnosis']
    combined_present = [f for f in combined_fields if data.get(f)]
    score += (len(combined_present) / len(combined_fields)) * 0.25
    
    # Weight 4: Consistency and pattern checks (25%)
    consistency_score = 0.0
    policy = data.get('policy_number', '')
    if re.match(r'POL-\d{4}-\d{3}', str(policy)):
        consistency_score += 0.1
    elif policy:
        consistency_score += 0.05

    if names_match(data.get('claim_form_patient_name'), data.get('combined_patient_name')):
        consistency_score += 0.075
    if names_match(data.get('claim_form_hospital_name'), data.get('combined_hospital_name')):
        consistency_score += 0.075

    score += min(consistency_score, 0.25)

    return round(min(score, 1.0), 2)

def names_match(a, b) -> bool:
    if not a or not b:
        return False
    return str(a).strip().lower() == str(b).strip().lower()

def regex_fallback_extract(doc_type: str, text: str) -> dict:
    content = text or ""

    def find(pattern: str):
        match = re.search(pattern, content, flags=re.IGNORECASE)
        return match.group(1).strip() if match else ""

    if is_claim_form_type(doc_type):
        return {
            "policy_number": find(r"(POL-\d{4}-\d{3})"),
            "claim_form_patient_name": find(r"Patient\s*Name[:\-]?\s*([A-Za-z .]+)"),
            "claim_form_hospital_name": find(r"Hospital\s*Name[:\-]?\s*([A-Za-z0-9 .,&()-]+)"),
            "claim_form_admission_date": find(r"Admission\s*Date[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})"),
            "claim_form_discharge_date": find(r"Discharge\s*Date[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})"),
            "claimed_amount": find(r"Claimed\s*Amount[:\-]?\s*([0-9,]+(?:\.\d+)?)"),
            "claim_type": find(r"Claim\s*Type[:\-]?\s*([A-Za-z ]+)"),
        }

    return {
        "combined_patient_name": find(r"Patient\s*Name[:\-]?\s*([A-Za-z .]+)"),
        "combined_hospital_name": find(r"Hospital\s*Name[:\-]?\s*([A-Za-z0-9 .,&()-]+)"),
        "combined_admission_date": find(r"Admission\s*Date[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})"),
        "combined_discharge_date": find(r"Discharge\s*Date[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})"),
        "bill_number": find(r"Bill\s*Number[:\-]?\s*([A-Za-z0-9\\-/]+)"),
        "bill_date": find(r"Bill\s*Date[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})"),
        "final_bill_amount": find(r"(?:Total|Final)\s*Bill\s*Amount[:\-]?\s*([0-9,]+(?:\.\d+)?)"),
        "diagnosis": find(r"Diagnosis[:\-]?\s*([A-Za-z0-9 ,.-]+)"),
    }

def normalize_date(value: str) -> str:
    if not value:
        return value

    for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(value, pattern).strftime("%Y-%m-%d")
        except Exception:
            continue
    return value
