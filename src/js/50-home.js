/* ---------- cards ---------- */
function shipCard(sh, full) {
  const sm = shipSummary(sh);
  const prog = h('div', { class: 'prog', 'aria-hidden': 'true' }, sm.gates.map((g) => h('i', { class: g.blocked ? 'bad' : g.state === 'done' ? 'done' : g.state === 'active' ? 'cur' : '' })));
  const line = sm.allDone ? tr('الرحلة مكتملة', 'Shipment complete')
    : sm.todo.length ? tr('عليك: ', 'You: ') + sm.todo[0].label
      : sm.waiting.length ? tr(`بانتظار ${whoName(sm.waiting[0].who)}: `, `Waiting for ${whoName(sm.waiting[0].who)}: `) + sm.waiting[0].label : (sm.next ? sm.next.label : '');
  return h('button', { class: 'card tap ship' + (full ? ' full' : ''), type: 'button', onclick: () => openShip(sh.id) },
    h('div', { class: 'top' },
      h('div', { class: 'col grow' }, h('span', { class: 'mono lbl' }, sh.id), h('h4', { class: 'clip' }, shipTitle(sh))),
      pill(sm.label, sm.tone)),
    h('div', { class: 'meta' }, h('span', { class: 'cc' }, sh.supplier.country), h('span', { class: 'clip ltr' }, sh.supplier.name), h('span', { class: 'num' }, '$' + short(sh.valueUsd))),
    prog,
    h('div', { class: 'next' }, icon(sm.allDone ? 'check' : sm.todo.length ? 'user' : 'clock'), h('span', { class: 'grow clip' }, line), icon('fwd')));
}

