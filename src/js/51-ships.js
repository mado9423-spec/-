/* ---------- shipments list ---------- */
const SHIP_FILTERS = [['all', 'الكل'], ['live', 'نشطة'], ['mine', 'بانتظارك'], ['done', 'منتهية']];
function fillShipList(box) {
  const q = UI.shipQuery.trim().toLowerCase();
  const rows = S.ships.filter((s) => {
    const sm = shipSummary(s);
    if (UI.shipFilter === 'live' && sm.allDone) return false;
    if (UI.shipFilter === 'mine' && !(sm.mine && !sm.allDone)) return false;
    if (UI.shipFilter === 'done' && !sm.allDone) return false;
    if (q && !`${s.id} ${s.title} ${s.supplier.name} ${s.lcNo}`.toLowerCase().includes(q)) return false;
    return true;
  });
  clear(box);
  if (!rows.length) { box.append(h('div', { class: 'card empty' }, 'لا توجد رحلات مطابقة.')); return; }
  rows.forEach((s, i) => { const c = shipCard(s, true); c.classList.add('rise'); c.style.setProperty('--i', i); box.append(c); });
}
SCREENS.ships = (root) => {
  const list = h('div', { class: 'stack' });
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'تصفية الرحلات' }, SHIP_FILTERS.map(([id, ar]) => h('button', {
    type: 'button', class: UI.shipFilter === id ? 'on' : '',
    onclick: (e) => { UI.shipFilter = id; $$('button', seg).forEach((b) => b.classList.toggle('on', b === e.currentTarget)); fillShipList(list); },
  }, ar)));
  const search = h('div', { class: 'search' },
    h('input', { id: 'ship-q', type: 'search', placeholder: 'ابحث برقم الرحلة أو السلعة أو المورد', 'aria-label': 'بحث في الرحلات', value: UI.shipQuery, oninput: (e) => { UI.shipQuery = e.target.value; fillShipList(list); } }),
    icon('search'));
  root.append(
    h('div', { class: 'title-row' }, h('h1', null, 'رحلات الاستيراد'), h('button', { class: 'ibtn', type: 'button', 'aria-label': 'رحلة جديدة', onclick: () => openNewShip() }, icon('plus'))),
    h('div', { class: 'stack' }, seg, search, list));
  fillShipList(list);
};

