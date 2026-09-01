-- MTV E-ta'lim: shared listener directory and role registry.
-- Files are stored outside Postgres; the *_url columns hold their secure URLs.

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listeners (
  id TEXT PRIMARY KEY,
  phone_digits VARCHAR(12) NOT NULL UNIQUE,
  start_date DATE,
  training_year VARCHAR(4) NOT NULL DEFAULT '2026',
  category TEXT NOT NULL DEFAULT 'Nomzod direktor',
  group_name TEXT NOT NULL,
  initials TEXT NOT NULL DEFAULT '',
  surname TEXT NOT NULL DEFAULT '',
  first_name TEXT NOT NULL DEFAULT '',
  patronymic TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  workplace TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  birth_date DATE,
  note TEXT NOT NULL DEFAULT '',
  registration_status TEXT NOT NULL DEFAULT 'Töldirilmagan',
  photo_url TEXT NOT NULL DEFAULT '',
  order_file_url TEXT NOT NULL DEFAULT '',
  passport_front_url TEXT NOT NULL DEFAULT '',
  passport_back_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listeners_group_name_idx ON listeners (group_name);
CREATE INDEX IF NOT EXISTS listeners_region_district_idx ON listeners (region, district);

CREATE TABLE IF NOT EXISTS role_members (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role_name TEXT NOT NULL CHECK (role_name IN ('Bosh admin', 'Admin', 'Foydalanuvchi', 'Ko‘ruvchi')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  permissions JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO role_members (
  id, full_name, email, role_name, is_active, is_locked, permissions
) VALUES (
  'super-admin-ilxomovb2023',
  'Islom',
  'ilxomovb2023@gmail.com',
  'Bosh admin',
  TRUE,
  TRUE,
  '["Tinglovchilar:Ko\u2018rish", "Tinglovchilar:Kiritish", "Tinglovchilar:Tahrirlash", "Tinglovchilar:O\u2018chirish", "Tinglovchi formasi:Ko\u2018rish", "Tinglovchi formasi:Kiritish", "Tinglovchi formasi:Tahrirlash", "Tinglovchi formasi:O\u2018chirish", "Shartlar:Ko\u2018rish", "Shartlar:Kiritish", "Shartlar:Tahrirlash", "Shartlar:O\u2018chirish", "Manbalar:Ko\u2018rish", "Manbalar:Kiritish", "Manbalar:Tahrirlash", "Manbalar:O\u2018chirish", "Rollar va ruxsatlar:Ko\u2018rish", "Rollar va ruxsatlar:Kiritish", "Rollar va ruxsatlar:Tahrirlash", "Rollar va ruxsatlar:O\u2018chirish"]'::JSONB
)
ON CONFLICT (email) DO UPDATE SET
  role_name = EXCLUDED.role_name,
  is_active = TRUE,
  is_locked = TRUE,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();
