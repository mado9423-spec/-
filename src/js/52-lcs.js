/* ---------- letters of credit ---------- */
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
    h('div', { class: 'col' }, h('div', { class: 'row' }, h('span', { class: 'no' }, l.no), pill(st[0], st[1])), h('span', { class: 'ds clip' }, `${l.desc} · ${bankOf(l.bank).n}`)),
    h('div', { class: 'col', style: { textAlign: 'end' } }, h('span', { class: 'am' }, '$' + nf(l.usd)), h('span', { class: 'ds num' }, l.status === 'closed' ? '—' : c.left >= 0 ? daysLabel(c.left) : 'منتهٍ')),
    h('div', { class: 'pb bar' }, bar));
}
const LC_FILTERS = [['all', 'الكل'], ['issued', 'صادرة'], ['bank', 'لدى المصرف'], ['closed', 'مقفلة']];
function fillLcList(box) {
  const rows = S.lcs.filter((l) => UI.lcFilter === 'all' || (UI.lcFilter === 'issued' && l.status === 'issued') || (UI.lcFilter === 'bank' && ['draft', 'submitted', 'awaiting_cover'].includes(l.status)) || (UI.lcFilter === 'closed' && l.status === 'closed'));
  clear(box);
  if (!rows.length) box.append(h('div', { class: 'card empty' }, 'لا توجد اعتمادات في هذا التصنيف.'));
  rows.forEach((l, i) => box.append(lcRow(l, i)));
}

function donutBlock() {
  const open = S.lcs.filter((l) => l.status !== 'closed');
  const by = {};
  open.forEach((l) => { by[l.bank] = (by[l.bank] || 0) + l.usd * l.rate; });
  const ids = Object.keys(by).sort((a, b) => by[b] - by[a]);
  const tot = ids.reduce((a, k) => a + by[k], 0);
  const R = 38, C = 2 * Math.PI * R;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.innerHTML = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--line-2)" stroke-width="15"/>`;
  const mid = h('div', { class: 'ctr' }, h('b', { class: 'num', style: { font: '600 1.05rem var(--f-disp)' } }, short(tot)), h('span', { class: 'lbl' }, 'د.ل'));
  const leg = h('div', { class: 'leg' });
  let off = 0;
  ids.forEach((k, i) => {
    const b = bankOf(k), len = (by[k] / tot) * C;
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ['cx:50', 'cy:50', `r:${R}`, `stroke:${b.col}`, `stroke-dasharray:0 ${C}`, `stroke-dashoffset:${-off}`].forEach((kv_) => { const [a, v] = kv_.split(':'); c.setAttribute(a, v); });
    svg.append(c); off += len;
    setTimeout(() => c.setAttribute('stroke-dasharray', `${Math.max(1, len - 3)} ${C}`), 120 + i * 130);
    leg.append(h('div', null, h('i', { style: { background: b.col } }), h('span', { class: 'clip grow' }, b.n), h('b', { class: 'num' }, Math.round((by[k] / tot) * 100) + '%')));
  });
  return h('div', { class: 'card row rise' }, h('div', { class: 'don' }, svg, mid), leg);
}

