-- mtv-etalimai: a phone is contact data, not a lifetime registration identity.
-- Preserve all rows and files. Reject duplicates only within one cohort.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
CREATE UNIQUE INDEX IF NOT EXISTS listeners_active_cohort_phone_uidx
  ON listeners (phone_digits, training_year, category, group_name,
    (COALESCE(EXTRACT(MONTH FROM start_date), 0)))
  WHERE deleted_at IS NULL;
DROP INDEX IF EXISTS listeners_active_phone_digits_uidx;
ALTER TABLE listeners DROP CONSTRAINT IF EXISTS listeners_phone_digits_key;
COMMIT;
