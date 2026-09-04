import { authenticatedAdmin, deviceBinding } from '@/lib/auth';
import {
  getDatabase,
  hasPermission,
  logServerError,
  publicError,
} from '@/lib/server-data';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string; kind: string }>;
};

function safeExtension(mimeType: string) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'bin';
}

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id, kind } = await context.params;
    if (!id || id.length > 100 || (kind !== 'photo' && kind !== 'order')) {
      return publicError('Fayl topilmadi.', 404);
    }

    const [member, device] = await Promise.all([
      authenticatedAdmin(request),
      deviceBinding(request),
    ]);
    const canViewAll = hasPermission(member, 'Tinglovchilar:Ko‘rish');
    const sql = getDatabase();
    const deviceListenerId = device?.listenerId || '';
    const fileRows = await sql`
      SELECT
        f.mime_type,
        encode(f.file_bytes, 'base64') AS file_base64,
        md5(f.file_bytes) AS file_hash
      FROM listener_files f
      INNER JOIN listeners l ON l.id = f.listener_id
      LEFT JOIN listeners owner
        ON owner.id = ${deviceListenerId}
       AND owner.deleted_at IS NULL
      WHERE f.listener_id = ${id}
        AND f.file_kind = ${kind}
        AND l.deleted_at IS NULL
        AND (
          ${canViewAll}
          OR (
            ${kind === 'order'}
            AND l.id = ${deviceListenerId}
          )
          OR (
            ${kind === 'photo'}
            AND owner.id IS NOT NULL
            AND owner.group_name = l.group_name
            AND owner.training_year = l.training_year
            AND COALESCE(TO_CHAR(owner.start_date, 'MM'), '') =
                COALESCE(TO_CHAR(l.start_date, 'MM'), '')
          )
        )
      LIMIT 1
    `;
    const file = fileRows[0];
    if (!file?.file_base64) return publicError('Fayl topilmadi.', 404);

    const mimeType = String(file.mime_type || '');
    if (
      !allowedMimeTypes.has(mimeType) ||
      (kind === 'photo' && !mimeType.startsWith('image/'))
    ) {
      return publicError('Fayl turi ruxsat etilmagan.', 415);
    }

    const binary = atob(String(file.file_base64));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const headers = new Headers();
    headers.set('content-type', mimeType);
    headers.set('content-length', String(bytes.byteLength));
    headers.set('etag', `"${String(file.file_hash || '')}"`);
    headers.set('x-content-type-options', 'nosniff');
    headers.set('cross-origin-resource-policy', 'same-origin');
    headers.set('cache-control', 'private, no-store');
    headers.set('vary', 'Cookie');
    headers.set(
      'content-disposition',
      `inline; filename="mtv-etalimai-${kind}.${safeExtension(mimeType)}"`,
    );
    return new Response(bytes, { headers });
  } catch (error) {
    logServerError('[api/files] Unable to load file', error);
    return publicError('Faylni ochib bo‘lmadi.', 503);
  }
}
