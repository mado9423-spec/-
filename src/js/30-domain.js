/* ---------- state ---------- */
let S = null;
const STORE_KEY = 'sanad.v1';
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { const o = JSON.parse(raw); if (o && o.v === DATA_VERSION) return o; }
  } catch (e) { /* storage unavailable */ }
  return null;
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
}
function resetState() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } S = seed(); saveState(); }
function logActivity(ic, txt, ref) { S.activity.unshift({ at: iso(TODAY), ic, txt, ref: ref || '' }); S.activity.length = Math.min(S.activity.length, 40); }

const lcOf = (sh) => S.lcs.find((l) => l.no === sh.lcNo) || null;
const shipOf = (id) => S.ships.find((s) => s.id === id) || null;
const lcByNo = (no) => S.lcs.find((l) => l.no === no) || null;
const sum = (a) => a.reduce((x, y) => x + (Number(y) || 0), 0);

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
  if (l.status === 'closed') return ['مقفل', 'idle'];
  if (l.status === 'draft') return ['مسودة', 'idle'];
  if (l.status === 'submitted') return ['لدى المصرف', 'info'];
  if (l.status === 'awaiting_cover') return ['بانتظار تغطية المركزي', 'warn'];
  if (c.out > 0) return ['تغطية نقدية مستحقة', 'bad'];
  if (c.left < 0) return ['منتهي', 'bad'];
  if (c.left <= 7) return ['ينتهي قريبًا', 'warn'];
  return ['صادر', 'ok'];
}
const ceilingFromTax = (income, payroll) => 30 * num(income) + 10 * num(payroll);

