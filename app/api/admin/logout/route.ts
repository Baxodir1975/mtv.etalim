import { clearAdminSessionCookie } from '@/lib/auth';
import { jsonResponse } from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = jsonResponse({ authenticated: false });
  response.headers.append('Set-Cookie', clearAdminSessionCookie());
  return response;
}
