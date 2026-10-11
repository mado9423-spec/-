/* ---------- language flag (set by 01-i18n) ---------- */
let LANG = 'ar';

/* ---------- helpers ---------- */
/* Latin runs (E-Custom, ISO 6346, supplier names) are wrapped in LRI/PDI inside Arabic text so punctuation never reorders. Not needed in LTR mode. */
const LATIN_RUN = /(?=[A-Za-z0-9/.:&-]*[A-Za-z])[A-Za-z0-9]+(?:[-/.:& ][A-Za-z0-9]+)*(\.(?=\s|$))?/g;
const bidi = (s) => {
  const str = String(s);
  if (LANG !== 'ar') return str;
  return str.replace(LATIN_RUN, (m, dot) => {
    const core = dot ? m.slice(0, -1) : m;
    const abbr = dot && /[-/.:& ]/.test(core) && /(?:^|[-/.:& ])[A-Za-z]$/.test(core); // keeps the dot of "A.S." inside the run
    return abbr ? `⁦${m}⁩` : `⁦${core}⁩${dot || ''}`;
  });
};
/* Element.append that accepts nested arrays and skips null/false, so call sites can pass .map() results and conditionals directly */
const _nativeAppend = Element.prototype.append;
Element.prototype.append = function (...kids) {
  _nativeAppend.apply(this, kids.flat(Infinity).filter((k) => k != null && k !== false).map((k) => (k.nodeType ? k : bidi(k))));
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(bidi(k)));
  }
}
/* URLs that reach an attribute must be http(s), mailto, tel, blob or relative: never javascript:, data: or vbscript: */
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'poster', 'xlink:href']);
function safeUrl(v) {
  const t = String(v).replace(/[\u0000-\u0020\u007f-\u009f]+/g, '');
  return !/^[a-z][a-z0-9+.-]*:/i.test(t) || /^(?:https?|mailto|tel|blob):/i.test(t);
}
/* h(tag, attrs, ...kids): builds an element. Kids become text nodes (never markup); there is deliberately no innerHTML path,
   an on* attribute must be a function (a string would become an inline handler), and URL attributes are checked. */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) { if (typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v); }
      else if (URL_ATTRS.has(k)) { if (safeUrl(v)) el.setAttribute(k, v); }
      else if (k === 'style' || k === 'srcdoc') continue;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    if (el.getAttribute('target') === '_blank') el.setAttribute('rel', 'noopener noreferrer');
  }
  append(el, kids);
  return el;
}
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

/* ---------- numbers + dates ---------- */
const nf = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const short = (n) => {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'K';
  return nf(n);
};
const num = (v) => parseFloat(String(v == null ? '' : v).replace(/[,\s]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))) || 0;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const MONTHS = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const DAY = 864e5;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const TODAY = startOfDay(new Date());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);
const pad2 = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const D = (s) => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDate = (d) => (d ? `${d.getDate()} ${MONTHS[LANG][d.getMonth()]} ${d.getFullYear()}` : '—');
const fmtDay = (d) => (d ? `${d.getDate()} ${MONTHS[LANG][d.getMonth()]}` : '—');

function dayWord(n) {
  n = Math.abs(n);
  if (LANG === 'en') return n === 1 ? 'day' : 'days';
  if (n === 1) return 'يوم';
  if (n === 2) return 'يومان';
  if (n >= 3 && n <= 10) return 'أيام';
  return 'يومًا';
}
function inDays(n) {
  if (LANG === 'en') {
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n === -1) return 'yesterday';
    return n > 0 ? `in ${n} days` : `${-n} days ago`;
  }
  if (n === 0) return 'اليوم';
  if (n === 1) return 'غدًا';
  if (n === 2) return 'بعد يومين';
  if (n > 0) return `بعد ${n} ${dayWord(n)}`;
  const m = -n;
  if (m === 1) return 'أمس';
  if (m === 2) return 'منذ يومين';
  return `منذ ${m} ${dayWord(m)}`;
}
function daysLabel(n) {
  if (LANG === 'en') return n === 1 ? '1 day' : `${n} days`;
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومان';
  return `${n} ${dayWord(n)}`;
}
function greeting() {
  const hr = new Date().getHours();
  if (LANG === 'en') return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  return hr < 12 ? 'صباح الخير' : 'مساء الخير';
}

/* ---------- misc ---------- */
let _uid = 0;
const uid = (p = 'u') => `${p}${++_uid}`;
const rid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
function vibrate(ms = 10) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* unsupported */ } }
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e2) { return false; }
  }
}
function debounce(fn, ms = 120) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
const sum = (a) => a.reduce((x, y) => x + (Number(y) || 0), 0);

/* ISO 6346 container number check digit */
const ISO_LETTERS = { A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20, K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31, U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38 };
function iso6346Digit(first10) {
  let total = 0;
  for (let i = 0; i < 10; i++) {
    const c = first10[i];
    const v = /[A-Z]/.test(c) ? ISO_LETTERS[c] : Number(c);
    total += v * 2 ** i;
  }
  return (total % 11) % 10;
}
function makeContainer(owner3, serial6) { const base = `${owner3}U${serial6}`; return base + iso6346Digit(base); }
function validContainer(raw) {
  const c = String(raw || '').toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z]{3}[UJZR]\d{7}$/.test(c)) return false;
  return iso6346Digit(c.slice(0, 10)) === Number(c[10]);
}
