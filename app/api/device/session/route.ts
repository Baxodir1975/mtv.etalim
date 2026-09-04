import {
  clearDeviceBindingCookie,
  deviceBinding,
  deviceBindingCookie,
} from '@/lib/auth';
import {
  getDatabase,
  jsonResponse,
  logServerError,
  publicError,
} from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const binding = await deviceBinding(request);
  if (!binding) return jsonResponse({ bound: false });
  try {
    const sql = getDatabase();
    const rows = await sql`
      SELECT id, group_name
      FROM listeners
      WHERE id = ${binding.listenerId} AND deleted_at IS NULL
      LIMIT 1
    `;
    if (!rows.length) {
      const response = jsonResponse({ bound: false });
      response.headers.append('Set-Cookie', clearDeviceBindingCookie());
      return response;
    }
    const currentGroup = String(rows[0].group_name || binding.group);
    const response = jsonResponse({
      bound: true,
      listenerId: binding.listenerId,
      group: currentGroup,
    });
    if (currentGroup !== binding.group) {
      response.headers.append(
        'Set-Cookie',
        await deviceBindingCookie(binding.listenerId, currentGroup),
      );
    }
    return response;
  } catch (error) {
    logServerError(
      '[api/device/session] Unable to validate device binding',
      error,
    );
    return publicError('Qurilma ma’lumotini tekshirib bo‘lmadi.', 503);
  }
}
