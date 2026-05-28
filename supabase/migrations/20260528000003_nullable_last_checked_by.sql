-- last_checked_by was incorrectly declared NOT NULL while the FK uses ON DELETE SET NULL.
-- Seed data and historical checks may also have no associated user. Make the column nullable.
ALTER TABLE water_quality_checks
  ALTER COLUMN last_checked_by DROP NOT NULL;
