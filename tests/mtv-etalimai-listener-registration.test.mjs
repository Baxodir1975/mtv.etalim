import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { isListenerAudience } from '../lib/listener-audience.ts';

const group56 = 'Nomzod direktor (56-guruh)';
const group57 = 'Nomzod direktor (57-guruh)';
const payload = {
  phone: '+998901111111',
  group: group56,
  year: '2026',
  startDate: '2026-09-01',
  category: 'Nomzod direktor',
  region: 'Toshkent shahri',
  district: 'Yunusobod tumani',
  workplace: 'Test MTM',
  surname: 'Test',
  firstName: 'Listener',
};
const owner = {
  id: 'owner',
  phone_digits: '901111111',
  group_name: group56,
  training_year: '2026',
  start_date: '2026-09-01',
  photo_url: 'database:photo',
};
const routeCode = ts.transpileModule(
  readFileSync(
    new URL('../app/api/listeners/route.ts', import.meta.url),
    'utf8',
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

function setup({
  admin = false,
  binding = null,
  records = [],
  failWrite = false,
} = {}) {
  const writes = [];
  const rows = records.map((row) => ({ ...row }));
  const sources = {
    groups: [group56, group57],
    districtsByRegion: { 'Toshkent shahri': ['Yunusobod tumani'] },
  };
  const sql = async (strings, ...values) => {
    const query = strings.join('?');
    if (query.includes('FROM app_settings')) return [];
    if (query.includes('id <>')) {
      return rows.filter(
        (row) => row.phone_digits === values[0] && row.id !== values[1],
      );
    }
    if (query.includes('FROM listeners')) {
      return rows.filter((row) =>
        query.includes('WHERE id =')
          ? row.id === values[0]
          : row.phone_digits === values[0],
      );
    }
    throw new Error('Unexpected query: ' + query);
  };
  sql.transaction = async (callback) => {
    if (failWrite) throw new Error('Test database unavailable');
    const tx = (strings, ...values) => {
      const query = strings.join('?');
      writes.push({ query, values });
      if (query.includes('INSERT INTO listeners (')) {
        const [
          id,
          phone_digits,
          start_date,
          training_year,
          category,
          group_name,
        ] = values;
        const row = {
          id,
          phone_digits,
          start_date,
          training_year,
          category,
          group_name,
        };
        rows.push(row);
        return [row];
      }
      if (query.includes('UPDATE listeners SET')) {
        const id = values.at(-1);
        const row = rows.find((item) => item.id === id);
        Object.assign(row, {
          phone_digits: values[0],
          start_date: values[1],
          training_year: values[2],
          group_name: values[4],
        });
        return [row];
      }
      return [];
    };
    return callback(tx);
  };
  const dependencies = {
    '@/lib/listener-audience': { isListenerAudience },
    '@/lib/auth': {
      authenticatedAdmin: async () =>
        admin ? { email: 'admin@example.test' } : null,
      deviceBinding: async () => binding,
      deviceBindingCookie: async (id, group) =>
        '__Host-test-device=' +
        encodeURIComponent(JSON.stringify({ id, group })) +
        '; HttpOnly; Secure',
    },
    '@/lib/server-data': {
      getDatabase: () => sql,
      hasPermission: (member) => Boolean(member),
      defaultListenerSources: () => sources,
      normalizeListenerSources: () => sources,
      knownRegions: ['Toshkent shahri'],
      listenerFromDb: (row) => row,
      jsonResponse: (body, status = 200) => Response.json(body, { status }),
      publicError: (error, status) => Response.json({ error }, { status }),
      logServerError: () => {},
    },
    '@/lib/security': {
      hasSameOrigin: () => true,
      rateLimit: async () => true,
      validCalendarDate: (date, required) =>
        !date ? !required : /^\d{4}-\d{2}-\d{2}$/.test(date),
    },
  };
  const exports = {};
  runInNewContext(routeCode, {
    exports,
    Response,
    File,
    Uint8Array,
    crypto,
    require: (id) => {
      assert.ok(dependencies[id], id);
      return dependencies[id];
    },
  });
  return {
    rows,
    writes,
    async save({
      input = payload,
      editingId = '',
      audience = 'listener',
    } = {}) {
      const form = new FormData();
      form.set('payload', JSON.stringify(input));
      if (editingId) form.set('editingId', editingId);
      form.set(
        'photo',
        new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'test.jpg', {
          type: 'image/jpeg',
        }),
      );
      const response = await exports.POST(
        new Request('https://mtv.etalimai.uz/api/listeners', {
          method: 'POST',
          headers: { 'x-mtv-audience': audience },
          body: form,
        }),
      );
      return {
        status: response.status,
        body: await response.json(),
        cookie: response.headers.get('set-cookie'),
      };
    },
  };
}

test('first public save writes once and binds the device only on success', async () => {
  const app = setup();
  const result = await app.save();
  assert.equal(result.status, 201);
  assert.equal(app.rows.length, 1);
  assert.equal(result.body.listener.group_name, group56);
  assert.match(result.cookie, /HttpOnly; Secure/);
  assert.match(decodeURIComponent(result.cookie), /56-guruh/);
});

test('failed save issues no device binding and leaves data unchanged', async () => {
  const app = setup({ failWrite: true });
  const result = await app.save();
  assert.equal(result.status, 503);
  assert.equal(result.cookie, null);
  assert.equal(app.rows.length, 0);
});

test('bound ordinary listener cannot register again or switch groups', async () => {
  const app = setup({ binding: { listenerId: 'owner' }, records: [owner] });
  const result = await app.save({
    input: { ...payload, group: group57, phone: '902222222' },
  });
  assert.equal(result.status, 409);
  assert.equal(app.writes.length, 0);
});

test('public edit preserves server group, year and month despite submitted changes', async () => {
  const app = setup({ binding: { listenerId: 'owner' }, records: [owner] });
  const result = await app.save({
    editingId: 'owner',
    input: {
      ...payload,
      group: group57,
      year: '2025',
      startDate: '2025-08-01',
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.listener.group_name, group56);
  assert.equal(result.body.listener.training_year, '2026');
  assert.equal(result.body.listener.start_date, '2026-09-01');
});

test('public audience never inherits an admin cookie on save or editing', async () => {
  const result = await setup({ admin: true }).save();
  assert.equal(result.status, 201);
  assert.ok(result.cookie);
  const app = setup({
    admin: true,
    binding: { listenerId: 'owner' },
    records: [owner],
  });
  assert.equal((await app.save({ editingId: 'other' })).status, 403);
  assert.equal(app.writes.length, 0);
});

test('verified admin form may change cohort without rebinding its device', async () => {
  const app = setup({
    admin: true,
    binding: { listenerId: 'owner' },
    records: [owner],
  });
  const result = await app.save({
    audience: 'admin',
    editingId: 'owner',
    input: {
      ...payload,
      group: group57,
      year: '2025',
      startDate: '2025-08-01',
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.listener.group_name, group57);
  assert.equal(result.body.listener.training_year, '2025');
  assert.equal(result.cookie, null);
  assert.ok(
    app.writes.some((write) => write.query.includes('admin_audit_log')),
  );
});

test('forged admin audience does not grant admin privileges', async () => {
  const app = setup({ binding: { listenerId: 'owner' }, records: [owner] });
  assert.equal((await app.save({ audience: 'admin' })).status, 409);
});
