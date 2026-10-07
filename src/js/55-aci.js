/* ---------- ACI composer ---------- */
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function setPath(o, p, v) { const ks = p.split('.'); let t = o; for (let i = 0; i < ks.length - 1; i++) t = t[ks[i]]; t[ks[ks.length - 1]] = v; }

const ACI_SECTIONS = [
  { id: 'parties', ar: 'الأطراف والبيانات العامة', fields: [
    { p: 'aci.exporterTin', ar: 'الرقم الضريبي للمصدّر', req: 1, cls: 'ltr' },
    { p: 'aci.importerStat', ar: 'الرمز الإحصائي للمستورد', req: 1, cls: 'ltr' },
    { p: 'aci.exportCountry', ar: 'بلد التصدير', req: 1, t: 'country', w2: 1 },
  ] },
  { id: 'transport', ar: 'النقل', fields: [
    { p: 'booking', ar: 'رقم الحجز', req: 1, cls: 'ltr' },
    { p: 'vessel', ar: 'اسم السفينة', req: 1, cls: 'ltr' },
    { p: 'imo', ar: 'رقم IMO', req: 1, cls: 'ltr', inputmode: 'numeric', hint: '7 أرقام' },
    { p: 'voyage', ar: 'رقم الرحلة', req: 1, cls: 'ltr' },
    { p: 'carrier', ar: 'شركة الشحن', req: 1 },
    { p: 'agent', ar: 'الوكيل الملاحي', req: 1 },
    { p: 'etd', ar: 'المغادرة التقديرية', req: 1, t: 'date' },
    { p: 'eta', ar: 'الوصول التقديري', req: 1, t: 'date' },
    { p: 'pol', ar: 'ميناء التحميل', req: 1 },
    { p: 'pod', ar: 'ميناء التفريغ', req: 1, t: 'select', opts: PORTS_LY },
    { p: 'dest', ar: 'الوجهة النهائية', req: 1, t: 'select', opts: PORTS_LY },
  ] },
  { id: 'finance', ar: 'البيانات المالية', fields: [
    { p: 'incoterm', ar: 'شروط التسليم', req: 1, t: 'select', opts: INCOTERMS },
    { p: 'lcNo', ar: 'الرقم المرجعي للاعتماد', req: 1, cls: 'ltr' },
    { p: 'valueUsd', ar: 'قيمة المنتج', req: 1, num: 1, unit: 'USD' },
    { p: 'freight', ar: 'قيمة الشحن', num: 1, unit: 'USD' },
    { p: 'insurance', ar: 'قيمة التأمين', num: 1, unit: 'USD' },
    { p: 'currency', ar: 'العملة', t: 'select', opts: ['USD', 'EUR', 'CNY', 'TRY', 'INR'] },
  ] },
];
const ITEM_COLS = [
  { k: 'desc', ar: 'الوصف التجاري', w2: 1 }, { k: 'hs', ar: 'رمز البضاعة HS', cls: 'ltr', hint: '6 أرقام على الأقل' }, { k: 'origin', ar: 'بلد المنشأ', t: 'country' },
  { k: 'pkgs', ar: 'عدد الطرود', num: 1 }, { k: 'pkgType', ar: 'نوع الطرد', t: 'select', opts: PKG_TYPES }, { k: 'gross', ar: 'الوزن الإجمالي كجم', num: 1 }, { k: 'net', ar: 'الوزن الصافي كجم', num: 1 },
];
const CONT_COLS = [
  { k: 'no', ar: 'رقم الحاوية', cls: 'ltr', w2: 1, check: 'container' }, { k: 'type', ar: 'النوع', t: 'select', opts: CONTAINER_TYPES }, { k: 'seal', ar: 'رقم الختم', cls: 'ltr' },
  { k: 'pkgs', ar: 'الطرود', num: 1 }, { k: 'tare', ar: 'الوزن الفارغ كجم', num: 1 }, { k: 'gross', ar: 'الوزن الإجمالي كجم', num: 1 },
];
const ACI_DOCS = ['invoice', 'origin', 'packing', 'booking'];
const ACI_OPEN = {};

