/* ---------- More: a short menu instead of many tabs ---------- */
SCREENS.more = (root) => {
  const row = (ic, title, sub, fn) => h('button', { class: 'card tap menu-row', type: 'button', onclick: fn }, h('div', { class: 'bx' }, icon(ic)), h('div', null, h('b', null, title), h('span', { class: 's' }, sub)), icon('fwd', 'go'));
  const expiring = S.companyDocs.filter((d) => docStatus(d).tone !== 'ok').length;
  const acct = h('div', { class: 'card row' },
    h('div', { class: 'logo-mark', style: { width: '48px', height: '48px', borderRadius: '16px' } }, (orgName() || '?').trim().charAt(0).toUpperCase()),
    h('div', { class: 'col grow' }, h('b', { style: { font: '600 1.05rem var(--f-disp)' } }, orgName()), h('span', { class: 'lbl' }, S.org.type === 'sole' ? tr('تاجر فردي', 'Sole trader') : tr('شركة', 'Company'), ' · ', isDemo() ? tr('بيانات تجريبية', 'Demo data') : Cloud.active() ? tr('محفوظ على السحابة', 'Saved to the cloud') : tr('محفوظ على هذا الجهاز', 'Saved on this device'))),
    isDemo() ? pill(tr('تجريبي', 'Demo'), 'gold') : null);
  root.append(
    h('div', { class: 'title-row' }, h('h1', null, tr('المزيد', 'More'))),
    h('div', { class: 'menu' },
      acct,
      row('file', tr('المستندات', 'Documents'), expiring ? tr(`${expiring} تحتاج تحديثًا`, `${expiring} need attention`) : tr('مستندات الشركة والرحلات', 'Business and shipment documents'), openDocsPage),
      row('book', tr('الدليل والقواعد', 'Guide and rules'), tr('القرار 449 · شرح المصطلحات · أسئلة شائعة', 'Decision 449 · plain-language terms · FAQ'), () => openGuide()),
      row('cal', tr('رادار المواعيد', 'Deadline radar'), tr('مواعيد القرارات وACI والمستندات', 'Regulatory, ACI and document deadlines'), openRadar),
      row('sliders', tr('الإعدادات', 'Settings'), tr('اللغة · المظهر · الحساب · الفريق', 'Language · theme · account · team'), openSettings),
      h('p', { class: 'lbl', style: { textAlign: 'center', padding: '8px 10px' } }, tr('هذا نموذج تجريبي لتطبيق مرافق للمستورد. ليس جهة رسمية ولا يرتبط بالجمارك أو المركزي أو شبكة ليبيا للتجارة.', 'This is a prototype of an importer companion app. It is not an official body and is not connected to Customs, the Central Bank or the Libya Trade Network.'))));
};

/* ---------- documents ---------- */
function openCompanyDoc(type) {
  const cur = S.companyDocs.find((d) => d.type === type);
  openSheet({
    title: cur ? companyDocName(type) : tr('إضافة مستند', 'Add a document'),
    build: (body, ctrl) => {
      const f = { type: type || 'license', exp: cur && cur.exp ? cur.exp : '', file: cur ? cur.file : '', up: null };
      const sel = h('select', { id: 'cd-type', onchange: (e) => { f.type = e.target.value; } }, COMPANY_DOC_TYPES.map((c) => h('option', { value: c.v, selected: c.v === f.type }, L(c.n))));
      const exp = h('input', { id: 'cd-exp', type: 'date', value: f.exp, oninput: (e) => { f.exp = e.target.value; } });
      const fileLbl = h('span', { class: 'mono lbl' }, f.file || tr('لم يُختر ملف', 'No file chosen'));
      body.append(
        cur ? h('div', { class: 'card flat col' }, kv(tr('الملف الحالي', 'Current file'), h('span', { class: 'mono' }, cur.file)), kv(tr('الحالة', 'Status'), docStatus(cur).text)) : null,
        h('div', { class: 'form' },
          h('div', { class: 'field w2' }, h('label', { for: 'cd-type' }, tr('نوع المستند', 'Document type')), sel),
          h('div', { class: 'field w2' }, h('label', { for: 'cd-exp' }, tr('تاريخ الانتهاء (إن وجد)', 'Expiry date (if any)')), exp)),
        h('div', { class: 'row' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => pickFile((file) => { f.file = file.name; f.up = file; fileLbl.textContent = file.name; }) }, icon('upload'), tr('اختر ملفًا', 'Choose a file')), fileLbl),
        h('button', { class: 'btn gold block', type: 'button', onclick: async () => {
          if (!f.file) return toast(tr('اختر ملفًا أولًا', 'Choose a file first'));
          const meta = {};
          if (f.up && Cloud.active()) { const up = await Cloud.upload(f.up, 'company'); if (up) Object.assign(meta, up); }
          const ex = S.companyDocs.find((d) => d.type === f.type);
          if (ex) Object.assign(ex, { file: f.file, exp: f.exp || null }, meta); else S.companyDocs.push({ id: rid('cd'), type: f.type, file: f.file, exp: f.exp || null, ...meta });
          syncProfileFromDocs(); logActivity('file', T2(`تحديث مستند الشركة: ${companyDocName(f.type)}`, `Business document updated: ${companyDocName(f.type)}`));
          ctrl.close(); commit(tr('تم حفظ المستند', 'Document saved'));
        } }, tr('حفظ', 'Save')),
        Cloud.active() ? null : h('p', { class: 'lbl' }, tr('يُحفظ اسم الملف وتاريخ الانتهاء على جهازك فقط في هذا الوضع.', 'In this mode only the file name and expiry date are kept on your device.')));
    },
  });
}