SCREENS.lcs = (root) => {
  const open = S.lcs.filter((l) => l.status !== 'closed');
  const usd = sum(open.map((l) => l.usd));
  const lyd = sum(open.map((l) => l.usd * l.rate));
  const due = sum(S.lcs.filter((l) => l.status === 'issued').map((l) => calcLC(l).out));
  const bigNode = h('span', null, '0');
  const lydNode = h('span', { class: 'num' }, '0');
  setTimeout(() => { countTo(bigNode, usd); countTo(lydNode, lyd); }, 50);
  const hero = h('div', { class: 'card hero col rise' },
    h('span', { class: 'lbl' }, 'إجمالي الاعتمادات المفتوحة'),
    h('div', { class: 'big num' }, bigNode, h('small', null, 'USD')),
    h('span', { class: 'lbl' }, '≈ ', lydNode, ' دينار ليبي'),
    h('div', { class: 'mini3' },
      h('div', null, h('b', null, short(due)), h('span', null, 'تغطية مستحقة د.ل')),
      h('div', null, h('b', null, String(S.lcs.filter((l) => l.status === 'issued').length)), h('span', null, 'صادرة')),
      h('div', null, h('b', null, String(S.lcs.filter((l) => ['submitted', 'awaiting_cover'].includes(l.status)).length)), h('span', null, 'لدى المصرف/المركزي'))));

  const ceil = ceilingFromTax(S.tax.income, S.tax.payroll);
  const used = sum(open.map((l) => l.usd * l.rate));
  const usedPct = ceil ? clamp((used / ceil) * 100, 0, 100) : 0;
  const bar = h('i');
  setTimeout(() => { bar.style.width = usedPct + '%'; }, 200);
  const ceilCard = h('div', { class: 'card col rise', style: { '--i': 1 } },
    h('div', { class: 'row' }, h('div', { class: 'h3 grow' }, 'سقف الاعتمادات التقديري'), confTag('lo')),
    h('div', { class: 'row', style: { alignItems: 'baseline' } }, h('b', { class: 'num', style: { font: '600 1.5rem var(--f-disp)' } }, nf(ceil)), h('span', { class: 'lbl' }, 'د.ل سنويًا (بوحدة الضريبة المدخلة)')),
    h('div', { class: 'bar' }, bar),
    h('span', { class: 'lbl' }, 'الاستخدام الحالي ', h('b', { class: 'num' }, Math.round(usedPct) + '%'), ' من السقف'),
    h('span', { class: 'lbl' }, 'الصيغة: 30 × متوسط ضريبة الدخل + 10 × متوسط ضريبة المرتبات'),
    h('div', { class: 'note warn' }, icon('alert'), h('span', null, 'صيغة أعلنتها وزارة الاقتصاد في 20 أغسطس 2026 دون قرار منشور أو تاريخ نفاذ، ولم يعلّق المركزي. تقدير للتخطيط فقط. ', srcLink('المصدر', L.formula))),
    h('button', { class: 'btn sm ghost', type: 'button', onclick: openTaxSheet }, 'عدّل مدخلات الضرائب'));

  const list = h('div', { class: 'stack' });
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'تصفية الاعتمادات' }, LC_FILTERS.map(([id, ar]) => h('button', { type: 'button', class: UI.lcFilter === id ? 'on' : '', onclick: (e) => { UI.lcFilter = id; $$('button', seg).forEach((b) => b.classList.toggle('on', b === e.currentTarget)); fillLcList(list); } }, ar)));
  const banks = h('div', { class: 'bkcards' }, BANKS.map((b, i) => h('button', { class: `bk ${b.g}${i === S.bankSel ? ' sel' : ''}`, type: 'button', 'aria-label': b.n, onclick: (e) => { S.bankSel = i; saveState(); $$('.bk', banks).forEach((x) => x.classList.toggle('sel', x === e.currentTarget)); toast('مصدر الحوالة: ' + b.n); } },
    h('small', null, 'حساب ' + b.acc), h('div', { class: 'n' }, b.n), h('div', { class: 'b' }, h('span', null, nf(b.bal)), ' ', h('small', null, 'LYD')))));
  const fx = h('button', { class: 'card tap row rise', type: 'button', onclick: openConverter },
    h('div', { class: 'tool', style: { minHeight: 0, padding: 0, flex: 'none' } }, h('div', { class: 'bx', style: { background: 'var(--surface-2)', color: 'var(--gold-text)' } }, icon('swap'))),
    h('div', { class: 'col grow' }, h('b', null, 'محوّل العملة'), h('span', { class: 'lbl' }, 'سعر المركزي: 1 USD = ', h('span', { class: 'num' }, RATE.avg.toFixed(4)), ' د.ل')), icon('chevL'));

  root.append(
    h('div', { class: 'title-row' }, h('h1', null, 'الاعتمادات'), h('button', { class: 'ibtn', type: 'button', 'aria-label': 'اعتماد جديد', onclick: () => openNewLC() }, icon('plus'))),
    h('div', { class: 'stack' }, hero, ceilCard, seg, list, h('div', { class: 'sect-h' }, h('h2', { style: { font: '500 1rem var(--f-disp)' } }, 'التوزيع حسب المصرف')), donutBlock(),
      h('div', { class: 'sect-h' }, h('h2', { style: { font: '500 1rem var(--f-disp)' } }, 'الحسابات المصرفية'), h('span', { class: 'lbl' }, 'اختر مصدر الحوالة')), banks, fx,
      h('button', { class: 'btn gold block', type: 'button', onclick: () => openNewLC() }, icon('plus'), 'تجهيز طلب اعتماد جديد')));
  fillLcList(list);
};

