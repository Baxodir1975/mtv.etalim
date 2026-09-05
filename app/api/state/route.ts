import {
  authenticatedAdmin,
  deviceBinding,
  groupViewBinding,
} from '@/lib/auth';
import {
  defaultListenerSources,
  getDatabase,
  hasPermission,
  jsonResponse,
  listenerFromDb,
  logServerError,
  normalizeListenerSources,
  publicError,
  publicListenerFromDb,
  roleFromDb,
  type ListenerDbRow,
  type RoleDbRow,
} from '@/lib/server-data';

export const dynamic = 'force-dynamic';

const listenerColumns = `
  id, phone_digits, start_date, training_year, category, group_name,
  initials, surname, first_name, patronymic, full_name, workplace,
  region, district, position, birth_date, note, registration_status,
  photo_url, order_file_url, passport_front_url, passport_back_url,
  created_at, updated_at
`;

function settingValue(rows: Record<string, unknown>[], key: string) {
  return rows.find((row) => row.setting_key === key)?.setting_value;
}

function telegramUrl(value: unknown) {
  if (typeof value === 'string') return value;
  if (
    value &&
    typeof value === 'object' &&
    'url' in value &&
    typeof (value as { url?: unknown }).url === 'string'
  ) {
    return (value as { url: string }).url;
  }
  return 'https://t.me/+HQ9koTozY_gxMGRi';
}

export async function GET(request: Request) {
  try {
    const [member, device, groupView] = await Promise.all([
      authenticatedAdmin(request),
      deviceBinding(request),
      groupViewBinding(request),
    ]);
    const sql = getDatabase();
    const canViewAll = hasPermission(member, 'Tinglovchilar:Ko‘rish');
    const canViewRoles = hasPermission(member, 'Rollar va ruxsatlar:Ko‘rish');

    const [settingRows, roleRows] = await Promise.all([
      sql`
        SELECT setting_key, setting_value
        FROM app_settings
        WHERE setting_key IN ('telegram_group_url', 'listener_sources')
      `,
      canViewRoles
        ? sql`
            SELECT id, full_name, email, role_name, is_active, is_locked, permissions
            FROM role_members
            ORDER BY is_locked DESC, created_at ASC
          `
        : Promise.resolve([]),
    ]);

    let listenerRows: Record<string, unknown>[] = [];
    let scope: {
      kind: 'anonymous' | 'staff' | 'device' | 'group';
      group: string;
      year: string;
      month: string;
      canViewAll: boolean;
    } = {
      kind: 'anonymous',
      group: '',
      year: '',
      month: '',
      canViewAll: false,
    };

    if (canViewAll) {
      listenerRows = await sql.query(
        `SELECT ${listenerColumns}
         FROM listeners
         WHERE deleted_at IS NULL
         ORDER BY created_at ASC
         LIMIT 1000`,
        [],
      );
      scope = {
        kind: 'staff',
        group: '',
        year: '',
        month: '',
        canViewAll: true,
      };
    } else if (device) {
      const ownerRows = await sql`
        SELECT group_name, training_year,
               COALESCE(TO_CHAR(start_date, 'MM'), '') AS training_month
        FROM listeners
        WHERE id = ${device.listenerId} AND deleted_at IS NULL
        LIMIT 1
      `;
      const owner = ownerRows[0];
      if (owner) {
        const group = String(owner.group_name || '');
        const year = String(owner.training_year || '');
        const month = String(owner.training_month || '');
        listenerRows = await sql.query(
          `SELECT ${listenerColumns}
           FROM listeners
           WHERE deleted_at IS NULL
             AND group_name = $1
             AND training_year = $2
             AND COALESCE(TO_CHAR(start_date, 'MM'), '') = $3
           ORDER BY created_at ASC
           LIMIT 250`,
          [group, year, month],
        );
        scope = { kind: 'device', group, year, month, canViewAll: false };
      }
    } else if (groupView) {
      const group = groupView.group;
      const year = groupView.year;
      const month = groupView.month;
      listenerRows = await sql.query(
        `SELECT ${listenerColumns}
         FROM listeners
         WHERE deleted_at IS NULL
           AND group_name = $1
           AND training_year = $2
           AND COALESCE(TO_CHAR(start_date, 'MM'), '') = $3
         ORDER BY created_at ASC
         LIMIT 250`,
        [group, year, month],
      );
      scope = { kind: 'group', group, year, month, canViewAll: false };
    }

    const settings = settingRows as Record<string, unknown>[];
    const sourceValue = settingValue(settings, 'listener_sources');
    const sources = sourceValue
      ? normalizeListenerSources(sourceValue)
      : defaultListenerSources();

    return jsonResponse({
      listeners: (listenerRows as ListenerDbRow[]).map((row) =>
        canViewAll || device?.listenerId === row.id
          ? listenerFromDb(row)
          : publicListenerFromDb(row),
      ),
      roles: canViewRoles ? (roleRows as RoleDbRow[]).map(roleFromDb) : [],
      telegramGroupUrl: telegramUrl(
        settingValue(settings, 'telegram_group_url'),
      ),
      sources,
      scope,
    });
  } catch (error) {
    logServerError('[api/state] Unable to load persisted state', error);
    return publicError(
      'Ma’lumotlar bazasi bilan aloqa o‘rnatilmadi. Birozdan keyin qayta urinib ko‘ring.',
      503,
    );
  }
}