const SHIP_DOC_ORDER = ['invoice', 'inspection', 'insurance', 'origin', 'packing', 'conformity', 'booking', 'bl', 'declaration', 'valueProof'];
function fillDocs(box) {
  clear(box);
  if (UI.docsTab === 'company') {
    const ok = S.companyDocs.filter((d) => docStatus(d).tone === 'ok').length;
    box.append(
      S.companyDocs.length ? h('div', { class: 'card flat row' }, ring({ pct: (ok / S.companyDocs.length) * 100, size: 56, stroke: 6, track: 'var(--line-2)', mid: h('b', { class: 'num', style: { fontSize: '.8rem' } }, `${ok}/${S.companyDocs.length}`) }), h('div', { class: 'col grow' }, h('b', null, tr('مستندات الشركة', 'Business documents')), h('span', { class: 'lbl' }, tr('يطلب المصرف شهادتي الضرائب والضمان أصليتين وحديثتين عند كل اعتماد.', 'Banks ask for original, recent tax and social security certificates for every credit.')))) : h('div', { class: 'card empty' }, tr('لا مستندات بعد. أضف رخصة النشاط وشهادتي الضرائب والضمان.', 'No documents yet. Add your license and your tax and social security certificates.')),
      S.companyDocs.map((d, i) => { const st = docStatus(d); return h('button', { class: 'card tap row rise', style: { '--i': i }, type: 'button', onclick: () => openCompanyDoc(d.type) },
        h('div', { class: 'ibtn', style: { flex: 'none' } }, icon('file')),
        h('div', { class: 'col grow' }, h('b', { style: { font: '500 .92rem var(--f-body)' } }, companyDocName(d.type)), h('span', { class: 'mono lbl clip' }, d.file)),
        pill(st.text, st.tone)); }),
      h('button', { class: 'btn ghost block', type: 'button', onclick: () => openCompanyDoc('license') }, icon('plus'), tr('إضافة أو تحديث مستند', 'Add or update a document')));
  } else if (UI.docsTab === 'ships') {
    S.ships.filter((s) => !shipSummary(s).allDone).forEach((sh, i) => {
      const types = SHIP_DOC_ORDER.filter((t) => t !== 'conformity' || catOf(sh.cat).conf);
      const have = types.filter((t) => sh.docs && sh.docs[t]).length;
      box.append(h('div', { class: 'card col rise', style: { '--i': i } },
        h('div', { class: 'row' }, h('div', { class: 'col grow' }, h('span', { class: 'mono lbl' }, sh.id), h('b', null, shipTitle(sh))), pill(`${have}/${types.length}`, have === types.length ? 'ok' : 'warn')),
        h('div', { class: 'row wrap' }, types.map((t) => { const d = sh.docs && sh.docs[t]; return h('button', { class: 'chip' + (d ? ' on' : ''), type: 'button', style: d ? null : { borderStyle: 'dashed' }, onclick: () => (d ? openDocSheet(sh, t) : uploadDoc(sh, t)) }, d ? icon('check') : icon('plus'), docName(t)); }))));
    });
    if (!box.children.length) box.append(h('div', { class: 'card empty' }, tr('لا توجد رحلات نشطة.', 'No active shipments.')));
  } else {
    const t = (cls, ic, title, sub, fn) => h('button', { class: `card tap row ${cls}`, type: 'button', onclick: fn }, h('div', { class: 'tool', style: { minHeight: 0, padding: 0, flex: 'none' } }, h('div', { class: 'bx' }, icon(ic))), h('div', { class: 'col grow' }, h('b', null, title), h('span', { class: 'lbl', style: { color: 'inherit', opacity: 0.8 } }, sub)), icon('fwd'));
    box.append(
      t('tint-peach', 'scale', tr('مطابقة الفاتورة مع شهادة التفتيش', 'Match invoice with inspection certificate'), tr('يفعلها المصرف قبل قبول المستندات. اكتشف الفروق قبله.', 'The bank does this before accepting documents. Catch the differences first.'), () => openMatcher()),
      t('tint-mint', 'mail', tr('قراءة إشعار البوابة', 'Read a portal email'), tr('الصق بريد ACI فتتحدث حالة رحلتك.', 'Paste an ACI email and your shipment status updates.'), () => openMessageReader()),
      t('tint-lilac', 'route', tr('مرشد القناة المصرفية', 'Banking channel guide'), tr('اعتماد أم تحويل مباشر أم نشاط فردي.', 'Credit, direct transfer or sole-trader route.'), () => openChannelAdvisor()),
      t('tint-sky', 'swap', tr('محوّل العملة', 'Currency converter'), tr('بسعر المركزي الرسمي.', 'At the official Central Bank rate.'), () => openConverter()));
  }
}
function openDocsPage() {
  openPage('docs', () => {
    const box = h('div', { class: 'stack' });
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': tr('أقسام المستندات', 'Document sections') }, [['company', tr('الشركة', 'Business')], ['ships', tr('الرحلات', 'Shipments')], ['tools', tr('أدوات', 'Tools')]].map(([id, label]) => h('button', { type: 'button', class: UI.docsTab === id ? 'on' : '', onclick: (e) => { UI.docsTab = id; $$('button', seg).forEach((b) => b.classList.toggle('on', b === e.currentTarget)); fillDocs(box); } }, label)));
    fillDocs(box);
    return pageShell({ title: tr('المستندات', 'Documents'), right: h('button', { class: 'ibtn', type: 'button', 'aria-label': tr('إضافة مستند', 'Add a document'), onclick: () => openCompanyDoc('license') }, icon('plus')), body: h('div', { class: 'stack' }, seg, box) });
  });
}

