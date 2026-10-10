/* ---------- finance: credits (LCs) ---------- */
function countTo(node, to, d = 0) {
  const from = parseFloat(node.dataset.v || 0) || 0;
  node.dataset.v = to;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { node.textContent = nf(to, d); return; }
  let t0 = null;
  const step = (t) => {
    t0 = t0 || t;
    const p = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - p, 3);
    node.textContent = nf(from + (to - from) * e, d);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function lcRow(l, i) {
  const c = calcLC(l), st = lcStatus(l);
  const bar = h('i');
  setTimeout(() => { bar.style.width = clamp(c.invPct * 100, 0, 100) + '%'; }, 80 + i * 60);
  return h('button', { class: 'card tap lc rise', style: { '--i': i }, type: 'button', onclick: () => openLC(l.no) },
    h('div', { class: 'col' }, h('div', { class: 'row' }, h('span', { class: 'no' }, l.no), pill(st[0], st[1])), h('span', { class: 'ds clip' }, `${lcDesc(l)} · ${bankName(l.bank)}`)),
    h('div', { class: 'col', style: { textAlign: 'end' } }, h('span', { class: 'am' }, '$' + nf(l.usd)), h('span', { class: 'ds num' }, l.status === 'closed' ? '—' : c.left >= 0 ? daysLabel(c.left) : tr('منتهٍ', 'Expired'))),
    h('div', { class: 'pb bar' }, bar));
}
const LC_FILTERS = () => [['all', tr('الكل', 'All')], ['issued', tr('صادرة', 'Issued')], ['bank', tr('لدى المصرف', 'With bank')], ['closed', tr('مقفلة', 'Closed')]];
function fillLcList(box) {
  const rows = S.lcs.filter((l) => UI.lcFilter === 'all' || (UI.lcFilter === 'issued' && l.status === 'issued') || (UI.lcFilter === 'bank' && ['draft', 'submitted', 'awaiting_cover'].includes(l.status)) || (UI.lcFilter === 'closed' && l.status === 'closed'));
  clear(box);
  if (!rows.length) box.append(h('div', { class: 'card empty' }, tr('لا توجد اعتمادات في هذا التصنيف.', 'No credits in this filter.')));
  rows.forEach((l, i) => box.append(lcRow(l, i)));
}

function donutBlock() {
  const open = S.lcs.filter((l) => l.status !== 'closed');
  const by = {};
  open.forEach((l) => { by[l.bank] = (by[l.bank] || 0) + l.usd * l.rate; });
  const ids = Object.keys(by).sort((a, b) => by[b] - by[a]);
  const tot = ids.reduce((a, k) => a + by[k], 0);
  if (!tot) return null;
  const R = 38, C = 2 * Math.PI * R;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.innerHTML = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--line-2)" stroke-width="15"/>`;
  const mid = h('div', { class: 'ctr' }, h('b', { class: 'num', style: { font: '600 1.05rem var(--f-disp)' } }, short(tot)), h('span', { class: 'lbl' }, tr('د.ل', 'LYD')));
  const leg = h('div', { class: 'leg' });
  let off = 0;
  ids.forEach((k, i) => {
    const b = bankOf(k), len = (by[k] / tot) * C;
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    [['cx', 50], ['cy', 50], ['r', R], ['stroke', b.col], ['stroke-dasharray', `0 ${C}`], ['stroke-dashoffset', -off]].forEach(([a, v]) => c.setAttribute(a, v));
    svg.append(c); off += len;
    setTimeout(() => c.setAttribute('stroke-dasharray', `${Math.max(1, len - 3)} ${C}`), 120 + i * 130);
    leg.append(h('div', null, h('i', { style: { background: b.col } }), h('span', { class: 'clip grow' }, L(b.n)), h('b', { class: 'num' }, Math.round((by[k] / tot) * 100) + '%')));
  });
  return h('div', { class: 'card row' }, h('div', { class: 'don' }, svg, mid), leg);
}

