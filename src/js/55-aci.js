/* ---------- ACI composer ---------- */
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function setPath(o, p, v) { const ks = p.split('.'); let t = o; for (let i = 0; i < ks.length - 1; i++) t = t[ks[i]]; t[ks[ks.length - 1]] = v; }

const portOpts = () => PORTS_LY.map((p) => ({ v: p.id, t: L(p.n) }));
const aciSections = () => [
  { id: 'parties', n: tr('الأطراف والبيانات العامة', 'Parties and general data'), fields: [
    { p: 'aci.exporterTin', ar: tr('الرقم الضريبي للمصدّر', 'Exporter tax ID'), req: 1, cls: 'ltr' },
    { p: 'aci.importerStat', ar: tr('الرمز الإحصائي للمستورد', 'Importer statistical code'), req: 1, cls: 'ltr' },
    { p: 'aci.exportCountry', ar: tr('بلد التصدير', 'Country of export'), req: 1, t: 'country', w2: 1 },
  ] },
  { id: 'transport', n: tr('النقل', 'Transport'), fields: [
    { p: 'booking', ar: tr('رقم الحجز', 'Booking number'), req: 1, cls: 'ltr' },
    { p: 'vessel', ar: tr('اسم السفينة', 'Vessel name'), req: 1, cls: 'ltr' },
    { p: 'imo', ar: tr('رقم IMO', 'IMO number'), req: 1, cls: 'ltr', inputmode: 'numeric', hint: tr('7 أرقام', '7 digits') },
    { p: 'voyage', ar: tr('رقم الرحلة', 'Voyage number'), req: 1, cls: 'ltr' },
    { p: 'carrier', ar: tr('شركة الشحن', 'Shipping line'), req: 1 },
    { p: 'agent', ar: tr('الوكيل الملاحي', 'Shipping agent'), req: 1 },
    { p: 'etd', ar: tr('المغادرة التقديرية', 'Estimated departure'), req: 1, t: 'date' },
    { p: 'eta', ar: tr('الوصول التقديري', 'Estimated arrival'), req: 1, t: 'date' },
    { p: 'pol', ar: tr('ميناء التحميل', 'Port of loading'), req: 1 },
    { p: 'pod', ar: tr('ميناء التفريغ', 'Port of discharge'), req: 1, t: 'select', opts: portOpts() },
    { p: 'dest', ar: tr('الوجهة النهائية', 'Final destination'), req: 1, t: 'select', opts: portOpts() },
  ] },
  { id: 'finance', n: tr('البيانات المالية', 'Financial data'), fields: [
    { p: 'incoterm', ar: tr('شروط التسليم', 'Delivery terms'), req: 1, t: 'select', opts: INCOTERMS.map((o) => ({ v: o, t: o })) },
    { p: 'lcNo', ar: tr('الرقم المرجعي للاعتماد', 'Credit reference number'), req: 1, cls: 'ltr' },
    { p: 'valueUsd', ar: tr('قيمة المنتج', 'Goods value'), req: 1, num: 1, unit: 'USD' },
    { p: 'freight', ar: tr('قيمة الشحن', 'Freight value'), num: 1, unit: 'USD' },
    { p: 'insurance', ar: tr('قيمة التأمين', 'Insurance value'), num: 1, unit: 'USD' },
    { p: 'currency', ar: tr('العملة', 'Currency'), t: 'select', opts: ['USD', 'EUR', 'CNY', 'TRY', 'INR'].map((o) => ({ v: o, t: o })) },
  ] },
];
const itemCols = () => [
  { k: 'desc', ar: tr('الوصف التجاري', 'Commercial description'), w2: 1 }, { k: 'hs', ar: tr('رمز البضاعة HS', 'HS code'), cls: 'ltr', hint: tr('6 أرقام على الأقل', 'At least 6 digits') }, { k: 'origin', ar: tr('بلد المنشأ', 'Country of origin'), t: 'country' },
  { k: 'pkgs', ar: tr('عدد الطرود', 'Packages'), num: 1 }, { k: 'pkgType', ar: tr('نوع الطرد', 'Package type'), t: 'select', opts: PKG_TYPES.map((p) => ({ v: p.id, t: L(p.n) })) }, { k: 'gross', ar: tr('الوزن الإجمالي كجم', 'Gross weight kg'), num: 1 }, { k: 'net', ar: tr('الوزن الصافي كجم', 'Net weight kg'), num: 1 },
];
const contCols = () => [
  { k: 'no', ar: tr('رقم الحاوية', 'Container number'), cls: 'ltr', w2: 1, check: 'container' }, { k: 'type', ar: tr('النوع', 'Type'), t: 'select', opts: CONTAINER_TYPES.map((o) => ({ v: o, t: o })) }, { k: 'seal', ar: tr('رقم الختم', 'Seal number'), cls: 'ltr' },
  { k: 'pkgs', ar: tr('الطرود', 'Packages'), num: 1 }, { k: 'tare', ar: tr('الوزن الفارغ كجم', 'Tare weight kg'), num: 1 }, { k: 'gross', ar: tr('الوزن الإجمالي كجم', 'Gross weight kg'), num: 1 },
];
const ACI_DOCS = ['invoice', 'origin', 'packing', 'booking'];
const ACI_OPEN = {};

