/* ---------- shared actions ---------- */
function runAct(act) {
  if (!act) return;
  if (act.type === 'ship') openShip(act.id, { open: act.open });
  else if (act.type === 'lc') openLC(act.no);
  else if (act.type === 'tab') go(act.tab);
  else if (act.type === 'profile') openProfileList(act.id);
}

function shipCard(sh, full) {
  const sm = shipSummary(sh);
  const prog = h('div', { class: 'prog', 'aria-hidden': 'true' }, sm.gates.map((g) => h('i', { class: g.blocked ? 'bad' : g.state === 'done' ? 'done' : g.state === 'active' ? 'cur' : '' })));
  return h('button', { class: 'card tap ship' + (full ? ' full' : ''), type: 'button', onclick: () => openShip(sh.id) },
    h('div', { class: 'top' },
      h('div', { class: 'col grow' }, h('span', { class: 'mono lbl' }, sh.id), h('h4', { class: 'clip' }, sh.title)),
      pill(sm.label, sm.tone)),
    h('div', { class: 'meta' }, h('span', { class: 'cc' }, sh.supplier.country), h('span', { class: 'clip ltr' }, sh.supplier.name), h('span', { class: 'num' }, '$' + short(sh.valueUsd))),
    prog,
    h('div', { class: 'next' }, icon(sm.allDone ? 'check' : 'route'), h('span', { class: 'grow clip' }, sm.allDone ? 'الرحلة مكتملة' : 'التالي: ' + (sm.next ? sm.next.ar : '—')), icon('chevL')));
}

function alertCard(a, i) {
  return h('button', { class: `card tap alert ${a.tone} rise`, style: { '--i': i }, type: 'button', onclick: () => runAct(a.act) },
    h('div', { class: 'bx' }, icon(a.ic)),
    h('div', null, h('b', null, a.title), h('span', { class: 's' }, a.sub)),
    icon('chevL', 'go'));
}

/* ---------- home ---------- */
SCREENS.home = (root) => {
  const rd = readiness();
  const alerts = buildAlerts();
  const live = S.ships.filter((s) => !shipSummary(s).allDone);
  const openLcs = S.lcs.filter((l) => l.status !== 'closed');
  const exposure = sum(openLcs.map((l) => l.usd));
  const missing = S.profile.filter((p) => !p.done);

  const hero = h('button', { class: 'card hero tap rise', type: 'button', style: { '--i': 0, textAlign: 'start' }, onclick: () => openProfileList() },
    h('div', { class: 'hero-grid' },
      ring({ pct: rd.pct, size: 116, stroke: 10, mid: h('div', null, h('b', { class: 'num', style: { font: '600 1.7rem/1 var(--f-disp)' } }, rd.pct + '%'), h('div', { class: 'lbl' }, 'جاهزية')) }),
      h('div', { class: 'col' },
        h('span', { class: 'lbl' }, 'جاهزية الاستيراد وفق القرار 449'),
        h('div', { style: { font: '500 1.05rem/1.45 var(--f-disp)' } }, `${rd.done} من ${rd.total} متطلبات مكتملة`),
        missing.length ? h('span', { class: 'lbl' }, 'المتبقي: ' + missing.slice(0, 2).map((m) => m.label).join(' · ')) : h('span', { class: 'lbl' }, 'ملفك جاهز لفتح الاعتمادات'),
        h('div', null, pill(missing.length ? 'أكمل الملف' : 'مكتمل', missing.length ? 'gold' : 'ok', missing.length ? 'chevL' : 'check')))),
    h('div', { class: 'mini3' },
      h('div', null, h('b', null, String(live.length)), h('span', null, 'رحلات نشطة')),
      h('div', null, h('b', null, '$' + short(exposure)), h('span', null, 'اعتمادات مفتوحة')),
      h('div', null, h('b', null, String(alerts.length)), h('span', null, 'تنبيهات'))));

  const alertsSect = h('section', { class: 'sect' },
    h('div', { class: 'sect-h' }, h('h2', null, 'يحتاج انتباهك'), alerts.length > 3 ? h('button', { class: 'more', type: 'button', onclick: openNotifications }, `عرض الكل (${alerts.length})`) : null),
    alerts.length ? alerts.slice(0, 3).map((a, i) => alertCard(a, i + 1)) : h('div', { class: 'card empty' }, 'لا شيء يحتاج انتباهك الآن.'));

  const shipsSect = h('section', { class: 'sect' },
    h('div', { class: 'sect-h' }, h('h2', null, 'رحلاتك النشطة'), h('button', { class: 'more', type: 'button', onclick: () => go('ships') }, 'الكل')),
    live.length ? h('div', { class: 'hscroll' }, live.map((s) => shipCard(s))) : h('div', { class: 'card empty' }, 'لا توجد رحلات نشطة. ابدأ رحلة جديدة.'),
    h('button', { class: 'btn ghost block', type: 'button', onclick: () => openNewShip() }, icon('plus'), 'رحلة استيراد جديدة'));

  const tool = (cls, ic, t, s, fn) => h('button', { class: `tool ${cls}`, type: 'button', onclick: fn }, h('div', { class: 'bx' }, icon(ic)), h('b', null, t), h('span', null, s));
  const toolsSect = h('section', { class: 'sect' },
    h('div', { class: 'sect-h' }, h('h2', null, 'أدواتك')),
    h('div', { class: 'tools' },
      tool('card tint-lilac', 'route', 'مرشد القناة', 'اعتماد أم تحويل مباشر أم نشاط فردي؟', () => openChannelAdvisor()),
      tool('card tint-mint', 'shield', 'مُنسّق ACI', 'جهّز بيانات الشحنة وافحصها قبل المورد', () => pickShipForACI()),
      tool('card tint-peach', 'scale', 'مطابقة المستندات', 'الفاتورة مقابل شهادة التفتيش', () => openMatcher()),
      tool('card tint-sky', 'swap', 'محوّل العملة', 'بسعر المركزي الرسمي', () => openConverter())));

  const radarSect = h('section', { class: 'sect' },
    h('div', { class: 'sect-h' }, h('h2', null, 'رادار المواعيد'), h('span', { class: 'lbl' }, 'مواعيد القرارين 449 و465')),
    h('div', { class: 'card radar' }, REG_DATES.map((r) => {
      const dt = D(r.date); const left = daysBetween(TODAY, dt);
      return h('div', { class: 'rd' + (left < 0 ? ' past' : '') },
        h('div', { class: 'dt' }, h('b', { class: 'num' }, String(dt.getDate())), h('span', null, MONTHS[dt.getMonth()])),
        h('div', { class: 't' }, r.title, h('small', null, `${r.src} · ${dt.getFullYear()}`)),
        left < 0 ? pill('سارٍ', 'ok', 'check') : pill(inDays(left), r.tone));
    })));

  const feed = [...S.activity].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 4);
  const feedSect = h('section', { class: 'sect' },
    h('div', { class: 'sect-h' }, h('h2', null, 'آخر النشاطات')),
    h('div', { class: 'card feed' }, feed.map((e) => h('div', { class: 'ev' }, h('div', { class: 'bx' }, icon(e.ic)), h('div', null, e.txt, h('small', null, inDays(daysBetween(TODAY, D(e.at))))), null))));

  root.append(
    topbar(),
    h('div', { class: 'stack' },
      h('div', { class: 'rise' }, h('span', { class: 'lbl' }, greeting()), h('div', { style: { font: '600 1.4rem/1.35 var(--f-disp)' } }, S.company.name)),
      hero, alertsSect, shipsSect, toolsSect, radarSect, feedSect,
      h('p', { class: 'lbl', style: { textAlign: 'center', padding: '4px 10px' } }, 'نموذج تجريبي: البيانات أمثلة ولا ترتبط بأي جهة رسمية. قواعد محدّثة حتى ' + fmtDate(D(RULES_AS_OF)) + '.')));
};

