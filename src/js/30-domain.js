/* ---------- state accessors ---------- */
let S = null;
const lcOf = (sh) => S.lcs.find((l) => l.no === sh.lcNo) || null;
const shipOf = (id) => S.ships.find((s) => s.id === id) || null;
const lcByNo = (no) => S.lcs.find((l) => l.no === no) || null;
const shipTitle = (sh) => L(sh.title);
const lcDesc = (l) => L(l.desc);
function logActivity(ic, t, ref) {
  S.activity.unshift({ id: rid('ev'), at: iso(TODAY), ic, t, ref: ref || '' });
  S.activity.length = Math.min(S.activity.length, 40);
}
const isDemo = () => S.mode === 'demo';

/* ---------- letters of credit ---------- */
function calcLC(l) {
  const lyd = l.usd * l.rate;
  const req = (lyd * l.cover) / 100;
  const due = addDays(D(l.open), l.days);
  const inv = sum(l.invoices || []);
  const out = l.status === 'closed' ? 0 : Math.max(0, req - l.paid);
  return { lyd, req, out, due, left: daysBetween(TODAY, due), inv, max: l.usd * (1 + l.dev / 100), invPct: l.usd ? inv / l.usd : 0, elapsed: clamp(daysBetween(D(l.open), TODAY) / l.days, 0, 1) };
}
function lcStatus(l) {
  const c = calcLC(l);
  if (l.status === 'closed') return [tr('مقفل', 'Closed'), 'idle'];
  if (l.status === 'draft') return [tr('مسودة', 'Draft'), 'idle'];
  if (l.status === 'submitted') return [tr('لدى المصرف', 'With the bank'), 'info'];
  if (l.status === 'awaiting_cover') return [tr('بانتظار تغطية المركزي', 'Waiting for CBL cover'), 'warn'];
  if (c.out > 0) return [tr('تغطية نقدية مستحقة', 'Cash cover due'), 'bad'];
  if (c.left < 0) return [tr('منتهي', 'Expired'), 'bad'];
  if (c.left <= 7) return [tr('ينتهي قريبًا', 'Ending soon'), 'warn'];
  return [tr('صادر', 'Issued'), 'ok'];
}
const ceilingFromTax = (income, payroll) => 30 * num(income) + 10 * num(payroll);
const SECTORS = { commercial: T2('تجاري', 'Commercial'), industrial: T2('صناعي', 'Industrial'), services: T2('خدمات', 'Services') };
const sectorName = (s) => L(SECTORS[s] || SECTORS.commercial);

/* ---------- shipment journey engine ---------- */
const GATE_META = [
  { id: 'fund', n: T2('التمويل المصرفي', 'Bank funding'), sub: T2('القناة والاعتماد وتغطية المركزي', 'Channel, credit and CBL cover'), ic: 'bank' },
  { id: 'docs', n: T2('المستندات المسبقة', 'Pre-shipment documents'), sub: T2('فاتورة وتفتيش وتأمين ومنشأ', 'Invoice, inspection, insurance, origin'), ic: 'file' },
  { id: 'aci', n: T2('ACI قبل الشحن', 'ACI before shipping'), sub: T2('التسجيل المسبق للشحنة لدى الجمارك', 'Advance registration with Customs'), ic: 'shield' },
  { id: 'ship', n: T2('الشحن والوصول', 'Shipping & arrival'), sub: T2('السفينة والمانيفست ووصول الحاويات', 'Vessel, manifest and container arrival'), ic: 'ship' },
  { id: 'cus', n: T2('التخليص والإفراج', 'Clearance & release'), sub: T2('الإقرار الجمركي وإثبات القيمة', 'Declaration and proof of value'), ic: 'stamp' },
  { id: 'set', n: T2('التسوية', 'Settlement'), sub: T2('مطابقة المستندات وإقفال الاعتماد', 'Document match and closing the credit'), ic: 'check' },
];
const DOC_OWNER = { invoice: 'supplier', inspection: 'supplier', insurance: 'me', origin: 'supplier', packing: 'supplier', conformity: 'supplier' };

