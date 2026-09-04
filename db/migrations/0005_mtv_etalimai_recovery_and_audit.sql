-- mtv-etalimai: recoverable deletion and an immutable administrative audit trail.
BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE listeners
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT NOT NULL DEFAULT '';

ALTER TABLE listeners
  DROP CONSTRAINT IF EXISTS listeners_phone_digits_key;

CREATE UNIQUE INDEX IF NOT EXISTS listeners_active_phone_digits_uidx
  ON listeners (phone_digits)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS listeners_active_cohort_idx
  ON listeners (group_name, training_year, start_date)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx
  ON admin_audit_log (created_at DESC);

COMMIT;
