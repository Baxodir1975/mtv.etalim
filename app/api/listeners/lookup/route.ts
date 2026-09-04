import {
  getDatabase,
  jsonResponse,
  logServerError,
  publicError,
} from '@/lib/server-data';

export const dynamic = 'force-dynamic';

const lookupWindows = new Map<string, { count: number; resetAt: number }>();

function canLookup(request: Request) {
  const key =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const now = Date.now();
  const current = lookupWindows.get(key);
  if (!current || current.resetAt <= now) {
    lookupWindows.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= 30;
}

export async function POST(request: Request) {
  if (!canLookup(request)) {
    return publicError('Juda ko‘p qidiruv qilindi. 10 daqiqadan keyin urinib ko‘ring.', 429);
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > 2048) {
    return publicError('Qidiruv so‘rovi juda katta.', 413);
  }
  let input: { phone?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return publicError('Telefon raqami noto‘g‘ri yuborildi.', 400);
  }
  const digits =
    typeof input.phone === 'string' ? input.phone.replace(/\D/g, '') : '';
  const phone =
    digits.length === 12 && digits.startsWith('998') ? digits.slice(3) : digits;
  if (!/^\d{9}$/.test(phone)) {
    return publicError('Telefon raqamini 9 ta raqamda kiriting.', 400);
  }
  try {
    const sql = getDatabase();
    const rows = await sql`
      SELECT group_name
      FROM listeners
      WHERE phone_digits = ${phone}
      LIMIT 1
    `;
    const group = typeof rows[0]?.group_name === 'string' ? rows[0].group_name : '';
    return jsonResponse(group ? { found: true, group } : { found: false });
  } catch (error) {
    logServerError('[api/listeners/lookup] Unable to lookup listener group', error);
    return publicError('Guruhni aniqlab bo‘lmadi. Qayta urinib ko‘ring.', 503);
  }
}