SCREENS.fin = (root) => {
  const open = S.lcs.filter((l) => l.status !== 'closed');
  const usd = sum(open.map((l) => l.usd));
  const lyd = sum(open.map((l) => l.usd * l.rate));
  const due = sum(S.lcs.filter((l) => l.status === 'issued').map((l) => calcLC(l).out));
  const bigNode = h('span', null, '0');
  const lydNode = h('span', { class: 'num' }, '0');
  setTimeout(() => { countTo(bigNode, usd); countTo(lydNode, lyd); }, 50);

  const adv = adviseChannel({ trade: S.org.resell !== false, kind: S.org.type === 'sole' ? 'sole' : 'company', usd: BAND_USD[S.org.valueBand] || 500000 });
  const route = h('div', { class: 'card col rise' },
    h('div', { class: 'row' }, h('span', { class: 'lbl grow' }, tr('قناتك المصرفية المقترحة', 'Your suggested banking channel')), confTag(adv.conf)),
    h('b', { style: { font: '600 1.1rem/1.4 var(--f-disp)' } }, adv.title),
    h('span', { class: 'lbl', style: { lineHeight: 1.6 } }, adv.why[0] || ''),
    h('button', { class: 'btn sm ghost', type: 'button', onclick: () => openChannelAdvisor() }, icon('route'), tr('جرّب بقيمة شحنتك', 'Try with your shipment value')));

  const hero = open.length ? h('div', { class: 'card hero col rise', style: { '--i': 1 } },
    h('span', { class: 'lbl' }, tr('إجمالي الاعتمادات المفتوحة', 'Open credits')),
    h('div', { class: 'big num' }, bigNode, h('small', null, 'USD')),
    h('span', { class: 'lbl' }, '≈ ', lydNode, tr(' دينار ليبي', ' LYD')),
    h('div', { class: 'mini3' },
      h('div', null, h('b', null, short(due)), h('span', null, tr('تغطية مستحقة د.ل', 'Cash cover due LYD'))),
      h('div', null, h('b', null, String(S.lcs.filter((l) => l.status === 'issued').length)), h('span', null, tr('صادرة', 'Issued'))),
      h('div', null, h('b', null, String(S.lcs.filter((l) => ['submitted', 'awaiting_cover'].includes(l.status)).length)), h('span', null, tr('لدى المصرف/المركزي', 'With bank / CBL'))))) : null;

  const list = h('div', { class: 'stack' });
  const seg = S.lcs.length > 3 ? h('div', { class: 'seg', role: 'group', 'aria-label': tr('تصفية الاعتمادات', 'Filter credits') }, LC_FILTERS().map(([id, label]) => h('button', { type: 'button', class: UI.lcFilter === id ? 'on' : '', onclick: (e) => { UI.lcFilter = id; $$('button', seg).forEach((b) => b.classList.toggle('on', b === e.currentTarget)); fillLcList(list); } }, label))) : null;
  const empty = !S.lcs.length ? h('div', { class: 'card col', style: { alignItems: 'flex-start' } }, h('b', { style: { font: '500 .95rem var(--f-disp)' } }, tr('لا اعتمادات بعد', 'No credits yet')), h('span', { class: 'lbl' }, tr('إن اخترت التحويل المباشر أو النشاط الفردي فقد لا تحتاج اعتمادًا. وإلا جهّز طلب اعتماد لمصرفك.', 'If you choose a direct transfer or the sole-trader route you may not need a credit. Otherwise prepare a credit request for your bank.')), h('button', { class: 'btn gold sm', type: 'button', onclick: () => openNewLC() }, icon('plus'), tr('تجهيز طلب اعتماد', 'Prepare a credit request'))) : null;

  /* advanced tools: ceiling estimate, distribution, bank accounts, converter */
  const ceil = ceilingFromTax(S.tax.income, S.tax.payroll);
  const used = sum(open.map((l) => l.usd * l.rate));
  const usedPct = ceil ? clamp((used / ceil) * 100, 0, 100) : 0;
  const bar = h('i');
  setTimeout(() => { bar.style.width = usedPct + '%'; }, 250);
  const ceilCard = h('div', { class: 'card flat col' },
    h('div', { class: 'row' }, h('div', { class: 'h3 grow' }, tr('سقف الاعتمادات التقديري', 'Estimated credit ceiling')), confTag('lo')),
    ceil ? [h('div', { class: 'row', style: { alignItems: 'baseline' } }, h('b', { class: 'num', style: { font: '600 1.4rem var(--f-disp)' } }, nf(ceil)), h('span', { class: 'lbl' }, tr('د.ل سنويًا (بوحدة الضريبة المدخلة)', 'LYD per year (in the tax unit you entered)'))),
      h('div', { class: 'bar' }, bar),
      h('span', { class: 'lbl' }, tr('الاستخدام الحالي ', 'Current use '), h('b', { class: 'num' }, Math.round(usedPct) + '%'), tr(' من السقف', ' of the ceiling'))] : h('span', { class: 'lbl' }, tr('أدخل متوسط ضريبتي الدخل والمرتبات لتقدير سقفك.', 'Enter your average income and payroll tax to estimate your ceiling.')),
    h('span', { class: 'lbl' }, tr('الصيغة: 30 × متوسط ضريبة الدخل + 10 × متوسط ضريبة المرتبات', 'Formula: 30 × average income tax + 10 × average payroll tax')),
    h('div', { class: 'note warn' }, icon('alert'), h('span', null, tr('صيغة أعلنتها وزارة الاقتصاد في 20 أغسطس 2026 دون قرار منشور أو تاريخ نفاذ، ولم يعلّق المركزي. تقدير للتخطيط فقط. ', 'A formula the Ministry of Economy announced on 20 August 2026 with no published decision or effective date; the Central Bank has not commented. For planning only. '), srcLink(tr('المصدر', 'Source'), URLS.formula))),
    h('button', { class: 'btn sm ghost', type: 'button', onclick: openTaxSheet }, tr('عدّل مدخلات الضرائب', 'Edit tax inputs')));
  const banks = h('div', { class: 'bkcards' }, BANKS.map((b, i) => h('button', { class: `bk ${b.g}${i === S.bankSel ? ' sel' : ''}`, type: 'button', 'aria-label': L(b.n), onclick: (e) => { S.bankSel = i; saveState(); $$('.bk', banks).forEach((x) => x.classList.toggle('sel', x === e.currentTarget)); toast(tr('مصدر الحوالة: ', 'Payment source: ') + L(b.n)); } },
    h('small', null, tr('حساب ', 'Account ') + b.acc), h('div', { class: 'n' }, L(b.n)), h('div', { class: 'b' }, h('span', null, nf(b.bal)), ' ', h('small', null, 'LYD')))));
  const advanced = h('details', { class: 'adv' }, h('summary', null, icon('sliders'), tr('أدوات متقدمة', 'Advanced tools'), icon('chevD')),
    h('div', { class: 'adv-body' }, ceilCard, donutBlock(),
      h('div', { class: 'sect-h' }, h('h2', { style: { font: '500 .95rem var(--f-disp)' } }, tr('الحسابات المصرفية', 'Bank accounts')), h('span', { class: 'lbl' }, tr('اختر مصدر الحوالة', 'Pick the payment source'))), banks,
      h('button', { class: 'card tap row', type: 'button', onclick: openConverter }, icon('swap'), h('div', { class: 'col grow' }, h('b', null, tr('محوّل العملة', 'Currency converter')), h('span', { class: 'lbl' }, tr('سعر المركزي: 1 USD = ', 'Central Bank rate: 1 USD = '), h('span', { class: 'num' }, RATE.avg.toFixed(4)), tr(' د.ل', ' LYD'))), icon('fwd'))));

  root.append(
    h('div', { class: 'title-row' }, h('h1', null, tr('التمويل', 'Finance')), h('button', { class: 'ibtn', type: 'button', 'aria-label': tr('اعتماد جديد', 'New credit'), onclick: () => openNewLC() }, icon('plus'))),
    h('div', { class: 'stack' }, route, hero, seg, S.lcs.length ? list : empty, advanced, S.lcs.length ? h('button', { class: 'btn gold block', type: 'button', onclick: () => openNewLC() }, icon('plus'), tr('تجهيز طلب اعتماد جديد', 'Prepare a new credit request')) : null));
  if (S.lcs.length) fillLcList(list);
};

