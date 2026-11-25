# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-11-25

### Added
- Unified TPA + carrier portal (React, TypeScript, MUI) with role-based routes.
- Spring Boot API: claim lifecycle, 10-rule policy engine, carrier hand-off, audit trail, PDF export.
- FastAPI extraction service: OCR (pdfplumber, Tesseract), LLM structuring, regex fallback, confidence score.
- Pytest suite for the extraction service; GitHub Actions CI for all three services.
- README with architecture diagrams, setup and roadmap; contributing, security and conduct docs.

### Fixed
- Restored the missing `storage` package (`StorageService`) that the old `.gitignore` rule `storage/` had excluded, so the backend compiles; added path-traversal checks and JUnit tests.

### Changed
- All credentials now come from environment variables (`.env.example`).
- Removed two superseded frontends; `frontend-tpa/` is the single portal.
