/* ---------- language + direction ---------- */
const LANG_KEY = 'app.lang';
/* tr(ar, en): inline bilingual string. L(x): picks a language from {ar,en} or passes a plain string through. */
const tr = (ar, en) => (LANG === 'ar' ? ar : en);
const L = (o) => {
  if (o == null) return '';
  if (typeof o === 'string') return o;
  return o[LANG] != null ? o[LANG] : (o.ar != null ? o.ar : (o.en || ''));
};
const T2 = (ar, en) => ({ ar, en });
const biOf = (x) => (typeof x === 'string' ? { ar: x, en: x } : x);
const isRTL = () => LANG === 'ar';

function detectLang() {
  try { const s = localStorage.getItem(LANG_KEY); if (s === 'ar' || s === 'en') return s; } catch (e) { /* storage unavailable */ }
  return 'ar';
}
function applyLang(l) {
  LANG = l === 'en' ? 'en' : 'ar';
  const d = document.documentElement;
  d.lang = LANG;
  d.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { /* storage unavailable */ }
}