function inputFor(d, value, onSet) {
  const id = uid('f');
  let el;
  if (d.t === 'country') el = h('select', { id }, COUNTRIES.map((c) => h('option', { value: c.c, selected: c.c === value }, c.n)));
  else if (d.t === 'select') el = h('select', { id }, h('option', { value: '' }, '—'), d.opts.map((o) => h('option', { value: o, selected: o === value }, o)));
  else if (d.t === 'date') el = h('input', { id, type: 'date', value: value || '' });
  else el = h('input', { id, value: value == null || value === 0 ? '' : String(value), class: d.cls || (d.num ? 'ltr' : ''), inputmode: d.inputmode || (d.num ? 'numeric' : null) });
  el.addEventListener('change', () => onSet(d.num ? num(el.value) : el.value));
  if (d.check === 'container') {
    const hint = h('span', { class: 'hint' });
    const paint = () => { const v = el.value; hint.textContent = !v ? 'تُفحص وفق ISO 6346' : validContainer(v) ? 'رقم صحيح' : 'رقم التحقق غير صحيح (ISO 6346)'; hint.className = 'hint' + (v && !validContainer(v) ? ' bad' : ''); };
    el.addEventListener('input', paint); paint();
    return { id, el, wrap: h('div', { class: 'col', style: { gap: '6px' } }, el, hint) };
  }
  if (d.unit) return { id, el, wrap: h('div', { class: 'u' }, h('b', null, d.unit), el) };
  return { id, el, wrap: el };
}
function aciField(d, value, onSet) {
  const r = inputFor(d, value, onSet);
  return h('div', { class: 'field' + (d.w2 ? ' w2' : '') }, h('label', { for: r.id }, d.ar, d.req ? h('b', null, ' *') : null), r.wrap, d.hint && !d.check ? h('span', { class: 'hint' }, d.hint) : null);
}

function aciPackText(sh) {
  const a = sh.aci;
  const v = (x) => (x === undefined || x === null || x === '' || x === 0 ? '—' : x);
  const lines = [`بيانات ACI · ${sh.id}`, `(للنسخ إلى ${SYS.aci.url})`, '',
    '[الأطراف]', `الرقم الضريبي للمصدّر: ${v(a.exporterTin)}`, `الرمز الإحصائي للمستورد: ${v(a.importerStat)}`, `بلد التصدير: ${countryName(a.exportCountry)}`, '',
    '[النقل]', `رقم الحجز: ${v(sh.booking)}`, `السفينة: ${v(sh.vessel)} · IMO ${v(sh.imo)} · رحلة ${v(sh.voyage)}`, `شركة الشحن: ${v(sh.carrier)} · الوكيل: ${v(sh.agent)}`,
    `المغادرة: ${v(sh.etd)} · الوصول: ${v(sh.eta)}`, `التحميل: ${v(sh.pol)} · التفريغ: ${v(sh.pod)} · الوجهة: ${v(sh.dest)}`, '',
    '[المالية]', `Incoterms: ${v(sh.incoterm)} · مرجع الاعتماد: ${v(sh.lcNo)}`, `قيمة المنتج: ${v(sh.valueUsd)} ${sh.currency} · الشحن: ${v(sh.freight)} · التأمين: ${v(sh.insurance)}`, '', '[الأصناف]'];
  sh.items.forEach((i, n) => lines.push(`${n + 1}) ${v(i.desc)} | HS ${v(i.hs)} | ${countryName(i.origin)} | ${v(i.pkgs)} ${v(i.pkgType)} | إجمالي ${v(i.gross)} / صافي ${v(i.net)} كجم`));
  lines.push('', '[الحاويات]');
  sh.containers.forEach((c, n) => lines.push(`${n + 1}) ${v(c.no)} | ${v(c.type)} | ختم ${v(c.seal)} | ${v(c.pkgs)} طرد | فارغ ${v(c.tare)} / إجمالي ${v(c.gross)} كجم`));
  return lines.join('\n');
}
function supplierInvite(sh) {
  const dl = aciRisk(sh);
  return [`Subject: Libya ACI registration for shipment ${sh.id}${sh.lcNo ? ` (LC ${sh.lcNo})` : ''}`, '', `Dear ${sh.supplier.name},`, '',
    'Goods shipped to Libya need an Advance Cargo Information (ACI) number before loading.',
    `1. Register / log in at ${SYS.aci.url}`,
    `2. Start the shipment data entry and enter: your tax ID, our statistical code ${sh.aci.importerStat || S.company.stat}, country of export, and the commercial invoice.`,
    '3. We will review and approve. Then complete transport, financial, item and container details and submit.',
    sh.lcNo ? `4. Please quote LC reference ${sh.lcNo} in the financial data.` : '4. Please quote the payment reference in the financial data.',
    '5. Give the ACI number to the carrier so it appears on the final bill of lading. Carriers apply "no ACI number, no load".',
    dl ? `Deadline: the ACI number must be validated at least 48 hours before loading (by ${iso(dl.dead)}).` : 'The ACI number must be validated at least 48 hours before loading.',
    '', `Libya PTS registration for foreign suppliers becomes mandatory from 1 Jan 2027 (USD 1M or more per year) and from 31 Mar 2027 (USD 100K or more): ${SYS.etrade.url}`, '', `Best regards,`, S.company.name].join('\n');
}