function inputFor(d, value, onSet) {
  const id = uid('f');
  let el;
  if (d.t === 'country') el = h('select', { id }, COUNTRIES.map((c) => h('option', { value: c.c, selected: c.c === value }, L(c.n))));
  else if (d.t === 'select') el = h('select', { id }, h('option', { value: '' }, '—'), d.opts.map((o) => h('option', { value: o.v, selected: o.v === value }, o.t)));
  else if (d.t === 'date') el = h('input', { id, type: 'date', value: value || '' });
  else el = h('input', { id, value: value == null || value === 0 ? '' : String(value), class: d.cls || (d.num ? 'ltr' : ''), inputmode: d.inputmode || (d.num ? 'numeric' : null) });
  el.addEventListener('change', () => onSet(d.num ? num(el.value) : el.value));
  if (d.check === 'container') {
    const hint = h('span', { class: 'hint' });
    const paint = () => { const v = el.value; hint.textContent = !v ? tr('تُفحص وفق ISO 6346', 'Checked per ISO 6346') : validContainer(v) ? tr('رقم صحيح', 'Valid number') : tr('رقم التحقق غير صحيح (ISO 6346)', 'Check digit is not valid (ISO 6346)'); hint.className = 'hint' + (v && !validContainer(v) ? ' bad' : ''); };
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
  const lines = [`ACI data · ${sh.id}`, `(to copy into ${SYS.aci.url})`, '',
    '[Parties]', `Exporter tax ID: ${v(a.exporterTin)}`, `Importer statistical code: ${v(a.importerStat)}`, `Country of export: ${COUNTRIES.find((c) => c.c === a.exportCountry) ? COUNTRIES.find((c) => c.c === a.exportCountry).n.en : v(a.exportCountry)}`, '',
    '[Transport]', `Booking number: ${v(sh.booking)}`, `Vessel: ${v(sh.vessel)} · IMO ${v(sh.imo)} · voyage ${v(sh.voyage)}`, `Carrier: ${v(sh.carrier)} · Agent: ${v(sh.agent)}`,
    `Departure: ${v(sh.etd)} · Arrival: ${v(sh.eta)}`, `Loading: ${v(sh.pol)} · Discharge: ${v(sh.pod)} · Destination: ${v(sh.dest)}`, '',
    '[Financial]', `Incoterms: ${v(sh.incoterm)} · Credit ref: ${v(sh.lcNo)}`, `Goods value: ${v(sh.valueUsd)} ${sh.currency} · Freight: ${v(sh.freight)} · Insurance: ${v(sh.insurance)}`, '', '[Items]'];
  sh.items.forEach((i, n) => lines.push(`${n + 1}) ${v(i.desc)} | HS ${v(i.hs)} | ${v(i.origin)} | ${v(i.pkgs)} ${v(i.pkgType)} | gross ${v(i.gross)} / net ${v(i.net)} kg`));
  lines.push('', '[Containers]');
  sh.containers.forEach((c, n) => lines.push(`${n + 1}) ${v(c.no)} | ${v(c.type)} | seal ${v(c.seal)} | ${v(c.pkgs)} pkgs | tare ${v(c.tare)} / gross ${v(c.gross)} kg`));
  return lines.join('\n');
}
function supplierInvite(sh) {
  const dl = aciRisk(sh);
  return [`Subject: Libya ACI registration for shipment ${sh.id}${sh.lcNo ? ` (LC ${sh.lcNo})` : ''}`, '', `Dear ${sh.supplier.name},`, '',
    'Goods shipped to Libya need an Advance Cargo Information (ACI) number before loading.',
    `1. Register / log in at ${SYS.aci.url}`,
    `2. Start the shipment data entry and enter: your tax ID, our statistical code ${sh.aci.importerStat || S.org.stat || '(to be provided)'}, country of export, and the commercial invoice.`,
    '3. We will review and approve. Then complete transport, financial, item and container details and submit.',
    sh.lcNo ? `4. Please quote LC reference ${sh.lcNo} in the financial data.` : '4. Please quote the payment reference in the financial data.',
    '5. Give the ACI number to the carrier so it appears on the final bill of lading. Carriers apply "no ACI number, no load".',
    dl ? `Deadline: the ACI number must be validated at least 48 hours before loading (by ${iso(dl.dead)}).` : 'The ACI number must be validated at least 48 hours before loading.',
    '', `Libya PTS registration for foreign suppliers becomes mandatory from 1 Jan 2027 (USD 1M or more per year) and from 31 Mar 2027 (USD 100K or more): ${SYS.etrade.url}`, '', 'Best regards,', orgName()].join('\n');
}

function openACI(id) {
  const key = 'aci:' + id;
  if (!ACI_OPEN[id]) ACI_OPEN[id] = new Set(['parties']);
  openPage(key, (page) => {
    const sh = shipOf(id);
    if (!sh) return [pageShell({ title: tr('غير موجودة', 'Not found'), body: h('div', { class: 'empty' }, tr('تعذر العثور على الرحلة', 'Shipment not found')) })];
    const open = ACI_OPEN[id];
    const stat = h('div'), checksBox = h('div'), badges = {};
    const refresh = () => {
      const checks = aciChecks(sh);
      const errs = checks.filter((c) => c.lvl === 'err'), warns = checks.filter((c) => c.lvl === 'warn');
      const pct = aciCompleteness(sh);
      const idx = aciIndex(sh.aci.status);
      const cur = ACI_FLOW[idx];
      clear(stat).append(
        h('div', { class: 'row' }, pill(L(cur.n), idx >= 6 ? 'ok' : sh.aci.status === 'importer_review' ? 'gold' : 'info', 'shield'), h('span', { class: 'sp' }), cur.who ? h('span', { class: 'lbl' }, tr('الدور عند: ', 'Now with: '), h('b', null, whoName(cur.who))) : null),
        h('div', { class: 'stepper', 'aria-hidden': 'true' }, ACI_FLOW.map((s, i) => h('i', { class: i <= idx ? 'on' : '' }))),
        h('span', { class: 'lbl' }, L(cur.hint)),
        sh.aci.note ? h('div', { class: 'note warn' }, icon('alert'), h('span', null, h('b', null, tr('ملاحظة: ', 'Note: ')), sh.aci.note)) : null,
        h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { class: 'row' }, h('span', { class: 'lbl grow' }, tr('اكتمال حزمة البيانات', 'Data pack completeness')), h('b', { class: 'num' }, pct + '%')), h('div', { class: 'bar', style: { marginTop: '6px' } }, h('i', { style: { width: pct + '%' } })))),
        h('div', { class: 'row wrap' }, pill(tr(`${errs.length} ${errs.length === 1 ? 'خطأ' : 'أخطاء'}`, `${errs.length} ${errs.length === 1 ? 'error' : 'errors'}`), errs.length ? 'bad' : 'ok'), pill(tr(`${warns.length} ${warns.length === 1 ? 'تنبيه' : 'تنبيهات'}`, `${warns.length} ${warns.length === 1 ? 'warning' : 'warnings'}`), warns.length ? 'warn' : 'ok')));
      clear(checksBox).append(checks.length ? checks.sort((a, b) => (a.lvl === b.lvl ? 0 : a.lvl === 'err' ? -1 : 1)).map((c) => h('div', { class: `chk ${c.lvl}` }, icon(c.lvl === 'err' ? 'x' : 'alert'), h('span', null, c.text, c.sub ? h('small', null, c.sub) : null))) : h('div', { class: 'note ok' }, icon('check'), h('span', null, h('b', null, tr('جاهزة. ', 'Ready. '), tr('لا ملاحظات على حزمة البيانات.', 'No remarks on the data pack.')))));
      Object.keys(badges).forEach((k) => { const n = checks.filter((c) => c.sec === k && c.lvl === 'err').length; clear(badges[k]).append(n ? pill(String(n), 'bad') : pill('✓', 'ok')); });
    };
    const set = (path) => (v) => { setPath(sh, path, v); saveState(); refresh(); };
    const section = (id2, title, content) => {
      const det = h('details', { class: 'card', open: open.has(id2) ? true : null, ontoggle: () => { if (det.open) open.add(id2); else open.delete(id2); } },
        h('summary', { class: 'row', style: { cursor: 'pointer', listStyle: 'none' } }, h('b', { class: 'grow', style: { font: '500 .94rem var(--f-disp)' } }, title), (badges[id2] = h('span')), icon('chevD')),
        h('div', { style: { paddingTop: '12px' } }, content));
      return det;
    };
    const formOf = (defs) => h('div', { class: 'form' }, defs.map((d) => aciField({ ...d }, getPath(sh, d.p), set(d.p))));
    const listOf = (name, cols, label, blank) => h('div', { class: 'list-edit' },
      sh[name].map((row, i) => h('div', { class: 'mini-card' },
        h('div', { class: 'row' }, h('b', { class: 'grow' }, `${label} ${i + 1}`), h('button', { class: 'btn sm quiet', type: 'button', 'aria-label': tr('حذف', 'Remove'), onclick: () => { sh[name].splice(i, 1); saveState(); renderPage(page); } }, icon('trash'))),
        h('div', { class: 'form' }, cols.map((d) => aciField(d, row[d.k], (v) => { row[d.k] = v; saveState(); refresh(); }))))),
      h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { sh[name].push(blank()); saveState(); renderPage(page); } }, icon('plus'), tr('إضافة ', 'Add ') + label));
    const docsContent = h('div', { class: 'col' }, ACI_DOCS.map((t) => { const d = sh.docs[t]; return h('div', { class: 'row' }, icon(d ? 'check' : 'plus'), h('div', { class: 'col grow' }, h('b', { style: { font: '500 .88rem var(--f-body)' } }, docName(t)), h('span', { class: 'mono lbl clip' }, d ? d.file : tr('غير مرفق', 'Not attached'))), h('button', { class: 'btn sm ghost', type: 'button', onclick: () => uploadDoc(sh, t) }, d ? tr('استبدال', 'Replace') : tr('رفع', 'Upload'))); }));

    const SEC = aciSections();
    const sections = [
      section('parties', SEC[0].n, formOf(SEC[0].fields)),
      section('transport', SEC[1].n, formOf(SEC[1].fields)),
      section('finance', SEC[2].n, formOf(SEC[2].fields)),
      section('items', tr('الأصناف', 'Items'), listOf('items', itemCols(), tr('صنف', 'item'), () => ({ desc: '', hs: '', origin: sh.aci.exportCountry || '', pkgs: 0, pkgType: 'carton', gross: 0, net: 0 }))),
      section('containers', tr('الحاويات', 'Containers'), listOf('containers', contCols(), tr('حاوية', 'container'), () => ({ no: '', type: '40HC', seal: '', pkgs: 0, tare: 0, gross: 0 }))),
      section('docs', tr('المرفقات', 'Attachments'), docsContent),
    ];
    refresh();
    const foot = sh.aci.status === 'importer_review'
      ? h('button', { class: 'btn gold block', type: 'button', onclick: () => openApproval(sh.id) }, icon('check'), tr('مراجعة وموافقة على بيانات المورد', 'Review and approve the supplier data'))
      : sh.aci.status === 'draft'
        ? h('button', { class: 'btn gold block', type: 'button', onclick: async () => toast((await copyText(supplierInvite(sh))) ? tr('تم نسخ دعوة المورد', 'Supplier invitation copied') : tr('تعذر النسخ', 'Could not copy')) }, icon('invite'), tr('انسخ دعوة المورد', 'Copy the supplier invitation'))
        : h('a', { class: 'btn gold block', href: SYS.aci.url, target: '_blank', rel: 'noopener noreferrer', style: { textDecoration: 'none' } }, icon('ext'), tr('فتح بوابة ACI', 'Open the ACI portal'));
    return pageShell({
      title: tr('مُنسّق ACI · ', 'ACI composer · ') + sh.id,
      body: h('div', { class: 'stack' },
        h('div', { class: 'card col rise' }, stat),
        h('div', { class: 'note' }, icon('info'), h('span', null, tr('البوابة الرسمية هي المرجع. يجهّز التطبيق بياناتك ويفحصها ثم تنسخها أو يدخلها المورد هناك.', 'The official portal is the reference. The app prepares and checks your data, then you copy it, or the supplier enters it there.'))),
        sections,
        h('div', { class: 'sect-h' }, h('h2', { style: { font: '500 1rem var(--f-disp)' } }, tr('الفحص المسبق', 'Pre-flight check'))),
        h('div', { class: 'card' }, checksBox),
        h('div', { class: 'row wrap' },
          h('button', { class: 'btn ghost sm', type: 'button', onclick: async () => toast((await copyText(aciPackText(sh))) ? tr('تم نسخ حزمة البيانات', 'Data pack copied') : tr('تعذر النسخ', 'Could not copy')) }, icon('copy'), tr('نسخ حزمة البيانات', 'Copy the data pack')),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: async () => toast((await copyText(supplierInvite(sh))) ? tr('تم نسخ دعوة المورد', 'Supplier invitation copied') : tr('تعذر النسخ', 'Could not copy')) }, icon('invite'), tr('دعوة المورد', 'Invite the supplier')),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: () => openMessageReader(sh.id) }, icon('mail'), tr('لصق إشعار', 'Paste an email')))),
      foot,
    });
  });
}

