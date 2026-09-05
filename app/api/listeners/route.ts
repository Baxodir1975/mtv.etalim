import {
  defaultListenerSources,
  getDatabase,
  hasPermission,
  jsonResponse,
  knownRegions,
  listenerFromDb,
  logServerError,
  normalizeListenerSources,
  publicError,
  type ListenerDbRow,
} from '@/lib/server-data';
import {
  authenticatedAdmin,
  deviceBinding,
  deviceBindingCookie,
} from '@/lib/auth';
import { hasSameOrigin, rateLimit, validCalendarDate } from '@/lib/security';
import { isListenerAudience } from '@/lib/listener-audience';

export const dynamic = 'force-dynamic';

const uploadRules = {
  photo: {
    kinds: new Set(['image/jpeg', 'image/png', 'image/webp']),
    maxBytes: 2 * 1024 * 1024,
  },
  order: {
    kinds: new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ]),
    maxBytes: 3 * 1024 * 1024,
  },
  passportFront: {
    kinds: new Set(['image/jpeg', 'image/png', 'image/webp']),
    maxBytes: 2 * 1024 * 1024,
  },
  passportBack: {
    kinds: new Set(['image/jpeg', 'image/png', 'image/webp']),
    maxBytes: 2 * 1024 * 1024,
  },
} as const;

type UploadField = keyof typeof uploadRules;
type ListenerInput = Record<string, unknown>;

function text(input: ListenerInput, key: string, maxLength = 300) {
  const value = input[key];
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function phoneDigits(value: unknown) {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (digits.length === 9) return digits;
  if (digits.length === 12 && digits.startsWith('998')) return digits.slice(3);
  return '';
}

function uploadedFile(form: FormData, field: UploadField) {
  const value = form.get(field);
  return value instanceof File && value.size > 0 ? value : null;
}

async function hasValidSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === 'image/png') {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (file.type === 'image/webp') {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    );
  }
  if (file.type === 'application/pdf') {
    return String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
  }
  return false;
}

async function validateUploads(files: Partial<Record<UploadField, File>>) {
  let totalBytes = 0;
  for (const field of Object.keys(files) as UploadField[]) {
    const file = files[field];
    if (!file) continue;
    const rule = uploadRules[field];
    totalBytes += file.size;
    if (!rule.kinds.has(file.type as never)) {
      throw new Error(`${file.name}: fayl turi ruxsat etilmagan.`);
    }
    if (file.size > rule.maxBytes) {
      throw new Error(`${file.name}: fayl hajmi juda katta.`);
    }
    if (!(await hasValidSignature(file))) {
      throw new Error(`${file.name}: fayl mazmuni uning turiga mos emas.`);
    }
  }
  if (totalBytes > 8 * 1024 * 1024) {
    throw new Error(
      'Yuklanayotgan fayllarning umumiy hajmi 8 MB dan oshmasin.',
    );
  }
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file';
}

