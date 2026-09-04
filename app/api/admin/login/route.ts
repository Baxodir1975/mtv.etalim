import { adminFromCredentials, adminSessionCookie } from '@/lib/auth';
import {
  headAdminPermissions,
  jsonResponse,
  logServerError,
  publicError,
} from '@/lib/server-data';

export const dynamic = 'force-dynamic';

const loginWindows = new Map<string, { count: number; resetAt: number }>();

function canAttemptLogin(request: Request) {
  const key =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const now = Date.now();
  const current = loginWindows.get(key);
  if (!current || current.resetAt <= now) {
    loginWindows.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= 10;
}

export async function POST(request: Request) {
  if (!canAttemptLogin(request)) {
    return publicError('Juda ko‘p kirish urinishi. 10 daqiqadan keyin qayta urinib ko‘ring.', 429);
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > 4096) {
    return publicError('Kirish so‘rovi juda katta.', 413);
  }
  let input: { email?: unknown; password?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return publicError('Kirish ma’lumotlari noto‘g‘ri yuborildi.', 400);
  }
  const email = typeof input.email === 'string' ? input.email.slice(0, 254) : '';
  const password =
    typeof input.password === 'string' ? input.password.slice(0, 256) : '';
  const admin = await adminFromCredentials(email, password);
  if (!admin) {
    return publicError('E-mail yoki maxfiy parol noto‘g‘ri.', 401);
  }
  loginWindows.delete(
    request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown',
  );
  try {
    const response = jsonResponse({
      authenticated: true,
      viewer: {
        email: admin.email,
        name: admin.fullName,
        role: 'Bosh admin',
        permissions: headAdminPermissions,
      },
    });
    response.headers.append('Set-Cookie', await adminSessionCookie(admin.email));
    return response;
  } catch (error) {
    logServerError('[api/admin/login] Unable to create session', error);
    return publicError('Bosh admin kirishi vaqtincha ishlamayapti.', 503);
  }
}
