import {
  cloudflareAccessAdmin,
  headAdminPermissions,
  jsonResponse,
} from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const admin = cloudflareAccessAdmin(request);

  // This endpoint is deployed behind a Cloudflare Access application.  Both
  // the verified identity header and the Access assertion must be present;
  // client-provided query strings/cookies are deliberately not accepted.
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
      name: admin.fullName,
      role: 'Bosh admin',
      permissions: headAdminPermissions,
    },
  });
}
