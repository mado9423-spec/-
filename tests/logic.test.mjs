// Unit tests for the app's pure logic and its data-integrity / injection guards (no browser needed).
//   node --test tests/logic.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadApp } from './helpers/load-app.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = loadApp();
A.applyLang('en');
const demo = () => { A.S = A.seedDemo(); return A.S; };

/* ---------- reference calculations ---------- */
test('ISO 6346 container check digit: the standard example and the demo containers', () => {
  assert.equal(A.validContainer('CSQU3054383'), true); // the example in ISO 6346 itself
  assert.equal(A.validContainer('csqu 305438-3'), true); // case, spaces and dashes are ignored
  assert.equal(A.validContainer('CSQU3054384'), false); // wrong check digit
  assert.equal(A.validContainer('CSQU305438'), false); // too short
  assert.equal(A.validContainer('CSQX3054383'), false); // category letter must be U, J, Z or R
  assert.equal(A.validContainer(''), false);
  assert.equal(A.validContainer(null), false);
  for (const sh of demo().ships) for (const c of sh.containers) assert.equal(A.validContainer(c.no), true, c.no);
  assert.equal(A.makeContainer('ABC', '123456').length, 11);
  assert.equal(A.validContainer(A.makeContainer('ABC', '123456')), true);
});
test('letter of credit arithmetic: cover, tolerance, due date, outstanding', () => {
  const lc = { no: '1', usd: 480000, rate: 6.34, cover: 20, dev: 5, open: '2026-10-01', days: 60, paid: 300000, invoices: [100000, 50000], status: 'issued' };
  const c = A.calcLC(lc);
  assert.equal(Math.round(c.lyd), 3043200);
  assert.equal(Math.round(c.req), 608640);
  assert.equal(c.max, 504000);
  assert.equal(c.inv, 150000);
  assert.equal(Math.round(c.out), 308640);
  assert.equal(A.iso(c.due), '2026-11-30');
  assert.equal(A.calcLC({ ...lc, status: 'closed' }).out, 0);
});
test('sole-trader / channel advice follows the reported limits', () => {
  assert.equal(A.adviseChannel({ trade: false, kind: 'company', usd: 1e6 }).id, 'not-trade');
  assert.equal(A.adviseChannel({ trade: true, kind: 'sole', usd: 50000 }).id, 'sole');
  assert.equal(A.adviseChannel({ trade: true, kind: 'sole', usd: 250000 }).id, 'lc');
  assert.ok(['lc', 'lc-split'].includes(A.adviseChannel({ trade: true, kind: 'company', usd: 2e6 }).id));
  assert.equal(A.ceilingFromTax(1000, 100), 31000);
});
test('portal email reader: status and ACI number, English and Arabic, nothing invented', () => {
  assert.deepEqual({ ...A.parsePortalMessage('Your shipment ACI number: ACI-2610-77412 has been completed.') }, { status: 'completed', number: 'ACI-2610-77412' });
  assert.equal(A.parsePortalMessage('تم الإفراج: الشحنة مفرج عنها').status, 'released');
  assert.equal(A.parsePortalMessage('Lorem ipsum dolor sit amet').status, null);
  assert.equal(A.parsePortalMessage('Lorem ipsum').number, null);
  assert.equal(A.parsePortalMessage(null).status, null);
  assert.equal(A.parsePortalMessage('ACI number: 12').number, null); // too short to be a real number
});
test('ACI pre-check flags an empty draft and passes a finished demo shipment', () => {
  const S = demo();
  const empty = { ...S.ships[0], items: [], containers: [], docs: {}, valueUsd: 0, imo: '', booking: '', aci: { ...S.ships[0].aci, exporterTin: '', importerStat: '' } };
  const errs = A.aciChecks(empty).filter((x) => x.lvl === 'err');
  assert.ok(errs.length >= 6, `expected several errors, got ${errs.length}`);
  const done = S.ships.find((s) => s.aci.status === 'completed' || s.aci.status === 'released');
  assert.equal(A.aciChecks(done).filter((x) => x.lvl === 'err').length, 0);
});