function openTaxSheet() {
  openSheet({
    title: 'مدخلات سقف الاعتمادات',
    build: (body, ctrl) => {
      const inc = h('input', { id: 'tx-inc', class: 'ltr', inputmode: 'numeric', value: String(S.tax.income) });
      const pay = h('input', { id: 'tx-pay', class: 'ltr', inputmode: 'numeric', value: String(S.tax.payroll) });
      const out = h('b', { class: 'num', style: { font: '600 1.4rem var(--f-disp)' } });
      const paint = () => { out.textContent = nf(ceilingFromTax(inc.value, pay.value)) + ' د.ل'; };
      inc.oninput = paint; pay.oninput = paint; paint();
      body.append(
        h('div', { class: 'form' },
          h('div', { class: 'field w2' }, h('label', { for: 'tx-inc' }, 'متوسط ضريبة الدخل السنوية (آخر 3 سنوات)'), h('div', { class: 'u' }, h('b', null, 'LYD'), inc)),
          h('div', { class: 'field w2' }, h('label', { for: 'tx-pay' }, 'متوسط ضريبة المرتبات السنوية (آخر 3 سنوات)'), h('div', { class: 'u' }, h('b', null, 'LYD'), pay))),
        h('div', { class: 'card flat col' }, h('span', { class: 'lbl' }, 'السقف التقديري'), out),
        h('div', { class: 'note' }, icon('info'), h('span', null, 'العملة غير محددة في الإعلان، لذلك افترضنا أن الضريبة بالدينار. أدخل أرقام إقراراتك الفعلية.')),
        h('button', { class: 'btn gold block', type: 'button', onclick: () => { S.tax.income = num(inc.value); S.tax.payroll = num(pay.value); ctrl.close(); commit('تم تحديث التقدير'); } }, 'حفظ'));
    },
  });
}