/* ---------- deadline radar ---------- */
function openRadar() {
  openPage('radar', () => {
    const rows = [];
    REG_DATES.forEach((r) => rows.push({ date: D(r.date), title: L(r.n), sub: L(r.src), tone: r.tone, kind: 'reg' }));
    S.ships.forEach((sh) => { const r = aciRisk(sh); if (r) rows.push({ date: r.dead, title: tr(`اعتماد رقم ACI · ${sh.id}`, `ACI number due · ${sh.id}`), sub: shipTitle(sh), tone: r.tone, kind: 'aci', act: { type: 'ship', id: sh.id, open: 'gate-aci' } }); });
    S.companyDocs.forEach((d) => { if (d.exp) rows.push({ date: D(d.exp), title: tr(`انتهاء ${companyDocName(d.type)}`, `${companyDocName(d.type)} expires`), sub: tr('مستند الشركة', 'Business document'), tone: docStatus(d).tone === 'ok' ? 'info' : docStatus(d).tone, kind: 'doc', act: { type: 'docs' } }); });
    S.lcs.filter((l) => l.status === 'issued').forEach((l) => { const c = calcLC(l); rows.push({ date: c.due, title: tr(`استحقاق الاعتماد ${l.no}`, `Credit ${l.no} due`), sub: lcDesc(l), tone: c.left <= 7 ? 'warn' : 'info', kind: 'lc', act: { type: 'lc', no: l.no } }); });
    rows.sort((a, b) => a.date - b.date);
    return pageShell({ title: tr('رادار المواعيد', 'Deadline radar'), body: h('div', { class: 'card radar' }, rows.map((r) => {
      const left = daysBetween(TODAY, r.date);
      const el = h(r.act ? 'button' : 'div', { class: 'rd' + (left < 0 && r.kind === 'reg' ? ' past' : ''), type: r.act ? 'button' : null, style: r.act ? { width: '100%', textAlign: 'start' } : null, onclick: r.act ? () => runAct(r.act) : null },
        h('div', { class: 'dt' }, h('b', { class: 'num' }, String(r.date.getDate())), h('span', null, MONTHS[LANG][r.date.getMonth()])),
        h('div', { class: 't' }, r.title, h('small', null, `${r.sub} · ${r.date.getFullYear()}`)),
        left < 0 && r.kind === 'reg' ? pill(tr('سارٍ', 'In force'), 'ok', 'check') : pill(inDays(left), r.tone));
      return el;
    })) });
  });
}

