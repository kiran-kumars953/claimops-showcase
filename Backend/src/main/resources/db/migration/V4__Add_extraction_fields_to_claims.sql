ALTER TABLE claims
    ADD COLUMN extracted_data_json LONGTEXT NULL,
    ADD COLUMN extraction_confidence DECIMAL(5,2) NULL;