/* ---------- LC detail ---------- */
function lcSummaryText(l) {
  const c = calcLC(l);
  return [`طلب اعتماد مستندي · ${l.no}`, `الشركة: ${S.company.name}`, `المستفيد: ${l.supplier}`, `القطاع: ${l.sector}`, `المصرف: ${bankOf(l.bank).n} (حساب ${bankOf(l.bank).acc})`,
    `القيمة: ${nf(l.usd)} USD @ ${l.rate} = ${nf(c.lyd)} LYD`, `الغطاء: ${l.cover}% = ${nf(c.req)} LYD`, `المدة: ${l.days} يومًا · الاستحقاق ${iso(c.due)}`, `الانحراف المسموح: ${l.dev}% (حتى ${nf(c.max)} USD)`, `البيان: ${l.desc}`].join('\n');
}
function openLC(no) {
  openPage('lc:' + no, () => {
    const l = lcByNo(no);
    if (!l) return [pageShell({ title: 'غير موجود', body: h('div', { class: 'empty' }, 'تعذر العثور على الاعتماد') })];
    const c = calcLC(l), st = lcStatus(l), b = bankOf(l.bank);
    const ship = S.ships.find((s) => s.lcNo === l.no);
    const over = c.inv > c.max;
    const rg = (pct, col, txt, lab) => h('div', { class: 'rg' }, ring({ pct: pct * 100, size: 70, stroke: 7, track: 'var(--line-2)', c1: col, c2: col, mid: h('b', { class: 'num', style: { font: '600 .8rem var(--f-disp)' } }, txt) }), h('small', null, lab));
    const paidPct = c.req ? clamp(l.paid / c.req, 0, 1) : 1;
    const hero = h('div', { class: 'card rise' },
      h('div', { class: 'row', style: { marginBottom: '6px' } }, h('div', { class: 'h3 grow' }, h('span', { class: 'num' }, l.no)), pill(st[0], st[1])),
      h('div', { class: 'rings' },
        rg(1 - c.elapsed, c.left <= 7 ? 'var(--warn)' : 'var(--gold-b)', l.status === 'closed' ? '—' : String(Math.max(0, c.left)), 'أيام متبقية'),
        rg(paidPct, c.out > 0 ? 'var(--bad)' : 'var(--ok)', Math.round(paidPct * 100) + '%', 'الغطاء المسدّد'),
        rg(c.invPct, over ? 'var(--bad)' : 'var(--info)', Math.round(c.invPct * 100) + '%', 'المفوتَر')),
      h('div', { class: over || c.out > 0 ? 'note bad' : 'note ok' }, icon(over || c.out > 0 ? 'alert' : 'check'), h('span', null, over ? `الفواتير تتجاوز الحد المسموح ($${nf(c.max)}).` : c.out > 0 ? `تغطية نقدية مستحقة: ${nf(c.out)} د.ل` : 'الفواتير والغطاء ضمن الحدود.')));
    const info = h('div', { class: 'card rise', style: { '--i': 1 } },
      kv('البيان', l.desc), kv('المستفيد', h('span', { class: 'ltr' }, l.supplier)), kv('المصرف', `${b.n} · ${b.acc}`), kv('القطاع', l.sector),
      kv('القيمة', '$' + nf(l.usd)), kv(`بالدينار @ ${l.rate}`, nf(c.lyd) + ' د.ل'), kv(`الغطاء ${l.cover}%`, nf(c.req) + ' د.ل'), kv('المسدّد من الغطاء', nf(l.paid) + ' د.ل'),
      kv('نطاق الانحراف المسموح', h('span', { class: 'num' }, `$${nf(l.usd * (1 - l.dev / 100))} – $${nf(c.max)}`)), kv('الفتح', fmtDate(D(l.open))), kv('الاستحقاق', fmtDate(c.due)));
    const docs = h('div', { class: 'card col rise', style: { '--i': 2 } },
      h('div', { class: 'row' }, h('div', { class: 'h3 grow' }, 'ما يطلبه المصرف عادةً'), confTag('mid')),
      ['فاتورة أولية من المصدّر (النوع، الوصف، الوزن، الكمية، السعر، بلد المنشأ)', 'وثيقة تأمين من شركة تأمين محلية', 'شهادة تفتيش (محلية أو دولية ISO 9001:2015)', 'شهادة ضرائب وشهادة ضمان اجتماعي أصليتان وحديثتان', 'رمز المركزي (CBL Key) وتسجيل الشركة في ACI و FCMS'].map((t) => h('div', { class: 'chk ok' }, icon('check'), h('span', null, t))),
      h('span', { class: 'lbl' }, 'ضوابط المركزي المعلنة (ديسمبر 2020). تحقق من مصرفك بحثًا عن تحديثات. ', srcLink('المصدر', L.ctrl2020)));
    const idx = lcIndex(l.status);
    const sim = S.demo && idx < 4 && l.status !== 'closed' ? h('div', { class: 'sim' }, simBtn(l.status === 'draft' ? 'تقديم الطلب للمصرف' : l.status === 'submitted' ? 'موافقة المصرف وطلب التغطية' : 'تغطية المركزي وصدور الاعتماد', () => { l.status = LC_FLOW[idx + 1].id; logActivity('bank', `الاعتماد ${l.no}: ${LC_FLOW[idx + 1].ar}`, l.no); commit('تمت المحاكاة'); })) : null;
    const actions = h('div', { class: 'row wrap' },
      ship ? h('button', { class: 'btn gold grow', type: 'button', onclick: () => openShip(ship.id) }, icon('box'), 'الرحلة ' + ship.id) : h('button', { class: 'btn gold grow', type: 'button', onclick: () => openNewShip({ lcNo: l.no, usd: String(l.usd), supplier: l.supplier }) }, icon('plus'), 'ابدأ رحلة لهذا الاعتماد'),
      h('button', { class: 'btn ghost', type: 'button', onclick: async () => toast((await copyText(lcSummaryText(l))) ? 'تم نسخ ملخص الطلب' : 'تعذر النسخ') }, icon('copy'), 'نسخ الملخص'));
    return pageShell({ title: 'اعتماد ' + l.no, body: h('div', { class: 'stack' }, hero, info, actions, docs, sim) });
  });
}