function openACI(id) {
  const key = 'aci:' + id;
  if (!ACI_OPEN[id]) ACI_OPEN[id] = new Set(['parties']);
  openPage(key, (page) => {
    const sh = shipOf(id);
    if (!sh) return [pageShell({ title: 'غير موجودة', body: h('div', { class: 'empty' }, 'تعذر العثور على الرحلة') })];
    const open = ACI_OPEN[id];
    const stat = h('div'), checksBox = h('div'), badges = {};
    const refresh = () => {
      const checks = aciChecks(sh);
      const errs = checks.filter((c) => c.lvl === 'err'), warns = checks.filter((c) => c.lvl === 'warn');
      const pct = aciCompleteness(sh);
      const idx = aciIndex(sh.aci.status);
      const cur = ACI_FLOW[idx];
      clear(stat).append(
        h('div', { class: 'row' }, pill(cur.ar, idx >= 6 ? 'ok' : sh.aci.status === 'importer_review' ? 'gold' : 'info', 'shield'), h('span', { class: 'sp' }), cur.who ? h('span', { class: 'lbl' }, 'الدور عند: ', h('b', null, cur.who)) : null),
        h('div', { class: 'stepper', 'aria-hidden': 'true' }, ACI_FLOW.map((s, i) => h('i', { class: i <= idx ? 'on' : '' }))),
        h('span', { class: 'lbl' }, cur.hint),
        sh.aci.note ? h('div', { class: 'note warn' }, icon('alert'), h('span', null, h('b', null, 'ملاحظة: '), sh.aci.note)) : null,
        h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { class: 'row' }, h('span', { class: 'lbl grow' }, 'اكتمال حزمة البيانات'), h('b', { class: 'num' }, pct + '%')), h('div', { class: 'bar', style: { marginTop: '6px' } }, h('i', { style: { width: pct + '%' } })))),
        h('div', { class: 'row wrap' }, pill(`${errs.length} ${errs.length === 1 ? 'خطأ' : 'أخطاء'}`, errs.length ? 'bad' : 'ok'), pill(`${warns.length} ${warns.length === 1 ? 'تنبيه' : 'تنبيهات'}`, warns.length ? 'warn' : 'ok')));
      clear(checksBox).append(checks.length ? checks.sort((a, b) => (a.lvl === b.lvl ? 0 : a.lvl === 'err' ? -1 : 1)).map((c) => h('div', { class: `chk ${c.lvl}` }, icon(c.lvl === 'err' ? 'x' : 'alert'), h('span', null, c.text, c.sub ? h('small', null, c.sub) : null))) : h('div', { class: 'note ok' }, icon('check'), h('span', null, h('b', null, 'جاهزة. '), 'لا ملاحظات على حزمة البيانات.')));
      Object.keys(badges).forEach((k) => { const n = checks.filter((c) => c.sec === k && c.lvl === 'err').length; clear(badges[k]).append(n ? pill(String(n), 'bad') : pill('✓', 'ok')); });
    };
    const set = (path) => (v) => { setPath(sh, path, v); saveState(); refresh(); };
    const section = (id2, title, content) => {
      const det = h('details', { class: 'card', open: open.has(id2) ? true : null, ontoggle: () => { if (det.open) open.add(id2); else open.delete(id2); } },
        h('summary', { class: 'row', style: { cursor: 'pointer', listStyle: 'none' } }, h('b', { class: 'grow', style: { font: '500 .94rem var(--f-disp)' } }, title), (badges[id2] = h('span')), icon('chevD')),
        h('div', { style: { paddingTop: '12px' } }, content));
      return det;
    };
    const formOf = (defs) => h('div', { class: 'form' }, defs.map((d) => aciField(d, getPath(sh, d.p), set(d.p))));
    const listOf = (name, cols, label, blank) => h('div', { class: 'list-edit' },
      sh[name].map((row, i) => h('div', { class: 'mini-card' },
        h('div', { class: 'row' }, h('b', { class: 'grow' }, `${label} ${i + 1}`), h('button', { class: 'btn sm quiet', type: 'button', 'aria-label': 'حذف', onclick: () => { sh[name].splice(i, 1); saveState(); renderPage(page); } }, icon('trash'))),
        h('div', { class: 'form' }, cols.map((d) => aciField(d, row[d.k], (v) => { row[d.k] = v; saveState(); refresh(); }))))),
      h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { sh[name].push(blank()); saveState(); renderPage(page); } }, icon('plus'), 'إضافة ' + label));
    const docsContent = h('div', { class: 'col' }, ACI_DOCS.map((t) => { const d = sh.docs[t]; return h('div', { class: 'row' }, icon(d ? 'check' : 'plus'), h('div', { class: 'col grow' }, h('b', { style: { font: '500 .88rem var(--f-body)' } }, DOC_TYPES[t].ar), h('span', { class: 'mono lbl clip' }, d ? d.file : 'غير مرفق')), h('button', { class: 'btn sm ghost', type: 'button', onclick: () => uploadDoc(sh, t) }, d ? 'استبدال' : 'رفع')); }));

    const sections = [
      section('parties', 'الأطراف والبيانات العامة', formOf(ACI_SECTIONS[0].fields)),
      section('transport', 'النقل', formOf(ACI_SECTIONS[1].fields)),
      section('finance', 'البيانات المالية', formOf(ACI_SECTIONS[2].fields)),
      section('items', 'الأصناف', listOf('items', ITEM_COLS, 'صنف', () => ({ desc: '', hs: '', origin: sh.aci.exportCountry || '', pkgs: 0, pkgType: 'كرتون', gross: 0, net: 0 }))),
      section('containers', 'الحاويات', listOf('containers', CONT_COLS, 'حاوية', () => ({ no: '', type: '40HC', seal: '', pkgs: 0, tare: 0, gross: 0 }))),
      section('docs', 'المرفقات', docsContent),
    ];
    refresh();
    const foot = sh.aci.status === 'importer_review'
      ? h('button', { class: 'btn gold block', type: 'button', onclick: () => openApproval(sh.id) }, icon('check'), 'مراجعة وموافقة على بيانات المورد')
      : sh.aci.status === 'draft'
        ? h('button', { class: 'btn gold block', type: 'button', onclick: async () => toast((await copyText(supplierInvite(sh))) ? 'تم نسخ دعوة المورد' : 'تعذر النسخ') }, icon('invite'), 'انسخ دعوة المورد')
        : h('a', { class: 'btn gold block', href: SYS.aci.url, target: '_blank', rel: 'noopener noreferrer', style: { textDecoration: 'none' } }, icon('ext'), 'فتح بوابة ACI');
    return pageShell({
      title: 'مُنسّق ACI · ' + sh.id,
      body: h('div', { class: 'stack' },
        h('div', { class: 'card col rise' }, stat),
        h('div', { class: 'note' }, icon('info'), h('span', null, 'البوابة الرسمية هي المرجع. يجهّز سَنَد بياناتك ويفحصها ثم تنسخها أو يدخلها المورد هناك.')),
        sections,
        h('div', { class: 'sect-h' }, h('h2', { style: { font: '500 1rem var(--f-disp)' } }, 'الفحص المسبق')),
        h('div', { class: 'card' }, checksBox),
        h('div', { class: 'row wrap' },
          h('button', { class: 'btn ghost sm', type: 'button', onclick: async () => toast((await copyText(aciPackText(sh))) ? 'تم نسخ حزمة البيانات' : 'تعذر النسخ') }, icon('copy'), 'نسخ حزمة البيانات'),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: async () => toast((await copyText(supplierInvite(sh))) ? 'تم نسخ دعوة المورد' : 'تعذر النسخ') }, icon('invite'), 'دعوة المورد'),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: () => openMessageReader(sh.id) }, icon('mail'), 'لصق إشعار'))),
      foot,
    });
  });
}

