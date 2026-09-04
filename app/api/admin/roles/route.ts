import { authenticatedAdmin } from '@/lib/auth';
import {
  getDatabase,
  hasPermission,
  headAdminPermissions,
  isProtectedHeadAdmin,
  jsonResponse,
  knownPermissions,
  logServerError,
  protectedHeadAdmins,
  publicError,
  roleFromDb,
  type AccessRole,
  type RoleDbRow,
} from '@/lib/server-data';
import { hasSameOrigin, safeText } from '@/lib/security';

export const dynamic = 'force-dynamic';

const editableRoles = new Set<AccessRole>([
  'Admin',
  'Foydalanuvchi',
  'Ko‘ruvchi',
]);

type MemberInput = {
  id?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  active?: unknown;
  permissions?: unknown;
};

function normalizeMember(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const input = value as MemberInput;
  const id = safeText(input.id, 100);
  const name = safeText(input.name, 160);
  const email = safeText(input.email, 254).toLowerCase();
  const role = safeText(input.role, 40) as AccessRole;
  const active = input.active !== false;
  const permissions = Array.isArray(input.permissions)
    ? [
        ...new Set(
          input.permissions
            .filter(
              (permission): permission is string =>
                typeof permission === 'string',
            )
            .filter((permission) => knownPermissions.has(permission)),
        ),
      ]
    : [];
  if (
    !id ||
    !name ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    isProtectedHeadAdmin(email) ||
    !editableRoles.has(role)
  ) {
    return null;
  }
  return { id, name, email, role, active, permissions };
}

export async function PUT(request: Request) {
  if (!hasSameOrigin(request)) {
    return publicError('So‘rov manbasi tasdiqlanmadi.', 403);
  }
  const member = await authenticatedAdmin(request);
  if (
    !member ||
    !isProtectedHeadAdmin(member.email) ||
    !hasPermission(member, 'Rollar va ruxsatlar:Tahrirlash')
  ) {
    return publicError('Rollarni tahrirlash uchun ruxsat yo‘q.', 403);
  }

  let payload: { members?: unknown };
  try {
    payload = (await request.json()) as { members?: unknown };
  } catch {
    return publicError('Rollar ro‘yxati noto‘g‘ri yuborildi.', 400);
  }
  if (!Array.isArray(payload.members) || payload.members.length > 100) {
    return publicError('Rollar ro‘yxati noto‘g‘ri yoki juda katta.', 400);
  }
  const editableMembers = payload.members
    .filter((item) => {
      if (!item || typeof item !== 'object') return false;
      return !isProtectedHeadAdmin(safeText((item as MemberInput).email, 254));
    })
    .map(normalizeMember);
  if (editableMembers.some((item) => !item)) {
    return publicError('Rollar ro‘yxatidagi маълумотларни текширинг.', 400);
  }
  const normalized = editableMembers.filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );
  const emails = normalized.map((item) => item.email);
  const ids = normalized.map((item) => item.id);
  if (
    new Set(emails).size !== emails.length ||
    new Set(ids).size !== ids.length
  ) {
    return publicError('E-mail yoki rol identifikatori такрорланган.', 409);
  }

  try {
    const sql = getDatabase();
    const currentRows = await sql`
      SELECT id, email
      FROM role_members
      WHERE is_locked = FALSE
    `;
    const incomingIds = new Set(ids);
    const statements = currentRows
      .filter((row) => !incomingIds.has(String(row.id)))
      .map(
        (row) =>
          sql`DELETE FROM role_members WHERE id = ${String(row.id)} AND is_locked = FALSE`,
      );

    for (const item of normalized) {
      statements.push(sql`
        INSERT INTO role_members (
          id, full_name, email, role_name, is_active, is_locked, permissions, updated_at
        ) VALUES (
          ${item.id}, ${item.name}, ${item.email}, ${item.role}, ${item.active}, FALSE,
          ${JSON.stringify(item.permissions)}::JSONB, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          role_name = EXCLUDED.role_name,
          is_active = EXCLUDED.is_active,
          is_locked = FALSE,
          permissions = EXCLUDED.permissions,
          updated_at = NOW()
        WHERE role_members.is_locked = FALSE
      `);
    }
    statements.push(sql`
      INSERT INTO admin_audit_log (
        actor_email, action, entity_type, entity_id, details
      ) VALUES (
        ${member.email}, 'roles.replace', 'role_members', 'mtv-etalimai',
        ${JSON.stringify({ editableCount: normalized.length })}::JSONB
      )
    `);
    await sql.transaction(statements);

    const rows = await sql`
      SELECT id, full_name, email, role_name, is_active, is_locked, permissions
      FROM role_members
      ORDER BY is_locked DESC, created_at ASC
    `;
    const byEmail = new Map(
      (rows as RoleDbRow[]).map((row) => [
        row.email.toLowerCase(),
        roleFromDb(row),
      ]),
    );
    for (const admin of protectedHeadAdmins) {
      byEmail.set(admin.email.toLowerCase(), {
        id: admin.id,
        initials: admin.fullName
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0] || '')
          .join('')
          .toUpperCase(),
        name: admin.fullName,
        email: admin.email,
        role: 'Bosh admin',
        active: true,
        locked: true,
        permissions: headAdminPermissions,
      });
    }
    return jsonResponse({ saved: true, members: [...byEmail.values()] });
  } catch (error) {
    logServerError('[api/admin/roles] Unable to save role members', error);
    return publicError('Rollarni ma’lumotlar bazasiga saqlab bo‘lmadi.', 503);
  }
}
