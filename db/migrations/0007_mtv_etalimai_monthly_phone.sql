-- mtv-etalimai: one active registration per phone and start-date year/month.
-- No listener rows or files are changed. If historical duplicates exist,
-- unique-index creation fails and the entire migration rolls back.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
CREATE UNIQUE INDEX IF NOT EXISTS listeners_active_month_phone_uidx
  ON listeners (phone_digits,
    (COALESCE(EXTRACT(YEAR FROM start_date), 0)),
    (COALESCE(EXTRACT(MONTH FROM start_date), 0)))
  WHERE deleted_at IS NULL;
DROP INDEX IF EXISTS listeners_active_cohort_phone_uidx;
COMMIT;
