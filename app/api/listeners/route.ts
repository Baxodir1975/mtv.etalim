import {
  getDatabase,
  jsonResponse,
  listenerFromDb,
  publicError,
  type ListenerDbRow,
} from '@/lib/server-data';

export const dynamic = 'force-dynamic';

const allowedGroups = new Set(
  [56, 57, 58, 59, 60, 61].map(
    (number) => `Nomzod direktor (${number}-guruh)`,
  ),
);

const uploadRules = {
  photo: {
    kinds: new Set(['image/jpeg', 'image/png', 'image/webp']),
    maxBytes: 4 * 1024 * 1024,
  },
  order: {
    kinds: new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ]),
    maxBytes: 6 * 1024 * 1024,
  },
  passportFront: {
    kinds: new Set(['image/jpeg', 'image/png', 'image/webp']),
    maxBytes: 5 * 1024 * 1024,
  },
  passportBack: {
    kinds: new Set(['image/jpeg', 'image/png', 'image/webp']),
    maxBytes: 5 * 1024 * 1024,
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

function isIsoDate(value: string) {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
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
  if (totalBytes > 16 * 1024 * 1024) {
    throw new Error('Yuklanayotgan fayllarning umumiy hajmi 16 MB dan oshmasin.');
  }
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file';
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > 17 * 1024 * 1024) {
      return publicError('Yuklanayotgan ma’lumotlar hajmi 17 MB dan oshmasin.', 413);
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
    const phone = phoneDigits(input.phone);
    const group = text(input, 'group', 100);
    const category = text(input, 'category', 100);
    const region = text(input, 'region', 120);
    const district = text(input, 'district', 120);
    const workplace = text(input, 'workplace', 300);
    const surname = text(input, 'surname', 120);
    const firstName = text(input, 'firstName', 120);
    const patronymic = text(input, 'patronymic', 120);
    const position = text(input, 'position', 160) || '—';
    const startDate = text(input, 'startDate', 10);
    const birthDate = text(input, 'birthDate', 10);
    const trainingYear = text(input, 'year', 4) || '2026';
    const note = text(input, 'note', 2000);

    if (
      !phone ||
      !allowedGroups.has(group) ||
      category !== 'Nomzod direktor' ||
      !region ||
      !district ||
      !workplace ||
      !surname ||
      !firstName
    ) {
      return publicError('Majburiy maydonlarni to‘liq va to‘g‘ri kiriting.', 400);
    }
    if (!/^\d{4}$/.test(trainingYear) || !isIsoDate(startDate) || !isIsoDate(birthDate)) {
      return publicError('Sana yoki yil noto‘g‘ri kiritilgan.', 400);
    }

    const sql = getDatabase();
    const currentRows = editingId
      ? await sql`
          SELECT
            id, phone_digits, start_date, training_year, category, group_name,
            initials, surname, first_name, patronymic, full_name, workplace,
            region, district, position, birth_date, note, registration_status,
            photo_url, order_file_url, passport_front_url, passport_back_url,
            created_at, updated_at
          FROM listeners
          WHERE id = ${editingId}
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
          WHERE phone_digits = ${phone}
          LIMIT 1
        `;
    const current = currentRows[0] as ListenerDbRow | undefined;

    if (editingId && !current) {
      return publicError('Tahrirlanayotgan tinglovchi topilmadi.', 404);
    }
    if (!editingId && current) {
      return publicError(
        'Bu telefon raqami avval ro‘yxatdan o‘tgan. “Ko‘rish” orqali kartochkani oching.',
        409,
      );
    }

    if (editingId) {
      const duplicate = await sql`
        SELECT id FROM listeners
        WHERE phone_digits = ${phone} AND id <> ${editingId}
        LIMIT 1
      `;
      if (duplicate.length) {
        return publicError('Bu telefon raqami boshqa tinglovchiga biriktirilgan.', 409);
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

    const transactionResults = await sql.transaction((tx) => [
      tx`
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
        ON CONFLICT (id) DO UPDATE SET
          phone_digits = EXCLUDED.phone_digits,
          start_date = EXCLUDED.start_date,
          training_year = EXCLUDED.training_year,
          category = EXCLUDED.category,
          group_name = EXCLUDED.group_name,
          initials = EXCLUDED.initials,
          surname = EXCLUDED.surname,
          first_name = EXCLUDED.first_name,
          patronymic = EXCLUDED.patronymic,
          full_name = EXCLUDED.full_name,
          workplace = EXCLUDED.workplace,
          region = EXCLUDED.region,
          district = EXCLUDED.district,
          position = EXCLUDED.position,
          birth_date = EXCLUDED.birth_date,
          note = EXCLUDED.note,
          registration_status = EXCLUDED.registration_status,
          photo_url = EXCLUDED.photo_url,
          order_file_url = EXCLUDED.order_file_url,
          passport_front_url = EXCLUDED.passport_front_url,
          passport_back_url = EXCLUDED.passport_back_url,
          updated_at = NOW()
        RETURNING
          id, phone_digits, start_date, training_year, category, group_name,
          initials, surname, first_name, patronymic, full_name, workplace,
          region, district, position, birth_date, note, registration_status,
          photo_url, order_file_url, passport_front_url, passport_back_url,
          created_at, updated_at
      `,
      ...storedFiles
        .filter((file): file is NonNullable<typeof file> => Boolean(file))
        .map(
          (file) => tx`
            INSERT INTO listener_files (
              listener_id, file_kind, original_name, mime_type, file_size,
              file_bytes
            ) VALUES (
              ${id}, ${file.field}, ${file.name}, ${file.type}, ${file.size},
              ${file.bytes}
            )
            ON CONFLICT (listener_id, file_kind) DO UPDATE SET
              original_name = EXCLUDED.original_name,
              mime_type = EXCLUDED.mime_type,
              file_size = EXCLUDED.file_size,
              file_bytes = EXCLUDED.file_bytes,
              updated_at = NOW()
          `,
        ),
    ]);
    const savedRows = transactionResults[0];

    return jsonResponse(
      { listener: listenerFromDb(savedRows[0] as ListenerDbRow) },
      current ? 200 : 201,
    );
  } catch (error) {
    console.error('[api/listeners] Unable to persist listener', error);
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';
    if (errorCode === '23505') {
      return publicError('Бу телефон рақами аввал рўйхатдан ўтган.', 409);
    }
    return publicError(
      'Ma’lumot saqlanmadi. Internet aloqasini tekshirib, qayta urinib ko‘ring.',
      503,
    );
  }
}
