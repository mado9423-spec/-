// Loads the app's source files (everything except the boot file) into a sandboxed Node context with a tiny DOM stub,
// so pure logic (calculations, validation, normalisation, parsers) can be unit-tested without a browser.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FIXED_NOW = Date.UTC(2026, 9, 7, 9, 0, 0); // 7 Oct 2026

export function loadApp({ files } = {}) {
  const names = readdirSync(join(root, 'src/js')).filter((f) => f.endsWith('.js') && f !== '99-main.js').sort();
  const src = (files || names).map((f) => `/* ${f} */\n` + readFileSync(join(root, 'src/js', f), 'utf8')).join('\n');
  // every top-level function/const/let becomes reachable from the tests
  const decl = [...src.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/gm)].map((m) => m[1] || m[2]);
  const uniq = [...new Set(decl)].filter((n) => n !== 'S');
  const body = `(function(){'use strict';\n${src}\nreturn { ${uniq.join(', ')}, get S(){return S}, set S(v){S=v} };\n})()`;

  const store = new Map();
  class FakeDate extends Date {
    constructor(...a) { if (a.length === 0) super(FIXED_NOW); else super(...a); }
    static now() { return FIXED_NOW; }
  }
  class FakeElement { }
  const noop = () => { };
  const sandbox = {
    console, Intl, JSON, Math, Number, String, Array, Object, Set, Map, RegExp, Promise, Symbol, Error, TypeError, Infinity, NaN, parseFloat, parseInt, isFinite, isNaN, encodeURIComponent, decodeURIComponent,
    URL, Blob: class { }, setTimeout: noop, clearTimeout: noop, requestAnimationFrame: noop,
    Date: FakeDate, Element: FakeElement,
    document: { documentElement: { dataset: {}, lang: '', dir: '' }, title: '', createElement: () => ({}), createDocumentFragment: () => ({}), querySelector: () => null, querySelectorAll: () => [], addEventListener: noop },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } },
    navigator: {}, matchMedia: () => ({ matches: false, addEventListener: noop }), location: { href: 'http://localhost/', hash: '' },
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  const api = vm.runInContext(body, ctx, { filename: 'app-sources.js' });
  api.__store = store;
  api.__eval = (code) => vm.runInContext(code, ctx); // evaluates inside the app's realm (for prototype checks)
  return api;
}