/* ---------- shipment journey engine ---------- */
const GATE_META = [
  { id: 'fund', ar: 'التمويل المصرفي', sub: 'القناة والاعتماد وتغطية المركزي', ic: 'bank' },
  { id: 'docs', ar: 'المستندات المسبقة', sub: 'فاتورة وتفتيش وتأمين ومنشأ', ic: 'file' },
  { id: 'aci', ar: 'ACI قبل الشحن', sub: 'التسجيل المسبق للشحنة لدى الجمارك', ic: 'shield' },
  { id: 'ship', ar: 'الشحن والوصول', sub: 'السفينة والمانيفست ووصول الحاويات', ic: 'ship' },
  { id: 'cus', ar: 'التخليص والإفراج', sub: 'الإقرار الجمركي وإثبات القيمة', ic: 'stamp' },
  { id: 'set', ar: 'التسوية', sub: 'مطابقة المستندات وإقفال الاعتماد', ic: 'check' },
];

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

  T.fund = [
    { id: 'fund.channel', ar: 'تحديد القناة المصرفية', hint: isLC ? 'اعتماد مستندي عبر مصرفك التجاري' : sh.channel === 'SOLE' ? 'نشاط فردي ضمن السقف السنوي' : 'تحويل مباشر عبر FCMS', kind: 'auto', done: !!sh.channel },
  ];
  if (isLC) {
    T.fund.push(
      { id: 'fund.bank', ar: 'فتح الاعتماد لدى المصرف التجاري', hint: lc ? `الاعتماد ${lc.no} · ${bankOf(lc.bank).n}` : 'لم يُربط اعتماد بهذه الرحلة بعد', kind: 'lc', done: !!lc && lcIndex(lc.status) >= 1, mine: !lc },
      { id: 'fund.cover', ar: 'تغطية المركزي بالنقد الأجنبي', hint: 'يطلبها المصرف من المركزي عبر FCMS', kind: 'auto', sys: 'fcms', done: !!lc && lcIndex(lc.status) >= 3 },
    );
  } else {
    T.fund.push({ id: 'fund.transfer', ar: sh.channel === 'SOLE' ? 'توثيق التحويل وقيمة الشحنة' : 'طلب التحويل المباشر في FCMS', hint: sh.channel === 'SOLE' ? 'السداد عبر القناة المصرفية وتوثيق القيمة' : 'قسم Direct Transfers · حتى 100 ألف$ (المنشور 14/2026)', kind: 'manual', sys: 'fcms', done: man('fund.transfer'), mine: true });
  }

  const docTypes = PRE_DOCS.concat(cat.conf ? ['conformity'] : []);
  T.docs = docTypes.map((t) => ({
    id: 'docs.' + t, ar: DOC_TYPES[t].ar,
    hint: t === 'conformity' ? `مطلوبة لفئة «${cat.ar}» (ARN 2020/68)` : DOC_TYPES[t].hint,
    kind: 'doc', docType: t, done: has(t), mine: true,
  }));

  T.aci = [
    { id: 'aci.1', ar: 'المورد يسجّل البيانات الأولية والفاتورة', hint: a.note && ai <= 0 ? `أُعيدت للمورد: ${a.note}` : 'الرقم الضريبي، الرمز الإحصائي لك، بلد التصدير، الفاتورة', kind: 'aci', done: ai >= 1, sys: 'aci' },
    { id: 'aci.2', ar: 'مراجعتك وموافقتك على بيانات المورد', hint: 'يصلك بريد من ACI. وافق أو ارفض مع رسالة.', kind: 'aci', done: ai >= 2, mine: a.status === 'importer_review', sys: 'aci' },
    { id: 'aci.3', ar: 'المورد يستكمل النقل والأصناف والحاويات', hint: a.note && ai === 2 ? `استفسار الجمارك: ${a.note}` : 'IMO، الحجز، رمز HS، أرقام الحاويات والأختام', kind: 'aci', done: ai >= 3 },
    { id: 'aci.4', ar: 'مراجعة الجمارك وإصدار رقم ACI', hint: 'موافقة أو رفض أو استفسار', kind: 'aci', done: ai >= 4 },
    { id: 'aci.5', ar: 'رقم ACI في بوليصة الشحن ومراجعتها', hint: a.number ? `رقم ACI: ${a.number}` : 'يسلّم المورد الرقم للناقل قبل إصدار البوليصة النهائية', kind: 'aci', done: ai >= 6 },
  ];

  T.ship = [
    { id: 'ship.booking', ar: 'حجز الشحن وبيانات السفينة', hint: sh.vessel ? `${sh.vessel} · IMO ${sh.imo || '—'}` : 'تُدخل مع بيانات ACI (النقل)', kind: 'aci', done: !!(sh.booking && sh.vessel) },
    { id: 'ship.notice', ar: 'إشعار وصول السفينة والمانيفست', hint: 'يقدمه الوكيل الملاحي عبر E-Logistic (طرابلس والخمس)', kind: 'manual', sys: 'elogistic', done: !!sh.noticeFiled },
    { id: 'ship.arrive', ar: 'وصول الشحنة إلى الميناء', hint: sh.arrived ? `وصلت في ${fmtDate(D(sh.arrived))}` : sh.eta ? `المتوقع ${fmtDay(D(sh.eta))} · ${inDays(daysBetween(TODAY, D(sh.eta)))}` : '', kind: 'auto', done: !!sh.arrived },
  ];

  T.cus = [
    { id: 'cus.decl', ar: 'الإقرار الجمركي', hint: 'يقدمه المخلّص الجمركي (E-Custom)', kind: 'doc', docType: 'declaration', sys: 'ecustom', done: has('declaration'), mine: true },
    { id: 'cus.value', ar: 'إثبات القيمة الفعلية للشحنة', hint: 'شرط في القرار 449 قبل التخليص: الفاتورة النهائية وإثبات التحويل أو الاعتماد', kind: 'doc', docType: 'valueProof', done: has('valueProof'), mine: true, key: true },
  ];
  if (cat.conf) T.cus.push({ id: 'cus.conf', ar: 'الرقابة الفنية والمطابقة', hint: `فئة «${cat.ar}» قد تخضع لفحص المطابقة عند الوصول`, kind: 'manual', done: man('cus.conf'), mine: true });
  T.cus.push({ id: 'cus.release', ar: 'الإفراج الجمركي', hint: 'تضع الجمارك علامة «مفرج عنه» في ACI', kind: 'manual', done: rel });

  T.set = [
    { id: 'set.match', ar: 'مطابقة المستندات وتسديد المصرف', hint: 'يطابق المصرف الفاتورة مع شهادة التفتيش', kind: 'manual', done: man('set.match'), mine: true },
    { id: 'set.close', ar: isLC ? 'إقفال الاعتماد' : 'إقفال الملف', hint: isLC && lc ? `الاعتماد ${lc.no}` : '', kind: isLC ? 'auto' : 'manual', done: isLC ? !!lc && lc.status === 'closed' : man('set.close') },
  ];

  let active = -1;
  const gates = GATE_META.map((m, i) => {
    const tasks = T[m.id];
    const done = tasks.every((t) => t.done);
    if (!done && active < 0) active = i;
    return { ...m, i, tasks, done, ndone: tasks.filter((t) => t.done).length };
  });
  gates.forEach((g) => { g.state = g.done ? 'done' : g.i === active ? 'active' : 'todo'; });

  const cus = gates[4];
  if (sh.arrived && !has('valueProof') && !rel) {
    cus.blocked = true;
    cus.blockMsg = 'وصلت الشحنة ولن تُفرج الجمارك قبل تقديم ما يثبت قيمتها الفعلية (القرار 449).';
    if (cus.state !== 'done') cus.state = 'active';
    gates.forEach((g) => { if (g.i < 4 && !g.done) g.state = 'active'; });
  }
  const dl = aciRisk(sh);
  if (dl && dl.tone === 'bad') { gates[2].risk = dl; }
  else if (dl) gates[2].risk = dl;
  return gates;
}