/* ---------- new shipment ---------- */
function nextShipId() {
  const ym = String(TODAY.getFullYear()).slice(2) + pad2(TODAY.getMonth() + 1);
  const n = S.ships.filter((s) => s.id.startsWith('SH-' + ym)).length + 1;
  return `SH-${ym}-${String(n).padStart(3, '0')}`;
}
function openNewShip(pre = {}) {
  const f = { title: '', cat: 'food', supplier: '', country: 'TR', usd: '', channel: 'LC', lcNo: '', etd: iso(addDays(TODAY, 30)), pod: 'طرابلس', ...pre };
  const free = S.lcs.filter((l) => l.status !== 'closed' && !S.ships.some((s) => s.lcNo === l.no));
  openSheet({
    title: 'رحلة استيراد جديدة',
    build: (body, ctrl) => {
      const fld = (id, label, input, hint) => h('div', { class: 'field' }, h('label', { for: id }, label), input, hint || null);
      const title = h('input', { id: 'ns-title', value: f.title, placeholder: 'مثال: مواد غذائية معلّبة', oninput: (e) => { f.title = e.target.value; } });
      const cat = h('select', { id: 'ns-cat', onchange: (e) => { f.cat = e.target.value; confHint(); } }, CATS.map((c) => h('option', { value: c.id, selected: c.id === f.cat }, c.ar)));
      const sup = h('input', { id: 'ns-sup', class: 'ltr', value: f.supplier, placeholder: 'Supplier name', oninput: (e) => { f.supplier = e.target.value; } });
      const ctry = h('select', { id: 'ns-ctry', onchange: (e) => { f.country = e.target.value; } }, COUNTRIES.map((c) => h('option', { value: c.c, selected: c.c === f.country }, c.n)));
      const usd = h('input', { id: 'ns-usd', class: 'ltr', inputmode: 'numeric', value: f.usd, placeholder: '250000', oninput: (e) => { f.usd = e.target.value; advise(); } });
      const etd = h('input', { id: 'ns-etd', type: 'date', value: f.etd, oninput: (e) => { f.etd = e.target.value; } });
      const pod = h('select', { id: 'ns-pod', onchange: (e) => { f.pod = e.target.value; } }, PORTS_LY.map((p) => h('option', { value: p, selected: p === f.pod }, p)));
      const lc = h('select', { id: 'ns-lc', onchange: (e) => {
        f.lcNo = e.target.value;
        const l = lcByNo(f.lcNo);
        if (l) { f.channel = 'LC'; f.usd = String(l.usd); usd.value = f.usd; f.supplier = l.supplier || f.supplier; sup.value = f.supplier; paintChannel(); advise(); }
      } }, h('option', { value: '' }, 'سأربط اعتمادًا لاحقًا'), free.map((l) => h('option', { value: l.no, selected: l.no === f.lcNo }, `${l.no} · ${l.desc}`)));
      const confBox = h('div');
      const adviceBox = h('div');
      const chanBox = h('div', { class: 'radio' });
      const CH = [['LC', 'اعتماد مستندي', 'عبر مصرفك التجاري وتغطية المركزي'], ['TRANSFER', 'تحويل مباشر', 'عبر FCMS حتى 100 ألف$ (حسب تقارير)'], ['SOLE', 'نشاط فردي', 'ضمن السقف السنوي مع رخصة نشاط سارية']];
      function paintChannel() {
        clear(chanBox);
        CH.forEach(([id, t, s]) => chanBox.append(h('button', { type: 'button', class: 'opt' + (f.channel === id ? ' on' : ''), onclick: () => { f.channel = id; paintChannel(); } }, h('div', { class: 'rd-dot' }), h('div', null, h('b', null, t), h('span', null, s)))));
      }
      function confHint() {
        clear(confBox);
        if (catOf(f.cat).conf) confBox.append(h('div', { class: 'note warn' }, icon('alert'), h('span', null, 'هذه الفئة مدرجة ضمن السلع التي تتطلب شهادة مطابقة (ARN 2020/68 كما نقلتها Bureau Veritas). أضفناها لقائمة المستندات.')));
      }
      function advise() {
        clear(adviceBox);
        const v = num(f.usd);
        if (!v) return;
        const a = adviseChannel({ trade: true, kind: f.channel === 'SOLE' ? 'sole' : 'company', usd: v });
        adviceBox.append(h('div', { class: 'note gold' }, icon('route'), h('span', null, h('b', null, 'المسار المقترح: '), a.title, '. ', a.why[0] || '')));
      }
      paintChannel(); confHint(); advise();
      body.append(
        h('div', { class: 'form' },
          h('div', { class: 'field w2' }, h('label', { for: 'ns-title' }, 'وصف الشحنة ', h('b', null, '*')), title),
          fld('ns-cat', 'فئة السلعة', cat), fld('ns-lc', 'الاعتماد المرتبط', lc),
          h('div', { class: 'field w2' }, h('label', { for: 'ns-sup' }, 'المورد ', h('b', null, '*')), sup),
          fld('ns-ctry', 'بلد المورد', ctry),
          fld('ns-usd', 'قيمة الشحنة (USD) *', h('div', { class: 'u' }, h('b', null, 'USD'), usd)),
          fld('ns-etd', 'المغادرة المتوقعة', etd), fld('ns-pod', 'ميناء التفريغ', pod)),
        confBox,
        h('div', { class: 'col' }, h('label', { class: 'lbl' }, 'القناة المصرفية'), chanBox),
        adviceBox,
        h('button', { class: 'btn gold block', type: 'button', onclick: () => {
          let bad = false;
          [[title, f.title], [sup, f.supplier], [usd, num(f.usd) > 0]].forEach(([el, v]) => { const ok = !!v; el.closest('.field').classList.toggle('bad', !ok); if (!ok) bad = true; });
          if (bad) return toast('أكمل الحقول المعلّمة بنجمة');
          const l = lcByNo(f.lcNo);
          const sh = {
            id: nextShipId(), title: f.title.trim(), cat: f.cat, supplier: { name: f.supplier.trim(), country: f.country, pts: false },
            channel: f.channel, lcNo: l ? l.no : '', valueUsd: num(f.usd), created: iso(TODAY), etd: f.etd, eta: '', pol: '', pod: f.pod, dest: f.pod,
            vessel: '', imo: '', voyage: '', carrier: '', agent: '', booking: '', incoterm: '', freight: 0, insurance: 0, currency: 'USD',
            items: [], containers: [], arrived: null, noticeFiled: false, docs: {}, manual: {},
            aci: { status: 'draft', number: null, exporterTin: '', importerStat: S.company.stat, exportCountry: f.country, history: [{ s: 'draft', at: iso(TODAY) }] },
          };
          S.ships.unshift(sh);
          logActivity('box', `رحلة جديدة ${sh.id}: ${sh.title}`, sh.id);
          ctrl.close(); commit('تم إنشاء الرحلة'); openShip(sh.id);
        } }, 'إنشاء الرحلة'));
    },
  });
}

