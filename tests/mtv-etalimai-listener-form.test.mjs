import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import { formatAdminCohort } from '../lib/listener-preview.ts';
import { listenerAudienceHeaders } from '../lib/listener-audience.ts';

// Execute the real form with deterministic hooks and mocked network responses.
// No production database writes, browser cookies or external personal data.
const source = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source + '\nexport { ListenerForm };', {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const group = 'Nomzod direktor (56-guruh)';
const owner = {
  id: 'owner',
  group,
  year: '2026',
  startDate: '2026-09-01',
  phone: '+998 90 111 11 11',
  name: 'Test Listener',
  surname: 'Test',
  firstName: 'Listener',
  workplace: 'Test MTM',
  region: 'Toshkent shahri',
  district: 'Yunusobod tumani',
  position: 'Direktor',
  photo: '',
  category: 'Nomzod direktor',
  status: 'Тўлдирилмаган',
};
const peer = { ...owner, id: 'peer', phone: '+998 ** *** ** 22' };
const cohort = { group, year: '2026', month: '09' };
const responseFor = (listeners) =>
  Response.json({ found: true, cohort, listeners, ownerListenerId: 'owner' });

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function textOf(tree) {
  if (Array.isArray(tree)) return tree.map(textOf).join('');
  if (tree == null || typeof tree === 'boolean') return '';
  if (typeof tree !== 'object') return String(tree);
  return textOf(tree.props?.children);
}
function setup(overrides = {}) {
  let cursor = 0,
    dirty = false,
    effects = [],
    tree;
  const slots = [],
    requests = [],
    saves = [];
  let reply = () => responseFor([owner, peer]);
  const props = {
    isAdminForm: false,
    canEdit: false,
    canSelectAnyGroup: false,
    canViewAnyGroup: false,
    rows: [],
    telegramGroupUrl: 'https://t.me/example',
    lockedGroup: '',
    ownerListenerId: '',
    deviceBindingVerified: false,
    availableGroups: [group],
    districtOptions: { 'Toshkent shahri': ['Yunusobod tumani'] },
    initialEditingRecord: null,
    onPreviewLoaded: () => {},
    onCancel: () => {},
    onSave: async (...args) => {
      saves.push(args);
      return owner;
    },
    ...overrides,
  };
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[index],
        (next) => {
          const value = typeof next === 'function' ? next(slots[index]) : next;
          if (!Object.is(value, slots[index])) {
            slots[index] = value;
            dirty = true;
          }
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useMemo: (factory) => factory(),
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous[i]))) {
        slots[index] = deps;
        effects.push(effect);
      }
    },
  };
  class TestFormData extends FormData {
    constructor(form) {
      super();
      for (const [name, value] of Object.entries(form?.values || {}))
        this.set(name, value);
    }
  }
  const dependencies = {
    react: hooks,
    'react/jsx-runtime': jsxRuntime,
    'next/link': { default: 'a' },
    '@/lib/listener-preview': { formatAdminCohort },
    '@/lib/listener-audience': { listenerAudienceHeaders },
    '@/components/form-share-bar': { FormShareBar: () => null },
    '@/components/form-navigation': { FormNavigation: () => null },
    '@/components/google-admin-login': { GoogleAdminLogin: () => null },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    File,
    FormData: TestFormData,
    window: { requestAnimationFrame: () => {} },
    fetch: async (url, options) => {
      requests.push({ url, ...options, payload: JSON.parse(options.body) });
      return reply();
    },
    require: (id) => {
      assert.ok(dependencies[id], id);
      return dependencies[id];
    },
  });
  function render() {
    for (let attempts = 0; attempts < 15; attempts++) {
      cursor = 0;
      dirty = false;
      effects = [];
      tree = exports.ListenerForm(props);
      effects.forEach((effect) => effect());
      if (!dirty) return tree;
    }
    throw new Error('Render did not settle');
  }
  render();
  return {
    requests,
    saves,
    props,
    get tree() {
      return tree;
    },
    find: (predicate) => nodes(tree).filter(predicate),
    setReply(next) {
      reply = next;
    },
    update(next) {
      Object.assign(props, next);
      render();
    },
    changeFilter(name, value) {
      const field = nodes(tree).find(
        (node) => node.props?.['aria-label'] === 'Ko‘rish uchun ' + name,
      );
      assert.ok(field, 'Missing filter: ' + name);
      field.props.onChange({ target: { value } });
      render();
    },
    async view() {
      nodes(tree)
        .find((node) => node.props?.['aria-label'] === 'Ko‘rish')
        .props.onClick();
      await new Promise((resolve) => setImmediate(resolve));
      render();
    },
    async save() {
      await nodes(tree)
        .find((node) => node.type === 'form')
        .props.onSubmit({
          preventDefault() {},
          currentTarget: {
            checkValidity: () => true,
            values: { ...owner, phone: '901111111' },
          },
        });
      render();
    },
    async click(label) {
      const button = nodes(tree).find(
        (node) => node.type === 'button' && textOf(node).includes(label),
      );
      assert.ok(button, 'Missing button ' + label);
      button.props.onClick();
      await new Promise((resolve) => setImmediate(resolve));
      render();
    },
  };
}
const filters = (app) =>
  app.find(
    (node) =>
      node.type === 'select' &&
      node.props['aria-label']?.startsWith('Ko‘rish uchun'),
  );