function shipSummary(sh) {
  const gates = buildGates(sh);
  const rel = !!(sh.customs && sh.customs.released);
  const allDone = gates.every((g) => g.done);
  const cur = gates.find((g) => g.state === 'active') || gates[gates.length - 1];
  const blocked = gates.some((g) => g.blocked);
  let next = cur.tasks.find((t) => !t.done) || null;
  if (sh.aci.status === 'importer_review') next = gates[2].tasks[1];
  const tasks = gates.flatMap((g) => g.tasks);
  const pct = Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
  let label, tone;
  if (allDone) { label = 'مكتملة'; tone = 'idle'; }
  else if (rel) { label = 'تمت التسوية'; tone = 'ok'; }
  else if (blocked) { label = 'متوقفة عن الإفراج'; tone = 'bad'; }
  else if (sh.aci.status === 'importer_review') { label = 'بانتظارك'; tone = 'gold'; }
  else { label = cur.ar; tone = 'info'; }
  return { gates, cur, next, blocked, pct, label, tone, allDone, mine: sh.aci.status === 'importer_review' || (next && next.mine) };
}

/* ACI must be validated >= 48h before loading (carrier advisory) */
function aciRisk(sh) {
  if (aciIndex(sh.aci.status) >= aciIndex('awaiting_bl')) return null;
  if (!sh.etd) return null;
  const dead = addDays(D(sh.etd), -2);
  const left = daysBetween(TODAY, dead);
  if (daysBetween(TODAY, D(sh.etd)) < 0) return { left, dead, tone: 'bad', text: 'تجاوزت موعد التحميل دون رقم ACI' };
  return { left, dead, tone: left <= 2 ? 'bad' : left <= 7 ? 'warn' : 'info', text: left < 0 ? 'فات موعد اعتماد ACI (48 ساعة قبل التحميل)' : `آخر موعد لاعتماد رقم ACI ${inDays(left)}` };
}