function buildGates(sh) {
  const lc = lcOf(sh);
  const cat = catOf(sh.cat);
  const a = sh.aci;
  const ai = aciIndex(a.status);
  const man = (id) => !!(sh.manual && sh.manual[id]);
  const has = (t) => !!(sh.docs && sh.docs[t]);
  const rel = !!(sh.customs && sh.customs.released);
  const isLC = sh.channel === 'LC';
  const T = {};

  T.fund = [{ id: 'fund.channel', label: tr('تحديد القناة المصرفية', 'Choose the banking channel'), hint: isLC ? tr('اعتماد مستندي عبر مصرفك التجاري', 'Documentary credit through your commercial bank') : sh.channel === 'SOLE' ? tr('نشاط فردي ضمن السقف السنوي', 'Sole trader within the annual limit') : tr('تحويل مباشر عبر FCMS', 'Direct transfer through FCMS'), kind: 'auto', who: 'system', done: !!sh.channel }];
  if (isLC) {
    T.fund.push(
      { id: 'fund.bank', label: tr('فتح الاعتماد لدى المصرف التجاري', 'Open the credit at your bank'), hint: lc ? tr(`الاعتماد ${lc.no} · ${bankName(lc.bank)}`, `Credit ${lc.no} · ${bankName(lc.bank)}`) : tr('لم يُربط اعتماد بهذه الرحلة بعد', 'No credit is linked to this shipment yet'), kind: 'lc', who: lc && lcIndex(lc.status) >= 1 ? 'bank' : 'me', done: !!lc && lcIndex(lc.status) >= 1 },
      { id: 'fund.cover', label: tr('تغطية المركزي بالنقد الأجنبي', 'Central Bank foreign-currency cover'), hint: tr('يطلبها المصرف من المركزي عبر FCMS', 'Your bank requests it from the Central Bank through FCMS'), kind: 'auto', who: 'bank', sys: 'fcms', done: !!lc && lcIndex(lc.status) >= 3 },
    );
  } else {
    T.fund.push({ id: 'fund.transfer', label: sh.channel === 'SOLE' ? tr('توثيق التحويل وقيمة الشحنة', 'Document the transfer and shipment value') : tr('طلب التحويل المباشر في FCMS', 'Request the direct transfer in FCMS'), hint: sh.channel === 'SOLE' ? tr('السداد عبر القناة المصرفية وتوثيق القيمة', 'Pay through a banking channel and document the value') : tr('قسم Direct Transfers · حتى 100 ألف$ (المنشور 14/2026)', 'Direct Transfers section · up to USD 100K (Circular 14/2026)'), kind: 'manual', who: 'me', sys: 'fcms', done: man('fund.transfer') });
  }

  const docTypes = PRE_DOCS.concat(cat.conf ? ['conformity'] : []);
  T.docs = docTypes.map((t) => ({
    id: 'docs.' + t, label: docName(t),
    hint: t === 'conformity' ? tr(`مطلوبة لفئة «${catName(sh.cat)}» (ARN 2020/68)`, `Required for “${catName(sh.cat)}” (ARN 2020/68)`) : docHint(t),
    kind: 'doc', docType: t, done: has(t), who: DOC_OWNER[t] || 'supplier',
  }));

  T.aci = [
    { id: 'aci.1', label: tr('المورد يسجّل البيانات الأولية والفاتورة', 'Supplier enters the first data and invoice'), hint: a.note && ai <= 0 ? tr(`أُعيدت للمورد: ${a.note}`, `Returned to the supplier: ${a.note}`) : tr('الرقم الضريبي، الرمز الإحصائي لك، بلد التصدير، الفاتورة', 'Tax ID, your statistical code, country of export, invoice'), kind: 'aci', who: 'supplier', done: ai >= 1, sys: 'aci' },
    { id: 'aci.2', label: tr('مراجعتك وموافقتك على بيانات المورد', 'You review and approve the supplier data'), hint: tr('يصلك بريد من ACI. وافق أو ارفض مع رسالة.', 'You get an email from ACI. Approve or reject with a message.'), kind: 'aci', who: 'me', done: ai >= 2, sys: 'aci' },
    { id: 'aci.3', label: tr('المورد يستكمل النقل والأصناف والحاويات', 'Supplier completes transport, items and containers'), hint: a.note && ai === 2 ? tr(`استفسار الجمارك: ${a.note}`, `Customs query: ${a.note}`) : tr('IMO، الحجز، رمز HS، أرقام الحاويات والأختام', 'IMO, booking, HS code, container and seal numbers'), kind: 'aci', who: 'supplier', done: ai >= 3 },
    { id: 'aci.4', label: tr('مراجعة الجمارك وإصدار رقم ACI', 'Customs review and ACI number'), hint: tr('موافقة أو رفض أو استفسار', 'Approval, rejection or a query'), kind: 'aci', who: 'customs', done: ai >= 4 },
    { id: 'aci.5', label: tr('رقم ACI في بوليصة الشحن ومراجعتها', 'ACI number on the bill of lading, and its review'), hint: a.number ? tr(`رقم ACI: ${a.number}`, `ACI number: ${a.number}`) : tr('يسلّم المورد الرقم للناقل قبل إصدار البوليصة النهائية', 'The supplier gives the number to the carrier before the final bill of lading'), kind: 'aci', who: 'supplier', done: ai >= 6 },
  ];

  T.ship = [
    { id: 'ship.booking', label: tr('حجز الشحن وبيانات السفينة', 'Freight booking and vessel details'), hint: sh.vessel ? `${sh.vessel} · IMO ${sh.imo || '—'}` : tr('تُدخل مع بيانات ACI (النقل)', 'Entered with the ACI transport data'), kind: 'aci', who: 'supplier', done: !!(sh.booking && sh.vessel) },
    { id: 'ship.notice', label: tr('إشعار وصول السفينة والمانيفست', 'Vessel arrival notice and manifest'), hint: tr('يقدمه الوكيل الملاحي عبر E-Logistic (طرابلس والخمس)', 'Filed by the shipping agent in E-Logistic (Tripoli and Khoms)'), kind: 'manual', who: 'agent', sys: 'elogistic', done: !!sh.noticeFiled },
    { id: 'ship.arrive', label: tr('وصول الشحنة إلى الميناء', 'Cargo arrives at the port'), hint: sh.arrived ? tr(`وصلت في ${fmtDate(D(sh.arrived))}`, `Arrived on ${fmtDate(D(sh.arrived))}`) : sh.eta ? tr(`المتوقع ${fmtDay(D(sh.eta))} · ${inDays(daysBetween(TODAY, D(sh.eta)))}`, `Expected ${fmtDay(D(sh.eta))} · ${inDays(daysBetween(TODAY, D(sh.eta)))}`) : '', kind: 'auto', who: 'system', done: !!sh.arrived },
  ];

  T.cus = [
    { id: 'cus.decl', label: tr('الإقرار الجمركي', 'Customs declaration'), hint: tr('يقدمه المخلّص الجمركي (E-Custom)', 'Filed by your clearing agent (E-Custom)'), kind: 'doc', docType: 'declaration', sys: 'ecustom', who: 'agent', done: has('declaration') },
    { id: 'cus.value', label: tr('إثبات القيمة الفعلية للشحنة', 'Proof of the shipment’s actual value'), hint: tr('شرط في القرار 449 قبل التخليص: الفاتورة النهائية وإثبات التحويل أو الاعتماد', 'Required by Decision 449 before clearance: final invoice and proof of transfer or credit'), kind: 'doc', docType: 'valueProof', who: 'me', done: has('valueProof'), key: true },
  ];
  if (cat.conf) T.cus.push({ id: 'cus.conf', label: tr('الرقابة الفنية والمطابقة', 'Technical control and conformity'), hint: tr(`فئة «${catName(sh.cat)}» قد تخضع لفحص المطابقة عند الوصول`, `“${catName(sh.cat)}” may be subject to a conformity check on arrival`), kind: 'manual', who: 'me', done: man('cus.conf') });
  T.cus.push({ id: 'cus.release', label: tr('الإفراج الجمركي', 'Customs release'), hint: tr('تضع الجمارك علامة «مفرج عنه» في ACI', 'Customs marks it “Released” in ACI'), kind: 'manual', who: 'customs', done: rel });

  T.set = [
    { id: 'set.match', label: tr('مطابقة المستندات وتسديد المصرف', 'Documents matched and bank settled'), hint: tr('يطابق المصرف الفاتورة مع شهادة التفتيش', 'The bank matches the invoice with the inspection certificate'), kind: 'manual', who: 'bank', done: man('set.match') },
    { id: 'set.close', label: isLC ? tr('إقفال الاعتماد', 'Close the credit') : tr('إقفال الملف', 'Close the file'), hint: isLC && lc ? tr(`الاعتماد ${lc.no}`, `Credit ${lc.no}`) : '', kind: isLC ? 'auto' : 'manual', who: isLC ? 'bank' : 'me', done: isLC ? !!lc && lc.status === 'closed' : man('set.close') },
  ];

  let active = -1;
  const gates = GATE_META.map((m, i) => {
    const tasks = T[m.id];
    const done = tasks.every((t) => t.done);
    if (!done && active < 0) active = i;
    return { id: m.id, name: L(m.n), sub: L(m.sub), ic: m.ic, i, tasks, done, ndone: tasks.filter((t) => t.done).length };
  });
  gates.forEach((g) => { g.state = g.done ? 'done' : g.i === active ? 'active' : 'todo'; });

  const cus = gates[4];
  if (sh.arrived && !has('valueProof') && !rel) {
    cus.blocked = true;
    cus.blockMsg = tr('وصلت الشحنة ولن تُفرج الجمارك قبل تقديم ما يثبت قيمتها الفعلية (القرار 449).', 'The cargo has arrived and Customs will not release it until you provide proof of its actual value (Decision 449).');
    if (cus.state !== 'done') cus.state = 'active';
    gates.forEach((g) => { if (g.i < 4 && !g.done) g.state = 'active'; });
  }
  const dl = aciRisk(sh);
  if (dl) gates[2].risk = dl;
  return gates;
}

