/* ---------- boot ---------- */
function init() {
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';
  S = loadState() || seed();
  syncProfileFromDocs();
  saveState();
  applyTheme(S.theme);
  $$('[data-ic]').forEach((el) => el.append(icon(el.dataset.ic)));

  const screens = $('#screens');
  TABS.forEach((t) => screens.append(h('section', { class: 'screen', 'data-tab': t.id, id: 'screen-' + t.id, role: 'tabpanel', 'aria-labelledby': 'tab-' + t.id, hidden: t.id !== UI.tab })));
  buildDock();
  const hash = location.hash.replace('#', '');
  go(TABS.some((t) => t.id === hash) ? hash : 'home');

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!closeTopSheet() && UI.pages.length) closePage();
  });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (!S.theme) rerender(); });

  if (!window.__SANAD_EMBED__ && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline cache is optional */ });
  }
}
init();