/* ---------- company readiness + alerts ---------- */
function readiness() {
  const total = S.profile.length;
  const done = S.profile.filter((p) => p.done).length;
  return { total, done, pct: Math.round((done / total) * 100) };
}
function docStatus(d) {
  if (!d.exp) return { tone: 'ok', text: 'ساري', days: null };
  const left = daysBetween(TODAY, D(d.exp));
  if (left < 0) return { tone: 'bad', text: `منتهٍ ${inDays(left)}`, days: left };
  if (left <= 30) return { tone: 'warn', text: `ينتهي ${inDays(left)}`, days: left };
  return { tone: 'ok', text: `ساري · ${fmtDate(D(d.exp))}`, days: left };
}
function nextRegDate() {
  return REG_DATES.map((r) => ({ ...r, left: daysBetween(TODAY, D(r.date)) })).find((r) => r.left >= 0) || null;
}
const TONE_RANK = { bad: 0, warn: 1, gold: 2, info: 3, ok: 4 };
function buildAlerts() {
  const out = [];
  S.ships.forEach((sh) => {
    const sm = shipSummary(sh);
    if (sh.aci.status === 'importer_review') out.push({ tone: 'gold', ic: 'mail', title: `بانتظار موافقتك · ${sh.id}`, sub: `المورد أدخل بيانات ACI لشحنة «${sh.title}». راجعها ووافق أو ارفض.`, act: { type: 'ship', id: sh.id, open: 'aci-approve' } });
    if (sm.blocked) out.push({ tone: 'bad', ic: 'alert', title: `${sh.id} متوقفة عند الإفراج`, sub: 'لا إفراج قبل مستندات إثبات القيمة الفعلية.', act: { type: 'ship', id: sh.id, open: 'gate-cus' } });
    const r = aciRisk(sh);
    if (r && r.tone !== 'info' && sh.aci.status !== 'importer_review') out.push({ tone: r.tone, ic: 'clock', title: `${sh.id}: ${r.text}`, sub: `حالة ACI الآن: ${aciLabel(sh.aci.status)}`, act: { type: 'ship', id: sh.id, open: 'gate-aci' } });
    else if (r && r.tone !== 'info') out.push({ tone: r.tone, ic: 'clock', title: `موعد ACI: ${r.text}`, sub: `${sh.id} · المغادرة ${fmtDay(D(sh.etd))}`, act: { type: 'ship', id: sh.id, open: 'gate-aci' } });
  });
  S.profile.filter((p) => !p.done).slice(0, 2).forEach((p) => out.push({ tone: 'warn', ic: 'shield', title: `أكمل: ${p.label}`, sub: p.note ? `${p.note}. ${p.why}` : p.why, act: { type: 'profile', id: p.id } }));
  S.companyDocs.forEach((d) => {
    const st = docStatus(d);
    if (st.tone === 'bad') out.push({ tone: 'bad', ic: 'file', title: `${d.ar} ${st.text}`, sub: 'مطلوبة عند فتح الاعتماد. حدّثها قبل الطلب القادم.', act: { type: 'tab', tab: 'docs' } });
    else if (st.tone === 'warn') out.push({ tone: 'warn', ic: 'file', title: `${d.ar} ${st.text}`, sub: 'جدّدها مبكرًا لتفادي تعطيل الاعتماد.', act: { type: 'tab', tab: 'docs' } });
  });
  S.lcs.filter((l) => l.status !== 'closed').forEach((l) => {
    const c = calcLC(l);
    if (l.status === 'issued' && c.out > 0) out.push({ tone: 'warn', ic: 'bank', title: `تغطية نقدية مستحقة · ${l.no}`, sub: `${nf(c.out)} د.ل لدى ${bankOf(l.bank).n}`, act: { type: 'lc', no: l.no } });
    if (l.status === 'issued' && c.left >= 0 && c.left <= 7) out.push({ tone: 'warn', ic: 'clock', title: `الاعتماد ${l.no} ينتهي ${inDays(c.left)}`, sub: 'تأكد من تقديم المستندات قبل الانتهاء.', act: { type: 'lc', no: l.no } });
  });
  const nr = nextRegDate();
  if (nr && nr.left <= 120) out.push({ tone: nr.tone === 'bad' ? 'warn' : 'info', ic: 'cal', title: `${nr.title}`, sub: `${fmtDate(D(nr.date))} · ${inDays(nr.left)} · ${nr.src}`, act: { type: 'tab', tab: 'hub' } });
  out.sort((x, y) => TONE_RANK[x.tone] - TONE_RANK[y.tone]);
  return out;
}