function openTaxSheet() {
  openSheet({
    title: tr('مدخلات سقف الاعتمادات', 'Credit ceiling inputs'),
    build: (body, ctrl) => {
      const inc = h('input', { id: 'tx-inc', class: 'ltr', inputmode: 'numeric', value: S.tax.income ? String(S.tax.income) : '' });
      const pay = h('input', { id: 'tx-pay', class: 'ltr', inputmode: 'numeric', value: S.tax.payroll ? String(S.tax.payroll) : '' });
      const out = h('b', { class: 'num', style: { font: '600 1.4rem var(--f-disp)' } });
      const paint = () => { out.textContent = nf(ceilingFromTax(inc.value, pay.value)) + tr(' د.ل', ' LYD'); };
      inc.oninput = paint; pay.oninput = paint; paint();
      body.append(
        h('div', { class: 'form' },
          h('div', { class: 'field w2' }, h('label', { for: 'tx-inc' }, tr('متوسط ضريبة الدخل السنوية (آخر 3 سنوات)', 'Average annual income tax (last 3 years)')), h('div', { class: 'u' }, h('b', null, 'LYD'), inc)),
          h('div', { class: 'field w2' }, h('label', { for: 'tx-pay' }, tr('متوسط ضريبة المرتبات السنوية (آخر 3 سنوات)', 'Average annual payroll tax (last 3 years)')), h('div', { class: 'u' }, h('b', null, 'LYD'), pay))),
        h('div', { class: 'card flat col' }, h('span', { class: 'lbl' }, tr('السقف التقديري', 'Estimated ceiling')), out),
        h('div', { class: 'note' }, icon('info'), h('span', null, tr('العملة غير محددة في الإعلان، لذلك افترضنا أن الضريبة بالدينار. أدخل أرقام إقراراتك الفعلية.', 'The announcement does not state the currency, so we assume tax in dinars. Enter the figures from your actual returns.'))),
        h('button', { class: 'btn gold block', type: 'button', onclick: () => { S.tax.income = num(inc.value); S.tax.payroll = num(pay.value); ctrl.close(); commit(tr('تم تحديث التقدير', 'Estimate updated')); } }, tr('حفظ', 'Save')));
    },
  });
}