function alertCard(a, i) {
  return h('button', { class: `card tap alert ${a.tone} rise`, style: { '--i': i }, type: 'button', onclick: () => runAct(a.act) },
    h('div', { class: 'bx' }, icon(a.ic)),
    h('div', null, h('b', null, a.title), h('span', { class: 's' }, a.sub)),
    icon('fwd', 'go'));
}
function sameAct(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

/* ---------- home ---------- */
SCREENS.home = (root) => {
  const ns = nextStep();
  const rd = readiness();
  const alerts = buildAlerts().filter((a) => !sameAct(a.act, ns.act)).slice(0, 2);
  const ships = S.ships.filter((s) => !shipSummary(s).allDone);

  const nextCard = h('div', { class: 'card hero next-card rise', style: { '--i': 0 } },
    h('div', { class: 'eyebrow' }, icon(ns.ic), tr('خطوتك التالية', 'Your next step')),
    h('h2', null, ns.title),
    h('p', null, ns.why),
    h('button', { class: 'btn gold', type: 'button', onclick: () => runAct(ns.act) }, ns.label, icon('fwd')),
    rd.total ? h('div', { class: 'col', style: { gap: '6px', marginTop: '4px' } },
      h('div', { class: 'row' }, h('span', { class: 'lbl grow' }, tr('جاهزيتك للاستيراد', 'Your import readiness')), h('b', { class: 'num', style: { fontSize: '.85rem' } }, `${rd.done}/${rd.total}`)),
      h('div', { class: 'bar', style: { background: 'rgba(255,255,255,.12)' } }, h('i', { style: { width: rd.pct + '%' } }))) : null);

  const demoNote = isDemo() ? h('div', { class: 'note gold rise', style: { '--i': 1 } }, icon('info'), h('span', null, tr('أنت تتصفح بيانات تجريبية. ', 'You are browsing demo data. '), h('button', { class: 'src', type: 'button', onclick: () => { resetState('live'); applyTheme(null); closeAllPages(); rerender(); startOnboarding(); } }, tr('ابدأ ببياناتك', 'Start with your own data')))) : null;

  const alertsSect = alerts.length ? h('section', { class: 'sect' }, h('div', { class: 'sect-h' }, h('h2', null, tr('يحتاج انتباهك', 'Needs attention')), buildAlerts().length > 2 ? h('button', { class: 'more', type: 'button', onclick: openNotifications }, tr('عرض الكل', 'View all')) : null), alerts.map((a, i) => alertCard(a, i + 1))) : null;

  const shipsSect = h('section', { class: 'sect' },
    h('div', { class: 'sect-h' }, h('h2', null, tr('رحلاتك', 'Your shipments')), ships.length ? h('button', { class: 'more', type: 'button', onclick: () => go('ships') }, tr('الكل', 'All')) : null),
    ships.length ? ships.slice(0, 3).map((s) => shipCard(s, true)) : h('div', { class: 'card col', style: { alignItems: 'flex-start' } }, h('b', { style: { font: '500 .95rem var(--f-disp)' } }, tr('لا توجد رحلات بعد', 'No shipments yet')), h('span', { class: 'lbl' }, tr('ابدأ برحلة واحدة. نرافقك في كل خطوة.', 'Start with one shipment. We guide you through every step.')), h('button', { class: 'btn gold sm', type: 'button', onclick: () => openNewShip() }, icon('plus'), tr('رحلة جديدة', 'New shipment'))),
    ships.length ? h('button', { class: 'btn ghost block', type: 'button', onclick: () => openNewShip() }, icon('plus'), tr('رحلة استيراد جديدة', 'New import shipment')) : null);

  const chip = (ic, label, fn) => h('button', { class: 'chip', type: 'button', style: { height: '40px' }, onclick: fn }, icon(ic), label);
  const toolsSect = h('section', { class: 'sect' },
    h('div', { class: 'sect-h' }, h('h2', null, tr('أدوات سريعة', 'Quick tools'))),
    h('div', { class: 'hscroll' },
      chip('route', tr('أي قناة أستخدم؟', 'Which channel?'), () => openChannelAdvisor()),
      chip('scale', tr('مطابقة المستندات', 'Match documents'), () => openMatcher()),
      chip('swap', tr('محوّل العملة', 'Currency converter'), () => openConverter()),
      chip('shield', tr('مُنسّق ACI', 'ACI composer'), () => pickShipForACI())));

  const learn = h('button', { class: 'card tap menu-row rise', type: 'button', onclick: () => openGuide('glossary') },
    h('div', { class: 'bx' }, icon('help')), h('div', null, h('b', null, tr('ما هي PTS وACI وFCMS؟', 'What are PTS, ACI and FCMS?')), h('span', { class: 's' }, tr('شرح بسيط بلا مصطلحات', 'A plain-language explanation')) ), icon('fwd', 'go'));

  root.append(
    topbar(),
    h('div', { class: 'stack' },
      h('div', { class: 'rise' }, h('span', { class: 'lbl' }, greeting()), h('div', { style: { font: '600 1.4rem/1.35 var(--f-disp)' } }, orgName())),
      nextCard, demoNote, alertsSect, shipsSect, toolsSect, learn,
      h('p', { class: 'lbl', style: { textAlign: 'center', padding: '4px 10px' } }, tr('نموذج تجريبي: لا يرتبط بأي جهة رسمية. قواعد محدّثة حتى ', 'Prototype: not connected to any official body. Rules current as of ') + fmtDate(D(RULES_AS_OF)) + '.')));
};

function pickShipForACI() {
  const cands = S.ships.filter((s) => aciIndex(s.aci.status) < aciIndex('completed'));
  if (cands.length === 1) return openACI(cands[0].id);
  if (!S.ships.length) return toast(tr('أنشئ رحلة أولًا', 'Create a shipment first'));
  openSheet({
    title: tr('اختر الرحلة', 'Choose a shipment'),
    build: (body, ctrl) => {
      body.append(h('p', { class: 'lbl' }, tr('مُنسّق ACI يعمل على رحلة محددة.', 'The ACI composer works on one shipment.')),
        (cands.length ? cands : S.ships).map((s) => h('button', { class: 'card tap row', type: 'button', onclick: () => { ctrl.close(); openACI(s.id); } },
          h('div', { class: 'col grow' }, h('span', { class: 'mono lbl' }, s.id), h('b', null, shipTitle(s)), h('span', { class: 'lbl' }, aciLabel(s.aci.status))), icon('fwd'))));
    },
  });
}

/* ---------- requirements checklist (opened from Home / alerts) ---------- */
function openProfileList(focusId) {
  openSheet({
    title: tr('جاهزيتك للاستيراد', 'Your import readiness'),
    build: (body, ctrl) => {
      const rd = readiness();
      body.append(
        h('div', { class: 'row' }, ring({ pct: rd.pct, size: 76, stroke: 8, track: 'var(--line-2)', mid: h('b', { class: 'num' }, rd.pct + '%') }),
          h('div', { class: 'col grow' }, h('b', null, tr(`${rd.done} من ${rd.total} مكتملة`, `${rd.done} of ${rd.total} done`)), h('span', { class: 'lbl' }, tr('متطلبات الأهلية قبل فتح أي اعتماد أو شحنة.', 'Eligibility requirements before opening any credit or shipment.')))),
        h('div', { class: 'col', style: { gap: '10px' } }, S.profile.map((p) => { const R = REQS[p.id]; return h('div', { class: 'card flat col', style: p.id === focusId ? { borderColor: 'var(--gold-b)' } : null },
          h('div', { class: 'row' },
            h('div', { class: 'tick', style: p.done ? { background: 'linear-gradient(145deg,var(--gold-a),var(--gold-b))', borderColor: 'transparent', color: 'var(--on-gold)' } : null }, p.done ? icon('check') : null),
            h('b', { class: 'grow', style: { font: '500 .9rem/1.4 var(--f-body)' } }, L(R.n)),
            p.done ? pill(tr('مكتمل', 'Done'), 'ok') : pill(L(p.note) || tr('ناقص', 'Missing'), 'warn')),
          h('span', { class: 'lbl' }, L(R.why)),
          !p.done ? h('span', { class: 'lbl', style: { color: 'var(--ink-2)' } }, L(R.how)) : null,
          h('div', { class: 'row wrap' },
            whoChip(R.who),
            R.sys ? extLink(R.sys, tr('فتح ' + SYS[R.sys].code, 'Open ' + SYS[R.sys].code)) : null,
            h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { p.done = !p.done; if (p.done) p.note = ''; logActivity('shield', T2((p.done ? 'اكتمل: ' : 'أُعيد فتح: ') + R.n.ar, (p.done ? 'Done: ' : 'Reopened: ') + R.n.en)); saveState(); rerender(); ctrl.update(); } }, p.done ? tr('إعادة فتح', 'Reopen') : tr('أنجزتها', 'I did this')))); })),
        h('div', { class: 'note' }, icon('info'), h('span', null, tr('تعليم الحالة هنا يدوي في هذا النموذج. في النسخة المتكاملة تُقرأ الحالة من البوابات المعتمدة.', 'Marking status here is manual in this prototype. A connected version would read it from the official portals.'))));
    },
  });
}