/* ---------- data integrity ---------- */
test('the demo state is valid and survives normalisation unchanged', () => {
  const S = demo();
  const { state, dropped } = A.normalizeState(JSON.parse(JSON.stringify(S)));
  assert.equal(dropped, 0);
  assert.equal(state.ships.length, S.ships.length);
  assert.equal(state.lcs.length, S.lcs.length);
  assert.deepEqual(JSON.parse(JSON.stringify(state.org)), JSON.parse(JSON.stringify(S.org)));
  for (const sh of state.ships) assert.ok(A.aciIndex(sh.aci.status) >= 0);
});
test('normalisation refuses foreign versions and non-objects, and repairs bad fields', () => {
  assert.equal(A.normalizeState(null).state, null);
  assert.equal(A.normalizeState([]).state, null);
  assert.equal(A.normalizeState({ v: 1 }).state, null);
  assert.equal(A.normalizeState({ v: 2, ships: 'x' }).state.ships.length, 0);
  const bad = {
    v: 2, mode: 'weird', theme: 'purple', onboarded: 1, bankSel: -4,
    org: { type: 'martian', name: 'x'.repeat(5000) }, tax: { income: 'abc', payroll: -5 },
    lcs: [
      { no: '1', usd: -10, rate: 'NaN', cover: 500, dev: -3, days: 0, status: 'pwned', open: 'yesterday', paid: Infinity, invoices: ['a', 5] },
      { no: '1', usd: 1 }, // duplicate id
      { usd: 1 }, // no id
      'string', null, 7,
    ],
    ships: [{ id: 'S1', channel: 'X', aci: { status: 'hacked', history: [{ s: 'nope', at: 'bad' }] }, docs: { invoice: { file: 'f.pdf', at: 'bad' }, evil: 5 }, containers: 'none', valueUsd: '12abc' }],
  };
  const { state, dropped } = A.normalizeState(bad);
  assert.equal(state.mode, 'live'); assert.equal(state.theme, null); assert.equal(state.bankSel, 0);
  assert.equal(state.org.type, null); assert.equal(state.org.name.length, 400);
  assert.deepEqual(JSON.parse(JSON.stringify(state.tax)), { income: 0, payroll: 0 });
  assert.equal(state.lcs.length, 1); assert.equal(dropped, 5);
  const lc = state.lcs[0];
  assert.equal(lc.usd, 0); assert.equal(lc.cover, 100); assert.equal(lc.dev, 0); assert.equal(lc.days, 1); assert.equal(lc.status, 'draft'); assert.equal(lc.paid, 0);
  assert.match(lc.open, /^\d{4}-\d{2}-\d{2}$/); assert.deepEqual([...lc.invoices], [0, 5]);
  assert.ok(Number.isFinite(lc.rate) && lc.rate > 0);
  const sh = state.ships[0];
  assert.equal(sh.channel, 'LC'); assert.equal(sh.aci.status, 'draft'); assert.equal(sh.aci.history[0].s, 'draft'); assert.equal(sh.aci.history[0].at, '');
  assert.equal(sh.docs.invoice.at, ''); assert.ok(!('evil' in sh.docs)); assert.deepEqual([...sh.containers], []); assert.equal(sh.valueUsd, 12);
  assert.ok(Number.isFinite(A.calcLC(lc).elapsed)); // repaired values keep the calculations finite
});
test('prototype pollution payloads are inert', () => {
  const evil = JSON.parse('{"v":2,"__proto__":{"polluted":1},"org":{"__proto__":{"polluted":2},"constructor":{"prototype":{"polluted":3}}},"ships":[{"id":"S","__proto__":{"polluted":4},"docs":{"__proto__":{"file":"x"}}}]}');
  const { state } = A.normalizeState(evil);
  assert.equal(A.__eval('({}).polluted'), undefined); // evaluated in the app's own realm
  assert.equal(A.__eval('({}).file'), undefined);
  assert.equal(state.org.polluted, undefined);
  assert.equal(Object.getPrototypeOf(state.org).hasOwnProperty('polluted'), false);
  assert.equal(state.ships.length, 1);
});
test('scrub bounds depth, size and numbers', () => {
  const deep = JSON.parse('{"a":'.repeat(20) + '1' + '}'.repeat(20));
  assert.ok(JSON.stringify(A.scrub(deep)).length < JSON.stringify(deep).length);
  assert.equal(A.scrub('y'.repeat(9000)).length, 2000);
  assert.equal(A.scrub(NaN), 0); assert.equal(A.scrub(Infinity), 0);
  assert.equal(A.scrub(new Array(5000).fill(1)).length, 3000);
  assert.equal(A.scrub(() => 1), undefined);
});
test('markup in data stays text: names with tags survive as plain strings (rendering uses text nodes only)', () => {
  const { state } = A.normalizeState({ v: 2, ships: [{ id: 'S1', supplier: { name: '<img src=x onerror=alert(1)>' } }] });
  assert.equal(state.ships[0].supplier.name, '<img src=x onerror=alert(1)>');
});
test('local storage: unreadable or repaired data is kept aside instead of being overwritten', () => {
  const B = loadApp();
  B.__store.set('app.state.v2', '{not json');
  assert.equal(B.loadLocal(), null);
  assert.equal(B.__store.get('app.state.v2.unreadable'), '{not json');
  B.__store.set('app.state.v2', JSON.stringify({ v: 1, ships: [] })); // an older data version
  assert.equal(B.loadLocal(), null);
  assert.ok(B.__store.get('app.state.v2.unreadable').includes('"v":1'));
  B.__store.set('app.state.v2', JSON.stringify({ v: 2, onboarded: true, ships: [{ id: 'ok' }, { nope: 1 }] }));
  const s = B.loadLocal();
  assert.equal(s.ships.length, 1);
  assert.ok(B.__store.get('app.state.v2.repaired').includes('nope'));
  B.purgeLocal();
  assert.equal(B.__store.size, 0);
});