function shipSummary(sh) {
  const gates = buildGates(sh);
  const rel = !!(sh.customs && sh.customs.released);
  const allDone = gates.every((g) => g.done);
  const cur = gates.find((g) => g.state === 'active') || gates[gates.length - 1];
  const blocked = gates.some((g) => g.blocked);
  const tasks = gates.flatMap((g) => g.tasks);
  const pct = Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
  /* what is on the user right now: open "me" tasks up to and including the active gate (+ the ACI approval when pending) */
  const todo = [];
  gates.forEach((g) => { if (g.i <= cur.i) g.tasks.forEach((t) => { if (!t.done && t.who === 'me') todo.push({ ...t, gate: g.id }); }); });
  if (sh.aci.status === 'importer_review' && !todo.find((t) => t.id === 'aci.2')) todo.unshift({ ...gates[2].tasks[1], gate: 'aci' });
  todo.sort((x, y) => (y.id === 'aci.2') - (x.id === 'aci.2') || (y.key ? 1 : 0) - (x.key ? 1 : 0));
  const waiting = cur.tasks.filter((t) => !t.done && t.who !== 'me' && t.who !== 'system');
  const next = todo[0] || cur.tasks.find((t) => !t.done) || null;
  let label, tone;
  if (allDone) { label = tr('مكتملة', 'Complete'); tone = 'idle'; }
  else if (rel) { label = tr('تمت التسوية', 'Settled'); tone = 'ok'; }
  else if (blocked) { label = tr('متوقفة عند الإفراج', 'Stuck at release'); tone = 'bad'; }
  else if (todo.length) { label = tr('بانتظارك', 'Waiting for you'); tone = 'gold'; }
  else { label = cur.name; tone = 'info'; }
  return { gates, cur, next, todo, waiting, blocked, pct, label, tone, allDone, mine: todo.length > 0 };
}

/* ACI must be validated >= 48h before loading (carrier advisory) */
function aciRisk(sh) {
  if (aciIndex(sh.aci.status) >= aciIndex('awaiting_bl')) return null;
  if (!sh.etd) return null;
  const dead = addDays(D(sh.etd), -2);
  const left = daysBetween(TODAY, dead);
  if (daysBetween(TODAY, D(sh.etd)) < 0) return { left, dead, tone: 'bad', text: tr('تجاوزت موعد التحميل دون رقم ACI', 'Loading date passed without an ACI number') };
  return { left, dead, tone: left <= 2 ? 'bad' : left <= 7 ? 'warn' : 'info', text: left < 0 ? tr('فات موعد اعتماد ACI (48 ساعة قبل التحميل)', 'ACI deadline missed (48 hours before loading)') : tr(`آخر موعد لاعتماد رقم ACI ${inDays(left)}`, `ACI number deadline ${inDays(left)}`) };
}

