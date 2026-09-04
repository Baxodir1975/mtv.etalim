import { authenticatedAdmin } from '@/lib/auth';
import {
  getDatabase,
  hasPermission,
  jsonResponse,
  logServerError,
  publicError,
} from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const member = await authenticatedAdmin(request);
  if (!hasPermission(member, 'Rollar va ruxsatlar:Ko‘rish')) {
    return publicError('Monitoringni ko‘rish uchun ruxsat yo‘q.', 403);
  }
  try {
    const sql = getDatabase();
    const [events, deletedListeners] = await Promise.all([
      sql`
        SELECT id, actor_email, action, entity_type, entity_id, details, created_at
        FROM admin_audit_log
        ORDER BY created_at DESC
        LIMIT 100
      `,
      hasPermission(member, 'Tinglovchilar:O‘chirish')
        ? sql`
            SELECT id, full_name, group_name, training_year, deleted_at, deleted_by
            FROM listeners
            WHERE deleted_at IS NOT NULL
            ORDER BY deleted_at DESC
            LIMIT 100
          `
        : Promise.resolve([]),
    ]);
    return jsonResponse({ events, deletedListeners });
  } catch (error) {
    logServerError('[api/admin/audit] Unable to load audit log', error);
    return publicError('Monitoring ma’lumotlarini yuklab bo‘lmadi.', 503);
  }
}
