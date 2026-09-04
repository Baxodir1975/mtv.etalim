import { adminFromCredentials, adminSessionCookie } from '@/lib/auth';
import { jsonResponse, logServerError, publicError } from '@/lib/server-data';
import { hasSameOrigin, rateLimit } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return publicError('Kirish so‘rovi manbasi tasdiqlanmadi.', 403);
  }
  if (!(await rateLimit(request, 'admin-login'))) {
    return publicError(
      'Juda ko‘p kirish urinishi. Bir daqiqadan keyin qayta urinib ko‘ring.',
      429,
    );
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
  const email =
    typeof input.email === 'string' ? input.email.slice(0, 254) : '';
  const password =
    typeof input.password === 'string' ? input.password.slice(0, 256) : '';
  const admin = await adminFromCredentials(email, password);
  if (!admin) {
    return publicError('E-mail yoki maxfiy parol noto‘g‘ri.', 401);
  }
  try {
    const response = jsonResponse({
      authenticated: true,
      viewer: {
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
    response.headers.append(
      'Set-Cookie',
      await adminSessionCookie(admin.email),
    );
    return response;
  } catch (error) {
    logServerError('[api/admin/login] Unable to create session', error);
    return publicError('Bosh admin kirishi vaqtincha ishlamayapti.', 503);
  }
}
