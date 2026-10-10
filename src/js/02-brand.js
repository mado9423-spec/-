/* ---------- brand (the name is not final: change BRAND_DEFAULT at build time, or preview in Settings) ---------- */
const BRANDS = {
  marfa: { ar: 'مَرفأ', en: 'Marfa', mark: { ar: 'م', en: 'M' }, tag: { ar: 'مرفؤك الآمن للاستيراد', en: 'Your safe harbor for importing' } },
  sanad: { ar: 'سَنَد', en: 'Sanad', mark: { ar: 'س', en: 'S' }, tag: { ar: 'مسار الاستيراد', en: 'Import companion' } },
  darb: { ar: 'دَرب', en: 'Darb', mark: { ar: 'د', en: 'D' }, tag: { ar: 'طريقك الواضح للاستيراد', en: 'Your clear path to importing' } },
};
const BRAND_DEFAULT = /*BRAND_DEFAULT*/'marfa'/*END*/;
const BRAND_KEY = 'app.brand';
let BRAND_ID = BRAND_DEFAULT;
try { const b = localStorage.getItem(BRAND_KEY); if (b && BRANDS[b]) BRAND_ID = b; } catch (e) { /* storage unavailable */ }
const B = () => L(BRANDS[BRAND_ID]);
const brandMark = () => L(BRANDS[BRAND_ID].mark);
const brandTag = () => L(BRANDS[BRAND_ID].tag);
function setBrand(id) { if (!BRANDS[id]) return; BRAND_ID = id; try { localStorage.setItem(BRAND_KEY, id); } catch (e) { /* storage unavailable */ } document.title = `${B()} · ${brandTag()}`; }
