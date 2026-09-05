import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import { formUrls } from '../lib/form-sharing.ts';

const source = readFileSync(
  new URL('../components/form-navigation.tsx', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const exports = {};
runInNewContext(compiled, {
  exports,
  require: (id) => {
    if (id === '@/lib/form-sharing') return { formUrls };
    assert.equal(id, 'react/jsx-runtime');
    return jsxRuntime;
  },
});
function links(adminEntry, formActive) {
  return exports.FormNavigation({ adminEntry, formActive }).props.children;
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  if (!node || typeof node === 'boolean') return '';
  return typeof node === 'object' ? text(node.props?.children) : String(node);
}

test('ordinary and head-admin forms are separate menu links on every route', () => {
  for (const adminEntry of [false, true]) {
    for (const formActive of [false, true]) {
      const [ordinary, admin] = links(adminEntry, formActive);
      assert.equal(ordinary.type, 'a');
      assert.equal(admin.type, 'a');
      assert.equal(text(ordinary), 'TINGLOVCHI FORMASI');
      assert.equal(text(admin), 'BOSH ADMIN FORMASI');
      assert.equal(ordinary.props.href, 'https://mtv.etalimai.uz/?section=form');
      assert.equal(admin.props.href, 'https://mtv.etalimai.uz/admin?section=form');
      // Do not reuse the current route's privilege state with a shallow switch.
      assert.equal(ordinary.props.onClick, undefined);
      assert.equal(admin.props.onClick, undefined);
    }
  }
});
test('ordinary form highlights only its own menu item', () => {
  const [ordinary, admin] = links(false, true);
  assert.equal(ordinary.props['aria-current'], 'page');
  assert.equal(ordinary.props.className, 'nav-item active');
  assert.equal(admin.props['aria-current'], undefined);
  assert.equal(admin.props.className, 'nav-item');
});
test('admin form highlights only the separate admin menu item', () => {
  const [ordinary, admin] = links(true, true);
  assert.equal(ordinary.props['aria-current'], undefined);
  assert.equal(ordinary.props.className, 'nav-item');
  assert.equal(admin.props['aria-current'], 'page');
  assert.equal(admin.props.className, 'nav-item active');
});
test('other sections highlight neither form menu item', () => {
  for (const adminEntry of [false, true]) {
    for (const link of links(adminEntry, false)) {
      assert.equal(link.props['aria-current'], undefined);
      assert.equal(link.props.className, 'nav-item');
    }
  }
});
test('the existing protected admin route and distinct form heading are preserved', () => {
  const page = readFileSync(
    new URL('../app/page.tsx', import.meta.url),
    'utf8',
  );
  assert.ok(page.includes('if (adminEntry && !adminViewer)'));
  assert.ok(page.includes("fetch('/api/admin/session'"));
  assert.ok(page.includes('adminEntry={adminEntry}'));
  assert.ok(page.includes("formActive={activeSection === 'form'}"));
  assert.ok(page.includes("? 'Bosh admin formasi'"));
  assert.ok(page.includes('isAdminForm={adminEntry}'));
});