function pickShipForACI() {
  const cands = S.ships.filter((s) => aciIndex(s.aci.status) < aciIndex('completed'));
  if (cands.length === 1) return openACI(cands[0].id);
  openSheet({
    title: 'اختر الرحلة',
    build: (body, ctrl) => {
      body.append(h('p', { class: 'lbl' }, 'مُنسّق ACI يعمل على رحلة محددة.'),
        (cands.length ? cands : S.ships).map((s) => h('button', { class: 'card tap row', type: 'button', onclick: () => { ctrl.close(); openACI(s.id); } },
          h('div', { class: 'col grow' }, h('span', { class: 'mono lbl' }, s.id), h('b', null, s.title), h('span', { class: 'lbl' }, aciLabel(s.aci.status))), icon('chevL'))));
    },
  });
}

/* ---------- company profile checklist ---------- */
function openProfileList(focusId) {
  openSheet({
    title: 'جاهزية الشركة',
    build: (body, ctrl) => {
      const rd = readiness();
      body.append(
        h('div', { class: 'row' }, ring({ pct: rd.pct, size: 76, stroke: 8, track: 'var(--line-2)', mid: h('b', { class: 'num' }, rd.pct + '%') }),
          h('div', { class: 'col grow' }, h('b', null, `${rd.done} من ${rd.total} مكتملة`), h('span', { class: 'lbl' }, 'هذه متطلبات الأهلية قبل فتح أي اعتماد أو شحنة.'))),
        h('div', { class: 'col', style: { gap: '10px' } }, S.profile.map((p) => h('div', { class: 'card flat col', style: p.id === focusId ? { borderColor: 'var(--gold-b)' } : null },
          h('div', { class: 'row' },
            h('div', { class: 'tick', style: p.done ? { background: 'linear-gradient(145deg,var(--gold-a),var(--gold-b))', borderColor: 'transparent', color: 'var(--on-gold)' } : null }, p.done ? icon('check') : null),
            h('b', { class: 'grow', style: { font: '500 .9rem/1.4 var(--f-body)' } }, p.label),
            p.done ? pill('مكتمل', 'ok') : pill(p.note || 'ناقص', 'warn')),
          h('span', { class: 'lbl' }, p.why),
          h('div', { class: 'row wrap' },
            p.sys ? extLink(p.sys, 'فتح ' + SYS[p.sys].code) : null,
            h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { p.done = !p.done; if (p.done) p.note = ''; logActivity('shield', (p.done ? 'اكتمل: ' : 'أُعيد فتح: ') + p.label); saveState(); rerender(); ctrl.update(); } }, p.done ? 'إعادة فتح' : 'وضع علامة مكتمل'))))),
        h('div', { class: 'note' }, icon('info'), h('span', null, 'تعليم الحالة هنا يدوي في هذا النموذج. في النسخة المتكاملة تُقرأ الحالة من البوابات المعتمدة.')));
    },
  });
}
