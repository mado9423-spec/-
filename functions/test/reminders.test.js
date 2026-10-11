'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeReminders, digestMessage, daysBetween, addDays } = require('../reminders');

const TODAY = '2026-10-07';

test('date helpers', () => {
  assert.equal(daysBetween('2026-10-07', '2026-10-10'), 3);
  assert.equal(daysBetween('2026-10-07', '2026-10-05'), -2);
  assert.equal(addDays('2026-10-30', 3), '2026-11-02');
});
test('ACI deadline is 2 days before loading and only until the number is issued', () => {
  const ship = (id, etd, status) => ({ id, etd, aci: { status } });
  const r = computeReminders({ ships: [ship('A', '2026-10-09', 'draft'), ship('B', '2026-10-10', 'importer_review'), ship('C', '2026-10-09', 'awaiting_bl'), ship('D', '', 'draft'), ship('E', '2026-10-20', 'draft')] }, TODAY);
  assert.deepEqual(r.map((x) => x.key), ['aci:A:0', 'aci:B:1']);
  assert.match(r[0].ar, /اليوم/); assert.match(r[1].en, /tomorrow/);
});
test('document expiry at 30, 7 and 0 days only', () => {
  const doc = (id, d) => ({ id, type: 'tax', exp: addDays(TODAY, d) });
  const r = computeReminders({ documents: [doc('a', 30), doc('b', 7), doc('c', 0), doc('d', 12), doc('e', -3), { id: 'f', type: 'license' }] }, TODAY);
  assert.deepEqual(r.map((x) => x.key).sort(), ['doc:a:30', 'doc:b:7', 'doc:c:0']);
});
test('credit due date = open + days, only for issued credits', () => {
  const lc = (no, status, left) => ({ no, status, open: addDays(TODAY, left - 60), days: 60 });
  const r = computeReminders({ credits: [lc('1', 'issued', 3), lc('2', 'issued', 5), lc('3', 'closed', 3), lc('4', 'draft', 3), lc('5', 'issued', 0)] }, TODAY);
  assert.deepEqual(r.map((x) => x.key), ['lc:5:0', 'lc:1:3']);
});
test('every company-document type the app can store has a name in the digest', () => {
  for (const type of ['license', 'tax', 'ss', 'pts', 'aci', 'cblkey']) {
    const r = computeReminders({ documents: [{ id: 'd', type, exp: addDays(TODAY, 7) }] }, TODAY);
    assert.equal(r.length, 1);
    assert.ok(!/مستند الشركة|Business document/.test(r[0].ar + r[0].en), type);
  }
});
test('results are ordered by urgency; digest is null when nothing is due', () => {
  const r = computeReminders({ documents: [{ id: 'a', type: 'tax', exp: addDays(TODAY, 30) }, { id: 'b', type: 'license', exp: addDays(TODAY, 0) }] }, TODAY);
  assert.deepEqual(r.map((x) => x.left), [0, 30]);
  const m = digestMessage('Al-Nour', r);
  assert.match(m.subject, /2/); assert.match(m.text, /Business license/);
  assert.equal(digestMessage('x', []), null);
  assert.deepEqual(computeReminders({}, TODAY), []);
});