const cardsHidden = (app) =>
  app.find((node) => node.props?.className === 'form-entry-sections')[0].props
    .hidden;

test('Telegram joining is shown only on the ordinary listener form', () => {
  const invite = (app) =>
    app.find((node) => node.props?.className === 'form-telegram-invite');
  const ordinary = setup();
  assert.equal(invite(ordinary).length, 1);
  assert.equal(invite(ordinary)[0].props.href, 'https://t.me/example');
  for (const canViewAnyGroup of [false, true]) {
    const admin = setup({
      isAdminForm: true,
      canViewAnyGroup,
      canSelectAnyGroup: true,
      canEdit: true,
    });
    assert.equal(invite(admin).length, 0);
    assert.ok(!textOf(admin.tree).includes('Telegram guruhimiz'));
  }
});

test('ordinary form has no browse filters; admin has year/month above category/group', () => {
  assert.equal(filters(setup()).length, 0);
  assert.equal(
    setup().find(
      (node) =>
        node.props?.['aria-label'] === 'Ro‘yxatdan o‘tgan telefon raqami',
    ).length,
    0,
  );
  const admin = setup({
    isAdminForm: true,
    canViewAnyGroup: true,
    canSelectAnyGroup: true,
    canEdit: true,
  });
  assert.equal(filters(admin).length, 4);
  assert.deepEqual(
    filters(admin).map((node) => node.props['aria-label']),
    [
      'Ko‘rish uchun yil',
      'Ko‘rish uchun oy',
      'Ko‘rish uchun kategoriya',
      'Ko‘rish uchun guruh',
    ],
  );
  assert.ok(textOf(admin.tree).includes('Bosh admin formasi'));
  assert.ok(admin.find((node) => node.props?.href === '/?section=form').length);
});

test('admin category narrows groups and all four filters reach the server', async () => {
  const otherGroup = 'Metodist (10-guruh)';
  const app = setup({
    isAdminForm: true,
    canViewAnyGroup: true,
    canSelectAnyGroup: true,
    rows: [owner, { ...peer, category: 'Metodist', group: otherGroup }],
    availableGroups: [group, otherGroup],
  });
  app.changeFilter('guruh', group);
  app.changeFilter('kategoriya', 'Metodist');
  const groupField = () =>
    filters(app).find(
      (node) => node.props['aria-label'] === 'Ko‘rish uchun guruh',
    );
  assert.equal(groupField().props.value, '');
  assert.ok(textOf(groupField()).includes(otherGroup));
  assert.ok(!textOf(groupField()).includes(group));
  app.changeFilter('yil', '2026');
  app.changeFilter('oy', '09');
  app.changeFilter('guruh', otherGroup);
  app.setReply(() =>
    Response.json({
      found: true,
      cohort: {
        group: otherGroup,
        year: '2026',
        month: '09',
        category: 'Metodist',
      },
      listeners: [],
    }),
  );
  await app.view();
  const payload = app.requests[0].payload;
  assert.equal(payload.year, '2026');
  assert.equal(payload.month, '09');
  assert.equal(payload.category, 'Metodist');
  assert.equal(payload.group, otherGroup);
  assert.ok(
    textOf(app.tree).includes('Metodist (2026 yil, sentyabr, 10-guruh)'),
  );
  app.changeFilter('kategoriya', '');
  assert.equal(groupField().props.value, '');
  assert.ok(textOf(groupField()).includes(group));
});