/* ---------- shipment detail ---------- */
const OPEN_GATES = {};
function setAci(sh, status, extra = {}) {
  sh.aci.status = status;
  sh.aci.history.push({ s: status, at: iso(TODAY) });
  if (extra.number) sh.aci.number = extra.number;
  if (status === 'awaiting_bl' && !sh.aci.number) sh.aci.number = 'ACI-DEMO-' + String(100000 + Math.floor(Math.random() * 899999));
  if (status === 'released') { sh.customs = { ...(sh.customs || {}), released: true }; }
  sh.aci.note = extra.note || '';
  logActivity('shield', `ACI ${sh.id}: ${aciLabel(status)}`, sh.id);
}
function toggleTask(sh, t) {
  if (t.id === 'ship.notice') sh.noticeFiled = !sh.noticeFiled;
  else if (t.id === 'cus.release') {
    sh.customs = { ...(sh.customs || {}), released: !(sh.customs && sh.customs.released) };
    if (sh.customs.released && sh.aci.status === 'completed') setAci(sh, 'released');
  } else { sh.manual = sh.manual || {}; sh.manual[t.id] = !sh.manual[t.id]; }
  logActivity('check', `${sh.id}: ${t.ar}`, sh.id);
  commit();
}
function uploadDoc(sh, type) {
  pickFile((name) => {
    sh.docs = sh.docs || {};
    sh.docs[type] = { file: name, at: iso(TODAY) };
    logActivity('file', `${sh.id}: رُفع «${DOC_TYPES[type].ar}»`, sh.id);
    commit(`تم رفع ${DOC_TYPES[type].ar}`);
  });
}
function openDocSheet(sh, type) {
  openSheet({
    title: DOC_TYPES[type].ar,
    build: (body, ctrl) => {
      const d = sh.docs && sh.docs[type];
      body.append(
        d ? h('div', { class: 'card flat col' }, kv('الملف', h('span', { class: 'mono' }, d.file)), kv('تاريخ الرفع', fmtDate(D(d.at))), kv('الرحلة', sh.id)) : h('div', { class: 'empty' }, 'لم يُرفع بعد'),
        DOC_TYPES[type].hint ? h('div', { class: 'note' }, icon('info'), h('span', null, DOC_TYPES[type].hint)) : null,
        h('div', { class: 'row' },
          h('button', { class: 'btn gold grow', type: 'button', onclick: () => { ctrl.close(); uploadDoc(sh, type); } }, icon('upload'), d ? 'استبدال' : 'رفع'),
          d ? h('button', { class: 'btn danger', type: 'button', onclick: () => { delete sh.docs[type]; ctrl.close(); commit('تم حذف المستند'); } }, icon('trash'), 'حذف') : null),
        h('p', { class: 'lbl' }, 'في هذا النموذج يُحفظ اسم الملف فقط على جهازك، ولا يُرفع المحتوى إلى أي خادم.'));
    },
  });
}

function nextAction(sh, t) {
  if (!t) return null;
  if (t.kind === 'doc') return { label: 'رفع ' + DOC_TYPES[t.docType].ar, fn: () => uploadDoc(sh, t.docType) };
  if (t.kind === 'manual') return { label: 'وضع علامة مكتمل', fn: () => toggleTask(sh, t) };
  if (t.kind === 'aci') return t.id === 'aci.2' && sh.aci.status === 'importer_review' ? { label: 'مراجعة وموافقة', fn: () => openApproval(sh.id) } : { label: 'فتح مُنسّق ACI', fn: () => openACI(sh.id) };
  if (t.kind === 'lc') return lcOf(sh) ? { label: 'فتح الاعتماد', fn: () => openLC(sh.lcNo) } : { label: 'تجهيز اعتماد جديد', fn: () => openNewLC({ shipId: sh.id }) };
  return null;
}

