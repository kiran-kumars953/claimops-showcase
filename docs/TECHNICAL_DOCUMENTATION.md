# TPA Claim Processing System - Technical Documentation

## Architecture Summary
This project is a multi-service application:
- Frontend: React + TypeScript (Vite, MUI)
- Backend: Spring Boot (Java 17) + MySQL + Flyway
- Extraction service: FastAPI (Python) using OCR (Tesseract/PDFPlumber) + Hugging Face LLM
- Storage: local filesystem volume mounted into containers

## Repository Structure
- `frontend-tpa/`: React app (UI: upload, review, dashboard)
- `capstone/Backend/`: Spring Boot API + rule engine + PDF export + persistence
- `capstone/Python-Service/`: FastAPI service for OCR/LLM extraction and confidence scoring
- `capstone/docker-compose.yml`: local orchestration (MySQL + services)

## Local Run (Docker Compose)
From `capstone/`:
```powershell
docker compose up -d --build
```

Services and ports:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080`
- Python extraction service: `http://localhost:5000`

Environment variables:
- `capstone/.env` is used by Docker Compose for the Python service:
  - `HF_API_KEY` (Hugging Face token)
  - `HF_MODEL` (default: `HuggingFaceH4/zephyr-7b-beta`)

Security note:
- Do not commit or share a real `HF_API_KEY`. Rotate the token if it was exposed.

## Document Storage And Container Mounts
The backend writes uploaded documents to `/data/storage` (inside container).
Docker Compose mounts a shared volume:
- Backend: `backend_storage:/data/storage`
- Python service: `backend_storage:/data/storage:ro`

This allows the Python service to read the PDFs that the backend stored.

## Core Workflow (System Behavior)
1. Upload (two documents in one submission):
   - Frontend sends Base64 file payload to backend.
   - Backend stores documents and creates a Claim record.
2. Extraction preview:
   - Backend calls Python service `/extract` with document paths.
   - Python service runs OCR and LLM structuring.
   - Backend stores `extracted_data_json` + `extraction_confidence`.
   - Claim becomes `PENDING` (awaiting user confirmation).
3. Review and confirm:
   - UI shows PDF preview + extracted JSON/table and allows edits.
   - On confirm, UI sends edited JSON to backend.
4. Rule engine:
   - Backend runs mandatory rules and stores `rule_results`.
   - If any Reject rule is violated -> claim becomes `REJECTED`.
   - Else if any Manual Review rule is violated -> claim becomes `MANUAL_REVIEW`.
   - Else apply confidence gating to decide `APPROVED` / `MANUAL_REVIEW` / `REJECTED`.
5. Submit to carrier:
   - If claim is `APPROVED`, the user can click "Submit to Carrier".
   - Backend builds and stores a carrier submission payload and sets status `SUBMITTED_TO_CARRIER`.
6. Export:
   - UI can download a PDF decision report at any time.

## API Endpoints (Backend)
Base URL: `http://localhost:8080`

Claims:
- `POST /api/claims`
  - Creates a claim, stores docs, runs extraction, returns extracted data + confidence + preview URLs.
- `POST /api/claims/{id}/confirm`
  - Persists edited extracted JSON, runs rules + confidence gating, returns final decision.
- `POST /api/claims/{id}/manual-review/decision`
  - Allows manual approval/rejection for `MANUAL_REVIEW` claims.
- `POST /api/claims/{id}/submit-to-carrier`
  - Submits an `APPROVED` claim to carrier and sets status `SUBMITTED_TO_CARRIER`.
- `GET /api/claims`
  - Paginated list with status/search filters.
- `GET /api/claims/{id}`
  - Claim detail (includes documents preview URLs and extracted JSON).
- `GET /api/claims/{id}/export`
  - Downloads the claim decision PDF.
- `GET /api/claims/{id}/documents/{documentId}/content`
  - Streams a stored document for inline preview.

Carrier callback (optional simulation):
- `POST /tpa/claims/callback`
  - Updates carrier decision fields on a claim using `submission_id`.

## API Endpoints (Python Extraction Service)
Base URL: `http://localhost:5000`
- `GET /`
  - Health check.
- `POST /extract`
  - Input: claim_id + documents[{type, path}]
  - Output: status + confidence + data + warnings

## Data Model (MySQL Tables)
Tables are created via Flyway migrations in `Backend/src/main/resources/db/migration/`.

Key tables:
- `claims`
  - Identity: `claim_id`, `submission_id`
  - Status: `PENDING`, `PROCESSING`, `MANUAL_REVIEW`, `APPROVED`, `REJECTED`, `SUBMITTED_TO_CARRIER`, `CLOSED`
  - Extraction storage: `extracted_data_json`, `extraction_confidence`
  - Decision reasons: `rejection_reason`, `manual_review_reason`
  - Carrier fields: `carrier_reference_id`, `carrier_decision`, `carrier_decision_date`
- `documents`
  - Stored claim documents with `document_type`, `storage_path`, `ocr_text`, `processing_status`
- `rule_results`
  - Rule evaluations per claim with `rule_id`, `is_violated`, `action_required`
- `carrier_submissions`
  - Carrier submission payload + submission status/audit fields
- `audit_logs`
  - Operational actions recorded per claim
- `policies`
  - Policy master data used by rules (status/date checks)

## Rule Engine Implementation
Backend class:
- `Backend/src/main/java/com/tpa/claims/rules/RuleEngineServiceImpl.java`

Rule results:
- Stored per claim in `rule_results`.
- `action_required` is one of `REJECT`, `MANUAL_REVIEW`, `NONE`.

## Confidence Scoring Implementation
Python module:
- `Python-Service/extractor.py`

Score range: 0.00 to 1.00 (rounded to 2 decimals). Major components:
- OCR success rate (25%)
- Presence of key fields from claim form (25%)
- Presence of key fields from combined doc (25%)
- Pattern/consistency checks (25%)

Backend gating:
- confidence > 0.90 -> Approved
- 0.60 to 0.90 -> Manual Review
- < 0.60 -> Rejected

## Carrier Submission Payload (Project Format)
Backend class:
- `Backend/src/main/java/com/tpa/claims/carrier/CarrierSubmissionServiceImpl.java`

Payload is JSON with:
- `claim_metadata`
- `extracted_fields`
- `tpa_recommendation`
- `documents` (URLs to `.../documents/{id}/content`)

## UI Overview
- Upload page:
  - Enforces two documents.
  - Shows extraction preview (document preview + editable table/JSON).
  - Confirm triggers rule engine decisioning.
- Dashboard:
  - Shows claims list with actions: view, export PDF, submit to carrier.
  - Checkbox selection bar enables bulk export and single-record view/submit.
- Claim detail modal:
  - Overview, extracted JSON/table, documents preview, rules/audit context.
  - Manual review actions (approve/reject) when applicable.
  - Submit to carrier action when claim is Approved.

## Troubleshooting Notes
- PDF preview blank:
  - Ensure the backend preview endpoint returns `Content-Disposition: inline` and correct `Content-Type`.
  - Browser may block PDF embedding; "Open Full" should still work.
- Extraction service cannot read PDFs in Docker:
  - Verify `backend_storage` volume is mounted read-only into Python service at `/data/storage`.
- Claims always go to Manual Review:
  - Check which rule IDs are triggered and whether extracted fields (names/dates/amounts) need manual correction before confirm.

