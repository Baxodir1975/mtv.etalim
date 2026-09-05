import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { formatAdminCohort } from '../lib/listener-preview.ts';
import { isListenerAudience } from '../lib/listener-audience.ts';

const group56 = 'Nomzod direktor (56-guruh)';
const group57 = 'Nomzod direktor (57-guruh)';
const fixtures = [
  {
    id: 'owner',
    group_name: group56,
    training_year: '2026',
    training_month: '09',
    phone_digits: '901111111',
  },
  {
    id: 'peer',
    group_name: group56,
    training_year: '2026',
    training_month: '09',
    phone_digits: '902222222',
  },
  {
    id: 'other-year',
    group_name: group56,
    training_year: '2025',
    training_month: '08',
    phone_digits: '903333333',
  },
  {
    id: 'other-group',
    group_name: group57,
    training_year: '2026',
    training_month: '09',
    phone_digits: '904444444',
  },
  {
    id: 'deleted',
    group_name: group56,
    training_year: '2026',
    training_month: '09',
    deleted_at: '2026-09-01',
    phone_digits: '905555555',
  },
].map((row) => ({ ...row, category: 'Nomzod direktor' }));
const routeCode = ts.transpileModule(
  readFileSync(
    new URL('../app/api/listeners/lookup/route.ts', import.meta.url),
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
  device = null,
  throttled = false,
  databaseFails = false,
  audience = '',
  records = fixtures,
} = {}) {
  const calls = [];
  const sql = async (strings, ...values) => {
    const query = strings.join('?');
    calls.push({ query, values });
    assert.match(query, /SELECT/);
    assert.doesNotMatch(query, /\b(DELETE|INSERT|UPDATE|ALTER|DROP)\b/);
    if (databaseFails) throw new Error('Database unavailable');
    if (query.includes('LIMIT 1')) {
      const byId = query.includes('WHERE id =');
      return records
        .filter(
          (row) =>
            !row.deleted_at &&
            (byId ? row.id === values[0] : row.phone_digits === values[0]),
        )
        .slice(0, 1);
    }
    const [
      allGroups,
      group,
      allYears,
      year,
      allMonths,
      month,
      allCategories,
      category,
      limit,
    ] = values;
    assert.equal(limit, admin && audience !== 'listener' ? 1000 : 250);
    assert.match(query, /deleted_at IS NULL/);
    return records
      .filter(
        (row) =>
          !row.deleted_at &&
          (allGroups || row.group_name === group) &&
          (allYears || row.training_year === year) &&
          (allMonths || row.training_month === month) &&
          (allCategories || row.category === category),
      )
      .slice(0, limit);
  };
  const mocks = {
    '@/lib/listener-audience': { isListenerAudience },
    '@/lib/auth': {
      authenticatedAdmin: async () =>
        admin ? { active: true, permissions: ['Tinglovchilar:Ko‘rish'] } : null,
      deviceBinding: async () => device,
      groupViewCookie: async (group, year, month) =>
        'cohort=' +
        encodeURIComponent(JSON.stringify({ group, year, month })) +
        '; Secure; HttpOnly',
    },
    '@/lib/server-data': {
      getDatabase: () => sql,
      hasPermission: (member, permission) =>
        Boolean(member?.active && member.permissions.includes(permission)),
      jsonResponse: (body, status = 200) => Response.json(body, { status }),
      publicError: (error, status) => Response.json({ error }, { status }),
      logServerError: () => {},
      listenerFromDb: (row) => ({ id: row.id, privateDetails: true }),
      publicListenerFromDb: (row) => ({ id: row.id, privateDetails: false }),
    },
    '@/lib/security': {
      hasSameOrigin: (request) =>
        request.headers.get('origin') === 'https://mtv.etalimai.uz',
      rateLimit: async () => !throttled,
      safeText: (value, length) =>
        typeof value === 'string' ? value.trim().slice(0, length) : '',
    },
  };
  const exports = {};
  runInNewContext(routeCode, {
    exports,
    Response,
    require: (id) => {
      assert.ok(mocks[id], 'Unexpected production dependency: ' + id);
      return mocks[id];
    },
  });
  return {
    calls,
    async lookup(body = {}, origin = 'https://mtv.etalimai.uz') {
      const response = await exports.POST(
        new Request('https://mtv.etalimai.uz/api/listeners/lookup', {
          method: 'POST',
          headers: {
            origin,
            'content-type': 'application/json',
            'x-mtv-audience': audience,
          },
          body: JSON.stringify(body),
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

test('admin opens all groups without group, year, month or phone', async () => {
  const { body, status, cookie } = await setup({ admin: true }).lookup();
  assert.equal(status, 200);
  assert.equal(body.found, true);
  assert.equal(body.canViewAll, true);
  assert.deepEqual(body.cohort, {
    group: '',
    year: '',
    month: '',
    category: '',
  });
  assert.deepEqual(
    body.listeners.map((row) => row.id),
    ['owner', 'peer', 'other-year', 'other-group'],
  );
  assert.ok(body.listeners.every((row) => row.privateDetails));
  assert.equal(cookie, null);
});
for (const [name, filters, ids] of [
  ['group only', { group: group56 }, ['owner', 'peer', 'other-year']],
  ['year only', { year: '2025' }, ['other-year']],
  ['month only', { month: '09' }, ['owner', 'peer', 'other-group']],
  ['group and year', { group: group56, year: '2026' }, ['owner', 'peer']],
  [
    'exact cohort',
    { group: group56, year: '2026', month: '09' },
    ['owner', 'peer'],
  ],
  [
    'saved registration date',
    { group: group56, year: '2026', startDate: '2026-09-01' },
    ['owner', 'peer'],
  ],
  ['unknown group', { group: 'Unknown group' }, []],
]) {
  test('admin supports ' + JSON.stringify(name), async () => {
    const result = await setup({ admin: true }).lookup(filters);
    assert.equal(result.status, 200);
    assert.deepEqual(
      result.body.listeners.map((row) => row.id),
      ids,
    );
  });
}
test('admin ignores stale device ownership', async () => {
  const result = await setup({
    admin: true,
    device: { listenerId: 'owner' },
  }).lookup();
  assert.equal(result.body.listeners.length, 4);
  assert.equal(result.body.ownerListenerId, '');
  assert.equal(result.cookie, null);
});
for (const filters of [{ year: 'oops' }, { month: '13' }, { month: '0' }]) {
  test(
    'admin rejects malformed filters ' + JSON.stringify(filters),
    async () => {
      const app = setup({ admin: true });
      assert.equal((await app.lookup(filters)).status, 400);
      assert.equal(app.calls.length, 0);
    },
  );
}
test('anonymous cannot request all groups or forge admin flags', async () => {
  const app = setup();
  for (const body of [
    {},
    { group: group56 },
    { canViewAll: true, role: 'Bosh admin' },
  ]) {
    assert.equal((await app.lookup(body)).status, 403);
  }
  assert.equal(app.calls.length, 0);
});
test('phone knowledge does not grant access to any cohort', async () => {
  const app = setup();
  const result = await app.lookup({ phone: '+998901111111', group: group56 });
  assert.equal(result.status, 403);
  assert.equal(result.body.listeners, undefined);
  assert.equal(app.calls.length, 0);
});
test('device lookup cannot escape stored cohort; only owner sees full details', async () => {
  const result = await setup({ device: { listenerId: 'owner' } }).lookup({
    group: group57,
    year: '',
    month: '',
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.listeners, [
    { id: 'owner', privateDetails: true },
    { id: 'peer', privateDetails: false },
  ]);
  assert.equal(result.cookie, null);
});
test('unknown or deleted phone does not expose any group', async () => {
  for (const phone of ['909999999', '905555555']) {
    const result = await setup().lookup({ phone });
    assert.equal(result.status, 403);
    assert.equal(result.body.listeners, undefined);
  }
});
test('origin and rate-limit checks remain enforced for admin', async () => {
  assert.equal(
    (await setup({ admin: true }).lookup({}, 'https://other.invalid')).status,
    403,
  );
  assert.equal(
    (await setup({ admin: true, throttled: true }).lookup()).status,
    429,
  );
});
test('database errors return no records', async () => {
  const result = await setup({ admin: true, databaseFails: true }).lookup();
  assert.equal(result.status, 503);
  assert.equal(result.body.listeners, undefined);
});
test('admin heading describes only the chosen scope, never a guessed majority month', () => {
  assert.equal(
    formatAdminCohort({ group: '', year: '', month: '' }),
    'Barcha guruhlar · Barcha davrlar',
  );
  assert.equal(
    formatAdminCohort({ group: group56, year: '', month: '' }),
    group56 + ' · Barcha davrlar',
  );
  assert.equal(
    formatAdminCohort({ group: group56, year: '2026', month: '09' }),
    'Nomzod direktor (2026 yil, sentyabr, 56-guruh)',
  );
  assert.equal(
    formatAdminCohort({ group: '', year: '2026', month: '09' }),
    'Barcha guruhlar · 2026 yil, sentyabr',
  );
});

test('public form in an admin browser still stays in the device cohort', async () => {
  const result = await setup({
    admin: true,
    audience: 'listener',
    device: { listenerId: 'owner' },
  }).lookup({ group: group57, year: '2025', month: '08' });
  assert.equal(result.status, 200);
  assert.equal(result.body.canViewAll, false);
  assert.deepEqual(result.body.listeners, [
    { id: 'owner', privateDetails: true },
    { id: 'peer', privateDetails: false },
  ]);
});

test('public audience without a device or phone never inherits admin access', async () => {
  assert.equal(
    (await setup({ admin: true, audience: 'listener' }).lookup()).status,
    403,
  );
  assert.equal((await setup({ audience: 'admin' }).lookup()).status, 403);
});

test('pressing Ko‘rish again reloads new peers but never another group', async () => {
  const records = fixtures.map((row) => ({ ...row }));
  const app = setup({ device: { listenerId: 'owner' }, records });
  assert.equal((await app.lookup()).body.listeners.length, 2);
  records.push({ ...records[1], id: 'new-peer' });
  records.push({ ...records[3], id: 'new-other-group' });
  const refreshed = await app.lookup({ group: group57, year: '2025' });
  assert.deepEqual(
    refreshed.body.listeners.map((row) => row.id),
    ['owner', 'peer', 'new-peer'],
  );
  assert.equal(refreshed.body.cohort.group, group56);
});

test('category and registration identity prevent cross-cohort access even with the same phone', async () => {
  const records = fixtures.map((row) => ({ ...row }));
  records.push({
    ...records[0],
    id: 'different-category',
    category: 'Different course',
  });
  records[3].phone_digits = records[0].phone_digits;
  const result = await setup({
    device: { listenerId: 'owner' },
    records,
  }).lookup({ phone: records[3].phone_digits, group: group57 });
  assert.deepEqual(
    result.body.listeners.map((row) => row.id),
    ['owner', 'peer'],
  );
  assert.equal(result.body.cohort.category, 'Nomzod direktor');
});
