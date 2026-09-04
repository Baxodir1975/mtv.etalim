import {
  cloudflareAccessAdmin,
  getDatabase,
  jsonResponse,
  logServerError,
  publicError,
} from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!cloudflareAccessAdmin(request)) {
    return publicError('Faqat Bosh admin tinglovchini o‘chira oladi.', 403);
  }

  const { id } = await params;
  const listenerId = decodeURIComponent(id || '').trim();
  if (!listenerId || listenerId.length > 100) {
    return publicError('Tinglovchi identifikatori noto‘g‘ri.', 400);
  }

  try {
    const sql = getDatabase();
    const deleted = await sql`
      DELETE FROM listeners
      WHERE id = ${listenerId}
      RETURNING id
    `;
    if (!deleted.length) {
      return publicError('Tinglovchi topilmadi.', 404);
    }
    return jsonResponse({ deleted: true, id: listenerId });
  } catch (error) {
    logServerError('[api/admin/listeners] Unable to delete listener', error);
    return publicError('Tinglovchini o‘chirib bo‘lmadi.', 503);
  }
}
