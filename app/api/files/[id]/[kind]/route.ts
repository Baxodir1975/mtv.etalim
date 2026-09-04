import { getDatabase, logServerError, publicError } from '@/lib/server-data';
import { authenticatedAdmin, deviceBinding } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string; kind: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id, kind } = await context.params;
    if (kind !== 'photo' && kind !== 'order') {
      return publicError('Fayl topilmadi.', 404);
    }
    if (kind === 'order') {
      const admin = await authenticatedAdmin(request);
      const binding = admin ? null : await deviceBinding(request);
      if (!admin && binding?.listenerId !== id) {
        return publicError('Bu hujjatni ko‘rish uchun ruxsat yo‘q.', 403);
      }
    }

    const sql = getDatabase();
    const rows = await sql`
      SELECT
        original_name,
        mime_type,
        encode(file_bytes, 'base64') AS file_base64,
        md5(file_bytes) AS file_hash
      FROM listener_files
      WHERE listener_id = ${id} AND file_kind = ${kind}
      LIMIT 1
    `;
    const file = rows[0];
    if (!file?.file_base64) return publicError('Fayl topilmadi.', 404);

    const binary = atob(String(file.file_base64));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const headers = new Headers();
    headers.set('content-type', String(file.mime_type || 'application/octet-stream'));
    headers.set('content-length', String(bytes.byteLength));
    headers.set('etag', `"${String(file.file_hash || '')}"`);
    headers.set('x-content-type-options', 'nosniff');
    headers.set('cache-control', 'private, max-age=300');
    const originalName = String(file.original_name || kind);
    headers.set(
      'content-disposition',
      `inline; filename="${originalName.replace(/["\\\r\n]/g, '_')}"`,
    );
    return new Response(bytes, { headers });
  } catch (error) {
    logServerError('[api/files] Unable to load file', error);
    return publicError('Faylni ochib bo‘lmadi.', 503);
  }
}
