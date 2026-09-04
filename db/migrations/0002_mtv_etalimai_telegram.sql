-- Persist the official MTV E-ta'lim Telegram group for every device.
INSERT INTO app_settings (setting_key, setting_value)
VALUES (
  'telegram_group_url',
  '{"url":"https://t.me/+HQ9koTozY_gxMGRi"}'::JSONB
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();