/* ---------- injection guards ---------- */
test('URL attributes: only http(s), mailto, tel, blob or relative', () => {
  for (const ok of ['https://example.com/a?b=1', 'http://x.y', 'mailto:a@b.c', 'tel:+218912345678', 'blob:https://x/uuid', '#top', 'icons/icon.svg', '/path', './x']) assert.equal(A.safeUrl(ok), true, ok);
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', '\u0001javascript:1']) assert.equal(A.safeUrl(bad), false, JSON.stringify(bad));
});
test('source scan: no eval, no document.write, no string handlers, innerHTML only for the three constant-driven SVG helpers', () => {
  const files = readdirSync(join(root, 'src/js')).filter((f) => f.endsWith('.js'));
  const hits = { innerHTML: [] };
  for (const f of files) {
    const text = readFileSync(join(root, 'src/js', f), 'utf8');
    assert.ok(!/\beval\s*\(/.test(text), `eval in ${f}`);
    assert.ok(!/new\s+Function\s*\(/.test(text), `new Function in ${f}`);
    assert.ok(!/document\.write\s*\(/.test(text), `document.write in ${f}`);
    assert.ok(!/\.(outerHTML|insertAdjacentHTML)\b/.test(text), `HTML insertion in ${f}`);
    assert.ok(!/setAttribute\(\s*['"]on/i.test(text), `inline handler in ${f}`);
    assert.ok(!/\sstyle="/.test(text), `inline style attribute in ${f} (blocked by the CSP)`);
    assert.ok(!/\sstyle=\\"/.test(text), `inline style attribute in ${f}`);
    text.split('\n').forEach((line, i) => { if (/\.innerHTML\s*=/.test(line)) hits.innerHTML.push(`${f}:${i + 1}`); });
  }
  assert.deepEqual(hits.innerHTML.map((x) => x.split(':')[0]).sort(), ['10-icons.js', '40-ui.js', '52-finance.js']);
  const shell = readFileSync(join(root, 'src/shell.html'), 'utf8');
  assert.ok(!/\sstyle=|\son[a-z]+=/i.test(shell), 'shell.html must have no inline style or handlers');
});
test('every external link is a constant: the data model holds no URLs the app would render as links', () => {
  const S = demo();
  assert.ok(!JSON.stringify(S).match(/javascript:|https?:\/\//i), 'demo data contains URLs');
});