/* ---------- importer approval (the step the importer performs in ACI) ---------- */
function approvalChecks(sh) {
  const lc = lcOf(sh);
  const a = sh.aci;
  const c = lc ? calcLC(lc) : null;
  const mine = S.org.stat || a.importerStat;
  return [
    { ok: a.importerStat === mine, t: tr('الرمز الإحصائي المدخل يطابق رمز شركتك', 'The statistical code entered matches your business code'), s: tr(`المدخل: ${a.importerStat || '—'} · رمزك: ${mine || '—'}`, `Entered: ${a.importerStat || '—'} · yours: ${mine || '—'}`) },
    { ok: !!a.exporterTin, t: tr('الرقم الضريبي للمصدّر مدخل', 'Exporter tax ID is entered'), s: a.exporterTin || '' },
    { ok: a.exportCountry === sh.supplier.country, t: tr('بلد التصدير يطابق بلد المورد', 'Country of export matches the supplier’s country'), s: `${countryName(a.exportCountry)} / ${countryName(sh.supplier.country)}` },
    { ok: !!(sh.docs && sh.docs.invoice), t: tr('الفاتورة التجارية مرفقة', 'The commercial invoice is attached'), s: sh.docs && sh.docs.invoice ? sh.docs.invoice.file : '' },
    { ok: !lc || textMatch(sh.supplier.name, lc.supplier), t: tr('المورد هو مستفيد الاعتماد', 'The supplier is the credit beneficiary'), s: lc ? tr(`المستفيد: ${lc.supplier}`, `Beneficiary: ${lc.supplier}`) : tr('لا اعتماد مرتبط', 'No credit linked') },
    { ok: !c || !sh.valueUsd || sh.valueUsd <= c.max, t: tr('قيمة الفاتورة ضمن الحد المسموح للاعتماد', 'The invoice value is within the credit limit'), s: c ? tr(`القيمة $${nf(sh.valueUsd)} · الحد $${nf(c.max)}`, `Value $${nf(sh.valueUsd)} · limit $${nf(c.max)}`) : '' },
  ];
}
function openApproval(id) {
  const sh = shipOf(id);
  if (!sh) return;
  openSheet({
    title: tr('مراجعة بيانات المورد', 'Review the supplier data'),
    build: (body, ctrl) => {
      const checks = approvalChecks(sh);
      const bad = checks.filter((c) => !c.ok).length;
      const msg = h('textarea', { id: 'ap-msg', placeholder: tr('رسالة تُرسل مع قرارك (إلزامية عند الموافقة في ACI)', 'A message sent with your decision (required when approving in ACI)'), oninput: () => msg.closest('.field').classList.remove('bad') });
      body.append(
        h('div', { class: 'card flat' }, kv(tr('الشحنة', 'Shipment'), `${sh.id} · ${shipTitle(sh)}`), kv(tr('المورد', 'Supplier'), h('span', { class: 'ltr' }, sh.supplier.name)), kv(tr('بلد التصدير', 'Country of export'), countryName(sh.aci.exportCountry)), kv(tr('الفاتورة', 'Invoice'), sh.docs.invoice ? h('span', { class: 'mono' }, sh.docs.invoice.file) : '—'), kv(tr('القيمة', 'Value'), '$' + nf(sh.valueUsd))),
        h('div', { class: 'col' }, checks.map((c) => h('div', { class: `chk ${c.ok ? 'ok' : 'err'}` }, icon(c.ok ? 'check' : 'x'), h('span', null, c.t, c.s ? h('small', null, c.s) : null)))),
        bad ? h('div', { class: 'note bad' }, icon('alert'), h('span', null, tr(`${bad} ${bad === 1 ? 'بند يحتاج' : 'بنود تحتاج'} مراجعة. الأفضل رفض الطلب مع توضيح السبب بدل الموافقة على بيانات خاطئة.`, `${bad} ${bad === 1 ? 'item needs' : 'items need'} review. It is better to reject with a reason than to approve wrong data.`))) : h('div', { class: 'note ok' }, icon('check'), h('span', null, tr('البيانات متسقة مع الاعتماد والمورد.', 'The data is consistent with the credit and the supplier.'))),
        h('div', { class: 'field' }, h('label', { for: 'ap-msg' }, tr('رسالتك للمورد والجمارك', 'Your message to the supplier and Customs')), msg),
        h('div', { class: 'row' },
          h('button', { class: 'btn gold grow', type: 'button', onclick: () => {
            if (!msg.value.trim()) { msg.closest('.field').classList.add('bad'); return toast(tr('اكتب رسالة قبل الموافقة', 'Write a message before approving')); }
            setAci(sh, 'supplier_completion'); ctrl.close(); commit(tr('تمت الموافقة. بانتظار استكمال المورد', 'Approved. Waiting for the supplier to complete'));
          } }, icon('check'), tr('موافقة', 'Approve')),
          h('button', { class: 'btn danger', type: 'button', onclick: () => {
            if (!msg.value.trim()) { msg.closest('.field').classList.add('bad'); return toast(tr('اكتب سبب الرفض', 'Write the reason for rejecting')); }
            setAci(sh, 'draft', { note: msg.value.trim() }); ctrl.close(); commit(tr('تم الرفض وأُعيدت للمورد', 'Rejected and sent back to the supplier'));
          } }, icon('x'), tr('رفض', 'Reject'))),
        h('p', { class: 'lbl' }, tr('في النظام الرسمي تتم الموافقة من بريد ACI على بوابة الجمارك. هذه الشاشة تجهّز قرارك وتحدّث حالة رحلتك هنا.', 'In the official system you approve from the ACI email on the Customs portal. This screen prepares your decision and updates your shipment status here.')));
    },
  });
}