/* ---------- credit detail ---------- */
function lcSummaryText(l) {
  const c = calcLC(l);
  return [`Documentary credit request · ${l.no}`, `Applicant: ${orgName()}`, `Beneficiary: ${l.supplier}`, `Sector: ${sectorName(l.sector)}`, `Bank: ${bankName(l.bank)} (account ${bankOf(l.bank).acc})`,
    `Amount: ${nf(l.usd)} USD @ ${l.rate} = ${nf(c.lyd)} LYD`, `Cover: ${l.cover}% = ${nf(c.req)} LYD`, `Tenor: ${l.days} days · due ${iso(c.due)}`, `Tolerance: ${l.dev}% (up to ${nf(c.max)} USD)`, `Description: ${lcDesc(l)}`].join('\n');
}
function openLC(no) {
  openPage('lc:' + no, () => {
    const l = lcByNo(no);
    if (!l) return [pageShell({ title: tr('غير موجود', 'Not found'), body: h('div', { class: 'empty' }, tr('تعذر العثور على الاعتماد', 'Credit not found')) })];
    const c = calcLC(l), st = lcStatus(l), b = bankOf(l.bank);
    const ship = S.ships.find((s) => s.lcNo === l.no);
    const over = c.inv > c.max;
    const rg = (pct, col, txt, lab) => h('div', { class: 'rg' }, ring({ pct: pct * 100, size: 70, stroke: 7, track: 'var(--line-2)', c1: col, c2: col, mid: h('b', { class: 'num', style: { font: '600 .8rem var(--f-disp)' } }, txt) }), h('small', null, lab));
    const paidPct = c.req ? clamp(l.paid / c.req, 0, 1) : 1;
    const hero = h('div', { class: 'card rise' },
      h('div', { class: 'row', style: { marginBottom: '6px' } }, h('div', { class: 'h3 grow' }, h('span', { class: 'num' }, l.no)), pill(st[0], st[1])),
      h('div', { class: 'rings' },
        rg(1 - c.elapsed, c.left <= 7 ? 'var(--warn)' : 'var(--gold-b)', l.status === 'closed' ? '—' : String(Math.max(0, c.left)), tr('أيام متبقية', 'Days left')),
        rg(paidPct, c.out > 0 ? 'var(--bad)' : 'var(--ok)', Math.round(paidPct * 100) + '%', tr('الغطاء المسدّد', 'Cover paid')),
        rg(c.invPct, over ? 'var(--bad)' : 'var(--info)', Math.round(c.invPct * 100) + '%', tr('المفوتَر', 'Invoiced'))),
      h('div', { class: over || c.out > 0 ? 'note bad' : 'note ok' }, icon(over || c.out > 0 ? 'alert' : 'check'), h('span', null, over ? tr(`الفواتير تتجاوز الحد المسموح ($${nf(c.max)}).`, `Invoices exceed the allowed limit ($${nf(c.max)}).`) : c.out > 0 ? tr(`تغطية نقدية مستحقة: ${nf(c.out)} د.ل`, `Cash cover due: ${nf(c.out)} LYD`) : tr('الفواتير والغطاء ضمن الحدود.', 'Invoices and cover are within limits.'))));
    const info = h('details', { class: 'adv' }, h('summary', null, icon('list'), tr('تفاصيل الاعتماد', 'Credit details'), icon('chevD')), h('div', { class: 'adv-body' },
      kv(tr('البيان', 'Description'), lcDesc(l)), kv(tr('المستفيد', 'Beneficiary'), h('span', { class: 'ltr' }, l.supplier)), kv(tr('المصرف', 'Bank'), `${L(b.n)} · ${b.acc}`), kv(tr('القطاع', 'Sector'), sectorName(l.sector)),
      kv(tr('القيمة', 'Amount'), '$' + nf(l.usd)), kv(tr(`بالدينار @ ${l.rate}`, `In dinars @ ${l.rate}`), nf(c.lyd) + tr(' د.ل', ' LYD')), kv(tr(`الغطاء ${l.cover}%`, `Cover ${l.cover}%`), nf(c.req) + tr(' د.ل', ' LYD')), kv(tr('المسدّد من الغطاء', 'Cover paid'), nf(l.paid) + tr(' د.ل', ' LYD')),
      kv(tr('نطاق الانحراف المسموح', 'Allowed tolerance range'), h('span', { class: 'num' }, `$${nf(l.usd * (1 - l.dev / 100))} – $${nf(c.max)}`)), kv(tr('الفتح', 'Opened'), fmtDate(D(l.open))), kv(tr('الاستحقاق', 'Due'), fmtDate(c.due))));
    const docs = h('div', { class: 'card col rise', style: { '--i': 2 } },
      h('div', { class: 'row' }, h('div', { class: 'h3 grow' }, tr('ما يطلبه المصرف عادةً', 'What the bank usually asks for')), confTag('mid')),
      [tr('فاتورة أولية من المصدّر (النوع، الوصف، الوزن، الكمية، السعر، بلد المنشأ)', 'Initial invoice from the exporter (type, description, weight, quantity, price, origin)'), tr('وثيقة تأمين من شركة تأمين محلية', 'Insurance policy from a local insurer'), tr('شهادة تفتيش (محلية أو دولية ISO 9001:2015)', 'Inspection certificate (local or international, ISO 9001:2015)'), tr('شهادة ضرائب وشهادة ضمان اجتماعي أصليتان وحديثتان', 'Original, recent tax and social security certificates'), tr('رمز المركزي (CBL Key) وتسجيل الشركة في ACI و FCMS', 'CBL Key, and the business registered in ACI and FCMS')].map((t) => h('div', { class: 'chk ok' }, icon('check'), h('span', null, t))),
      h('span', { class: 'lbl' }, tr('ضوابط المركزي المعلنة (ديسمبر 2020). تحقق من مصرفك بحثًا عن تحديثات. ', 'Central Bank controls as published (December 2020). Ask your bank for updates. '), srcLink(tr('المصدر', 'Source'), URLS.ctrl2020)));
    const idx = lcIndex(l.status);
    const sim = isDemo() && idx < 4 && l.status !== 'closed' ? h('div', { class: 'sim' }, simBtn(l.status === 'draft' ? tr('تقديم الطلب للمصرف', 'submit the request to the bank') : l.status === 'submitted' ? tr('موافقة المصرف وطلب التغطية', 'bank approval and cover request') : tr('تغطية المركزي وصدور الاعتماد', 'CBL cover and issuance'), () => { l.status = LC_FLOW[idx + 1].id; logActivity('bank', T2(`الاعتماد ${l.no}: ${LC_FLOW[idx + 1].n.ar}`, `Credit ${l.no}: ${LC_FLOW[idx + 1].n.en}`), l.no); commit(tr('تمت المحاكاة', 'Simulated')); })) : null;
    const actions = h('div', { class: 'row wrap' },
      ship ? h('button', { class: 'btn gold grow', type: 'button', onclick: () => openShip(ship.id) }, icon('box'), tr('الرحلة ', 'Shipment ') + ship.id) : h('button', { class: 'btn gold grow', type: 'button', onclick: () => openNewShip({ lcNo: l.no, usd: String(l.usd), supplier: l.supplier, channel: 'LC' }) }, icon('plus'), tr('ابدأ رحلة لهذا الاعتماد', 'Start a shipment for this credit')),
      h('button', { class: 'btn ghost', type: 'button', onclick: async () => toast((await copyText(lcSummaryText(l))) ? tr('تم نسخ ملخص الطلب', 'Request summary copied') : tr('تعذر النسخ', 'Could not copy')) }, icon('copy'), tr('نسخ الملخص', 'Copy summary')));
    return pageShell({ title: tr('اعتماد ', 'Credit ') + l.no, body: h('div', { class: 'stack' }, hero, actions, info, docs, sim) });
  });
}