function taskRow(sh, t) {
  const act = nextAction(sh, t);
  const tick = h('button', { class: 'tick', type: 'button', 'aria-label': t.ar + (t.done ? ' (مكتمل)' : ''), onclick: () => {
    if (t.kind === 'manual') toggleTask(sh, t);
    else if (t.kind === 'doc') (t.done ? openDocSheet(sh, t.docType) : uploadDoc(sh, t.docType));
    else if (act) act.fn();
  } }, t.done ? icon('check') : null);
  const acts = h('div', { class: 'acts' });
  if (!t.done && act && t.kind !== 'manual') acts.append(h('button', { class: 'btn sm ghost', type: 'button', onclick: act.fn }, t.kind === 'doc' ? icon('upload') : null, t.kind === 'doc' ? 'رفع' : t.kind === 'aci' && act.label.startsWith('مراجعة') ? 'راجع' : 'فتح'));
  if (t.done && t.kind === 'doc') acts.append(h('button', { class: 'btn sm quiet', type: 'button', onclick: () => openDocSheet(sh, t.docType) }, 'عرض'));
  if (!t.done && t.sys && t.kind !== 'doc') acts.append(extLink(t.sys));
  return h('div', { class: 'task' + (t.done ? ' done' : '') + (['auto', 'aci', 'lc'].includes(t.kind) ? ' auto' : '') + (t.key && !t.done ? ' warn' : '') },
    tick, h('div', null, h('div', { class: 'tt' }, t.ar), t.hint ? h('span', { class: 'th' + (t.key && !t.done ? ' w' : '') }, t.hint) : null), acts);
}

