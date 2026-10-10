/* ---------- first-run onboarding: who you are, what you import, what you already have, your plan ---------- */
const BAND_USD = { low: 50000, mid: 500000, high: 2000000 };
const BANDS = [
  { id: 'low', n: T2('حتى 100 ألف دولار', 'Up to USD 100K') },
  { id: 'mid', n: T2('من 100 ألف إلى مليون', 'USD 100K to 1M') },
  { id: 'high', n: T2('أكثر من مليون', 'Over USD 1M') },
];

function startOnboarding() {
  const root = h('div', { class: 'onb', role: 'dialog', 'aria-label': tr('البداية', 'Get started') });
  $('#app').append(root);
  const d = { step: 0, type: null, name: '', goods: 'food', band: 'mid', resell: true, have: {} };
  const TOTAL = 4;

  const langSeg = () => h('div', { class: 'lang-seg' },
    h('button', { type: 'button', class: LANG === 'ar' ? 'on' : '', onclick: () => setLanguage('ar') }, 'العربية'),
    h('button', { type: 'button', class: LANG === 'en' ? 'on' : '', onclick: () => setLanguage('en') }, 'English'));
  const dots = () => h('div', { class: 'onb-dots', 'aria-hidden': 'true' }, Array.from({ length: TOTAL }, (_, i) => h('i', { class: i < d.step ? 'on' : '' })));
  const shell = (top, body, foot) => { clear(root); root.append(h('div', { class: 'onb-top' }, top), h('div', { class: 'onb-body' }, body), h('div', { class: 'onb-foot' }, foot)); };
  const back = () => h('button', { class: 'btn ghost', type: 'button', onclick: () => { d.step--; render(); } }, tr('رجوع', 'Back'));
  const next = (label, ok, fn) => h('button', { class: 'btn gold block', type: 'button', disabled: ok === false ? true : null, onclick: fn || (() => { d.step++; render(); }) }, label);
  const opt = (on, ic, title, sub, fn) => h('button', { type: 'button', class: 'big-opt' + (on ? ' on' : ''), onclick: fn }, h('div', { class: 'bx' }, icon(ic)), h('div', null, h('b', null, title), sub ? h('span', { class: 's' }, sub) : null), h('div', { class: 'rd-dot' }));

  const reqs = () => REQ_ORDER[d.type || 'company'];
  const doneCount = () => reqs().filter((id) => d.have[id]).length;

  function stepWelcome() {
    shell([h('div', { class: 'sp' }), langSeg()],
      [h('div', { class: 'logo-mark', style: { width: '64px', height: '64px', borderRadius: '20px', fontSize: '2rem' } }, brandMark()),
        h('h1', null, tr('استورد إلى ليبيا ', 'Import into Libya, '), h('em', null, tr('بخطوات واضحة', 'one clear step at a time'))),
        h('p', { class: 'lead' }, tr('بعد القرار 449 صار على المستورد أن يمر بالمصرف والجمارك وبوابات حكومية عدة. نرتّبها لك في مكان واحد، ونخبرك دائمًا بما عليك فعله الآن.', 'After Decision 449 an importer has to go through the bank, Customs and several government portals. We line them up in one place and always tell you what to do next.')),
        h('div', { class: 'col', style: { gap: '12px' } },
          [['route', tr('خطوة تالية واحدة', 'One next step'), tr('لا قوائم طويلة ولا مصطلحات غامضة.', 'No long lists, no unexplained jargon.')], ['shield', tr('نفحص بياناتك قبل البوابات', 'We check your data before the portals do'), tr('أخطاء الحاويات والقيم تُكتشف مبكرًا.', 'Container and value errors are caught early.')], ['phone', tr('على هاتفك', 'On your phone'), tr('يعمل حتى مع ضعف الإنترنت.', 'Works even with a weak connection.')]]
            .map(([ic, t, s]) => h('div', { class: 'hint-card' }, h('div', { class: 'bx' }, icon(ic)), h('div', null, h('b', { style: { font: '500 .9rem var(--f-disp)' } }, t), h('span', { class: 'lbl', style: { display: 'block' } }, s)))))],
      [next(tr('ابدأ', 'Get started')),
        h('button', { class: 'btn quiet', type: 'button', onclick: () => { resetState('demo'); applyTheme(S.theme); finish(false, true); } }, tr('جرّب ببيانات تجريبية', 'Explore with demo data'))]);
  }

  function stepWho() {
    const name = h('input', { id: 'onb-name', value: d.name, placeholder: d.type === 'sole' ? tr('اسمك أو اسم نشاطك', 'Your name or trade name') : tr('اسم الشركة', 'Company name'), oninput: (e) => { d.name = e.target.value; } });
    shell([dots(), langSeg()],
      [h('h1', null, tr('من أنت؟', 'Who are you?')),
        h('p', { class: 'lead' }, tr('نخصص لك الخطوات والقواعد. يمكنك تغييرها لاحقًا.', 'We tailor the steps and rules to you. You can change this later.')),
        opt(d.type === 'company', 'building', tr('شركة', 'A company'), tr('لها موظفون وحسابات مصرفية وتفتح اعتمادات أو تحويلات.', 'With staff and bank accounts, opening credits or transfers.'), () => { d.type = 'company'; render(); }),
        opt(d.type === 'sole', 'store', tr('تاجر فردي', 'A sole trader'), tr('رخصة نشاط فردي وتستورد بنفسك ضمن سقف سنوي.', 'An individual-activity license; you import yourself within an annual limit.'), () => { d.type = 'sole'; render(); }),
        h('div', { class: 'field' }, h('label', { for: 'onb-name' }, d.type === 'sole' ? tr('اسمك أو اسم نشاطك', 'Your name or trade name') : tr('اسم الشركة', 'Company name')), name)],
      [next(tr('التالي', 'Next'), !!d.type), back()]);
  }

  function stepGoods() {
    const advice = adviseChannel({ trade: d.resell, kind: d.type === 'sole' ? 'sole' : 'company', usd: BAND_USD[d.band] });
    shell([dots(), langSeg()],
      [h('h1', null, tr('ماذا تستورد؟', 'What will you import?')),
        h('div', { class: 'chips' }, CATS.map((c) => h('button', { type: 'button', class: 'chip' + (d.goods === c.id ? ' on' : ''), style: { height: '38px' }, onclick: () => { d.goods = c.id; render(); } }, L(c.n)))),
        h('div', { class: 'col' }, h('label', { class: 'lbl' }, tr('هل ستبيع ما تستورد؟', 'Will you resell what you import?')),
          h('div', { class: 'seg' }, h('button', { type: 'button', class: d.resell ? 'on' : '', onclick: () => { d.resell = true; render(); } }, tr('نعم، للتجارة', 'Yes, for trade')), h('button', { type: 'button', class: !d.resell ? 'on' : '', onclick: () => { d.resell = false; render(); } }, tr('لا، استخدام خاص', 'No, own use')))),
        h('div', { class: 'col' }, h('label', { class: 'lbl' }, tr('قيمة شحنتك الأولى تقريبًا', 'Approximate value of your first shipment')),
          h('div', { class: 'chips' }, BANDS.map((b) => h('button', { type: 'button', class: 'chip' + (d.band === b.id ? ' on' : ''), style: { height: '38px' }, onclick: () => { d.band = b.id; render(); } }, L(b.n))))),
        h('div', { class: 'card hero col' },
          h('div', { class: 'row' }, h('span', { class: 'lbl' }, tr('مسارك المقترح', 'Your suggested route')), h('span', { class: 'sp' }), confTag(advice.conf)),
          h('b', { style: { font: '600 1.1rem/1.4 var(--f-disp)' } }, advice.title),
          h('span', { style: { fontSize: '.82rem', opacity: 0.85, lineHeight: 1.6 } }, advice.why[0] || ''))],
      [next(tr('التالي', 'Next')), back()]);
  }

  function stepHave() {
    shell([dots(), langSeg()],
      [h('h1', null, tr('ما الذي لديك الآن؟', 'What do you already have?')),
        h('p', { class: 'lead' }, tr('علّم ما أنجزته فقط. الباقي نرتّبه لك في خطة.', 'Tick only what you have done. We will turn the rest into a plan.')),
        h('div', { class: 'col', style: { gap: '10px' } }, reqs().map((id) => h('button', { type: 'button', class: 'checkrow' + (d.have[id] ? ' on' : ''), onclick: () => { d.have[id] = !d.have[id]; render(); } },
          h('div', { class: 'tick' }, d.have[id] ? icon('check') : null), h('div', null, h('b', null, L(REQS[id].n)), h('span', { class: 's' }, L(REQS[id].why))))))],
      [next(tr('أنشئ خطتي', 'Build my plan')), back()]);
  }

  function stepPlan() {
    const todo = reqs().filter((id) => !d.have[id]);
    const pct = Math.round((doneCount() / reqs().length) * 100);
    shell([dots(), langSeg()],
      [h('h1', null, todo.length ? tr('خطتك للبدء', 'Your plan to get started') : tr('أنت جاهز', 'You are ready')),
        h('div', { class: 'row' }, ring({ pct, size: 76, stroke: 8, track: 'var(--line-2)', mid: h('b', { class: 'num' }, pct + '%') }),
          h('div', { class: 'col grow' }, h('b', null, tr(`${doneCount()} من ${reqs().length} متطلبات جاهزة`, `${doneCount()} of ${reqs().length} requirements ready`)), h('span', { class: 'lbl' }, todo.length ? tr('أنجز هذه الخطوات بالترتيب قبل أول شحنة.', 'Do these in order before your first shipment.') : tr('يمكنك بدء أول رحلة الآن.', 'You can start your first shipment now.')))),
        todo.length ? h('ol', { class: 'steps plan' }, todo.map((id) => h('li', null, h('div', null, h('b', { style: { color: 'var(--ink)', fontWeight: 500 } }, L(REQS[id].n)), h('div', { class: 'lbl' }, L(REQS[id].how))), h('div', { class: 'col', style: { alignItems: 'flex-end', gap: '6px' } }, whoChip(REQS[id].who), REQS[id].sys ? extLink(REQS[id].sys) : null)))) : null,
        h('div', { class: 'note' }, icon('info'), h('span', null, tr('نتتبع تقدمك في الصفحة الرئيسية، ونذكّرك بالمواعيد.', 'We track your progress on Home and remind you of deadlines.')))],
      [h('button', { class: 'btn gold block', type: 'button', onclick: () => finish(true, false) }, tr('ابدأ أول رحلة', 'Start my first shipment')), h('button', { class: 'btn ghost block', type: 'button', onclick: () => finish(false, false) }, tr('ادخل التطبيق', 'Go to the app')), back()]);
  }

  function finish(startShip, demo) {
    if (!demo) {
      S = emptyState();
      S.org = { type: d.type, name: d.name.trim() || tr('نشاطي', 'My business'), stat: '', ptsCode: '', goods: d.goods, valueBand: d.band, resell: d.resell };
      S.profile = REQ_ORDER[d.type].map((id) => ({ id, done: !!d.have[id], note: '' }));
      S.onboarded = true;
      saveState();
      if (Cloud.signedIn()) Cloud.createOrgFromState().catch((e) => console.warn('org create failed', e));
    }
    root.classList.remove('in');
    setTimeout(() => root.remove(), 200);
    UI.onb = null;
    buildDock(); go('home');
    if (startShip) { const adv = adviseChannel({ trade: d.resell, kind: d.type === 'sole' ? 'sole' : 'company', usd: BAND_USD[d.band] }); setTimeout(() => openNewShip({ cat: d.goods, usd: String(BAND_USD[d.band]), channel: { direct: 'TRANSFER', sole: 'SOLE', lc: 'LC', 'lc-split': 'LC' }[adv.id] || 'LC' }), 350); }
  }

  function render() {
    [stepWelcome, stepWho, stepGoods, stepHave, stepPlan][d.step]();
    const body = $('.onb-body', root); if (body) body.scrollTop = 0;
  }
  UI.onb = { render, d };
  render();
}