/* ---------- ACI pre-flight ---------- */
const hsDigits = (v) => String(v || '').replace(/\D/g, '');
function aciChecks(sh) {
  const out = [];
  const add = (lvl, sec, text, sub) => out.push({ lvl, sec, text, sub: sub || '' });
  const a = sh.aci;
  const lc = lcOf(sh);
  if (!a.exporterTin) add('err', 'parties', 'الرقم الضريبي للمصدّر مفقود');
  if (!a.importerStat) add('err', 'parties', 'الرمز الإحصائي للمستورد مفقود');
  if (!a.exportCountry) add('err', 'parties', 'بلد التصدير غير محدد');
  if (!(sh.docs && sh.docs.invoice)) add('err', 'docs', 'الفاتورة التجارية غير مرفقة', 'تُرفع في القسم الأول من ACI');
  [['booking', 'رقم الحجز'], ['vessel', 'اسم السفينة'], ['voyage', 'رقم الرحلة'], ['carrier', 'شركة الشحن'], ['agent', 'الوكيل الملاحي'], ['pol', 'ميناء التحميل'], ['pod', 'ميناء التفريغ'], ['dest', 'الوجهة النهائية'], ['etd', 'تاريخ المغادرة التقديري'], ['eta', 'تاريخ الوصول التقديري']]
    .forEach(([k, ar]) => { if (!sh[k]) add('err', 'transport', `${ar} غير مدخل`); });
  if (sh.imo && !/^\d{7}$/.test(String(sh.imo))) add('err', 'transport', 'رقم IMO يجب أن يتكون من 7 أرقام');
  else if (!sh.imo) add('err', 'transport', 'رقم IMO غير مدخل');
  if (sh.etd && sh.eta && D(sh.eta) <= D(sh.etd)) add('err', 'transport', 'تاريخ الوصول يسبق تاريخ المغادرة');
  if (!sh.incoterm) add('err', 'finance', 'شروط التسليم (Incoterms) غير محددة');
  if (sh.channel === 'LC' && !sh.lcNo) add('err', 'finance', 'الرقم المرجعي لخطاب الاعتماد مفقود');
  if (!sh.valueUsd) add('err', 'finance', 'قيمة المنتج غير مدخلة');
  if (lc && sh.valueUsd) {
    const c = calcLC(lc);
    if (sh.valueUsd > c.max) add('err', 'finance', `قيمة الشحنة ($${nf(sh.valueUsd)}) تتجاوز الحد المسموح للاعتماد ($${nf(c.max)})`, `الاعتماد ${lc.no} بانحراف مسموح ${lc.dev}%`);
    else if (sh.valueUsd > lc.usd) add('warn', 'finance', 'القيمة أعلى من قيمة الاعتماد لكنها ضمن الانحراف المسموح');
  }
  if (!sh.freight || !sh.insurance) add('warn', 'finance', 'قيمة الشحن أو التأمين غير مدخلة', 'تظهر ضمن البيانات المالية في ACI');
  if (!sh.items.length) add('err', 'items', 'لا توجد أصناف مسجلة');
  sh.items.forEach((it, i) => {
    const n = `الصنف ${i + 1}`;
    if (!it.desc) add('err', 'items', `${n}: الوصف التجاري مفقود`);
    if (hsDigits(it.hs).length < 6) add('err', 'items', `${n}: رمز HS يجب ألا يقل عن 6 أرقام`);
    if (!it.origin) add('err', 'items', `${n}: بلد المنشأ مفقود`);
    if (!(num(it.pkgs) > 0)) add('err', 'items', `${n}: عدد الطرود مفقود`);
    if (!(num(it.gross) > 0) || !(num(it.net) > 0)) add('err', 'items', `${n}: الوزن الإجمالي أو الصافي مفقود`);
    else if (num(it.net) > num(it.gross)) add('err', 'items', `${n}: الوزن الصافي أكبر من الإجمالي`);
  });
  if (!sh.containers.length) add('err', 'containers', 'لا توجد حاويات مسجلة');
  sh.containers.forEach((c) => {
    const n = c.no || 'حاوية';
    if (!validContainer(c.no)) add('err', 'containers', `رقم الحاوية «${c.no || '—'}» غير صحيح`, 'يُفحص رقم التحقق وفق معيار ISO 6346');
    if (!c.seal) add('err', 'containers', `${n}: رقم الختم مفقود`);
    if (!(num(c.gross) > num(c.tare))) add('err', 'containers', `${n}: الوزن الإجمالي يجب أن يزيد عن الفارغ`);
  });
  if (sh.items.length && sh.containers.length) {
    const cargo = sum(sh.containers.map((c) => num(c.gross) - num(c.tare)));
    const decl = sum(sh.items.map((i) => num(i.gross)));
    if (decl > 0) {
      const diff = Math.abs(cargo - decl) / decl;
      if (diff > 0.05) add('err', 'containers', `وزن الحاويات (${nf(cargo)} كجم) لا يطابق أوزان الأصناف (${nf(decl)} كجم)`);
      else if (diff > 0.02) add('warn', 'containers', `فرق ${(diff * 100).toFixed(1)}% بين وزن الحاويات وأوزان الأصناف`);
    }
    const pc = sum(sh.containers.map((c) => num(c.pkgs)));
    const pi = sum(sh.items.map((i) => num(i.pkgs)));
    if (pc !== pi) add('err', 'containers', `عدد الطرود في الحاويات (${nf(pc)}) لا يساوي عددها في الأصناف (${nf(pi)})`);
  }
  ['origin', 'packing', 'booking'].forEach((t) => { if (!(sh.docs && sh.docs[t])) add('warn', 'docs', `${DOC_TYPES[t].ar} غير مرفقة`, 'يرفقها المصدّر في آخر مراحل ACI'); });
  const r = aciRisk(sh);
  if (r) add(r.tone === 'info' ? 'warn' : 'err', 'timing', r.text, `الموعد النهائي ${fmtDate(r.dead)}`);
  return out;
}
function aciCompleteness(sh) {
  const checks = aciChecks(sh).filter((c) => c.lvl === 'err');
  const req = 3 + 1 + 10 + 1 + 3 + 2 + Math.max(1, sh.items.length) * 5 + Math.max(1, sh.containers.length) * 3 + 4;
  return clamp(Math.round((1 - checks.length / req) * 100), 0, 100);
}

