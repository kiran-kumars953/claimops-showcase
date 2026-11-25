-- V1__Initial_schema.sql
-- Create User table
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('ADMIN', 'AGENT', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Policy table
CREATE TABLE policies (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    policy_number VARCHAR(50) NOT NULL UNIQUE,
    policy_holder_name VARCHAR(100) NOT NULL,
    policy_holder_dob DATE NOT NULL,
    policy_type VARCHAR(50) NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
    start_date DATE NOT NULL,
    end_date DATE,
    premium_amount DECIMAL(15, 2),
    coverage_limit DECIMAL(15, 2) NOT NULL,
    deductible DECIMAL(15, 2),
    carrier_name VARCHAR(100),
    carrier_policy_ref VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_policy_number (policy_number),
    INDEX idx_status (status),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    INDEX idx_policyholder_name (policy_holder_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Claim table
CREATE TABLE claims (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    claim_id VARCHAR(50) NOT NULL UNIQUE,
    submission_id VARCHAR(50) NOT NULL UNIQUE,
    policy_id BIGINT NOT NULL,
    status ENUM('PENDING', 'PROCESSING', 'MANUAL_REVIEW', 'APPROVED', 'REJECTED', 'SUBMITTED_TO_CARRIER', 'CLOSED') NOT NULL DEFAULT 'PENDING',
    patient_name VARCHAR(100),
    patient_dob DATE,
    provider_name VARCHAR(100),
    provider_id VARCHAR(50),
    hospital_name VARCHAR(100),
    hospital_id VARCHAR(50),
    service_date DATE,
    bill_amount DECIMAL(15, 2),
    claimed_amount DECIMAL(15, 2),
    recommended_payable_amount DECIMAL(15, 2),
    non_payable_amount DECIMAL(15, 2),
    processing_notes TEXT,
    rejection_reason VARCHAR(255),
    manual_review_reason VARCHAR(255),
    carrier_reference_id VARCHAR(100),
    carrier_decision VARCHAR(50),
    carrier_decision_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_claim_policy FOREIGN KEY (policy_id) REFERENCES policies(id),
    INDEX idx_claim_id (claim_id),
    INDEX idx_submission_id (submission_id),
    INDEX idx_policy_id (policy_id),
    INDEX idx_status (status),
    INDEX idx_service_date (service_date),
    INDEX idx_created_at (created_at),
    INDEX idx_patient_name (patient_name),
    INDEX idx_provider_id (provider_id),
    INDEX idx_hospital_id (hospital_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Document table
CREATE TABLE documents (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    claim_id BIGINT NOT NULL,
    submission_id VARCHAR(50) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(64),
    file_size BIGINT,
    mime_type VARCHAR(50),
    page_count INT,
    is_image BOOLEAN DEFAULT FALSE,
    ocr_text LONGTEXT,
    extracted_json LONGTEXT,
    processing_status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    processing_error VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_document_claim FOREIGN KEY (claim_id) REFERENCES claims(id),
    INDEX idx_claim_id (claim_id),
    INDEX idx_submission_id (submission_id),
    INDEX idx_document_type (document_type),
    INDEX idx_processing_status (processing_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create RuleResult table
CREATE TABLE rule_results (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    claim_id BIGINT NOT NULL,
    rule_id VARCHAR(50) NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    is_violated BOOLEAN NOT NULL DEFAULT FALSE,
    violation_message VARCHAR(500),
    rule_data JSON,
    action_required VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_rule_claim FOREIGN KEY (claim_id) REFERENCES claims(id),
    INDEX idx_claim_id (claim_id),
    INDEX idx_rule_id (rule_id),
    INDEX idx_is_violated (is_violated),
    INDEX idx_action_required (action_required)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create AuditLog table
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    claim_id BIGINT,
    user_id BIGINT,
    action VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    previous_value LONGTEXT,
    new_value LONGTEXT,
    ip_address VARCHAR(45),
    correlation_id VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_audit_claim FOREIGN KEY (claim_id) REFERENCES claims(id),
    INDEX idx_claim_id (claim_id),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at),
    INDEX idx_correlation_id (correlation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create CarrierSubmission table
CREATE TABLE carrier_submissions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    claim_id BIGINT NOT NULL,
    carrier_name VARCHAR(100) NOT NULL,
    carrier_reference_id VARCHAR(100),
    submission_payload LONGTEXT NOT NULL,
    submission_status ENUM('PENDING', 'SUBMITTED', 'ACKNOWLEDGED', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    response_payload LONGTEXT,
    submitted_at TIMESTAMP,
    responded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_submission_claim FOREIGN KEY (claim_id) REFERENCES claims(id),
    INDEX idx_claim_id (claim_id),
    INDEX idx_carrier_name (carrier_name),
    INDEX idx_carrier_reference_id (carrier_reference_id),
    INDEX idx_submission_status (submission_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