/* ---------- company readiness + alerts ---------- */
function reqState(id) { return S.profile.find((p) => p.id === id); }
function readiness() {
  const total = S.profile.length;
  const done = S.profile.filter((p) => p.done).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}
function docStatus(d) {
  if (!d.exp) return { tone: 'ok', text: tr('ساري', 'Valid'), days: null };
  const left = daysBetween(TODAY, D(d.exp));
  if (left < 0) return { tone: 'bad', text: tr(`منتهٍ ${inDays(left)}`, `Expired ${inDays(left)}`), days: left };
  if (left <= 30) return { tone: 'warn', text: tr(`ينتهي ${inDays(left)}`, `Expires ${inDays(left)}`), days: left };
  return { tone: 'ok', text: tr(`ساري · ${fmtDate(D(d.exp))}`, `Valid · ${fmtDate(D(d.exp))}`), days: left };
}
const COMPANY_DOC_TYPES = [
  { v: 'license', n: T2('رخصة النشاط', 'Business license') },
  { v: 'tax', n: T2('شهادة الضرائب', 'Tax certificate') },
  { v: 'ss', n: T2('شهادة الضمان الاجتماعي', 'Social security certificate') },
  { v: 'pts', n: T2('شهادة تسجيل PTS', 'PTS registration certificate') },
  { v: 'aci', n: T2('إثبات تسجيل ACI', 'ACI registration proof') },
  { v: 'cblkey', n: T2('خطاب مفتاح المركزي وIBAN', 'CBL Key and IBAN letter') },
];
const companyDocName = (type) => { const t = COMPANY_DOC_TYPES.find((x) => x.v === type); return t ? L(t.n) : type; };
/* license / tax / social security follow their documents when uploaded */
function syncProfileFromDocs() {
  ['license', 'tax', 'ss'].forEach((id) => {
    const d = S.companyDocs.find((x) => x.type === id);
    const p = reqState(id);
    if (!d || !p) return;
    const ok = docStatus(d).tone !== 'bad';
    p.done = ok; p.note = ok ? '' : T2('منتهية', 'Expired');
  });
}
function nextRegDate() {
  return REG_DATES.map((r) => ({ ...r, left: daysBetween(TODAY, D(r.date)) })).find((r) => r.left >= 0) || null;
}
const TONE_RANK = { bad: 0, warn: 1, gold: 2, info: 3, ok: 4 };
function buildAlerts() {
  const out = [];
  S.ships.forEach((sh) => {
    const sm = shipSummary(sh);
    const t = shipTitle(sh);
    if (sh.aci.status === 'importer_review') out.push({ tone: 'gold', ic: 'mail', title: tr(`بانتظار موافقتك · ${sh.id}`, `Waiting for your approval · ${sh.id}`), sub: tr(`المورد أدخل بيانات ACI لشحنة «${t}». راجعها ووافق أو ارفض.`, `The supplier entered the ACI data for “${t}”. Review it, then approve or reject.`), act: { type: 'ship', id: sh.id, open: 'aci-approve' } });
    if (sm.blocked) out.push({ tone: 'bad', ic: 'alert', title: tr(`${sh.id} متوقفة عند الإفراج`, `${sh.id} is stuck at release`), sub: tr('لا إفراج قبل مستندات إثبات القيمة الفعلية.', 'No release before proof of the actual value.'), act: { type: 'ship', id: sh.id, open: 'gate-cus' } });
    const r = aciRisk(sh);
    if (r && r.tone !== 'info' && sh.aci.status !== 'importer_review') out.push({ tone: r.tone, ic: 'clock', title: `${sh.id}: ${r.text}`, sub: tr(`حالة ACI الآن: ${aciLabel(sh.aci.status)}`, `ACI status now: ${aciLabel(sh.aci.status)}`), act: { type: 'ship', id: sh.id, open: 'gate-aci' } });
    else if (r && r.tone !== 'info') out.push({ tone: r.tone, ic: 'clock', title: tr(`موعد ACI: ${r.text}`, `ACI deadline: ${r.text}`), sub: tr(`${sh.id} · المغادرة ${fmtDay(D(sh.etd))}`, `${sh.id} · departs ${fmtDay(D(sh.etd))}`), act: { type: 'ship', id: sh.id, open: 'gate-aci' } });
  });
  S.profile.filter((p) => !p.done).slice(0, 2).forEach((p) => out.push({ tone: 'warn', ic: 'shield', title: tr(`أكمل: ${L(REQS[p.id].n)}`, `Complete: ${L(REQS[p.id].n)}`), sub: (p.note ? L(p.note) + '. ' : '') + L(REQS[p.id].why), act: { type: 'profile', id: p.id } }));
  S.companyDocs.forEach((d) => {
    const st = docStatus(d);
    const nm = companyDocName(d.type);
    if (st.tone === 'bad') out.push({ tone: 'bad', ic: 'file', title: `${nm} ${st.text}`, sub: tr('مطلوبة عند فتح الاعتماد. حدّثها قبل الطلب القادم.', 'Needed when opening a credit. Renew it before the next request.'), act: { type: 'docs' } });
    else if (st.tone === 'warn') out.push({ tone: 'warn', ic: 'file', title: `${nm} ${st.text}`, sub: tr('جدّدها مبكرًا لتفادي تعطيل الاعتماد.', 'Renew early to avoid delaying the credit.'), act: { type: 'docs' } });
  });
  S.lcs.filter((l) => l.status !== 'closed').forEach((l) => {
    const c = calcLC(l);
    if (l.status === 'issued' && c.out > 0) out.push({ tone: 'warn', ic: 'bank', title: tr(`تغطية نقدية مستحقة · ${l.no}`, `Cash cover due · ${l.no}`), sub: tr(`${nf(c.out)} د.ل لدى ${bankName(l.bank)}`, `${nf(c.out)} LYD at ${bankName(l.bank)}`), act: { type: 'lc', no: l.no } });
    if (l.status === 'issued' && c.left >= 0 && c.left <= 7) out.push({ tone: 'warn', ic: 'clock', title: tr(`الاعتماد ${l.no} ينتهي ${inDays(c.left)}`, `Credit ${l.no} ends ${inDays(c.left)}`), sub: tr('تأكد من تقديم المستندات قبل الانتهاء.', 'Make sure the documents are presented before it ends.'), act: { type: 'lc', no: l.no } });
  });
  const nr = nextRegDate();
  if (nr && nr.left <= 120) out.push({ tone: nr.tone === 'bad' ? 'warn' : 'info', ic: 'cal', title: L(nr.n), sub: `${fmtDate(D(nr.date))} · ${inDays(nr.left)} · ${L(nr.src)}`, act: { type: 'radar' } });
  out.sort((x, y) => TONE_RANK[x.tone] - TONE_RANK[y.tone]);
  return out;
}