function simBtn(label, fn) { return h('button', { type: 'button', onclick: fn }, 'محاكاة: ' + label); }
function gateEl(sh, g, openSet, page) {
  const lc = lcOf(sh);
  const isOpen = openSet.has(g.id);
  const el = h('div', { class: `gate ${g.state}${g.blocked ? ' blocked' : ''}${isOpen ? ' open' : ''}`, id: `${sh.id}-${g.id}` });
  const node = h('div', { class: 'node' }, g.state === 'done' ? icon('check') : g.blocked ? icon('alert') : String(g.i + 1));
  const head = h('button', { class: 'ghead', type: 'button', 'aria-expanded': String(isOpen), onclick: () => {
    if (openSet.has(g.id)) openSet.delete(g.id); else openSet.add(g.id);
    el.classList.toggle('open'); head.setAttribute('aria-expanded', String(openSet.has(g.id)));
  } },
    h('div', { class: 'grow' }, h('b', null, g.ar), h('small', null, g.sub)),
    h('span', { class: 'lbl num' }, `${g.ndone}/${g.tasks.length}`), icon('chevL', 'chev'));
  const body = h('div', { class: 'gbody' });
  if (g.blocked) body.append(h('div', { class: 'note bad' }, icon('alert'), h('span', null, g.blockMsg)));
  if (g.id === 'aci') {
    const r = g.risk;
    body.append(
      h('div', { class: 'row wrap', style: { padding: '4px 0 6px' } }, pill(aciLabel(sh.aci.status), aciIndex(sh.aci.status) >= 6 ? 'ok' : sh.aci.status === 'importer_review' ? 'gold' : 'info', 'shield'),
        sh.aci.number ? h('button', { class: 'chip mono', type: 'button', onclick: async () => toast((await copyText(sh.aci.number)) ? 'تم نسخ رقم ACI' : sh.aci.number) }, sh.aci.number, icon('copy')) : null),
      r ? h('div', { class: `note ${r.tone === 'bad' ? 'bad' : r.tone === 'warn' ? 'warn' : ''}` }, icon('clock'), h('span', null, r.text + ' · ' + fmtDate(r.dead))) : null);
  }
  g.tasks.forEach((t) => body.append(taskRow(sh, t)));
  if (g.id === 'aci') body.append(h('div', { class: 'row wrap', style: { paddingTop: '10px' } },
    h('button', { class: 'btn sm gold', type: 'button', onclick: () => (sh.aci.status === 'importer_review' ? openApproval(sh.id) : openACI(sh.id)) }, icon('shield'), sh.aci.status === 'importer_review' ? 'راجع ووافق' : 'مُنسّق ACI'),
    h('button', { class: 'btn sm ghost', type: 'button', onclick: () => openMessageReader(sh.id) }, icon('mail'), 'لصق إشعار البوابة'),
    extLink('aci', 'بوابة ACI')));
  if (g.id === 'fund' && lc) body.append(h('div', { class: 'row wrap', style: { paddingTop: '10px' } }, h('button', { class: 'btn sm ghost', type: 'button', onclick: () => openLC(lc.no) }, icon('bank'), `الاعتماد ${lc.no}`), extLink('fcms', 'FCMS')));
  if (g.id === 'ship' && sh.containers.length) body.append(h('div', { class: 'row wrap', style: { paddingTop: '10px' } }, sh.containers.map((c) => h('span', { class: 'chip mono' }, c.no))));
  if (g.id === 'cus') body.append(h('div', { class: 'row wrap', style: { paddingTop: '10px' } }, extLink('ecustom', 'E-Custom'), extLink('elogistic', 'E-Logistic')));

  if (S.demo && g.state !== 'todo') {
    const sims = [];
    if (g.id === 'fund' && lc && lcIndex(lc.status) < 3) sims.push(simBtn('صدور الاعتماد وتغطية المركزي', () => { lc.status = 'issued'; logActivity('bank', `صدر الاعتماد ${lc.no}`, lc.no); commit('تمت المحاكاة'); }));
    if (g.id === 'docs' && !g.done) sims.push(simBtn('رفع المستندات الناقصة', () => { g.tasks.filter((t) => !t.done).forEach((t) => { sh.docs[t.docType] = { file: `${t.docType}-demo.pdf`, at: iso(TODAY) }; }); commit('تمت المحاكاة'); }));
    if (g.id === 'aci' && aciIndex(sh.aci.status) < aciIndex('released')) {
      sims.push(simBtn('تقدّم الحالة', () => { setAci(sh, ACI_FLOW[aciIndex(sh.aci.status) + 1].id); if (aciIndex(sh.aci.status) >= 6 && !sh.docs.bl) sh.docs.bl = { file: 'BL-demo.pdf', at: iso(TODAY) }; commit('تمت المحاكاة'); }));
      if (aciIndex(sh.aci.status) >= 3 && aciIndex(sh.aci.status) < 4) sims.push(simBtn('استفسار من الجمارك', () => { setAci(sh, 'supplier_completion', { note: 'رقم الحاوية لا يطابق بوليصة الحجز' }); commit('وصل استفسار الجمارك'); }));
    }
    if (g.id === 'ship' && !sh.arrived) sims.push(simBtn('وصول الشحنة', () => { sh.arrived = iso(TODAY); sh.noticeFiled = true; logActivity('anchor', `وصلت الشحنة ${sh.id} إلى ميناء ${sh.pod}`, sh.id); commit('تمت المحاكاة'); }));
    if (g.id === 'cus' && !g.done) {
      if (!sh.docs.valueProof) sims.push(simBtn('تقديم إثبات القيمة', () => { sh.docs.valueProof = { file: 'value-proof-demo.pdf', at: iso(TODAY) }; commit('تمت المحاكاة'); }));
      else sims.push(simBtn('الإفراج الجمركي', () => { sh.docs.declaration = sh.docs.declaration || { file: 'declaration-demo.pdf', at: iso(TODAY) }; sh.manual['cus.conf'] = true; sh.customs = { ...(sh.customs || {}), released: true }; if (sh.aci.status === 'completed') setAci(sh, 'released'); commit('تم الإفراج (محاكاة)'); }));
    }
    if (g.id === 'set' && !g.done) sims.push(simBtn('إقفال الاعتماد', () => { sh.manual['set.match'] = true; if (lc) lc.status = 'closed'; logActivity('check', `أُقفلت الرحلة ${sh.id}`, sh.id); commit('تمت المحاكاة'); }));
    if (sims.length) body.append(h('div', { class: 'sim' }, sims));
  }
  el.append(h('div', { class: 'rail' }, node), h('div', { class: 'card gcard' }, head, body));
  return el;
}