export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) {
      return publicError('Saqlash so‘rovi manbasi tasdiqlanmadi.', 403);
    }
    const member = isListenerAudience(request)
      ? null
      : await authenticatedAdmin(request);
    let binding = member ? null : await deviceBinding(request);
    if (!member && !(await rateLimit(request, 'listener-write'))) {
      return publicError(
        'Juda ko‘p saqlash urinishi. Bir daqiqadan keyin qayta urinib ko‘ring.',
        429,
      );
    }
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > 9 * 1024 * 1024) {
      return publicError(
        'Yuklanayotgan ma’lumotlar hajmi 9 MB dan oshmasin.',
        413,
      );
    }
    const form = await request.formData();
    const rawPayload = form.get('payload');
    if (typeof rawPayload !== 'string') {
      return publicError('Forma ma’lumotlari topilmadi.', 400);
    }

    let input: ListenerInput;
    try {
      input = JSON.parse(rawPayload) as ListenerInput;
    } catch {
      return publicError('Forma ma’lumotlari noto‘g‘ri yuborildi.', 400);
    }

    const editingValue = form.get('editingId');
    const editingId =
      typeof editingValue === 'string' ? editingValue.trim() : '';
    const newPeriodRegistration = form.get('newPeriodRegistration') === 'true';
    const phone = phoneDigits(input.phone);
    let group = text(input, 'group', 100);
    let category = text(input, 'category', 100);
    const region = text(input, 'region', 120);
    const district = text(input, 'district', 120);
    const workplace = text(input, 'workplace', 300);
    const surname = text(input, 'surname', 120);
    const firstName = text(input, 'firstName', 120);
    const patronymic = text(input, 'patronymic', 120);
    const position = text(input, 'position', 160) || '—';
    let startDate = text(input, 'startDate', 10);
    const birthDate = text(input, 'birthDate', 10);
    let trainingYear = text(input, 'year', 4) || '2026';
    const note = text(input, 'note', 2000);

    const sql = getDatabase();
    const sourceRows = await sql`
      SELECT setting_value
      FROM app_settings
      WHERE setting_key = 'listener_sources'
      LIMIT 1
    `;
    const sourceValue = sourceRows[0]?.setting_value;
    const configuredSources = sourceValue
      ? normalizeListenerSources(sourceValue)
      : defaultListenerSources();
    const allowedGroups = new Set(configuredSources.groups);
    const allowedDistricts = configuredSources.districtsByRegion[region] || [];

    if (
      !phone ||
      !allowedGroups.has(group) ||
      category !== 'Nomzod direktor' ||
      !startDate ||
      !knownRegions.includes(region as (typeof knownRegions)[number]) ||
      !district ||
      !allowedDistricts.includes(district) ||
      !workplace ||
      !surname ||
      !firstName
    ) {
      return publicError(
        'Majburiy maydonlarni to‘liq va to‘g‘ri kiriting.',
        400,
      );
    }
    if (
      !/^\d{4}$/.test(trainingYear) ||
      !validCalendarDate(startDate, true) ||
      !validCalendarDate(birthDate) ||
      trainingYear !== startDate.slice(0, 4)
    ) {
      return publicError('Sana yoki yil noto‘g‘ri kiritilgan.', 400);
    }
    if (birthDate && birthDate > new Date().toISOString().slice(0, 10)) {
      return publicError('Tug‘ilgan sana kelajakda bo‘lishi mumkin emas.', 400);
    }
    if (!member && binding) {
      const boundRows = await sql`
        SELECT id, phone_digits, start_date FROM listeners
        WHERE id = ${binding.listenerId} AND deleted_at IS NULL
        LIMIT 1
      `;
      if (!boundRows.length) binding = null;
      else if (!editingId && newPeriodRegistration) {
        const previous = boundRows[0];
        const previousDate =
          previous.start_date instanceof Date
            ? previous.start_date.toISOString().slice(0, 10)
            : String(previous.start_date || '').slice(0, 10);
        if (previousDate.slice(0, 7) === startDate.slice(0, 7)) {
          return publicError(
            'Shu yil va oy uchun allaqachon ro‘yxatdan o‘tgansiz. Boshqa yil yoki oyni tanlang.',
            409,
          );
        }
        if (previous.phone_digits !== phone) {
          return publicError(
            'Yangi oy uchun avvalgi ro‘yxatdagi telefon raqamidan foydalaning.',
            400,
          );
        }
      }
    }

    if (!member) {
      if (editingId) {
        if (!binding || binding.listenerId !== editingId) {
          return publicError(
            'Faqat shu qurilmadan ro‘yxatdan o‘tgan tinglovchini tahrirlash mumkin.',
            403,
          );
        }
      } else if (binding && !newPeriodRegistration) {
        return publicError(
          'Bu qurilma avval ro‘yxatdan o‘tgan. “Ko‘rish” orqali kartochkangizni oching.',
          409,
        );
      }
    }

    if (member) {
      const permission = editingId
        ? 'Tinglovchilar:Tahrirlash'
        : 'Tinglovchilar:Kiritish';
      if (!hasPermission(member, permission)) {
        return publicError('Bu amal uchun ruxsat yo‘q.', 403);
      }
    }

    const currentRows = editingId
      ? await sql`
          SELECT
            id, phone_digits, start_date, training_year, category, group_name,
            initials, surname, first_name, patronymic, full_name, workplace,
            region, district, position, birth_date, note, registration_status,
            photo_url, order_file_url, passport_front_url, passport_back_url,
            created_at, updated_at
          FROM listeners
          WHERE id = ${editingId} AND deleted_at IS NULL
          LIMIT 1
        `
      : await sql`
          SELECT
            id, phone_digits, start_date, training_year, category, group_name,
            initials, surname, first_name, patronymic, full_name, workplace,
            region, district, position, birth_date, note, registration_status,
            photo_url, order_file_url, passport_front_url, passport_back_url,
            created_at, updated_at
          FROM listeners
          WHERE phone_digits = ${phone} AND deleted_at IS NULL
            AND EXTRACT(YEAR FROM start_date) = ${Number(startDate.slice(0, 4))}
            AND EXTRACT(MONTH FROM start_date) = ${Number(startDate.slice(5, 7))}
          LIMIT 1
        `;
    const current = currentRows[0] as ListenerDbRow | undefined;

    if (editingId && !current) {
      return publicError('Tahrirlanayotgan tinglovchi topilmadi.', 404);
    }
    if (!member && editingId && binding && current) {
      // A public device owns one exact cohort, not just a group label. Preserve
      // the server values so a stale or manipulated browser cannot pivot to a
      // different month/year and enumerate another cohort.
      group = current.group_name;
      category = current.category;
      trainingYear = current.training_year;
      startDate =
        current.start_date instanceof Date
          ? current.start_date.toISOString().slice(0, 10)
          : String(current.start_date || '').slice(0, 10);
    }
    if (!editingId && current) {
      return publicError(
        'Shu telefon raqami bilan bu yil va oy uchun yozuv mavjud. Boshqa guruh tanlash takroriy ro‘yxatdan o‘tishga ruxsat bermaydi.',
        409,
      );
    }

    if (editingId) {
      const duplicate = await sql`
        SELECT id FROM listeners
        WHERE phone_digits = ${phone} AND id <> ${editingId}
          AND deleted_at IS NULL
          AND EXTRACT(YEAR FROM start_date) = ${Number(startDate.slice(0, 4))}
          AND EXTRACT(MONTH FROM start_date) = ${Number(startDate.slice(5, 7))}
        LIMIT 1
      `;
      if (duplicate.length) {
        return publicError(
          'Ushbu telefon raqami bilan bu yil va oy uchun boshqa yozuv mavjud.',
          409,
        );
      }
    }

    const files: Partial<Record<UploadField, File>> = {};
    for (const field of Object.keys(uploadRules) as UploadField[]) {
      const file = uploadedFile(form, field);
      if (file) files[field] = file;
    }
    try {
      await validateUploads(files);
    } catch (error) {
      return publicError(
        error instanceof Error ? error.message : 'Faylni tekshirib bo‘lmadi.',
        415,
      );
    }

    if (!current?.photo_url && !files.photo) {
      return publicError('3×4 rasmni yuklash majburiy.', 400);
    }

    const id = current?.id || crypto.randomUUID();
    const preparedDeviceCookie = member
      ? ''
      : await deviceBindingCookie(id, group);
    const objectKeys = {
      photo: current?.photo_url || '',
      order: current?.order_file_url || '',
      passportFront: current?.passport_front_url || '',
      passportBack: current?.passport_back_url || '',
    };
    const storedFiles = await Promise.all(
      (Object.keys(files) as UploadField[]).map(async (field) => {
        const file = files[field];
        if (!file) return null;
        objectKeys[field] = `database:${field}`;
        return {
          field,
          name: safeFileName(file.name),
          type: file.type,
          size: file.size,
          bytes: new Uint8Array(await file.arrayBuffer()),
        };
      }),
    );

    const fullName = [surname, firstName, patronymic].filter(Boolean).join(' ');
    const initials = `${surname[0] || ''}${firstName[0] || ''}`.toUpperCase();
    const completionValues = [
      startDate,
      region,
      district,
      workplace,
      category,
      group,
      surname,
      firstName,
      position === '—' ? '' : position,
      phone,
      birthDate,
      objectKeys.photo,
      objectKeys.order,
      objectKeys.passportFront,
      objectKeys.passportBack,
    ];
    const registrationStatus = completionValues.every(Boolean)
      ? 'Тўлиқ'
      : 'Тўлдирилмаган';

    const transactionResults = await sql.transaction((tx) => {
      const listenerWrite = editingId
        ? tx`
            UPDATE listeners SET
              phone_digits = ${phone},
              start_date = ${startDate || null},
              training_year = ${trainingYear},
              category = ${category},
              group_name = ${group},
              initials = ${initials},
              surname = ${surname},
              first_name = ${firstName},
              patronymic = ${patronymic},
              full_name = ${fullName},
              workplace = ${workplace},
              region = ${region},
              district = ${district},
              position = ${position},
              birth_date = ${birthDate || null},
              note = ${note},
              registration_status = ${registrationStatus},
              photo_url = ${objectKeys.photo},
              order_file_url = ${objectKeys.order},
              passport_front_url = ${objectKeys.passportFront},
              passport_back_url = ${objectKeys.passportBack},
              updated_at = NOW()
            WHERE id = ${id} AND deleted_at IS NULL
            RETURNING
              id, phone_digits, start_date, training_year, category, group_name,
              initials, surname, first_name, patronymic, full_name, workplace,
              region, district, position, birth_date, note, registration_status,
              photo_url, order_file_url, passport_front_url, passport_back_url,
              created_at, updated_at
          `
        : tx`
            INSERT INTO listeners (
              id, phone_digits, start_date, training_year, category, group_name,
              initials, surname, first_name, patronymic, full_name, workplace,
              region, district, position, birth_date, note, registration_status,
              photo_url, order_file_url, passport_front_url, passport_back_url
            ) VALUES (
              ${id}, ${phone}, ${startDate || null}, ${trainingYear}, ${category}, ${group},
              ${initials}, ${surname}, ${firstName}, ${patronymic}, ${fullName}, ${workplace},
              ${region}, ${district}, ${position}, ${birthDate || null}, ${note},
              ${registrationStatus}, ${objectKeys.photo}, ${objectKeys.order},
              ${objectKeys.passportFront}, ${objectKeys.passportBack}
            )
            RETURNING
              id, phone_digits, start_date, training_year, category, group_name,
              initials, surname, first_name, patronymic, full_name, workplace,
              region, district, position, birth_date, note, registration_status,
              photo_url, order_file_url, passport_front_url, passport_back_url,
              created_at, updated_at
          `;

      return [
        listenerWrite,
        ...storedFiles
          .filter((file): file is NonNullable<typeof file> => Boolean(file))
          .map(
            (file) => tx`
              INSERT INTO listener_files (
                listener_id, file_kind, original_name, mime_type, file_size,
                file_bytes
              )
              SELECT
                ${id}, ${file.field}, ${file.name}, ${file.type}, ${file.size},
                ${file.bytes}
              WHERE EXISTS (
                SELECT 1 FROM listeners
                WHERE id = ${id} AND deleted_at IS NULL
              )
              ON CONFLICT (listener_id, file_kind) DO UPDATE SET
                original_name = EXCLUDED.original_name,
                mime_type = EXCLUDED.mime_type,
                file_size = EXCLUDED.file_size,
                file_bytes = EXCLUDED.file_bytes,
                updated_at = NOW()
            `,
          ),
        ...(member
          ? [
              tx`
                INSERT INTO admin_audit_log (
                  actor_email, action, entity_type, entity_id, details
                )
                SELECT
                  ${member.email},
                  ${editingId ? 'listener.update' : 'listener.create'},
                  'listener', ${id},
                  CAST(${JSON.stringify({ group, trainingYear })} AS JSONB)
                WHERE EXISTS (
                  SELECT 1 FROM listeners
                  WHERE id = ${id} AND deleted_at IS NULL
                )
              `,
            ]
          : []),
      ];
    });
    const savedRows = transactionResults[0];
    if (editingId && !savedRows.length) {
      return publicError('Tahrirlanayotgan tinglovchi topilmadi.', 404);
    }

    const response = jsonResponse(
      { listener: listenerFromDb(savedRows[0] as ListenerDbRow) },
      current ? 200 : 201,
    );
    if (!member) {
      response.headers.append('Set-Cookie', preparedDeviceCookie);
    }
    return response;
  } catch (error) {
    logServerError('[api/listeners] Unable to persist listener', error);
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';
    if (errorCode === '23503') {
      return publicError('Tahrirlanayotgan tinglovchi topilmadi.', 404);
    }
    if (errorCode === '23505') {
      return publicError(
        'Ushbu telefon raqami bilan bu yil va oy uchun yozuv allaqachon saqlangan.',
        409,
      );
    }
    return publicError(
      'Ma’lumot saqlanmadi. Internet aloqasini tekshirib, qayta urinib ko‘ring.',
      503,
    );
  }
}
