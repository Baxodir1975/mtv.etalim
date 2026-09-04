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

export type AccessRole = RoleDbRow['role_name'];

export type RoleMember = {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: AccessRole;
  active: boolean;
  locked: boolean;
  permissions: string[];
};

export type ListenerSources = {
  groups: string[];
  districtsByRegion: Record<string, string[]>;
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

export const knownPermissions = new Set(headAdminPermissions);

export const defaultListenerGroups = [56, 57, 58, 59, 60, 61].map(
  (number) => `Nomzod direktor (${number}-guruh)`,
);

export const knownRegions = [
  'Qoraqalpog‘iston Respublikasi',
  'Andijon viloyati',
  'Buxoro viloyati',
  'Jizzax viloyati',
  'Qashqadaryo viloyati',
  'Navoiy viloyati',
  'Namangan viloyati',
  'Samarqand viloyati',
  'Surxondaryo viloyati',
  'Sirdaryo viloyati',
  'Toshkent viloyati',
  'Toshkent shahri',
  'Farg‘ona viloyati',
  'Xorazm viloyati',
] as const;

export const defaultDistrictsByRegion: Record<string, string[]> = {
  'Qoraqalpog‘iston Respublikasi': [
    'Amudaryo tumani',
    'Beruniy tumani',
    'Bo‘zatov tumani',
    'Chimboy tumani',
    'Ellikqal’a tumani',
    'Kegeyli tumani',
    'Mo‘ynoq tumani',
    'Nukus shahri',
    'Nukus tumani',
    'Qanliko‘l tumani',
    'Qo‘ng‘irot tumani',
    'Qorao‘zak tumani',
    'Shumanay tumani',
    'Taxtako‘pir tumani',
    'Taxiatosh tumani',
    'To‘rtko‘l tumani',
    'Xo‘jayli tumani',
  ],
  'Andijon viloyati': [
    'Andijon shahri',
    'Andijon tumani',
    'Asaka tumani',
    'Baliqchi tumani',
    'Bo‘ston tumani',
    'Buloqboshi tumani',
    'Izboskan tumani',
    'Jalaquduq tumani',
    'Marhamat tumani',
    'Oltinko‘l tumani',
    'Paxtaobod tumani',
    'Qo‘rg‘ontepa tumani',
    'Shahrixon tumani',
    'Ulug‘nor tumani',
    'Xo‘jaobod tumani',
    'Xonobod shahri',
  ],
  'Buxoro viloyati': [
    'Buxoro shahri',
    'Buxoro tumani',
    'G‘ijduvon tumani',
    'Jondor tumani',
    'Kogon shahri',
    'Kogon tumani',
    'Olot tumani',
    'Peshku tumani',
    'Qorako‘l tumani',
    'Qorovulbozor tumani',
    'Romitan tumani',
    'Shofirkon tumani',
    'Vobkent tumani',
  ],
  'Jizzax viloyati': [
    'Arnasoy tumani',
    'Baxmal tumani',
    'Do‘stlik tumani',
    'Forish tumani',
    'G‘allaorol tumani',
    'Jizzax shahri',
    'Mirzacho‘l tumani',
    'Paxtakor tumani',
    'Sharof Rashidov tumani',
    'Yangiobod tumani',
    'Zafarobod tumani',
    'Zarbdor tumani',
    'Zomin tumani',
  ],
  'Qashqadaryo viloyati': [
    'Chiroqchi tumani',
    'Dehqonobod tumani',
    'G‘uzor tumani',
    'Kasbi tumani',
    'Kitob tumani',
    'Ko‘kdala tumani',
    'Koson tumani',
    'Mirishkor tumani',
    'Muborak tumani',
    'Nishon tumani',
    'Qamashi tumani',
    'Qarshi shahri',
    'Qarshi tumani',
    'Shahrisabz shahri',
    'Shahrisabz tumani',
    'Yakkabog‘ tumani',
  ],
  'Navoiy viloyati': [
    'G‘ozg‘on shahri',
    'Karmana tumani',
    'Konimex tumani',
    'Navbahor tumani',
    'Navoiy shahri',
    'Nurota tumani',
    'Qiziltepa tumani',
    'Tomdi tumani',
    'Uchquduq tumani',
    'Xatirchi tumani',
    'Zarafshon shahri',
  ],
  'Namangan viloyati': [
    'Chortoq tumani',
    'Chust tumani',
    'Davlatobod tumani',
    'Kosonsoy tumani',
    'Mingbuloq tumani',
    'Namangan shahri',
    'Namangan tumani',
    'Norin tumani',
    'Pop tumani',
    'To‘raqo‘rg‘on tumani',
    'Uchqo‘rg‘on tumani',
    'Uychi tumani',
    'Yangi Namangan tumani',
    'Yangiqo‘rg‘on tumani',
  ],
  'Samarqand viloyati': [
    'Bulung‘ur tumani',
    'Ishtixon tumani',
    'Jomboy tumani',
    'Kattaqo‘rg‘on shahri',
    'Kattaqo‘rg‘on tumani',
    'Narpay tumani',
    'Nurobod tumani',
    'Oqdaryo tumani',
    'Paxtachi tumani',
    'Pastdarg‘om tumani',
    'Payariq tumani',
    'Qo‘shrabot tumani',
    'Samarqand shahri',
    'Samarqand tumani',
    'Toyloq tumani',
    'Urgut tumani',
  ],
  'Surxondaryo viloyati': [
    'Angor tumani',
    'Bandixon tumani',
    'Boysun tumani',
    'Denov tumani',
    'Jarqo‘rg‘on tumani',
    'Muzrabot tumani',
    'Oltinsoy tumani',
    'Qiziriq tumani',
    'Qumqo‘rg‘on tumani',
    'Sariosiyo tumani',
    'Sherobod tumani',
    'Sho‘rchi tumani',
    'Termiz shahri',
    'Termiz tumani',
    'Uzun tumani',
  ],
  'Sirdaryo viloyati': [
    'Boyovut tumani',
    'Guliston shahri',
    'Guliston tumani',
    'Mirzaobod tumani',
    'Oqoltin tumani',
    'Sardoba tumani',
    'Sayxunobod tumani',
    'Shirin shahri',
    'Sirdaryo tumani',
    'Yangiyer shahri',
    'Xovos tumani',
  ],
  'Toshkent viloyati': [
    'Angren shahri',
    'Bekobod shahri',
    'Bekobod tumani',
    'Bo‘ka tumani',
    'Bo‘stonliq tumani',
    'Chinoz tumani',
    'Chirchiq shahri',
    'Ohangaron shahri',
    'Ohangaron tumani',
    'Olmaliq shahri',
    'Oqqo‘rg‘on tumani',
    'Parkent tumani',
    'Piskent tumani',
    'Qibray tumani',
    'Quyi Chirchiq tumani',
    'Yangiyo‘l shahri',
    'Yangiyo‘l tumani',
    'Yuqori Chirchiq tumani',
    'Zangiota tumani',
    'O‘rta Chirchiq tumani',
  ],
  'Toshkent shahri': [
    'Bektemir tumani',
    'Chilonzor tumani',
    'Mirobod tumani',
    'Mirzo Ulug‘bek tumani',
    'Olmazor tumani',
    'Sergeli tumani',
    'Shayxontohur tumani',
    'Uchtepa tumani',
    'Yakkasaroy tumani',
    'Yangihayot tumani',
    'Yashnobod tumani',
    'Yunusobod tumani',
  ],
  'Farg‘ona viloyati': [
    'Bag‘dod tumani',
    'Beshariq tumani',
    'Buvayda tumani',
    'Dang‘ara tumani',
    'Farg‘ona shahri',
    'Farg‘ona tumani',
    'Furqat tumani',
    'Marg‘ilon shahri',
    'Oltiariq tumani',
    'O‘zbekiston tumani',
    'Qo‘qon shahri',
    'Qo‘shtepa tumani',
    'Quva tumani',
    'Quvasoy shahri',
    'Rishton tumani',
    'So‘x tumani',
    'Toshloq tumani',
    'Uchko‘prik tumani',
    'Yozyovon tumani',
  ],
  'Xorazm viloyati': [
    'Bog‘ot tumani',
    'Gurlan tumani',
    'Hazorasp tumani',
    'Qo‘shko‘pir tumani',
    'Shovot tumani',
    'Tuproqqal’a tumani',
    'Urganch shahri',
    'Urganch tumani',
    'Xiva shahri',
    'Xiva tumani',
    'Xonqa tumani',
    'Yangiariq tumani',
    'Yangibozor tumani',
  ],
};

export function defaultListenerSources(): ListenerSources {
  return {
    groups: [...defaultListenerGroups],
    districtsByRegion: Object.fromEntries(
      Object.entries(defaultDistrictsByRegion).map(([region, districts]) => [
        region,
        [...districts],
      ]),
    ),
  };
}

export function normalizeListenerSources(value: unknown): ListenerSources {
  const fallback = defaultListenerSources();
  if (!value || typeof value !== 'object') return fallback;
  const input = value as {
    groups?: unknown;
    districtsByRegion?: unknown;
  };
  const groups = Array.isArray(input.groups)
    ? [
        ...new Set(
          input.groups
            .filter((group): group is string => typeof group === 'string')
            .map((group) => group.trim().slice(0, 100))
            .filter(Boolean),
        ),
      ].slice(0, 100)
    : fallback.groups;
  const districtsByRegion: Record<string, string[]> = {};
  if (
    input.districtsByRegion &&
    typeof input.districtsByRegion === 'object' &&
    !Array.isArray(input.districtsByRegion)
  ) {
    for (const region of knownRegions) {
      const districts = (input.districtsByRegion as Record<string, unknown>)[
        region
      ];
      if (!Array.isArray(districts)) {
        districtsByRegion[region] = [
          ...(fallback.districtsByRegion[region] || []),
        ];
        continue;
      }
      districtsByRegion[region] = [
        ...new Set(
          districts
            .filter(
              (district): district is string => typeof district === 'string',
            )
            .map((district) => district.trim().slice(0, 120))
            .filter(Boolean),
        ),
      ].slice(0, 100);
    }
  }
  return {
    groups: groups.length ? groups : fallback.groups,
    districtsByRegion: Object.keys(districtsByRegion).length
      ? districtsByRegion
      : fallback.districtsByRegion,
  };
}

export function isProtectedHeadAdmin(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return protectedHeadAdmins.some(
    (admin) => admin.email.toLowerCase() === normalizedEmail,
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
    storedValue.startsWith('database:') ? databaseFileUrl(kind) : storedValue;

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

export function publicListenerFromDb(row: ListenerDbRow) {
  const listener = listenerFromDb(row);
  const phoneSuffix = row.phone_digits.replace(/\D/g, '').slice(-2);
  return {
    ...listener,
    phone: phoneSuffix ? `+998 ** *** ** ${phoneSuffix}` : '+998 ** *** ** **',
    birthDate: '',
    note: '',
    orderFile: '',
    passportFront: '',
    passportBack: '',
  };
}

export function roleFromDb(row: RoleDbRow): RoleMember {
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

export function hasPermission(
  member: Pick<RoleMember, 'active' | 'permissions'> | null | undefined,
  permission: string,
) {
  return Boolean(member?.active && member.permissions.includes(permission));
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
  const raw =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const sanitized = raw
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[REDACTED_DATABASE_URL]')
    .replace(/(DATABASE_URL\s*[=:]\s*)\S+/gi, '$1[REDACTED]');
  console.error(scope, sanitized);
}