/* ---------- new credit request: two steps, advanced settings tucked away ---------- */
function openNewLC(pre = {}) {
  const f = { supplier: '', sector: 'commercial', bank: BANKS[S.bankSel].id, base: 'cash', desc: '', usd: '250000', rate: String(RATE.avg), days: '30', cover: '100', dev: '10', notes: tr('دفع مقابل مستندات', 'Payment against documents') };
  const ship = pre.shipId ? shipOf(pre.shipId) : null;
  if (ship) { f.supplier = ship.supplier.name; f.usd = String(ship.valueUsd); f.desc = shipTitle(ship); }
  let step = 0;
  const p = openPage('newlc', () => {
    const fld = (id, label, input, w2, hint) => h('div', { class: 'field' + (w2 ? ' w2' : '') }, h('label', { for: id }, label), input, hint ? h('span', { class: 'hint' }, hint) : null);
    const inp = (id, k, extra = {}) => h('input', { id, value: f[k], oninput: (e) => { f[k] = e.target.value; paint(); }, ...extra });
    const sel = (id, k, opts) => h('select', { id, onchange: (e) => { f[k] = e.target.value; paint(); } }, opts.map((o) => h('option', { value: o.v, selected: o.v === f[k] }, o.t)));
    const calc = () => {
      const usd = num(f.usd), rate = num(f.rate), days = num(f.days) || 0, cover = num(f.cover), dev = num(f.dev);
      return { usd, rate, lyd: usd * rate, cov: (usd * rate * cover) / 100, due: addDays(TODAY, days), max: usd * (1 + dev / 100), min: usd * (1 - dev / 100), cover, days, dev };
    };
    const panel = () => {
      const c = calc();
      const warns = [];
      const cap = f.sector === 'industrial' ? 10000000 : f.sector === 'services' ? 3000000 : 5000000;
      if (c.usd > cap) warns.push(tr(`القيمة تتجاوز سقف الاعتماد الواحد المعلن لقطاع «${sectorName(f.sector)}» ($${nf(cap)} في ضوابط 2020، وتعليق آخر يذكر أرقامًا مختلفة).`, `The value exceeds the reported single-credit ceiling for “${sectorName(f.sector)}” ($${nf(cap)} in the 2020 controls; another commentary gives different figures).`));
      if (c.cover < 100) warns.push(tr('ضوابط المركزي المعلنة (2020) تشترط تغطية الاعتماد كاملة من الرصيد المتاح. بعض المصارف تطبق نسبًا أقل، فتأكد من مصرفك.', 'The Central Bank controls as published (2020) require the credit to be fully covered by the available balance. Some banks apply lower percentages, so check with yours.'));
      const bank = bankOf(f.bank);
      if (c.cov > bank.bal) warns.push(tr(`قيمة الغطاء أكبر من رصيد الحساب (${nf(bank.bal)} د.ل).`, `The cover is larger than the account balance (${nf(bank.bal)} LYD).`));
      return h('div', { class: 'col' },
        h('div', { class: 'cvp' },
          h('div', { class: 'lbl', style: { color: 'var(--hero-mute)' } }, tr('القيمة المكافئة بالدينار', 'Equivalent in dinars')),
          h('div', { class: 'v num' }, nf(c.lyd), ' ', h('small', null, 'LYD')),
          kv(tr('الغطاء المطلوب', 'Cover required'), nf(c.cov) + tr(' د.ل', ' LYD')), kv(tr('الاستحقاق', 'Due'), fmtDate(c.due)), kv(tr('نطاق الانحراف المقبول', 'Accepted tolerance range'), c.usd ? h('span', { class: 'num' }, `$${nf(c.min)} – $${nf(c.max)}`) : '—'),
          h('div', { class: 'bar', style: { marginTop: '8px' } }, h('i', { style: { width: clamp(c.cover, 0, 100) + '%' } }))),
        warns.map((w) => h('div', { class: 'note warn' }, icon('alert'), h('span', null, w))));
    };
    const panelBox = h('div');
    function paint() { clear(panelBox).append(panel()); }
    let body;
    if (step === 0) {
      body = h('div', { class: 'stack' }, h('div', { class: 'form' },
        fld('lc-sup', tr('لصالح المورد *', 'Beneficiary (supplier) *'), inp('lc-sup', 'supplier', { class: 'ltr', placeholder: tr('اسم المورد', 'Supplier name') }), true),
        fld('lc-usd', tr('قيمة الاعتماد *', 'Credit amount *'), h('div', { class: 'u' }, h('b', null, 'USD'), inp('lc-usd', 'usd', { inputmode: 'numeric' })), true),
        fld('lc-bank', tr('على الحساب المصرفي', 'On bank account'), sel('lc-bank', 'bank', BANKS.map((b) => ({ v: b.id, t: L(b.n) }))), true),
        fld('lc-desc', tr('بيان الاعتماد', 'Description'), inp('lc-desc', 'desc', { placeholder: tr('مثال: شحنة 56 · مشتريات', 'e.g. Shipment 56 · purchases') }), true)),
        h('details', { class: 'adv' }, h('summary', null, icon('sliders'), tr('إعدادات متقدمة (لها قيم افتراضية)', 'Advanced settings (sensible defaults)'), icon('chevD')), h('div', { class: 'adv-body' }, h('div', { class: 'form' },
          fld('lc-sec', tr('القطاع', 'Sector'), sel('lc-sec', 'sector', Object.keys(SECTORS).map((k) => ({ v: k, t: L(SECTORS[k]) })))),
          fld('lc-rate', tr('معدل التحويل', 'Exchange rate'), inp('lc-rate', 'rate', { class: 'ltr', inputmode: 'decimal' }), false, [tr('سعر المركزي ', 'CBL rate '), h('span', { class: 'num' }, String(RATE.avg)), ' · ', h('span', { class: 'ltr' }, RATE.date)]),
          fld('lc-days', tr('المدة (يوم)', 'Tenor (days)'), inp('lc-days', 'days', { class: 'ltr', inputmode: 'numeric' })),
          fld('lc-cov', tr('نسبة الغطاء %', 'Cover %'), inp('lc-cov', 'cover', { class: 'ltr', inputmode: 'decimal' })),
          fld('lc-dev', tr('الانحراف المسموح %', 'Tolerance %'), inp('lc-dev', 'dev', { class: 'ltr', inputmode: 'decimal' })),
          fld('lc-base', tr('الحساب الأساسي للغطاء', 'Cover base account'), sel('lc-base', 'base', [{ v: 'cash', t: tr('حساب الغطاء النقدي', 'Cash cover account') }, { v: 'restricted', t: tr('حساب الودائع المقيّدة', 'Restricted deposits account') }])),
          fld('lc-notes', tr('ملاحظات وشروط الدفع', 'Notes and payment terms'), inp('lc-notes', 'notes'), true)))));
    } else {
      body = h('div', { class: 'stack' }, panelBox,
        h('div', { class: 'card flat' }, kv(tr('الشركة', 'Applicant'), orgName()), kv(tr('المستفيد', 'Beneficiary'), h('span', { class: 'ltr' }, f.supplier)), kv(tr('المصرف', 'Bank'), bankName(f.bank)), kv(tr('البيان', 'Description'), f.desc || '—'), kv(tr('المدة', 'Tenor'), tr(`${f.days} يومًا`, `${f.days} days`)), kv(tr('الغطاء', 'Cover'), `${f.cover}%`)),
        h('div', { class: 'note' }, icon('info'), h('span', null, tr('نجهّز لك حزمة الطلب لتقدّمها عبر نظام مصرفك (فرع أو بوابة مثل OLC). الإرسال المباشر يتطلب شراكة مع المصرف.', 'We prepare the request pack for you to submit through your bank (a branch or a portal such as OLC). Direct submission needs a partnership with the bank.'))));
    }
    paint();
    if (step === 0) panelBox.hidden = true;
    const steps = h('div', { class: 'stepper', 'aria-hidden': 'true' }, [0, 1].map((i) => h('i', { class: i <= step ? 'on' : '' })));
    const titles = [tr('الأساسيات', 'The basics'), tr('المراجعة والتأكيد', 'Review and confirm')];
    const foot = step === 0
      ? h('button', { class: 'btn gold block', type: 'button', onclick: () => {
        if (!f.supplier.trim()) { $('#lc-sup').closest('.field').classList.add('bad'); return toast(tr('اكتب اسم المورد', 'Enter the supplier name')); }
        if (!(num(f.usd) > 0)) { $('#lc-usd').closest('.field').classList.add('bad'); return toast(tr('أدخل قيمة الاعتماد', 'Enter the credit amount')); }
        step = 1; renderPage(p);
      } }, tr('التالي', 'Next'))
      : h('div', { class: 'col' }, swipeConfirm(tr('اسحب لتجهيز طلب الاعتماد', 'Swipe to prepare the credit request'), () => {
        const c = calc();
        const no = String(Math.max(522000, ...S.lcs.map((x) => Number(x.no) || 0)) + 1);
        const lc = { no, desc: f.desc || T2('اعتماد جديد', 'New credit'), bank: f.bank, open: iso(TODAY), days: c.days, usd: c.usd, rate: c.rate, cover: c.cover, dev: c.dev, status: 'draft', paid: 0, invoices: [], sector: f.sector, supplier: f.supplier.trim() };
        S.lcs.unshift(lc);
        if (ship) ship.lcNo = no;
        logActivity('bank', T2(`جُهّز طلب الاعتماد ${no}`, `Credit request ${no} prepared`), no);
        saveState();
        celebrate({ title: tr('تم تجهيز طلب الاعتماد', 'Credit request prepared'), sub: tr(`الاعتماد ${no} بقيمة $${nf(c.usd)}. انسخ الملخص وقدّمه لمصرفك.`, `Credit ${no} for $${nf(c.usd)}. Copy the summary and submit it to your bank.`), cta: tr('عرض الاعتماد', 'View the credit'), onClose: () => { closePage(); rerender(); openLC(no); } });
      }), h('button', { class: 'btn ghost', type: 'button', onclick: () => { step = 0; renderPage(p); } }, tr('رجوع', 'Back')));
    return pageShell({ title: tr('طلب اعتماد جديد', 'New credit request'), onBack: () => (step > 0 ? (step = 0, renderPage(p)) : closePage()), body: h('div', { class: 'stack' }, steps, h('div', { class: 'h3' }, titles[step]), body), foot });
  });
}