/* ---------- settings ---------- */
function openSettings() {
  openPage('settings', () => {
    const row = (title, sub, ctl) => h('div', { class: 'setrow' }, h('div', { class: 'col' }, h('b', { style: { font: '500 .92rem var(--f-body)' } }, title), sub ? h('span', { class: 'lbl' }, sub) : null), ctl);
    const langSegEl = h('div', { class: 'lang-seg' }, h('button', { type: 'button', class: LANG === 'ar' ? 'on' : '', onclick: () => setLanguage('ar') }, 'العربية'), h('button', { type: 'button', class: LANG === 'en' ? 'on' : '', onclick: () => setLanguage('en') }, 'English'));
    const themeSeg = h('div', { class: 'lang-seg' }, [[null, tr('تلقائي', 'Auto')], ['light', tr('فاتح', 'Light')], ['dark', tr('داكن', 'Dark')]].map(([v, label]) => h('button', { type: 'button', class: (S.theme || null) === v ? 'on' : '', onclick: () => { S.theme = v; applyTheme(v); saveState(); rerender(); } }, label)));
    const sw = (on, fn) => h('button', { class: 'chip' + (on ? ' on' : ''), type: 'button', role: 'switch', 'aria-checked': String(on), onclick: fn }, on ? tr('يعمل', 'On') : tr('متوقف', 'Off'));
    const sure = (label, fn) => h('button', { class: 'chip', type: 'button', onclick: (e) => {
      const b = e.currentTarget;
      if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = tr('اضغط للتأكيد', 'Tap to confirm'); b.classList.add('on'); setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = label; b.classList.remove('on'); } }, 3000); return; }
      fn();
    } }, label);
    const parts = [
      h('div', { class: 'card col' }, h('div', { class: 'h3' }, tr('عام', 'General')),
        row(tr('اللغة', 'Language'), null, langSegEl),
        row(tr('المظهر', 'Theme'), null, themeSeg),
        row(tr('عرض مبسّط', 'Simple view'), tr('يخفي المسار الكامل للرحلة ما لم تفتحه.', 'Keeps the full shipment journey folded until you open it.'), sw(S.simple, () => { S.simple = !S.simple; commit(); }))),
      h('div', { class: 'card col' }, h('div', { class: 'h3' }, tr('بياناتك', 'Your data')),
        Cloud.orgId()
          ? row(tr('بياناتك الفعلية', 'Your own data'), tr('محفوظة في حسابك على السحابة وتتزامن بين أجهزتك.', 'Saved to your cloud account and synced across your devices.'), pill(tr('متزامن', 'Synced'), 'ok', 'check'))
          : [
            row(isDemo() ? tr('تجربة ببيانات تجريبية', 'Exploring demo data') : tr('بياناتك الفعلية', 'Your own data'), isDemo() ? tr('كل ما تراه أمثلة.', 'Everything you see is an example.') : tr('محفوظة هنا.', 'Kept here.'), isDemo() ? h('button', { class: 'chip on', type: 'button', onclick: () => { resetState('live'); applyTheme(null); closeAllPages(); rerender(); startOnboarding(); } }, tr('ابدأ ببياناتي', 'Start with mine')) : h('button', { class: 'chip', type: 'button', onclick: () => { resetState('demo'); applyTheme(null); closeAllPages(); rerender(); toast(tr('تم تحميل بيانات تجريبية', 'Demo data loaded')); } }, tr('جرّب بيانات تجريبية', 'Try demo data'))),
            row(tr('إعادة البدء', 'Start over'), tr('يمسح بياناتك على هذا الجهاز ويعيد التهيئة.', 'Clears your data on this device and restarts the setup.'), sure(tr('إعادة', 'Reset'), () => { resetState('live'); applyTheme(null); closeAllPages(); rerender(); startOnboarding(); })),
          ]),
      accountCard(),
      h('div', { class: 'card col' }, h('div', { class: 'h3' }, tr('عن التطبيق', 'About')),
        h('p', { class: 'lbl' }, tr('نموذج تجريبي. ليس جهة رسمية ولا يرتبط بأي بوابة حكومية. القواعد محدّثة حتى ', 'Prototype. Not an official body and not connected to any government portal. Rules current as of '), fmtDate(D(RULES_AS_OF)), '.')),
    ];
    return pageShell({ title: tr('الإعدادات', 'Settings'), body: h('div', { class: 'stack' }, parts) });
  });
}