/* ---------- importer approval (the step the importer performs in ACI) ---------- */
function approvalChecks(sh) {
  const lc = lcOf(sh);
  const a = sh.aci;
  const c = lc ? calcLC(lc) : null;
  return [
    { ok: a.importerStat === S.company.stat, t: 'الرمز الإحصائي المدخل يطابق رمز شركتك', s: `المدخل: ${a.importerStat || '—'} · رمزك: ${S.company.stat}` },
    { ok: !!a.exporterTin, t: 'الرقم الضريبي للمصدّر مدخل', s: a.exporterTin || '' },
    { ok: a.exportCountry === sh.supplier.country, t: 'بلد التصدير يطابق بلد المورد', s: `${countryName(a.exportCountry)} / ${countryName(sh.supplier.country)}` },
    { ok: !!(sh.docs && sh.docs.invoice), t: 'الفاتورة التجارية مرفقة', s: sh.docs && sh.docs.invoice ? sh.docs.invoice.file : '' },
    { ok: !lc || textMatch(sh.supplier.name, lc.supplier), t: 'المورد هو مستفيد الاعتماد', s: lc ? `المستفيد: ${lc.supplier}` : 'لا اعتماد مرتبط' },
    { ok: !c || !sh.valueUsd || sh.valueUsd <= c.max, t: 'قيمة الفاتورة ضمن الحد المسموح للاعتماد', s: c ? `القيمة $${nf(sh.valueUsd)} · الحد $${nf(c.max)}` : '' },
  ];
}
function openApproval(id) {
  const sh = shipOf(id);
  if (!sh) return;
  openSheet({
    title: 'مراجعة بيانات المورد',
    build: (body, ctrl) => {
      const checks = approvalChecks(sh);
      const bad = checks.filter((c) => !c.ok).length;
      const msg = h('textarea', { id: 'ap-msg', placeholder: 'رسالة تُرسل مع قرارك (إلزامية عند الموافقة في ACI)', oninput: () => msg.closest('.field').classList.remove('bad') });
      body.append(
        h('div', { class: 'card flat' }, kv('الشحنة', `${sh.id} · ${sh.title}`), kv('المورد', h('span', { class: 'ltr' }, sh.supplier.name)), kv('بلد التصدير', countryName(sh.aci.exportCountry)), kv('الفاتورة', sh.docs.invoice ? h('span', { class: 'mono' }, sh.docs.invoice.file) : '—'), kv('القيمة', '$' + nf(sh.valueUsd))),
        h('div', { class: 'col' }, checks.map((c) => h('div', { class: `chk ${c.ok ? 'ok' : 'err'}` }, icon(c.ok ? 'check' : 'x'), h('span', null, c.t, c.s ? h('small', null, c.s) : null)))),
        bad ? h('div', { class: 'note bad' }, icon('alert'), h('span', null, `${bad} ${bad === 1 ? 'بند يحتاج' : 'بنود تحتاج'} مراجعة. الأفضل رفض الطلب مع توضيح السبب بدل الموافقة على بيانات خاطئة.`)) : h('div', { class: 'note ok' }, icon('check'), h('span', null, 'البيانات متسقة مع الاعتماد والمورد.')),
        h('div', { class: 'field' }, h('label', { for: 'ap-msg' }, 'رسالتك للمورد والجمارك'), msg),
        h('div', { class: 'row' },
          h('button', { class: 'btn gold grow', type: 'button', onclick: () => {
            if (!msg.value.trim()) { msg.closest('.field').classList.add('bad'); return toast('اكتب رسالة قبل الموافقة'); }
            setAci(sh, 'supplier_completion'); ctrl.close(); commit('تمت الموافقة. بانتظار استكمال المورد');
          } }, icon('check'), 'موافقة'),
          h('button', { class: 'btn danger', type: 'button', onclick: () => {
            if (!msg.value.trim()) { msg.closest('.field').classList.add('bad'); return toast('اكتب سبب الرفض'); }
            setAci(sh, 'draft', { note: msg.value.trim() }); ctrl.close(); commit('تم الرفض وأُعيدت للمورد');
          } }, icon('x'), 'رفض')),
        h('p', { class: 'lbl' }, 'في النظام الرسمي تتم الموافقة من بريد ACI على بوابة الجمارك. هذه الشاشة تجهّز قرارك وتحدّث حالة رحلتك هنا.'));
    },
  });
}