/* Reads a portal e-mail / notification and maps it to an ACI status (rule based, no network) */
function parsePortalMessage(text) {
  const t = String(text || '').replace(/[ً-ٟـ]/g, '');
  const rules = [
    [/مفرج\s*عنه|\breleased\b/i, 'released'],
    [/مراجعة\s*بوليصة|بوليصة\s*الشحن\s*المعتمدة|bill of lading.*review/i, 'bl_review'],
    [/في\s*انتظار\s*بوليصة|awaiting.*(bill|b\/l)/i, 'awaiting_bl'],
    [/مكتمل|\bcompleted\b/i, 'completed'],
    [/استفسار|\bquery\b/i, 'supplier_completion'],
    [/مراجعة\s*الجمارك|customs\s*review/i, 'customs_review'],
    [/استكمال|complete\s+the\s+remaining/i, 'supplier_completion'],
    [/(تحقق|مراجعة|موافقة).*(المستورد|التفاصيل)|importer.*(verify|review)/i, 'importer_review'],
  ];
  let status = null;
  for (const [re, s] of rules) { if (re.test(t)) { status = s; break; } }
  const m = /(?:ACI|رقم\s*ACI)\s*(?:number|no\.?|رقم)?\s*[:#：\-]?\s*((?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{5,})/i.exec(t);
  return { status, number: m ? m[1].toUpperCase() : null };
}

/* ---------- invoice vs inspection certificate ---------- */
const MATCH_FIELDS = [
  { k: 'supplier', ar: 'المورد', t: 'text' },
  { k: 'desc', ar: 'وصف السلعة', t: 'text' },
  { k: 'qty', ar: 'الكمية', t: 'num', tol: 0 },
  { k: 'gross', ar: 'الوزن كجم', t: 'num', tol: 0.01 },
  { k: 'value', ar: 'القيمة USD', t: 'num', tol: 0.005 },
  { k: 'origin', ar: 'بلد المنشأ', t: 'text' },
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
    return { ...f, ok, a, b };
  });
}