/* The single most useful thing to do now (drives the Home hero) */
function nextStep() {
  const blocked = S.ships.map((s) => ({ s, sm: shipSummary(s) })).find((x) => x.sm.blocked);
  if (blocked) return { tone: 'bad', ic: 'alert', title: tr(`${blocked.s.id} تنتظر إثبات القيمة`, `${blocked.s.id} needs proof of value`), why: tr('وصلت الشحنة ولن تُفرج الجمارك قبل تقديم ما يثبت قيمتها الفعلية.', 'The cargo arrived and Customs will not release it before you prove its actual value.'), label: tr('أرفق مستندات القيمة', 'Add proof of value'), act: { type: 'ship', id: blocked.s.id, open: 'gate-cus' } };
  const pend = S.ships.find((s) => s.aci.status === 'importer_review');
  if (pend) return { tone: 'gold', ic: 'mail', title: tr(`وافق على بيانات ACI للشحنة ${pend.id}`, `Approve the ACI data for ${pend.id}`), why: tr('المورد أدخل البيانات وينتظر موافقتك ليكمل. ACI لازم قبل التحميل.', 'The supplier entered the data and is waiting for you. ACI is needed before loading.'), label: tr('راجع ووافق', 'Review and approve'), act: { type: 'ship', id: pend.id, open: 'aci-approve' } };
  const miss = S.profile.find((p) => !p.done);
  if (miss) return { tone: 'gold', ic: 'shield', title: L(REQS[miss.id].n), why: `${L(REQS[miss.id].why)} ${L(REQS[miss.id].how)}`, label: tr('اعرف كيف', 'See how'), act: { type: 'profile', id: miss.id } };
  const bad = S.companyDocs.find((d) => docStatus(d).tone === 'bad');
  if (bad) return { tone: 'warn', ic: 'file', title: tr(`جدّد ${companyDocName(bad.type)}`, `Renew your ${companyDocName(bad.type)}`), why: tr('منتهية الصلاحية وتُطلب عند كل اعتماد.', 'It has expired and is requested for every credit.'), label: tr('حدّث المستند', 'Update the document'), act: { type: 'docs' } };
  const live = S.ships.map((s) => ({ s, sm: shipSummary(s) })).find((x) => !x.sm.allDone && x.sm.todo.length);
  if (live) return { tone: 'gold', ic: 'box', title: live.sm.todo[0].label, why: tr(`الرحلة ${live.s.id} · ${shipTitle(live.s)}`, `Shipment ${live.s.id} · ${shipTitle(live.s)}`), label: tr('افتح الرحلة', 'Open the shipment'), act: { type: 'ship', id: live.s.id } };
  if (!S.ships.length) return { tone: 'gold', ic: 'plus', title: tr('ابدأ أول رحلة استيراد', 'Start your first import shipment'), why: tr('نرتّب لك التمويل والمستندات وACI والإفراج خطوة بخطوة.', 'We line up funding, documents, ACI and release one step at a time.'), label: tr('ابدأ الآن', 'Start now'), act: { type: 'newShip' } };
  return { tone: 'ok', ic: 'check', title: tr('كل شيء على ما يرام', 'Everything is on track'), why: tr('لا خطوات مطلوبة منك الآن. سننبهك عند أي جديد.', 'Nothing is needed from you right now. We will alert you when something changes.'), label: tr('رحلة جديدة', 'New shipment'), act: { type: 'newShip' } };
}

