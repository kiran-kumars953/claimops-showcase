-- Add carrier decision reason for auditability and UI display.
ALTER TABLE claims
    ADD COLUMN carrier_decision_reason VARCHAR(255) NULL AFTER carrier_decision_date;

