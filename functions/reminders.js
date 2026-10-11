'use strict';
/* Pure logic: which reminders are due today for one business. No Firebase imports, so it is unit-tested directly.
   Dates are ISO strings (YYYY-MM-DD), exactly as the app stores them. The thresholds mirror the in-app alerts. */

const ACI_ORDER = ['draft', 'importer_review', 'supplier_completion', 'customs_review', 'awaiting_bl', 'bl_review', 'completed', 'released'];
const DAY = 864e5;
const utc = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };
const daysBetween = (fromIso, toIso) => Math.round((utc(toIso) - utc(fromIso)) / DAY);
const addDays = (iso, n) => new Date(utc(iso) + n * DAY).toISOString().slice(0, 10);

const ACI_DAYS = [7, 3, 1, 0];
const DOC_DAYS = [30, 7, 0];
const LC_DAYS = [7, 3, 0];
const inDaysAr = (n) => (n === 0 ? 'اليوم' : n === 1 ? 'غدًا' : `بعد ${n} أيام`);
const inDaysEn = (n) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);

const DOC_NAMES = { /* keys are the app's company-document types (src/js/30-domain.js COMPANY_DOC_TYPES) */
  license: { ar: 'رخصة النشاط', en: 'Business license' },
  tax: { ar: 'شهادة الضرائب', en: 'Tax certificate' },
  ss: { ar: 'شهادة الضمان الاجتماعي', en: 'Social security certificate' },
  pts: { ar: 'شهادة تسجيل PTS', en: 'PTS registration certificate' },
  aci: { ar: 'إثبات تسجيل ACI', en: 'ACI registration proof' },
  cblkey: { ar: 'خطاب مفتاح المركزي وIBAN', en: 'CBL Key and IBAN letter' },
};
const docName = (t) => DOC_NAMES[t] || { ar: 'مستند الشركة', en: 'Business document' };

/* data: { ships: [], credits: [], documents: [] }; returns [{ key, ar, en }] sorted by urgency */
function computeReminders(data, todayIso) {
  const out = [];
  (data.ships || []).forEach((s) => {
    const aci = s.aci || {};
    if (ACI_ORDER.indexOf(aci.status || 'draft') >= ACI_ORDER.indexOf('awaiting_bl') || !s.etd) return;
    const left = daysBetween(todayIso, addDays(s.etd, -2));
    if (ACI_DAYS.includes(left)) out.push({ left, key: `aci:${s.id}:${left}`, ar: `${s.id}: اعتماد رقم ACI مطلوب ${inDaysAr(left)} (قبل التحميل بـ 48 ساعة)`, en: `${s.id}: the ACI number is due ${inDaysEn(left)} (48 hours before loading)` });
  });
  (data.documents || []).forEach((d) => {
    if (!d.exp) return;
    const left = daysBetween(todayIso, d.exp);
    if (DOC_DAYS.includes(left)) { const n = docName(d.type); out.push({ left, key: `doc:${d.id}:${left}`, ar: `${n.ar} ينتهي ${inDaysAr(left)}`, en: `${n.en} expires ${inDaysEn(left)}` }); }
  });
  (data.credits || []).forEach((c) => {
    if (c.status !== 'issued' || !c.open || !c.days) return;
    const left = daysBetween(todayIso, addDays(c.open, c.days));
    if (LC_DAYS.includes(left)) out.push({ left, key: `lc:${c.no}:${left}`, ar: `الاعتماد ${c.no} يستحق ${inDaysAr(left)}`, en: `Credit ${c.no} is due ${inDaysEn(left)}` });
  });
  return out.sort((a, b) => a.left - b.left);
}

/* one digest email per business per day; returns null when nothing is due */
function digestMessage(orgName, reminders) {
  if (!reminders.length) return null;
  return {
    subject: `${orgName}: ${reminders.length} تذكير · ${reminders.length} reminder${reminders.length > 1 ? 's' : ''}`,
    text: reminders.map((r) => `• ${r.ar}\n  ${r.en}`).join('\n\n') + '\n\n— مرافق الاستيراد · Import companion',
  };
}

module.exports = { computeReminders, digestMessage, daysBetween, addDays };
