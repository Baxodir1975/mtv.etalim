import { authenticatedAdmin } from '@/lib/auth';
import {
  getDatabase,
  hasPermission,
  jsonResponse,
  logServerError,
  normalizeListenerSources,
  publicError,
} from '@/lib/server-data';
import { hasSameOrigin, safeText, validTelegramUrl } from '@/lib/security';

export const dynamic = 'force-dynamic';

type SettingsInput = {
  telegramGroupUrl?: unknown;
  sources?: unknown;
};

export async function PUT(request: Request) {
  if (!hasSameOrigin(request)) {
    return publicError('So‘rov manbasi tasdiqlanmadi.', 403);
  }
  const member = await authenticatedAdmin(request);
  if (!member || !hasPermission(member, 'Manbalar:Tahrirlash')) {
    return publicError('Manbalarni tahrirlash uchun ruxsat yo‘q.', 403);
  }

  let input: SettingsInput;
  try {
    input = (await request.json()) as SettingsInput;
  } catch {
    return publicError('Sozlamalar noto‘g‘ri yuborildi.', 400);
  }

  const updates: Array<'telegram' | 'sources'> = [];
  const telegramGroupUrl = safeText(input.telegramGroupUrl, 500);
  const sources =
    input.sources === undefined
      ? null
      : normalizeListenerSources(input.sources);

  if (input.telegramGroupUrl !== undefined) {
    if (!telegramGroupUrl || !validTelegramUrl(telegramGroupUrl)) {
      return publicError(
        'Telegram guruhi uchun haqiqiy https://t.me/ havolasini kiriting.',
        400,
      );
    }
    updates.push('telegram');
  }
  if (sources) updates.push('sources');
  if (!updates.length) {
    return publicError('Saqlanadigan sozlama topilmadi.', 400);
  }

  try {
    const sql = getDatabase();
    const statements = [];
    if (updates.includes('telegram')) {
      statements.push(sql`
        INSERT INTO app_settings (setting_key, setting_value, updated_at)
        VALUES ('telegram_group_url', ${JSON.stringify(telegramGroupUrl)}::JSONB, NOW())
        ON CONFLICT (setting_key) DO UPDATE SET
          setting_value = EXCLUDED.setting_value,
          updated_at = NOW()
      `);
    }
    if (sources) {
      statements.push(sql`
        INSERT INTO app_settings (setting_key, setting_value, updated_at)
        VALUES ('listener_sources', ${JSON.stringify(sources)}::JSONB, NOW())
        ON CONFLICT (setting_key) DO UPDATE SET
          setting_value = EXCLUDED.setting_value,
          updated_at = NOW()
      `);
    }
    statements.push(sql`
      INSERT INTO admin_audit_log (
        actor_email, action, entity_type, entity_id, details
      ) VALUES (
        ${member.email}, 'settings.update', 'app_settings', 'mtv-etalimai',
        ${JSON.stringify({ updates })}::JSONB
      )
    `);
    await sql.transaction(statements);
    return jsonResponse({
      saved: true,
      telegramGroupUrl: updates.includes('telegram')
        ? telegramGroupUrl
        : undefined,
      sources: sources ?? undefined,
    });
  } catch (error) {
    logServerError('[api/admin/settings] Unable to save settings', error);
    return publicError(
      'Sozlamalarni ma’lumotlar bazasiga saqlab bo‘lmadi.',
      503,
    );
  }
}