/* ---------- currency converter (carried over from the original dashboard) ---------- */
function openConverter() {
  openSheet({
    title: tr('محوّل العملة', 'Currency converter'),
    build: (body) => {
      let dir = 'USD';
      const amt = h('input', { id: 'fx-amt', inputmode: 'decimal', value: '250000', 'aria-label': tr('المبلغ', 'Amount'), style: { background: 'none', border: 0, outline: 0, font: '600 1.7rem var(--f-disp)', width: '100%', textAlign: 'right', direction: 'ltr', color: 'inherit' } });
      const out = h('output', { style: { font: '600 1.7rem var(--f-disp)', width: '100%', textAlign: 'right', direction: 'ltr', display: 'block' } });
      const cp = h('em', { class: 'num', style: { fontStyle: 'normal', fontSize: '.8rem', opacity: '.8', padding: '2px 10px', borderRadius: '99px', background: 'rgba(0,0,0,.14)' } });
      const cg = h('em', { class: 'num', style: { fontStyle: 'normal', fontSize: '.8rem', opacity: '.8', padding: '2px 10px', borderRadius: '99px', background: 'var(--line)' } });
      const paint = () => {
        const v = num(amt.value);
        out.textContent = nf(dir === 'USD' ? v * RATE.avg : v / RATE.avg, 2);
        cp.textContent = dir; cg.textContent = dir === 'USD' ? 'LYD' : 'USD';
      };
      amt.oninput = paint; paint();
      body.append(
        h('div', { class: 'card tint-mint', style: { borderRadius: '18px' } }, h('label', { class: 'lbl', for: 'fx-amt', style: { color: 'inherit' } }, tr('أنت تدفع', 'You pay')), h('div', { class: 'row', style: { direction: 'ltr' } }, amt, cp)),
        h('div', { style: { display: 'grid', placeItems: 'center', margin: '-14px 0' } }, h('button', { class: 'ibtn', type: 'button', 'aria-label': tr('عكس الاتجاه', 'Swap direction'), style: { background: 'var(--sheet)', borderColor: 'var(--line-2)', zIndex: 2, borderRadius: '50%' }, onclick: () => { const o = num(amt.value) * (dir === 'USD' ? RATE.avg : 1 / RATE.avg); dir = dir === 'USD' ? 'LYD' : 'USD'; amt.value = o.toFixed(2); paint(); } }, icon('swap'))),
        h('div', { class: 'card', style: { borderRadius: '18px' } }, h('span', { class: 'lbl' }, tr('تحصل على', 'You get')), h('div', { class: 'row', style: { direction: 'ltr' } }, out, cg)),
        h('div', { class: 'row wrap' }, [1000, 10000, 100000, 1000000].map((q) => h('button', { class: 'chip num', type: 'button', onclick: () => { amt.value = String(q); paint(); } }, short(q)))),
        h('div', { class: 'card flat' }, kv(tr('سعر المركزي', 'Central Bank rate'), '1 USD = ' + RATE.avg.toFixed(4) + ' LYD'), kv(tr('شراء / بيع', 'Buy / sell'), `${RATE.buy.toFixed(4)} / ${RATE.sell.toFixed(4)}`), kv(tr('تاريخ السعر', 'Rate date'), h('span', { class: 'ltr' }, RATE.date))),
        h('div', { class: 'note' }, icon('info'), h('span', null, tr('السعر مأخوذ من اللوحة الأصلية بتاريخ ', 'Rate taken from the original dashboard dated '), h('span', { class: 'ltr' }, RATE.date), tr('. تحقق من السعر الحالي في ', '. Check the current rate at '), srcLink(tr('موقع المركزي', 'the Central Bank site'), SYS.cbl.url), tr('. يختلف سعر السوق الموازي ولا يُستخدم في المعاملات المصرفية.', '. The parallel-market rate differs and is not used for bank transactions.'))));
    },
  });
}
