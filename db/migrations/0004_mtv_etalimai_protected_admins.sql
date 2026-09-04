-- mtv-etalimai: keep both operational accounts as protected head admins.
INSERT INTO role_members (
  id, full_name, email, role_name, is_active, is_locked, permissions
) VALUES
  (
    'super-admin-ilxomovb2023',
    'Islom',
    'ilxomovb2023@gmail.com',
    'Bosh admin',
    TRUE,
    TRUE,
    '["Tinglovchilar:Ko\u2018rish", "Tinglovchilar:Kiritish", "Tinglovchilar:Tahrirlash", "Tinglovchilar:O\u2018chirish", "Tinglovchi formasi:Ko\u2018rish", "Tinglovchi formasi:Kiritish", "Tinglovchi formasi:Tahrirlash", "Tinglovchi formasi:O\u2018chirish", "Shartlar:Ko\u2018rish", "Shartlar:Kiritish", "Shartlar:Tahrirlash", "Shartlar:O\u2018chirish", "Manbalar:Ko\u2018rish", "Manbalar:Kiritish", "Manbalar:Tahrirlash", "Manbalar:O\u2018chirish", "Rollar va ruxsatlar:Ko\u2018rish", "Rollar va ruxsatlar:Kiritish", "Rollar va ruxsatlar:Tahrirlash", "Rollar va ruxsatlar:O\u2018chirish"]'::JSONB
  ),
  (
    'super-admin-etalim-appsheet',
    'E-talim',
    'etalim@appsheet.uz',
    'Bosh admin',
    TRUE,
    TRUE,
    '["Tinglovchilar:Ko\u2018rish", "Tinglovchilar:Kiritish", "Tinglovchilar:Tahrirlash", "Tinglovchilar:O\u2018chirish", "Tinglovchi formasi:Ko\u2018rish", "Tinglovchi formasi:Kiritish", "Tinglovchi formasi:Tahrirlash", "Tinglovchi formasi:O\u2018chirish", "Shartlar:Ko\u2018rish", "Shartlar:Kiritish", "Shartlar:Tahrirlash", "Shartlar:O\u2018chirish", "Manbalar:Ko\u2018rish", "Manbalar:Kiritish", "Manbalar:Tahrirlash", "Manbalar:O\u2018chirish", "Rollar va ruxsatlar:Ko\u2018rish", "Rollar va ruxsatlar:Kiritish", "Rollar va ruxsatlar:Tahrirlash", "Rollar va ruxsatlar:O\u2018chirish"]'::JSONB
  )
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role_name = 'Bosh admin',
  is_active = TRUE,
  is_locked = TRUE,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();
