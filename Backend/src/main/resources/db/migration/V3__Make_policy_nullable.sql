-- V3__Make_policy_nullable.sql
ALTER TABLE claims MODIFY COLUMN policy_id BIGINT NULL;
