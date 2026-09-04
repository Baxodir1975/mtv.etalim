import { neon } from '@neondatabase/serverless';
import { env } from 'cloudflare:workers';

type MtvEnvironment = {
  DATABASE_URL?: string;
};

export type ListenerDbRow = {
  id: string;
  phone_digits: string;
  start_date: string | Date | null;
  training_year: string;
  category: string;
  group_name: string;
  initials: string;
  surname: string;
  first_name: string;
  patronymic: string;
  full_name: string;
  workplace: string;
  region: string;
  district: string;
  position: string;
  birth_date: string | Date | null;
  note: string;
  registration_status: string;
  photo_url: string;
  order_file_url: string;
  passport_front_url: string;
  passport_back_url: string;
  created_at?: string | Date;
  updated_at?: string | Date;
};

export type RoleDbRow = {
  id: string;
  full_name: string;
  email: string;
  role_name: 'Bosh admin' | 'Admin' | 'Foydalanuvchi' | 'Ko‘ruvchi';
  is_active: boolean;
  is_locked: boolean;
  permissions: string[] | string;
};

export const protectedHeadAdmins = [
  {
    id: 'super-admin-ilxomovb2023',
    fullName: 'Islom',
    email: 'ilxomovb2023@gmail.com',
  },
  {
    id: 'super-admin-etalim-appsheet',
    fullName: 'E-talim',
    email: 'etalim@appsheet.uz',
  },
] as const;
export const accessActions = ['Ko‘rish', 'Kiritish', 'Tahrirlash', 'O‘chirish'];
export const accessPages = [
  'Tinglovchilar',
  'Tinglovchi formasi',
  'Shartlar',
  'Manbalar',
  'Rollar va ruxsatlar',
];
export const headAdminPermissions = accessPages.flatMap((page) =>
  accessActions.map((action) => `${page}:${action}`),
);

export function isProtectedHeadAdmin(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return protectedHeadAdmins.some(
    (admin) => admin.email.toLowerCase() === normalizedEmail,
  );
}

export function cloudflareAccessAdmin(request: Request) {
  const email = (
    request.headers.get('cf-access-authenticated-user-email') ?? ''
  )
    .trim()
    .toLowerCase();
  const assertion = request.headers.get('cf-access-jwt-assertion');
  if (!email || !assertion || !isProtectedHeadAdmin(email)) return null;
  return (
    protectedHeadAdmins.find(
      (admin) => admin.email.toLowerCase() === email,
    ) ?? null
  );
}

export function getDatabase() {
  const databaseUrl = (env as unknown as MtvEnvironment).DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }
  return neon(databaseUrl);
}

function dateOnly(value: string | Date | null | undefined) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function displayDate(value: string) {
  return value ? value.split('-').reverse().join('.') : '—';
}

function calculateAge(value: string) {
  if (!value) return null;
  const birthDate = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDifference = today.getUTCMonth() - birthDate.getUTCMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }
  return Math.max(0, age);
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(-9);
  if (digits.length !== 9) return value;
  return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
}

export function listenerFromDb(row: ListenerDbRow) {
  const startDate = dateOnly(row.start_date);
  const birthDate = dateOnly(row.birth_date);
  const version = row.updated_at
    ? encodeURIComponent(new Date(row.updated_at).toISOString())
    : '';
  const databaseFileUrl = (kind: 'photo' | 'order') =>
    `/api/files/${encodeURIComponent(row.id)}/${kind}${version ? `?v=${version}` : ''}`;
  const publicFileUrl = (storedValue: string, kind: 'photo' | 'order') =>
    storedValue.startsWith('database:')
      ? databaseFileUrl(kind)
      : storedValue;

  return {
    id: row.id,
    date: displayDate(startDate),
    startDate,
    year: row.training_year || '2026',
    category: row.category,
    group: row.group_name,
    initials: row.initials,
    surname: row.surname,
    firstName: row.first_name,
    patronymic: row.patronymic,
    name: row.full_name,
    organization: row.workplace,
    workplace: row.workplace,
    region: row.region,
    district: row.district,
    phone: formatPhone(row.phone_digits),
    position: row.position || '—',
    birthDate,
    note: row.note,
    age: calculateAge(birthDate),
    role: 'Тингловчи',
    status: row.registration_status,
    photo: row.photo_url ? publicFileUrl(row.photo_url, 'photo') : '',
    orderFile: row.order_file_url
      ? publicFileUrl(row.order_file_url, 'order')
      : '',
    // Passport bytes are never exposed by the public state endpoint. These
    // markers preserve completion/edit state while the object stays private.
    passportFront: row.passport_front_url ? 'saqlangan' : '',
    passportBack: row.passport_back_url ? 'saqlangan' : '',
  };
}

export function roleFromDb(row: RoleDbRow) {
  let permissions: string[] = [];
  if (Array.isArray(row.permissions)) {
    permissions = row.permissions;
  } else {
    try {
      const parsed = JSON.parse(row.permissions) as unknown;
      if (Array.isArray(parsed)) permissions = parsed.map(String);
    } catch {
      permissions = [];
    }
  }
  const words = row.full_name.trim().split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word[0] || '')
    .join('')
    .toUpperCase();

  return {
    id: row.id,
    initials: initials || 'ИБ',
    name: row.full_name,
    email: row.email,
    role: row.role_name,
    active: row.is_active,
    locked: row.is_locked,
    permissions,
  };
}

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

export function publicError(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}

export function logServerError(scope: string, error: unknown) {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const sanitized = raw
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[REDACTED_DATABASE_URL]')
    .replace(/(DATABASE_URL\s*[=:]\s*)\S+/gi, '$1[REDACTED]');
  console.error(scope, sanitized);
}
