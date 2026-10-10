/* ---------- desktop story panel (repaints with the language and the brand) ---------- */
function refreshStory() {
  const el = $('#story');
  if (!el) return;
  el.setAttribute('aria-label', B());
  const item = (ic, t, s) => h('li', null, h('span', { class: 'bx' }, icon(ic)), h('div', null, h('b', null, t), h('span', null, s)));
  clear(el).append(
    h('div', { class: 'brand' }, h('div', { class: 'logo-mark' }, brandMark()), h('span', null, B())),
    h('h1', null, tr('استورد إلى ليبيا ', 'Import into Libya '), h('em', null, tr('بخطوة واحدة واضحة في كل مرة.', 'with one clear step at a time.'))),
    h('p', { class: 'lead' }, tr('بعد القرار 449 صار الاستيراد للتجارة يمر عبر القنوات المصرفية وثلاث بوابات حكومية لا رابط بينها. نجمعها لك في رحلة واحدة ونخبرك بما عليك فعله الآن، قبل أن يوقف شحنتك أي خطأ.', 'After Decision 449, importing for trade goes through banking channels and three unconnected government portals. We bring them into one journey and tell you what to do now, before a mistake holds your shipment.')),
    h('ul', null,
      item('route', tr('خطوة تالية واحدة', 'One next step'), tr('الصفحة الرئيسية تعرض ما عليك أنت، وما ينتظر غيرك.', 'Home shows what is yours to do and what is waiting on someone else.')),
      item('shield', tr('نفحص قبل أن تفحصك البوابات', 'We check before the portals do'), tr('رموز HS وأرقام الحاويات (ISO 6346) وتطابق القيمة مع الاعتماد.', 'HS codes, container numbers (ISO 6346) and value against the credit.')),
      item('globe', tr('عربي وإنجليزي، على هاتفك', 'Arabic and English, on your phone'), tr('يعمل مع ضعف الإنترنت، ويحفظ بياناتك على جهازك أو حسابك.', 'Works on a weak connection and saves to your device or your account.'))),
    h('p', { class: 'fine' }, tr('نموذج تجريبي لتطبيق مرافق للمستورد. ليس جهة رسمية ولا يرتبط بالجمارك أو المصرف المركزي أو شبكة ليبيا للتجارة.', 'A prototype of an importer companion app. Not an official body and not connected to Customs, the Central Bank or the Libya Trade Network.')));
}

/* ---------- cloud boot: never blocks first paint; safe to retry ---------- */
let cloudBooting = false;
async function bootCloud(manual) {
  if (cloudBooting || !Cloud.available()) return;
  cloudBooting = true;
  try {
    const r = await Cloud.init();
    if (r === 'loaded') {
      const o = $('.onb'); if (o) o.remove();
      UI.onb = null;
      applyTheme(S.theme);
      buildDock(); go(UI.tab);
    } else if (r === 'empty') {
      if (S.onboarded && S.mode === 'live') await Cloud.createOrgFromState();
      else await offerInvites();
      rerender();
    } else if (manual) {
      toast(tr('تعذر الاتصال بالسحابة. نواصل على جهازك.', 'Could not reach the cloud. Continuing on your device.'));
    }
    if (UI.pages.some((p) => p.key === 'settings')) rerender();
  } catch (e) {
    console.warn('cloud boot failed', e);
  } finally { cloudBooting = false; }
}

/* ---------- boot ---------- */
function init() {
  applyLang(detectLang());
  S = loadLocal() || emptyState();
  if (S.onboarded) syncProfileFromDocs();
  document.title = `${B()} · ${brandTag()}`;
  applyTheme(S.theme);

  const screens = $('#screens');
  TAB_IDS.forEach((id) => screens.append(h('section', { class: 'screen', 'data-tab': id, id: 'screen-' + id, role: 'tabpanel', 'aria-labelledby': 'tab-' + id, hidden: id !== UI.tab })));
  refreshStory();
  buildDock();
  const hash = location.hash.replace('#', '');
  go(TAB_IDS.includes(hash) ? hash : 'home');
  if (!S.onboarded) startOnboarding();

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!closeTopSheet() && UI.pages.length) closePage();
  });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (!S.theme) rerender(); });
  window.addEventListener('online', () => { if (!Cloud.signedIn()) bootCloud(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && Cloud.active()) Cloud.flush().catch(() => { /* retried on the next change */ }); });

  bootCloud();

  if (!window.__SANAD_EMBED__ && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline cache is optional */ });
  }
}
init();
