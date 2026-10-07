/* ---------- helpers ---------- */
/* Element.append that accepts nested arrays and skips null/false, so call sites can pass .map() results and conditionals directly */
/* Latin runs (E-Custom, ISO 6346, supplier names) are wrapped in LRI/PDI so Arabic text never reorders their punctuation */
const LATIN_RUN = /(?=[A-Za-z0-9/.:&-]*[A-Za-z])[A-Za-z0-9]+(?:[-/.:& ][A-Za-z0-9]+)*(\.(?=\s|$))?/g;
const bidi = (s) => String(s).replace(LATIN_RUN, (m, dot) => {
  const core = dot ? m.slice(0, -1) : m;
  const abbr = dot && /[-/.:& ]/.test(core) && /(?:^|[-/.:& ])[A-Za-z]$/.test(core); // keeps the dot of "A.S." inside the run
  return abbr ? `\u2066${m}\u2069` : `\u2066${core}\u2069${dot || ''}`;
});
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
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
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

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAY = 864e5;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const TODAY = startOfDay(new Date());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);
const pad2 = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const D = (s) => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDate = (d) => (d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '—');
const fmtDay = (d) => (d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : '—');

function dayWord(n) {
  n = Math.abs(n);
  if (n === 1) return 'يوم';
  if (n === 2) return 'يومان';
  if (n >= 3 && n <= 10) return 'أيام';
  return 'يومًا';
}
function inDays(n) {
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
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومان';
  return `${n} ${dayWord(n)}`;
}
function greeting() {
  const hr = new Date().getHours();
  return hr < 5 ? 'مساء الخير' : hr < 12 ? 'صباح الخير' : hr < 18 ? 'مساء الخير' : 'مساء الخير';
}

/* ---------- misc ---------- */
let _uid = 0;
const uid = (p = 'u') => `${p}${++_uid}`;
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

/* ISO 6346 container number check digit */
const ISO_LETTERS = { A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20, K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31, U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38 };
function iso6346Digit(first10) {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const c = first10[i];
    const v = /[A-Z]/.test(c) ? ISO_LETTERS[c] : Number(c);
    sum += v * 2 ** i;
  }
  return (sum % 11) % 10;
}
function makeContainer(owner3, serial6) { const base = `${owner3}U${serial6}`; return base + iso6346Digit(base); }
function validContainer(raw) {
  const c = String(raw || '').toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z]{3}[UJZR]\d{7}$/.test(c)) return false;
  return iso6346Digit(c.slice(0, 10)) === Number(c[10]);
}
