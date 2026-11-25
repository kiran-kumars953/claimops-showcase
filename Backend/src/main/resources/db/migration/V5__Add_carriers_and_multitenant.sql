-- V5__Add_carriers_and_multitenant.sql
-- Introduce carriers + carrier isolation for claims/users.

CREATE TABLE IF NOT EXISTS carriers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    carrier_code VARCHAR(50) NOT NULL UNIQUE,
    carrier_name VARCHAR(150) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_carrier_code (carrier_code),
    INDEX idx_carrier_name (carrier_name),
    INDEX idx_carrier_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expand users.role to support enterprise roles.
ALTER TABLE users
    MODIFY COLUMN role ENUM('ADMIN','AGENT','SUPERVISOR','CARRIER','AUDITOR','VIEWER') NOT NULL DEFAULT 'VIEWER';

-- Add carrier binding to users (only used for CARRIER users).
ALTER TABLE users
    ADD COLUMN carrier_id BIGINT NULL,
    ADD INDEX idx_user_carrier_id (carrier_id),
    ADD CONSTRAINT fk_user_carrier FOREIGN KEY (carrier_id) REFERENCES carriers(id);

-- Add carrier binding to claims for isolation.
ALTER TABLE claims
    ADD COLUMN carrier_id BIGINT NULL,
    ADD INDEX idx_claim_carrier_id (carrier_id),
    ADD CONSTRAINT fk_claim_carrier FOREIGN KEY (carrier_id) REFERENCES carriers(id);

