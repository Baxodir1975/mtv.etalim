import { authenticatedAdmin } from '@/lib/auth';
import {
  getDatabase,
  hasPermission,
  jsonResponse,
  listenerFromDb,
  logServerError,
  publicError,
  type ListenerDbRow,
} from '@/lib/server-data';
import { hasSameOrigin } from '@/lib/security';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

async function authorizedMember(request: Request) {
  const member = await authenticatedAdmin(request);
  return hasPermission(member, 'Tinglovchilar:O‘chirish') ? member : null;
}

async function listenerId(context: RouteContext) {
  const { id } = await context.params;
  return decodeURIComponent(id || '').trim();
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!hasSameOrigin(request)) {
    return publicError('So‘rov manbasi tasdiqlanmadi.', 403);
  }
  const member = await authorizedMember(request);
  if (!member) {
    return publicError('Tinglovchini o‘chirish uchun ruxsat yo‘q.', 403);
  }

  const id = await listenerId(context);
  if (!id || id.length > 100) {
    return publicError('Tinglovchi identifikatori noto‘g‘ri.', 400);
  }

  try {
    const sql = getDatabase();
    const rows = await sql`
      WITH changed AS (
        UPDATE listeners
        SET deleted_at = NOW(), deleted_by = ${member.email}, updated_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
        RETURNING id
      ), logged AS (
        INSERT INTO admin_audit_log (
          actor_email, action, entity_type, entity_id, details
        )
        SELECT ${member.email}, 'listener.soft_delete', 'listener', id,
               '{"recoverable":true}'::JSONB
        FROM changed
        RETURNING id
      )
      SELECT id FROM changed
    `;
    if (!rows.length) {
      return publicError('Tinglovchi topilmadi.', 404);
    }
    return jsonResponse({ deleted: true, recoverable: true, id });
  } catch (error) {
    logServerError('[api/admin/listeners] Unable to archive listener', error);
    return publicError('Tinglovchini o‘chirib bo‘lmadi.', 503);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!hasSameOrigin(request)) {
    return publicError('So‘rov manbasi tasdiqlanmadi.', 403);
  }
  const member = await authorizedMember(request);
  if (!member || !hasPermission(member, 'Tinglovchilar:Ko‘rish')) {
    return publicError('Tinglovchini tiklash uchun ruxsat yo‘q.', 403);
  }
  const id = await listenerId(context);
  if (!id || id.length > 100) {
    return publicError('Tinglovchi identifikatori noto‘g‘ri.', 400);
  }
  try {
    const sql = getDatabase();
    const rows = await sql`
      WITH changed AS (
        UPDATE listeners
        SET deleted_at = NULL, deleted_by = '', updated_at = NOW()
        WHERE id = ${id} AND deleted_at IS NOT NULL
        RETURNING
          id, phone_digits, start_date, training_year, category, group_name,
          initials, surname, first_name, patronymic, full_name, workplace,
          region, district, position, birth_date, note, registration_status,
          photo_url, order_file_url, passport_front_url, passport_back_url,
          created_at, updated_at
      ), logged AS (
        INSERT INTO admin_audit_log (
          actor_email, action, entity_type, entity_id, details
        )
        SELECT ${member.email}, 'listener.restore', 'listener', id, '{}'::JSONB
        FROM changed
        RETURNING id
      )
      SELECT * FROM changed
    `;
    const row = rows[0] as ListenerDbRow | undefined;
    if (!row) return publicError('Tiklanadigan tinglovchi topilmadi.', 404);
    return jsonResponse({ restored: true, listener: listenerFromDb(row) });
  } catch (error) {
    logServerError('[api/admin/listeners] Unable to restore listener', error);
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';
    if (errorCode === '23505') {
      return publicError(
        'Bu telefon raqami bilan faol tinglovchi bor. Avval takroriy yozuvni tekshiring.',
        409,
      );
    }
    return publicError('Tinglovchini tiklab bo‘lmadi.', 503);
  }
}