test('returning bound listener sees own cards, not another registration', async () => {
  const app = setup({
    rows: [owner, peer],
    lockedGroup: group,
    ownerListenerId: 'owner',
    deviceBindingVerified: true,
  });
  assert.equal(cardsHidden(app), true);
  const lock = app.find(
    (node) => node.props?.['aria-label'] === 'Biriktirilgan o‘quv guruhi',
  )[0];
  assert.match(textOf(lock), /2026 yil/);
  assert.match(textOf(lock), /sentyabr/);
  assert.match(textOf(lock), /Nomzod direktor/);
  assert.match(textOf(lock), /56-guruh/);
  assert.equal(filters(app).length, 0);
  assert.equal(
    app.find(
      (node) =>
        node.props?.['aria-label'] === 'Ro‘yxatdan o‘tgan telefon raqami',
    ).length,
    0,
  );
  assert.ok(!textOf(app.tree).includes('Formaga qaytish'));
  await app.view();
  app.setReply(() => responseFor([owner, peer, { ...peer, id: 'new-peer' }]));
  await app.view();
  assert.equal(app.requests.length, 2);
  assert.ok(
    app.requests.every(
      (request) =>
        request.cache === 'no-store' &&
        request.headers['x-mtv-audience'] === 'listener',
    ),
  );
  assert.ok(
    app.requests.every((request) => Object.keys(request.payload).length === 0),
  );
  assert.ok(textOf(app.tree).includes('3 nafar'));
});

test('failed refresh preserves the last confirmed cards and reports the error', async () => {
  const app = setup({
    rows: [owner, peer],
    lockedGroup: group,
    ownerListenerId: 'owner',
    deviceBindingVerified: true,
  });
  app.setReply(() =>
    Response.json({ error: 'Connection unavailable' }, { status: 503 }),
  );
  await app.view();
  assert.equal(cardsHidden(app), true);
  assert.ok(textOf(app.tree).includes('2 nafar'));
  assert.ok(textOf(app.tree).includes('Connection unavailable'));
});

test('successful registration shows saved card even if its follow-up refresh fails', async () => {
  const app = setup();
  app.setReply(() =>
    Response.json({ error: 'Refresh failed' }, { status: 503 }),
  );
  await app.save();
  assert.equal(app.saves.length, 1);
  assert.equal(cardsHidden(app), true);
  assert.ok(textOf(app.tree).includes('1 nafar'));
  assert.ok(textOf(app.tree).includes('ro‘yxatga kiritildi'));
});

test('ordinary edit cannot change group/date and cancel returns to cards', async () => {
  const app = setup({
    rows: [owner, peer],
    lockedGroup: group,
    ownerListenerId: 'owner',
    deviceBindingVerified: true,
  });
  await app.click('TAHRIRLASH');
  assert.equal(cardsHidden(app), false);
  assert.equal(
    app.find((node) => node.type === 'select' && node.props.disabled)[0].props
      .value,
    group,
  );
  assert.equal(
    app.find((node) => node.props?.name === 'startDate')[0].props.readOnly,
    true,
  );
  await app.click('TAHRIRNI BEKOR QILISH');
  assert.equal(cardsHidden(app), true);
});

test('admin can open all groups without filters and edit a completed card', async () => {
  const app = setup({
    isAdminForm: true,
    canViewAnyGroup: true,
    canSelectAnyGroup: true,
    canEdit: true,
  });
  app.setReply(() =>
    Response.json({
      found: true,
      cohort: { group: '', year: '', month: '' },
      listeners: [{ ...owner, status: 'Тўлиқ' }],
    }),
  );
  await app.view();
  assert.equal(app.requests[0].headers['x-mtv-audience'], 'admin');
  assert.equal(app.requests[0].payload.group, '');
  await app.click('TAHRIRLASH');
  assert.equal(cardsHidden(app), false);
  assert.equal(
    app.find((node) => node.props?.name === 'startDate')[0].props.readOnly,
    false,
  );
});