/* ---------- ACI pre-flight ---------- */
const hsDigits = (v) => String(v || '').replace(/\D/g, '');
function aciChecks(sh) {
  const out = [];
  const add = (lvl, sec, text, sub) => out.push({ lvl, sec, text, sub: sub || '' });
  const a = sh.aci;
  const lc = lcOf(sh);
  if (!a.exporterTin) add('err', 'parties', tr('الرقم الضريبي للمصدّر مفقود', 'Exporter tax ID is missing'));
  if (!a.importerStat) add('err', 'parties', tr('الرمز الإحصائي للمستورد مفقود', 'Importer statistical code is missing'));
  if (!a.exportCountry) add('err', 'parties', tr('بلد التصدير غير محدد', 'Country of export is not set'));
  if (!(sh.docs && sh.docs.invoice)) add('err', 'docs', tr('الفاتورة التجارية غير مرفقة', 'Commercial invoice is not attached'), tr('تُرفع في القسم الأول من ACI', 'Uploaded in the first ACI section'));
  [['booking', tr('رقم الحجز', 'Booking number')], ['vessel', tr('اسم السفينة', 'Vessel name')], ['voyage', tr('رقم الرحلة', 'Voyage number')], ['carrier', tr('شركة الشحن', 'Shipping line')], ['agent', tr('الوكيل الملاحي', 'Shipping agent')], ['pol', tr('ميناء التحميل', 'Port of loading')], ['pod', tr('ميناء التفريغ', 'Port of discharge')], ['dest', tr('الوجهة النهائية', 'Final destination')], ['etd', tr('تاريخ المغادرة التقديري', 'Estimated departure date')], ['eta', tr('تاريخ الوصول التقديري', 'Estimated arrival date')]]
    .forEach(([k, label]) => { if (!sh[k]) add('err', 'transport', tr(`${label} غير مدخل`, `${label} is missing`)); });
  if (sh.imo && !/^\d{7}$/.test(String(sh.imo))) add('err', 'transport', tr('رقم IMO يجب أن يتكون من 7 أرقام', 'The IMO number must have 7 digits'));
  else if (!sh.imo) add('err', 'transport', tr('رقم IMO غير مدخل', 'IMO number is missing'));
  if (sh.etd && sh.eta && D(sh.eta) <= D(sh.etd)) add('err', 'transport', tr('تاريخ الوصول يسبق تاريخ المغادرة', 'Arrival date is before the departure date'));
  if (!sh.incoterm) add('err', 'finance', tr('شروط التسليم (Incoterms) غير محددة', 'Delivery terms (Incoterms) are not set'));
  if (sh.channel === 'LC' && !sh.lcNo) add('err', 'finance', tr('الرقم المرجعي لخطاب الاعتماد مفقود', 'Credit reference number is missing'));
  if (!sh.valueUsd) add('err', 'finance', tr('قيمة المنتج غير مدخلة', 'Goods value is missing'));
  if (lc && sh.valueUsd) {
    const c = calcLC(lc);
    if (sh.valueUsd > c.max) add('err', 'finance', tr(`قيمة الشحنة ($${nf(sh.valueUsd)}) تتجاوز الحد المسموح للاعتماد ($${nf(c.max)})`, `Shipment value ($${nf(sh.valueUsd)}) exceeds the credit limit ($${nf(c.max)})`), tr(`الاعتماد ${lc.no} بانحراف مسموح ${lc.dev}%`, `Credit ${lc.no} with ${lc.dev}% tolerance`));
    else if (sh.valueUsd > lc.usd) add('warn', 'finance', tr('القيمة أعلى من قيمة الاعتماد لكنها ضمن الانحراف المسموح', 'Value is above the credit amount but within the allowed tolerance'));
  }
  if (!sh.freight || !sh.insurance) add('warn', 'finance', tr('قيمة الشحن أو التأمين غير مدخلة', 'Freight or insurance value is missing'), tr('تظهر ضمن البيانات المالية في ACI', 'Shown in the ACI financial data'));
  if (!sh.items.length) add('err', 'items', tr('لا توجد أصناف مسجلة', 'No items entered'));
  sh.items.forEach((it, i) => {
    const n = tr(`الصنف ${i + 1}`, `Item ${i + 1}`);
    if (!it.desc) add('err', 'items', tr(`${n}: الوصف التجاري مفقود`, `${n}: commercial description is missing`));
    if (hsDigits(it.hs).length < 6) add('err', 'items', tr(`${n}: رمز HS يجب ألا يقل عن 6 أرقام`, `${n}: HS code needs at least 6 digits`));
    if (!it.origin) add('err', 'items', tr(`${n}: بلد المنشأ مفقود`, `${n}: country of origin is missing`));
    if (!(num(it.pkgs) > 0)) add('err', 'items', tr(`${n}: عدد الطرود مفقود`, `${n}: number of packages is missing`));
    if (!(num(it.gross) > 0) || !(num(it.net) > 0)) add('err', 'items', tr(`${n}: الوزن الإجمالي أو الصافي مفقود`, `${n}: gross or net weight is missing`));
    else if (num(it.net) > num(it.gross)) add('err', 'items', tr(`${n}: الوزن الصافي أكبر من الإجمالي`, `${n}: net weight is greater than gross`));
  });
  if (!sh.containers.length) add('err', 'containers', tr('لا توجد حاويات مسجلة', 'No containers entered'));
  sh.containers.forEach((c) => {
    const n = c.no || tr('حاوية', 'Container');
    if (!validContainer(c.no)) add('err', 'containers', tr(`رقم الحاوية «${c.no || '—'}» غير صحيح`, `Container number “${c.no || '—'}” is not valid`), tr('يُفحص رقم التحقق وفق معيار ISO 6346', 'The check digit is verified per ISO 6346'));
    if (!c.seal) add('err', 'containers', tr(`${n}: رقم الختم مفقود`, `${n}: seal number is missing`));
    if (!(num(c.gross) > num(c.tare))) add('err', 'containers', tr(`${n}: الوزن الإجمالي يجب أن يزيد عن الفارغ`, `${n}: gross weight must exceed tare`));
  });
  if (sh.items.length && sh.containers.length) {
    const cargo = sum(sh.containers.map((c) => num(c.gross) - num(c.tare)));
    const decl = sum(sh.items.map((i) => num(i.gross)));
    if (decl > 0) {
      const diff = Math.abs(cargo - decl) / decl;
      if (diff > 0.05) add('err', 'containers', tr(`وزن الحاويات (${nf(cargo)} كجم) لا يطابق أوزان الأصناف (${nf(decl)} كجم)`, `Container weight (${nf(cargo)} kg) does not match item weights (${nf(decl)} kg)`));
      else if (diff > 0.02) add('warn', 'containers', tr(`فرق ${(diff * 100).toFixed(1)}% بين وزن الحاويات وأوزان الأصناف`, `${(diff * 100).toFixed(1)}% difference between container and item weights`));
    }
    const pc = sum(sh.containers.map((c) => num(c.pkgs)));
    const pi = sum(sh.items.map((i) => num(i.pkgs)));
    if (pc !== pi) add('err', 'containers', tr(`عدد الطرود في الحاويات (${nf(pc)}) لا يساوي عددها في الأصناف (${nf(pi)})`, `Packages in containers (${nf(pc)}) differ from items (${nf(pi)})`));
  }
  ['origin', 'packing', 'booking'].forEach((t) => { if (!(sh.docs && sh.docs[t])) add('warn', 'docs', tr(`${docName(t)} غير مرفقة`, `${docName(t)} is not attached`), tr('يرفقها المصدّر في آخر مراحل ACI', 'The exporter attaches it in the last ACI stage')); });
  const r = aciRisk(sh);
  if (r) add(r.tone === 'info' ? 'warn' : 'err', 'timing', r.text, tr(`الموعد النهائي ${fmtDate(r.dead)}`, `Deadline ${fmtDate(r.dead)}`));
  return out;
}
function aciCompleteness(sh) {
  const errs = aciChecks(sh).filter((c) => c.lvl === 'err');
  const req = 3 + 1 + 10 + 1 + 3 + 2 + Math.max(1, sh.items.length) * 5 + Math.max(1, sh.containers.length) * 3 + 4;
  return clamp(Math.round((1 - errs.length / req) * 100), 0, 100);
}

