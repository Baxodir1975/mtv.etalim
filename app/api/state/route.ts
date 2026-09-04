import {
  getDatabase,
  headAdminEmail,
  headAdminPermissions,
  jsonResponse,
  listenerFromDb,
  logServerError,
  publicError,
  roleFromDb,
  type ListenerDbRow,
  type RoleDbRow,
} from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDatabase();
    const permissionJson = JSON.stringify(headAdminPermissions);

    // Reassert the protected account on every bootstrap so it cannot be
    // downgraded by a stale client or an accidental database edit.
    await sql`
      INSERT INTO role_members (
        id, full_name, email, role_name, is_active, is_locked, permissions
      ) VALUES (
        'super-admin-ilxomovb2023',
        'Islom',
        ${headAdminEmail},
        'Bosh admin',
        TRUE,
        TRUE,
        CAST(${permissionJson} AS JSONB)
      )
      ON CONFLICT (email) DO UPDATE SET
        role_name = 'Bosh admin',
        is_active = TRUE,
        is_locked = TRUE,
        permissions = EXCLUDED.permissions,
        updated_at = NOW()
    `;
    await sql`
      INSERT INTO app_settings (setting_key, setting_value)
      VALUES (
        'telegram_group_url',
        CAST(${JSON.stringify({ url: 'https://t.me/+HQ9koTozY_gxMGRi' })} AS JSONB)
      )
      ON CONFLICT (setting_key) DO NOTHING
    `;

    const [listenerRows, roleRows, settingRows] = await Promise.all([
      sql`
        SELECT
          id, phone_digits, start_date, training_year, category, group_name,
          initials, surname, first_name, patronymic, full_name, workplace,
          region, district, position, birth_date, note, registration_status,
          photo_url, order_file_url, passport_front_url, passport_back_url,
          created_at, updated_at
        FROM listeners
        ORDER BY created_at ASC
      `,
      sql`
        SELECT id, full_name, email, role_name, is_active, is_locked, permissions
        FROM role_members
        ORDER BY is_locked DESC, created_at ASC
      `,
      sql`
        SELECT setting_value
        FROM app_settings
        WHERE setting_key = 'telegram_group_url'
        LIMIT 1
      `,
    ]);

    const setting = settingRows[0]?.setting_value as unknown;
    const telegramGroupUrl =
      typeof setting === 'string'
        ? setting
        : typeof setting === 'object' &&
            setting !== null &&
            'url' in setting &&
            typeof (setting as { url?: unknown }).url === 'string'
          ? (setting as { url: string }).url
          : '';

    return jsonResponse({
      listeners: (listenerRows as ListenerDbRow[]).map(listenerFromDb),
      roles: (roleRows as RoleDbRow[]).map(roleFromDb),
      telegramGroupUrl:
        telegramGroupUrl || 'https://t.me/+HQ9koTozY_gxMGRi',
    });
  } catch (error) {
    logServerError('[api/state] Unable to load persisted state', error);
    return publicError(
      'Ma’lumotlar bazasi bilan aloqa o‘rnatilmadi. Birozdan keyin qayta urinib ko‘ring.',
      503,
    );
  }
}
