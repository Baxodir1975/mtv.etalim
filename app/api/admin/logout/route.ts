import { clearAdminSessionCookie } from '@/lib/auth';
import { jsonResponse } from '@/lib/server-data';
import { hasSameOrigin } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return jsonResponse({ error: 'So‘rov manbasi tasdiqlanmadi.' }, 403);
  }
  const response = jsonResponse({ authenticated: false });
  response.headers.append('Set-Cookie', clearAdminSessionCookie());
  return response;
}