/* Reads a portal e-mail / notification and maps it to an ACI status (rule based, no network) */
function parsePortalMessage(text) {
  const t = String(text || '').replace(/[ً-ٟـ]/g, '');
  const rules = [
    [/مفرج\s*عنه|\breleased\b/i, 'released'],
    [/مراجعة\s*بوليصة|بوليصة\s*الشحن\s*المعتمدة|bill of lading.*(review|under)/i, 'bl_review'],
    [/في\s*انتظار\s*بوليصة|awaiting.*(bill|b\/l)|waiting.*bill of lading/i, 'awaiting_bl'],
    [/مكتمل|\bcompleted\b/i, 'completed'],
    [/استفسار|\bquery\b|\binquiry\b/i, 'supplier_completion'],
    [/مراجعة\s*الجمارك|customs\s*review/i, 'customs_review'],
    [/استكمال|complete\s+the\s+remaining/i, 'supplier_completion'],
    [/(تحقق|مراجعة|موافقة).*(المستورد|التفاصيل)|importer.*(verify|review)|verify.*(details|data)/i, 'importer_review'],
  ];
  let status = null;
  for (const [re, s] of rules) { if (re.test(t)) { status = s; break; } }
  const m = /(?:ACI|رقم\s*ACI)\s*(?:number|no\.?|رقم)?\s*[:#：\-]?\s*((?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{5,})/i.exec(t);
  return { status, number: m ? m[1].toUpperCase() : null };
}

/* ---------- invoice vs inspection certificate ---------- */
const MATCH_FIELDS = [
  { k: 'supplier', n: T2('المورد', 'Supplier'), t: 'text' },
  { k: 'desc', n: T2('وصف السلعة', 'Goods description'), t: 'text' },
  { k: 'qty', n: T2('الكمية', 'Quantity'), t: 'num', tol: 0 },
  { k: 'gross', n: T2('الوزن كجم', 'Weight kg'), t: 'num', tol: 0.01 },
  { k: 'value', n: T2('القيمة USD', 'Value USD'), t: 'num', tol: 0.005 },
  { k: 'origin', n: T2('بلد المنشأ', 'Origin'), t: 'text' },
];
const NOISE = new Set(['co', 'ltd', 'llc', 'inc', 'corp', 'pvt', 'sa', 'as', 'srl', 'spa', 'sas', 'gmbh', 'company', 'limited', 'the', 'and', 'of', 'شركة']);
const normText = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s) => new Set(normText(s).split(' ').filter((w) => w && !NOISE.has(w)).map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)));
function textMatch(a, b) {
  const x = normText(a), y = normText(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return false;
  let inter = 0;
  A.forEach((w) => { if (B.has(w)) inter++; });
  return inter / Math.max(A.size, B.size) >= 0.6;
}
function matchDocs(inv, cert) {
  return MATCH_FIELDS.map((f) => {
    const a = inv[f.k], b = cert[f.k];
    let ok;
    if (f.t === 'num') {
      const x = num(a), y = num(b);
      ok = x > 0 && y > 0 && Math.abs(x - y) <= Math.max(x, y) * f.tol;
    } else ok = textMatch(a, b);
    return { ...f, name: L(f.n), ok, a, b };
  });
}

/* ---------- channel advisor (rules as reported; see FAQ) ---------- */
function adviseChannel({ trade, kind, usd }) {
  const r = { id: '', title: '', conf: 'mid', why: [], steps: [], warn: [] };
  const common = [tr('ملف FCMS مفعّل والمفوّضون موثّقون', 'FCMS profile active and authorized users verified'), tr('تسجيل الشركة في ACI ورقم PTS', 'Business registered in ACI, with a PTS number'), tr('اطلب من المورد التسجيل في PTS (إلزامي تدريجيًا من 2027)', 'Ask your supplier to register in PTS (mandatory in stages from 2027)')];
  if (!trade) {
    r.id = 'not-trade'; r.title = tr('قد تقع خارج نطاق القرار 449', 'May fall outside Decision 449'); r.conf = 'lo';
    r.why.push(tr('القرار يعرّف الاستيراد بأنه إدخال البضائع بغرض التجارة وإعادة البيع.', 'The decision defines importing as bringing goods in for trade and resale.'));
    r.warn.push(tr('وضع المواد الخام الصناعية والاستخدام الخاص غير مفصّل في المصدر. اسأل مصرفك والجمارك قبل الشحن.', 'The position of industrial raw materials and private use is not detailed in the source. Ask your bank and Customs before shipping.'));
    r.steps = [tr('استمر في توثيق قيمة الشحنة وتسجيل ACI', 'Keep documenting the shipment value and registering ACI'), tr('اسأل مصرفك عن القناة المطلوبة لتحويل قيمة الشحنة', 'Ask your bank which channel is required to pay for the shipment')];
    return r;
  }
  if (kind === 'sole') {
    if (usd <= 100000) {
      r.id = 'sole'; r.title = tr('مسار النشاط الفردي', 'Sole-trader route'); r.conf = 'lo';
      r.why.push(tr('القرار يستثني الأنشطة الفردية جزئيًا ضمن سقف سنوي مع رخصة نشاط سارية.', 'The decision partly exempts sole traders within an annual limit, with a valid business license.'));
      r.why.push(tr('ذكرت تقارير أن السقف 100 ألف دولار حتى نهاية 2026. المصدر الأساسي لا يذكر الرقم.', 'Reports said the limit is USD 100,000 until the end of 2026. The main source does not state the figure.'));
      r.steps = [tr('رخصة نشاط فردي سارية', 'A valid sole-trader license'), tr('السداد عبر القناة المصرفية (التحويل المباشر عبر FCMS أو مصرفك)', 'Pay through a banking channel (direct transfer via FCMS, or your bank)'), tr('توثيق قيمة الشحنة الفعلية للجمارك', 'Document the actual shipment value for Customs'), tr('تسجيل ACI قبل التحميل بـ 48 ساعة', 'Register ACI 48 hours before loading')];
      r.warn.push(tr('السقف سنوي وتراكمي: احسب كل شحناتك خلال السنة.', 'The limit is annual and cumulative: count all your shipments in the year.'));
    } else {
      r.id = 'lc'; r.title = tr('اعتماد مستندي (القيمة تتجاوز سقف النشاط الفردي المعلن)', 'Documentary credit (value exceeds the reported sole-trader limit)'); r.conf = 'lo';
      r.why.push(tr('قيمة الشحنة أعلى من 100 ألف دولار، وهو السقف الذي ذكرته التقارير للنشاط الفردي.', 'The shipment is above USD 100,000, the limit reports gave for sole traders.'));
      r.steps = [tr('رخصة تجارية تتيح الاعتماد، حسب مصرفك', 'A trading license that allows credits, as your bank requires'), ...common];
      r.warn.push(tr('تحقق من وضعك القانوني مع مصرفك قبل المتابعة.', 'Check your legal status with your bank before going on.'));
    }
    return r;
  }
  if (usd <= 100000) {
    r.id = 'direct'; r.title = tr('تحويل مباشر عبر FCMS', 'Direct transfer through FCMS'); r.conf = 'mid';
    r.why.push(tr('أتاح المركزي في مايو 2026 تحويلات مباشرة حتى 100 ألف دولار (المنشور 14/2026) بنفس مسار الحجز في FCMS.', 'In May 2026 the Central Bank opened direct transfers up to USD 100,000 (Circular 14/2026) using the same FCMS booking flow.'));
    r.why.push(tr('بديل: اعتماد مستندي إن طلب المورد ضمانًا أقوى.', 'Alternative: a documentary credit if the supplier wants stronger assurance.'));
    r.steps = [tr('ارفع مستندات الشحنة في قسم Direct Transfers بـ FCMS', 'Upload the shipment documents in the Direct Transfers section of FCMS'), tr('سدّد عبر القناة المصرفية فقط', 'Pay through the banking channel only'), ...common.slice(1), tr('قدّم رقم ACI قبل التحميل بـ 48 ساعة', 'Have the ACI number 48 hours before loading')];
    r.warn.push(tr('الحد 100 ألف دولار للتحويل وفق تقارير. اسأل مصرفك عن التراكم والسقوف الحالية.', 'The USD 100,000 limit comes from reports. Ask your bank about accumulation and current limits.'));
    return r;
  }
  r.id = usd > 5000000 ? 'lc-split' : 'lc';
  r.title = usd > 5000000 ? tr('اعتماد مستندي (قد تحتاج تقسيمه)', 'Documentary credit (you may need to split it)') : tr('اعتماد مستندي عبر مصرفك', 'Documentary credit through your bank');
  r.conf = 'mid';
  r.why.push(tr('القيمة أعلى من حد التحويل المباشر. الاعتماد هو المسار المعتاد مع تغطية المركزي بالنقد الأجنبي.', 'The value is above the direct-transfer limit. A credit is the usual route, with the Central Bank covering the foreign currency.'));
  if (usd > 5000000) r.warn.push(tr('الاعتماد الواحد التجاري حتى 5 ملايين$ في ضوابط 2020 (تعليق آخر يذكر 3 ملايين). وزّع القيمة أو راجع مصرفك.', 'A single commercial credit is up to USD 5M in the 2020 controls (another commentary says 3M). Split the value or ask your bank.'));
  r.steps = [...common, tr('افتح الاعتماد: فاتورة أولية، تأمين من شركة محلية، شهادة تفتيش، شهادتا ضرائب وضمان', 'Open the credit: initial invoice, local insurance, inspection certificate, tax and social security certificates'), tr('انتظر تغطية المركزي ثم ابدأ ACI مع المورد', 'Wait for the Central Bank cover, then start ACI with the supplier')];
  r.warn.push(tr('تغطية الاعتماد في ضوابط 2020 كاملة من الرصيد المتاح. بعض المصارف تطبق نسبًا مختلفة.', 'The 2020 controls require the credit to be fully covered by the available balance. Some banks apply different percentages.'));
  return r;
}