/* ---------- new LC wizard ---------- */
function openNewLC(pre = {}) {
  const f = { supplier: '', sector: 'تجاري', bank: BANKS[S.bankSel].id, base: 'حساب الغطاء النقدي', desc: '', usd: '250000', rate: String(RATE.avg), days: '30', cover: '15', dev: '10', notes: 'دفع مقابل مستندات' };
  const ship = pre.shipId ? shipOf(pre.shipId) : null;
  if (ship) { f.supplier = ship.supplier.name; f.usd = String(ship.valueUsd); f.desc = ship.title; }
  let step = 0;
  const key = 'newlc';
  const p = openPage(key, () => {
    const parts = [];
    const dyn = {};
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
      const cap = f.sector === 'صناعي' ? 10000000 : f.sector === 'خدمات' ? 3000000 : 5000000;
      if (c.usd > cap) warns.push(`القيمة تتجاوز سقف الاعتماد الواحد المعلن لقطاع «${f.sector}» ($${nf(cap)} في ضوابط 2020، وتعليق آخر يذكر أرقامًا مختلفة).`);
      if (c.cover < 100) warns.push('ضوابط المركزي المعلنة (2020) تشترط تغطية الاعتماد كاملة من الرصيد المتاح. بعض المصارف تطبق نسبًا أقل، فتأكد من مصرفك.');
      const bank = bankOf(f.bank);
      if (c.cov > bank.bal) warns.push(`قيمة الغطاء أكبر من رصيد الحساب (${nf(bank.bal)} د.ل).`);
      return h('div', { class: 'col' },
        h('div', { class: 'cvp' },
          h('div', { class: 'lbl', style: { color: 'var(--hero-mute)' } }, 'القيمة المكافئة بالدينار'),
          h('div', { class: 'v num' }, nf(c.lyd), ' ', h('small', null, 'LYD')),
          kv('الغطاء المطلوب', nf(c.cov) + ' د.ل'), kv('الاستحقاق', fmtDate(c.due)), kv('نطاق الانحراف المقبول', c.usd ? h('span', { class: 'num' }, `$${nf(c.min)} – $${nf(c.max)}`) : '—'),
          h('div', { class: 'bar', style: { marginTop: '8px' } }, h('i', { style: { width: clamp(c.cover, 0, 100) + '%' } }))),
        warns.map((w) => h('div', { class: 'note warn' }, icon('alert'), h('span', null, w))));
    };
    const panelBox = h('div');
    function paint() { clear(panelBox).append(panel()); }
    let body;
    if (step === 0) {
      body = h('div', { class: 'form' },
        fld('lc-co', 'الشركة المستوردة', h('input', { id: 'lc-co', value: S.company.name, readonly: true }), true),
        fld('lc-sup', 'لصالح المورد *', inp('lc-sup', 'supplier', { class: 'ltr', placeholder: 'Supplier name' }), true),
        fld('lc-sec', 'القطاع', sel('lc-sec', 'sector', [{ v: 'تجاري', t: 'تجاري' }, { v: 'صناعي', t: 'صناعي' }, { v: 'خدمات', t: 'خدمات' }])),
        fld('lc-bank', 'على الحساب المصرفي', sel('lc-bank', 'bank', BANKS.map((b) => ({ v: b.id, t: b.n })))),
        fld('lc-base', 'الحساب الأساسي للغطاء', sel('lc-base', 'base', [{ v: 'حساب الغطاء النقدي', t: 'حساب الغطاء النقدي' }, { v: 'حساب الودائع المقيّدة', t: 'حساب الودائع المقيّدة' }]), true),
        fld('lc-desc', 'بيان الاعتماد', inp('lc-desc', 'desc', { placeholder: 'مثال: شحنة 56 · مشتريات' }), true));
    } else if (step === 1) {
      body = h('div', { class: 'stack' }, h('div', { class: 'form' },
        fld('lc-usd', 'القيمة الافتتاحية *', h('div', { class: 'u' }, h('b', null, 'USD'), inp('lc-usd', 'usd', { inputmode: 'numeric' })), true),
        fld('lc-rate', 'معدل التحويل', inp('lc-rate', 'rate', { class: 'ltr', inputmode: 'decimal' }), false, ['سعر المركزي ', h('span', { class: 'num' }, String(RATE.avg)), ' · ', h('span', { class: 'ltr' }, RATE.date)]),
        fld('lc-days', 'مدة الاعتماد (يوم)', inp('lc-days', 'days', { class: 'ltr', inputmode: 'numeric' })),
        fld('lc-cov', 'نسبة الغطاء %', inp('lc-cov', 'cover', { class: 'ltr', inputmode: 'decimal' })),
        fld('lc-dev', 'الانحراف المسموح %', inp('lc-dev', 'dev', { class: 'ltr', inputmode: 'decimal' })),
        fld('lc-notes', 'ملاحظات وشروط الدفع', inp('lc-notes', 'notes'), true)), panelBox);
    } else {
      const c = calc();
      body = h('div', { class: 'stack' }, panelBox,
        h('div', { class: 'card flat' }, kv('الشركة', S.company.name), kv('المستفيد', h('span', { class: 'ltr' }, f.supplier)), kv('المصرف', bankOf(f.bank).n), kv('القطاع', f.sector), kv('البيان', f.desc || '—'), kv('المدة', `${c.days} يومًا`), kv('الغطاء', `${c.cover}%`)),
        h('div', { class: 'note' }, icon('info'), h('span', null, 'يجهّز سَنَد حزمة الطلب لتقدّمها عبر نظام مصرفك (فرع أو بوابة مثل OLC). الإرسال المباشر يتطلب شراكة مع المصرف.')));
    }
    paint();
    if (step < 2) panelBox.hidden = step === 0;
    const steps = h('div', { class: 'stepper' }, [0, 1, 2].map((i) => h('i', { class: i <= step ? 'on' : '' })));
    const titles = ['الأطراف والحساب', 'القيمة والمدة والغطاء', 'المراجعة والتأكيد'];
    const foot = step < 2
      ? h('div', { class: 'row' }, step > 0 ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { step--; renderPage(p); } }, 'السابق') : null,
        h('button', { class: 'btn gold grow', type: 'button', onclick: () => {
          if (step === 0 && !f.supplier.trim()) { $('#lc-sup').closest('.field').classList.add('bad'); return toast('اكتب اسم المورد'); }
          if (step === 1 && !(num(f.usd) > 0)) { $('#lc-usd').closest('.field').classList.add('bad'); return toast('أدخل قيمة الاعتماد'); }
          step++; renderPage(p);
        } }, 'التالي'))
      : h('div', { class: 'col' }, swipeConfirm('اسحب لتجهيز طلب الاعتماد', () => {
        const c = calc();
        const no = String(Math.max(...S.lcs.map((x) => Number(x.no) || 0)) + 1);
        const lc = { no, desc: f.desc || 'اعتماد جديد', bank: f.bank, open: iso(TODAY), days: c.days, usd: c.usd, rate: c.rate, cover: c.cover, dev: c.dev, status: 'draft', paid: 0, invoices: [], sector: f.sector, supplier: f.supplier.trim() };
        S.lcs.unshift(lc);
        if (ship) ship.lcNo = no;
        logActivity('bank', `جُهّز طلب الاعتماد ${no}`, no);
        saveState();
        celebrate({ title: 'تم تجهيز طلب الاعتماد', sub: `الاعتماد ${no} بقيمة $${nf(c.usd)}. انسخ الملخص وقدّمه لمصرفك.`, cta: 'عرض الاعتماد', onClose: () => { closePage(); rerender(); openLC(no); } });
      }), h('button', { class: 'btn ghost', type: 'button', onclick: () => { step--; renderPage(p); } }, 'السابق'));
    return pageShell({ title: 'طلب اعتماد جديد', onBack: () => (step > 0 ? (step--, renderPage(p)) : closePage()), body: h('div', { class: 'stack' }, steps, h('div', { class: 'h3' }, titles[step]), body), foot });
  });
}

