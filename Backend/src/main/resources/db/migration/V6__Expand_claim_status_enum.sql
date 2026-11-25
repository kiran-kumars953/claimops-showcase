-- V6__Expand_claim_status_enum.sql
-- Expand claim.status ENUM to support enterprise lifecycle while keeping legacy statuses for compatibility.

ALTER TABLE claims
    MODIFY COLUMN status ENUM(
        'PENDING',
        'PROCESSING',
        'MANUAL_REVIEW',
        'APPROVED',
        'REJECTED',
        'SUBMITTED_TO_CARRIER',
        'CLOSED',
        'DRAFT',
        'REVIEW',
        'TPA_MANUAL_REVIEW',
        'TPA_APPROVED',
        'CARRIER_PENDING',
        'CARRIER_APPROVED',
        'CARRIER_REJECTED'
    ) NOT NULL DEFAULT 'PENDING';

