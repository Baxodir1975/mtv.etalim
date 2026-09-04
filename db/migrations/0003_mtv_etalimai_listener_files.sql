-- R2 is not enabled on the current Cloudflare account. Keep listener uploads
-- durable in Neon while exposing only the explicitly public photo/order routes.
CREATE TABLE IF NOT EXISTS listener_files (
  listener_id TEXT NOT NULL REFERENCES listeners(id) ON DELETE CASCADE,
  file_kind TEXT NOT NULL CHECK (
    file_kind IN ('photo', 'order', 'passportFront', 'passportBack')
  ),
  original_name TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size >= 0),
  file_bytes BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (listener_id, file_kind)
);

CREATE INDEX IF NOT EXISTS listener_files_listener_id_idx
  ON listener_files (listener_id);
