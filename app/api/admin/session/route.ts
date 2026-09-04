import { jsonResponse } from '@/lib/server-data';
import { authenticatedAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const admin = await authenticatedAdmin(request);

  if (!admin) {
    return jsonResponse(
      { authenticated: false, error: 'Bosh admin sessiyasi tasdiqlanmadi.' },
      401,
    );
  }

  return jsonResponse({
    authenticated: true,
    viewer: {
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions: admin.permissions,
    },
  });
}
