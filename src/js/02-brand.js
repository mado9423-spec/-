/* ---------- brand: the name and tagline come from this table; the mark is the ship in 03-logo.js (it carries no text) ---------- */
const BRANDS = {
  dalil: { ar: 'دليل', en: 'Dalil', tag: { ar: 'دليلك الواضح للاستيراد', en: 'Your clear guide to importing' } },
};
const BRAND_ID = /*BRAND_DEFAULT*/'dalil'/*END*/;
const B = () => L(BRANDS[BRAND_ID]);
const brandTag = () => L(BRANDS[BRAND_ID].tag);
function brandMark() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', LOGO_VB); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', LOGO_D); path.setAttribute('fill', 'currentColor'); path.setAttribute('fill-rule', 'evenodd');
  svg.append(path);
  return svg;
}
