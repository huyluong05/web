-- REVIEW ONLY. DO NOT RUN ON AIVEN WITHOUT APPROVAL AND A VERIFIED BACKUP.
-- Preflight: SELECT DATABASE(), VERSION(), @@session.time_zone;
-- SHOW CREATE TABLE health_records; SHOW CREATE TABLE reminders;
-- Compare with schema.sql (root). The legacy database/schema.sql is NOT a migration.
-- DDL auto-commits in MySQL. Run each section once; verify information_schema first.
-- No existing rows are removed and no existing metric values are changed.
ALTER TABLE health_records
  MODIFY COLUMN weight DECIMAL(5,2) NULL,
  MODIFY COLUMN systolic INT NULL,
  MODIFY COLUMN diastolic INT NULL,
  MODIFY COLUMN heart_rate INT NULL,
  ADD COLUMN updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

-- updated_at remains NULL for pre-existing records: their edit time is unknown.
-- Both schemas use the same four supported reminder kinds after this expansion.
ALTER TABLE reminders
  MODIFY COLUMN type ENUM('water','exercise','medication','measurement') NULL DEFAULT 'water',
  ADD COLUMN timezone VARCHAR(64) NULL,
  ADD COLUMN repeat_days JSON NULL,
  ADD COLUMN completed_dates JSON NULL;

ALTER TABLE system_settings ADD COLUMN settings_json JSON NULL;

-- timezone NULL means browser local zone; repeat_days NULL means every day.
-- Weekdays: 0 Sunday .. 6 Saturday. completed_dates holds local YYYY-MM-DD occurrences.
-- Rollback: keep these additive fields, revert app source; DO NOT DROP fields or
-- restore NOT NULL until all partial records have a reviewed reconciliation plan.