function openShip(id, opts = {}) {
  const key = 'ship:' + id;
  if (!OPEN_GATES[id]) OPEN_GATES[id] = new Set();
  if (opts.open && opts.open.startsWith('gate-')) OPEN_GATES[id].add(opts.open.slice(5));
  const first = !UI.pages.find((p) => p.key === key);
  openPage(key, () => {
    const sh = shipOf(id);
    if (!sh) return [pageShell({ title: 'غير موجودة', body: h('div', { class: 'empty' }, 'تعذر العثور على الرحلة') })];
    const sm = shipSummary(sh);
    const lc = lcOf(sh);
    const openSet = OPEN_GATES[id];
    if (!openSet.size && sm.cur) openSet.add(sm.cur.id);
    const act = !sm.allDone && sm.next ? nextAction(sh, sm.next) : null;
    const hero = h('div', { class: 'card hero rise' },
      h('div', { class: 'row', style: { alignItems: 'flex-start' } },
        h('div', { class: 'col grow' },
          h('span', { class: 'mono lbl' }, sh.id),
          h('div', { style: { font: '600 1.25rem/1.35 var(--f-disp)' } }, sh.title),
          h('div', { class: 'row wrap', style: { gap: '6px' } }, h('span', { class: 'cc' }, sh.supplier.country), h('span', { class: 'lbl', style: { color: 'var(--hero-mute)' } }, sh.supplier.name)),
          h('div', null, pill(sm.label, sm.tone))),
        ring({ pct: sm.pct, size: 84, stroke: 8, mid: h('b', { class: 'num', style: { font: '600 1.1rem var(--f-disp)' } }, sm.pct + '%') })),
      h('div', { class: 'mini3' },
        h('div', null, h('b', null, '$' + short(sh.valueUsd)), h('span', null, 'القيمة')),
        h('div', null, h('b', { style: { fontSize: '.88rem' } }, sh.channel === 'LC' ? 'اعتماد' : sh.channel === 'SOLE' ? 'نشاط فردي' : 'تحويل'), h('span', null, 'القناة')),
        h('div', null, h('b', { class: 'mono', style: { fontSize: '.85rem' } }, lc ? lc.no : '—'), h('span', null, 'الاعتماد'))));
    const nextCard = sm.allDone ? h('div', { class: 'note ok rise' }, icon('check'), h('span', null, h('b', null, 'الرحلة مكتملة. '), 'أُفرج عن الشحنة وأُقفل الاعتماد.'))
      : h('div', { class: 'card tint-lilac col rise', style: { '--i': 1 } },
        h('span', { class: 'lbl' }, 'الخطوة التالية'),
        h('b', { style: { font: '500 1rem/1.4 var(--f-disp)' } }, sm.next ? sm.next.ar : '—'),
        sm.next && sm.next.hint ? h('span', { class: 'lbl', style: { color: 'inherit', opacity: 0.8 } }, sm.next.hint) : null,
        act ? h('button', { class: 'btn gold', type: 'button', onclick: act.fn }, act.label) : sm.next && sm.next.sys ? h('div', null, extLink(sm.next.sys, 'فتح ' + SYS[sm.next.sys].code)) : null);
    const facts = h('div', { class: 'card rise', style: { '--i': 2 } },
      kv('المغادرة المتوقعة', sh.etd ? `${fmtDate(D(sh.etd))} · ${inDays(daysBetween(TODAY, D(sh.etd)))}` : '—'),
      kv('الوصول المتوقع', sh.eta ? fmtDate(D(sh.eta)) : '—'),
      kv('من / إلى', `${sh.pol || '—'} ← ${sh.pod || '—'}`),
      kv('السفينة', sh.vessel ? `${sh.vessel}${sh.imo ? ' · IMO ' + sh.imo : ''}` : '—'),
      kv('الحاويات', sh.containers.length ? String(sh.containers.length) : '—'));
    const gates = h('div', { class: 'gates' }, sm.gates.map((g) => gateEl(sh, g, openSet, null)));
    const demoFoot = S.demo ? h('p', { class: 'lbl', style: { textAlign: 'center' } }, 'أزرار «محاكاة» تظهر في وضع العرض فقط، وتحاكي ردّ الجهات الرسمية.') : null;
    return pageShell({ title: sh.id, body: h('div', { class: 'stack' }, hero, nextCard, facts, h('div', { class: 'sect-h' }, h('h2', { style: { font: '500 1rem var(--f-disp)' } }, 'مسار الرحلة')), gates, demoFoot) });
  });
  if (first && opts.open === 'aci-approve') setTimeout(() => openApproval(id), 380);
  if (first && opts.open && opts.open.startsWith('gate-')) setTimeout(() => { const g = $(`#${CSS.escape(id + '-' + opts.open.slice(5))}`); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 520);
}
