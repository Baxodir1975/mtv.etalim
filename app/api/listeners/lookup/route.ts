import { authenticatedAdmin, deviceBinding } from '@/lib/auth';
import {
  getDatabase,
  hasPermission,
  jsonResponse,
  listenerFromDb,
  logServerError,
  publicError,
  publicListenerFromDb,
  type ListenerDbRow,
} from '@/lib/server-data';
import { hasSameOrigin, rateLimit, safeText } from '@/lib/security';

export const dynamic = 'force-dynamic';

type LookupInput = {
  phone?: unknown;
  group?: unknown;
  year?: unknown;
  month?: unknown;
  startDate?: unknown;
};

function phoneDigits(value: unknown) {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (digits.length === 12 && digits.startsWith('998')) return digits.slice(3);
  return digits;
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return publicError('Qidiruv so‘rovi manbasi tasdiqlanmadi.', 403);
  }
  if (!(await rateLimit(request, 'listener-lookup'))) {
    return publicError(
      'Juda ko‘p qidiruv qilindi. Bir daqiqadan keyin urinib ko‘ring.',
      429,
    );
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > 4096) {
    return publicError('Qidiruv so‘rovi juda katta.', 413);
  }

  let input: LookupInput;
  try {
    input = (await request.json()) as LookupInput;
  } catch {
    return publicError('Qidiruv ma’lumotлари noto‘g‘ri yuborildi.', 400);
  }

  try {
    const [member, device] = await Promise.all([
      authenticatedAdmin(request),
      deviceBinding(request),
    ]);
    const canViewAll = hasPermission(member, 'Tinglovchilar:Ko‘rish');
    if (!canViewAll && !device) {
      return publicError(
        'Guruh kartochkalari faqat shu qurilmadan ro‘yxatdan o‘tgandan keyin ochiladi.',
        403,
      );
    }
    const sql = getDatabase();
    const phone = phoneDigits(input.phone);
    let group = safeText(input.group, 100);
    let year = safeText(input.year, 4);
    let month = safeText(input.month, 2);
    const startDate = safeText(input.startDate, 10);
    if (!month && /^\d{4}-(\d{2})-\d{2}$/.test(startDate)) {
      month = startDate.slice(5, 7);
    }

    if (!canViewAll && (device || phone)) {
      if (!device && !/^\d{9}$/.test(phone)) {
        return publicError(
          'Guruhni ko‘rish uchun ro‘yxatdan o‘tgan telefon raqamini kiriting.',
          400,
        );
      }
      const sourceRows = device
        ? await sql`
            SELECT id, group_name, training_year,
                   COALESCE(TO_CHAR(start_date, 'MM'), '') AS training_month
            FROM listeners
            WHERE id = ${device.listenerId} AND deleted_at IS NULL
            LIMIT 1
          `
        : await sql`
            SELECT id, group_name, training_year,
                   COALESCE(TO_CHAR(start_date, 'MM'), '') AS training_month
            FROM listeners
            WHERE phone_digits = ${phone} AND deleted_at IS NULL
            LIMIT 1
          `;
      const source = sourceRows[0];
      if (!source) return jsonResponse({ found: false, listeners: [] });
      group = String(source.group_name || '');
      year = String(source.training_year || '');
      month = String(source.training_month || '');
    }

    if (!group || !/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) {
      return publicError('Guruh, yil va oy to‘liq tanlanmagan.', 400);
    }

    const rows = await sql`
      SELECT
        id, phone_digits, start_date, training_year, category, group_name,
        initials, surname, first_name, patronymic, full_name, workplace,
        region, district, position, birth_date, note, registration_status,
        photo_url, order_file_url, passport_front_url, passport_back_url,
        created_at, updated_at
      FROM listeners
      WHERE deleted_at IS NULL
        AND group_name = ${group}
        AND training_year = ${year}
        AND COALESCE(TO_CHAR(start_date, 'MM'), '') = ${month}
      ORDER BY created_at ASC
      LIMIT 250
    `;

    const listeners = (rows as ListenerDbRow[]).map((row) =>
      canViewAll || device?.listenerId === row.id
        ? listenerFromDb(row)
        : publicListenerFromDb(row),
    );
    const response = jsonResponse({
      found: true,
      group,
      cohort: { group, year, month },
      listeners,
      ownerListenerId: device?.listenerId || '',
    });
    return response;
  } catch (error) {
    logServerError(
      '[api/listeners/lookup] Unable to lookup listener group',
      error,
    );
    return publicError('Guruhni aniqlab bo‘lmadi. Qayta urinib ko‘ring.', 503);
  }
}