/* ---------- channel advisor (rules as reported; see FAQ) ---------- */
function adviseChannel({ trade, kind, usd }) {
  const r = { id: '', title: '', conf: 'mid', why: [], steps: [], warn: [] };
  const common = ['ملف FCMS مفعّل والمفوّضون موثّقون', 'تسجيل الشركة في ACI ورقم PTS', 'اطلب من المورد التسجيل في PTS (إلزامي تدريجيًا من 2027)'];
  if (!trade) {
    r.id = 'not-trade'; r.title = 'قد تقع خارج نطاق القرار 449'; r.conf = 'lo';
    r.why.push('القرار يعرّف الاستيراد بأنه إدخال البضائع بغرض التجارة وإعادة البيع.');
    r.warn.push('وضع المواد الخام الصناعية والاستخدام الخاص غير مفصّل في المصدر. اسأل مصرفك والجمارك قبل الشحن.');
    r.steps = ['استمر في توثيق قيمة الشحنة وتسجيل ACI', 'اسأل مصرفك عن القناة المطلوبة لتحويل قيمة الشحنة'];
    return r;
  }
  if (kind === 'sole') {
    if (usd <= 100000) {
      r.id = 'sole'; r.title = 'مسار النشاط الفردي'; r.conf = 'lo';
      r.why.push('القرار يستثني الأنشطة الفردية جزئيًا ضمن سقف سنوي مع رخصة نشاط سارية.');
      r.why.push('ذكرت تقارير أن السقف 100 ألف دولار حتى نهاية 2026. المصدر الأساسي لا يذكر الرقم.');
      r.steps = ['رخصة نشاط فردي سارية', 'السداد عبر القناة المصرفية (التحويل المباشر عبر FCMS أو مصرفك)', 'توثيق قيمة الشحنة الفعلية للجمارك', 'تسجيل ACI قبل التحميل بـ 48 ساعة'];
      r.warn.push('السقف سنوي وتراكمي: احسب كل شحناتك خلال السنة.');
    } else {
      r.id = 'lc'; r.title = 'اعتماد مستندي (القيمة تتجاوز سقف النشاط الفردي المعلن)'; r.conf = 'lo';
      r.why.push('قيمة الشحنة أعلى من 100 ألف دولار، وهو السقف الذي ذكرته التقارير للنشاط الفردي.');
      r.steps = ['فتح شركة أو ترخيص تجاري يتيح الاعتماد، حسب مصرفك', ...common];
      r.warn.push('تحقق من وضعك القانوني مع مصرفك قبل المتابعة.');
    }
    return r;
  }
  if (usd <= 100000) {
    r.id = 'direct'; r.title = 'تحويل مباشر عبر FCMS'; r.conf = 'mid';
    r.why.push('أتاح المركزي في مايو 2026 تحويلات مباشرة حتى 100 ألف دولار (المنشور 14/2026) بنفس مسار الحجز في FCMS.');
    r.why.push('بديل: اعتماد مستندي إن طلب المورد ضمانًا أقوى.');
    r.steps = ['ارفع مستندات الشحنة في قسم Direct Transfers بـ FCMS', 'سدّد عبر القناة المصرفية فقط', ...common.slice(1), 'قدّم رقم ACI قبل التحميل بـ 48 ساعة'];
    r.warn.push('الحد 100 ألف دولار للتحويل وفق تقارير. اسأل مصرفك عن التراكم والسقوف الحالية.');
    return r;
  }
  r.id = usd > 5000000 ? 'lc-split' : 'lc';
  r.title = usd > 5000000 ? 'اعتماد مستندي (قد تحتاج تقسيمه)' : 'اعتماد مستندي عبر مصرفك';
  r.conf = 'mid';
  r.why.push('القيمة أعلى من حد التحويل المباشر. الاعتماد هو المسار المعتاد مع تغطية المركزي بالنقد الأجنبي.');
  if (usd > 5000000) r.warn.push('الاعتماد الواحد التجاري حتى 5 ملايين$ في ضوابط 2020 (تعليق آخر يذكر 3 ملايين). وزّع القيمة أو راجع مصرفك.');
  r.steps = [...common, 'افتح الاعتماد: فاتورة أولية، تأمين من شركة محلية، شهادة تفتيش، شهادتا ضرائب وضمان', 'انتظر تغطية المركزي ثم ابدأ ACI مع المورد'];
  r.warn.push('تغطية الاعتماد في ضوابط 2020 كاملة من الرصيد المتاح. بعض المصارف تطبق نسبًا مختلفة.');
  return r;
}