/* ---------- currency converter (carried over from the original dashboard) ---------- */
function openConverter() {
  openSheet({
    title: 'محوّل العملة',
    build: (body) => {
      let dir = 'USD';
      const amt = h('input', { id: 'fx-amt', inputmode: 'decimal', value: '250000', 'aria-label': 'المبلغ', style: { background: 'none', border: 0, outline: 0, font: '600 1.7rem var(--f-disp)', width: '100%', textAlign: 'end', direction: 'ltr', color: 'inherit' } });
      const out = h('output', { style: { font: '600 1.7rem var(--f-disp)', width: '100%', textAlign: 'end', direction: 'ltr', display: 'block' } });
      const cp = h('em', { class: 'num', style: { fontStyle: 'normal', fontSize: '.8rem', opacity: '.8', padding: '2px 10px', borderRadius: '99px', background: 'rgba(0,0,0,.14)' } });
      const cg = h('em', { class: 'num', style: { fontStyle: 'normal', fontSize: '.8rem', opacity: '.8', padding: '2px 10px', borderRadius: '99px', background: 'var(--line)' } });
      const paint = () => {
        const v = num(amt.value);
        out.textContent = nf(dir === 'USD' ? v * RATE.avg : v / RATE.avg, 2);
        cp.textContent = dir; cg.textContent = dir === 'USD' ? 'LYD' : 'USD';
      };
      amt.oninput = paint; paint();
      body.append(
        h('div', { class: 'card tint-mint', style: { borderRadius: '18px' } }, h('label', { class: 'lbl', for: 'fx-amt', style: { color: 'inherit' } }, 'أنت تدفع'), h('div', { class: 'row', style: { direction: 'ltr' } }, amt, cp)),
        h('div', { style: { display: 'grid', placeItems: 'center', margin: '-14px 0' } }, h('button', { class: 'ibtn', type: 'button', 'aria-label': 'عكس الاتجاه', style: { background: 'var(--sheet)', borderColor: 'var(--line-2)', zIndex: 2, borderRadius: '50%' }, onclick: () => { const o = num(amt.value) * (dir === 'USD' ? RATE.avg : 1 / RATE.avg); dir = dir === 'USD' ? 'LYD' : 'USD'; amt.value = o.toFixed(2); paint(); } }, icon('swap'))),
        h('div', { class: 'card', style: { borderRadius: '18px' } }, h('span', { class: 'lbl' }, 'تحصل على'), h('div', { class: 'row', style: { direction: 'ltr' } }, out, cg)),
        h('div', { class: 'row wrap' }, [1000, 10000, 100000, 1000000].map((q) => h('button', { class: 'chip num', type: 'button', onclick: () => { amt.value = String(q); paint(); } }, short(q)))),
        h('div', { class: 'card flat' }, kv('سعر المركزي', '1 USD = ' + RATE.avg.toFixed(4) + ' LYD'), kv('شراء / بيع', `${RATE.buy.toFixed(4)} / ${RATE.sell.toFixed(4)}`), kv('تاريخ السعر', h('span', { class: 'ltr' }, RATE.date))),
        h('div', { class: 'note' }, icon('info'), h('span', null, 'السعر مأخوذ من لوحة سَنَد الأصلية بتاريخ ', h('span', { class: 'ltr' }, RATE.date), '. تحقق من السعر الحالي في ', srcLink('موقع المركزي', SYS.cbl.url), '. يختلف سعر السوق الموازي ولا يُستخدم في المعاملات المصرفية.')));
    },
  });
}
