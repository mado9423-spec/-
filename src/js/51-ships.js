/* ---------- shipments list ---------- */
const SHIP_FILTERS = () => [['all', tr('الكل', 'All')], ['live', tr('نشطة', 'Active')], ['mine', tr('بانتظارك', 'On you')], ['done', tr('منتهية', 'Done')]];
function fillShipList(box) {
  const q = UI.shipQuery.trim().toLowerCase();
  const rows = S.ships.filter((s) => {
    const sm = shipSummary(s);
    if (UI.shipFilter === 'live' && sm.allDone) return false;
    if (UI.shipFilter === 'mine' && !(sm.mine && !sm.allDone)) return false;
    if (UI.shipFilter === 'done' && !sm.allDone) return false;
    if (q && !`${s.id} ${shipTitle(s)} ${s.supplier.name} ${s.lcNo}`.toLowerCase().includes(q)) return false;
    return true;
  });
  clear(box);
  if (!rows.length) {
    box.append(h('div', { class: 'card col', style: { alignItems: 'center', textAlign: 'center', padding: '28px 18px' } },
      h('b', { style: { font: '500 1rem var(--f-disp)' } }, S.ships.length ? tr('لا توجد رحلات مطابقة', 'No matching shipments') : tr('لا توجد رحلات بعد', 'No shipments yet')),
      h('span', { class: 'lbl' }, S.ships.length ? tr('جرّب تصنيفًا آخر.', 'Try another filter.') : tr('أنشئ أول رحلة ونرشدك خطوة بخطوة.', 'Create your first shipment and we will guide you step by step.')),
      S.ships.length ? null : h('button', { class: 'btn gold sm', type: 'button', onclick: () => openNewShip() }, icon('plus'), tr('رحلة جديدة', 'New shipment'))));
    return;
  }
  rows.forEach((s, i) => { const c = shipCard(s, true); c.classList.add('rise'); c.style.setProperty('--i', i); box.append(c); });
}
SCREENS.ships = (root) => {
  const list = h('div', { class: 'stack' });
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': tr('تصفية الرحلات', 'Filter shipments') }, SHIP_FILTERS().map(([id, label]) => h('button', {
    type: 'button', class: UI.shipFilter === id ? 'on' : '',
    onclick: (e) => { UI.shipFilter = id; $$('button', seg).forEach((b) => b.classList.toggle('on', b === e.currentTarget)); fillShipList(list); },
  }, label)));
  const search = h('div', { class: 'search' },
    h('input', { id: 'ship-q', type: 'search', placeholder: tr('ابحث برقم الرحلة أو السلعة أو المورد', 'Search by shipment, goods or supplier'), 'aria-label': tr('بحث في الرحلات', 'Search shipments'), value: UI.shipQuery, oninput: (e) => { UI.shipQuery = e.target.value; fillShipList(list); } }),
    icon('search'));
  root.append(
    h('div', { class: 'title-row' }, h('h1', null, tr('رحلات الاستيراد', 'Import shipments')), h('button', { class: 'ibtn', type: 'button', 'aria-label': tr('رحلة جديدة', 'New shipment'), onclick: () => openNewShip() }, icon('plus'))),
    h('div', { class: 'stack' }, S.ships.length > 2 ? [seg, search] : null, list));
  fillShipList(list);
};

/* ---------- new shipment (three questions) ---------- */
function nextShipId() {
  const ym = String(TODAY.getFullYear()).slice(2) + pad2(TODAY.getMonth() + 1);
  const n = S.ships.filter((s) => s.id.startsWith('SH-' + ym)).length + 1;
  return `SH-${ym}-${String(n).padStart(3, '0')}`;
}
function defaultChannel(usd) {
  if (S.org.type === 'sole') return 'SOLE';
  return usd && usd <= 100000 ? 'TRANSFER' : 'LC';
}
function openNewShip(pre = {}) {
  const f = { desc: '', cat: pre.cat || 'food', supplier: '', country: 'TR', usd: pre.usd || '', channel: pre.channel || '', lcNo: pre.lcNo || '', ...pre };
  if (pre.supplier) f.supplier = pre.supplier;
  const free = S.lcs.filter((l) => l.status !== 'closed' && !S.ships.some((s) => s.lcNo === l.no));
  openSheet({
    title: tr('رحلة استيراد جديدة', 'New import shipment'),
    build: (body, ctrl) => {
      const fld = (id, label, input, hint) => h('div', { class: 'field' }, h('label', { for: id }, label), input, hint || null);
      const desc = h('input', { id: 'ns-desc', value: f.desc, placeholder: tr('مثال: مواد غذائية معلّبة', 'e.g. Canned foods'), oninput: (e) => { f.desc = e.target.value; } });
      const sup = h('input', { id: 'ns-sup', class: 'ltr', value: f.supplier, placeholder: tr('اسم المورد', 'Supplier name'), oninput: (e) => { f.supplier = e.target.value; } });
      const ctry = h('select', { id: 'ns-ctry', onchange: (e) => { f.country = e.target.value; } }, COUNTRIES.map((c) => h('option', { value: c.c, selected: c.c === f.country }, L(c.n))));
      const usd = h('input', { id: 'ns-usd', class: 'ltr', inputmode: 'numeric', value: f.usd, placeholder: '250000', oninput: (e) => { f.usd = e.target.value; if (!f.channelTouched) { f.channel = defaultChannel(num(f.usd)); paintChannel(); } advise(); } });
      const catChips = h('div', { class: 'chips' });
      const chanBox = h('div', { class: 'radio' });
      const adviceBox = h('div'), confBox = h('div'), lcBox = h('div');
      const CH = () => [['LC', tr('اعتماد مستندي', 'Documentary credit'), tr('عبر مصرفك التجاري وتغطية المركزي', 'Through your commercial bank, with Central Bank cover')], ['TRANSFER', tr('تحويل مباشر', 'Direct transfer'), tr('عبر FCMS حتى 100 ألف$ (حسب تقارير)', 'Through FCMS up to USD 100K (per reports)')], ['SOLE', tr('نشاط فردي', 'Sole trader'), tr('ضمن السقف السنوي مع رخصة نشاط سارية', 'Within the annual limit, with a valid license')]];
      function paintCats() { clear(catChips); CATS.forEach((c) => catChips.append(h('button', { type: 'button', class: 'chip' + (f.cat === c.id ? ' on' : ''), onclick: () => { f.cat = c.id; paintCats(); confHint(); } }, L(c.n)))); }
      function paintChannel() {
        if (!f.channel) f.channel = defaultChannel(num(f.usd));
        clear(chanBox);
        CH().forEach(([id, t, s]) => chanBox.append(h('button', { type: 'button', class: 'opt' + (f.channel === id ? ' on' : ''), onclick: () => { f.channel = id; f.channelTouched = true; paintChannel(); paintLc(); } }, h('div', { class: 'rd-dot' }), h('div', null, h('b', null, t), h('span', null, s)))));
        paintLc();
      }
      function paintLc() {
        clear(lcBox);
        if (f.channel === 'LC' && free.length) lcBox.append(h('div', { class: 'field' }, h('label', { for: 'ns-lc' }, tr('الاعتماد المرتبط (اختياري)', 'Linked credit (optional)')), h('select', { id: 'ns-lc', onchange: (e) => { f.lcNo = e.target.value; const l = lcByNo(f.lcNo); if (l) { f.usd = String(l.usd); usd.value = f.usd; f.supplier = l.supplier || f.supplier; sup.value = f.supplier; advise(); } } }, h('option', { value: '' }, tr('سأربط اعتمادًا لاحقًا', 'I will link one later')), free.map((l) => h('option', { value: l.no, selected: l.no === f.lcNo }, `${l.no} · ${lcDesc(l)}`)))));
      }
      function confHint() { clear(confBox); if (catOf(f.cat).conf) confBox.append(h('div', { class: 'note warn' }, icon('alert'), h('span', null, tr('هذه الفئة تتطلب عادةً شهادة مطابقة (ARN 2020/68 كما نقلتها Bureau Veritas). أضفناها لقائمة المستندات.', 'This category usually needs a conformity certificate (ARN 2020/68 as reported by Bureau Veritas). We added it to your document list.')))); }
      function advise() {
        clear(adviceBox);
        const v = num(f.usd);
        if (!v) return;
        const a = adviseChannel({ trade: true, kind: f.channel === 'SOLE' ? 'sole' : 'company', usd: v });
        adviceBox.append(h('div', { class: 'note gold' }, icon('route'), h('span', null, h('b', null, tr('المسار المقترح: ', 'Suggested route: ')), a.title, '. ', a.why[0] || '')));
      }
      paintCats(); paintChannel(); confHint(); advise();
      body.append(
        h('div', { class: 'col' }, h('label', { class: 'lbl' }, tr('ما نوع البضاعة؟', 'What kind of goods?')), catChips),
        confBox,
        h('div', { class: 'form' },
          h('div', { class: 'field w2' }, h('label', { for: 'ns-desc' }, tr('وصف قصير (اختياري)', 'Short description (optional)')), desc),
          h('div', { class: 'field w2' }, h('label', { for: 'ns-sup' }, tr('من أين تشتري؟ اسم المورد *', 'Who are you buying from? Supplier name *')), sup),
          fld('ns-ctry', tr('بلد المورد', 'Supplier country'), ctry),
          fld('ns-usd', tr('القيمة التقريبية *', 'Approximate value *'), h('div', { class: 'u' }, h('b', null, 'USD'), usd))),
        h('details', { class: 'adv', open: pre.channel ? true : null }, h('summary', null, tr('كيف سأدفع؟', 'How will I pay?'), icon('chevD')), h('div', { class: 'adv-body' }, h('div', { class: 'radio' }, chanBox), lcBox)),
        adviceBox,
        h('button', { class: 'btn gold block', type: 'button', onclick: () => {
          let bad = false;
          [[sup, f.supplier.trim()], [usd, num(f.usd) > 0]].forEach(([el, v]) => { const ok = !!v; el.closest('.field').classList.toggle('bad', !ok); if (!ok) bad = true; });
          if (bad) return toast(tr('أكمل الحقول المعلّمة بنجمة', 'Complete the fields marked with a star'));
          const l = lcByNo(f.lcNo);
          const title = f.desc.trim() ? f.desc.trim() : catOf(f.cat).n;
          const sh = {
            id: nextShipId(), title, cat: f.cat, supplier: { name: f.supplier.trim(), country: f.country, pts: false },
            channel: f.channel || defaultChannel(num(f.usd)), lcNo: l ? l.no : '', valueUsd: num(f.usd), created: iso(TODAY), etd: '', eta: '', pol: '', pod: '', dest: '',
            vessel: '', imo: '', voyage: '', carrier: '', agent: '', booking: '', incoterm: '', freight: 0, insurance: 0, currency: 'USD',
            items: [], containers: [], arrived: null, noticeFiled: false, docs: {}, manual: {},
            aci: { status: 'draft', number: null, exporterTin: '', importerStat: S.org.stat || '', exportCountry: f.country, history: [{ s: 'draft', at: iso(TODAY) }] },
          };
          S.ships.unshift(sh);
          const tt = biOf(title);
          logActivity('box', T2(`رحلة جديدة ${sh.id}: ${tt.ar}`, `New shipment ${sh.id}: ${tt.en}`), sh.id);
          ctrl.close(); commit(tr('تم إنشاء الرحلة', 'Shipment created')); openShip(sh.id);
        } }, tr('إنشاء الرحلة', 'Create shipment')));
    },
  });
}

/* ---------- task rows ---------- */
const OPEN_GATES = {};
function setAci(sh, status, extra = {}) {
  sh.aci.status = status;
  sh.aci.history.push({ s: status, at: iso(TODAY) });
  if (extra.number) sh.aci.number = extra.number;
  if (status === 'awaiting_bl' && !sh.aci.number) sh.aci.number = 'ACI-DEMO-' + String(100000 + Math.floor(Math.random() * 899999));
  if (status === 'released') { sh.customs = { ...(sh.customs || {}), released: true }; }
  sh.aci.note = extra.note || '';
  const sObj = ACI_FLOW[aciIndex(status)];
  logActivity('shield', T2(`ACI ${sh.id}: ${sObj.n.ar}`, `ACI ${sh.id}: ${sObj.n.en}`), sh.id);
}
function toggleTask(sh, t) {
  if (t.id === 'ship.notice') sh.noticeFiled = !sh.noticeFiled;
  else if (t.id === 'cus.release') {
    sh.customs = { ...(sh.customs || {}), released: !(sh.customs && sh.customs.released) };
    if (sh.customs.released && sh.aci.status === 'completed') setAci(sh, 'released');
  } else { sh.manual = sh.manual || {}; sh.manual[t.id] = !sh.manual[t.id]; }
  logActivity('check', T2(`${sh.id}: تم تحديث خطوة`, `${sh.id}: step updated`), sh.id);
  commit();
}
function uploadDoc(sh, type) {
  pickFile(async (file) => {
    sh.docs = sh.docs || {};
    const meta = { file: file.name, at: iso(TODAY), size: file.size };
    if (typeof Cloud !== 'undefined' && Cloud.active()) {
      const up = await Cloud.upload(file, `shipments/${sh.id}`);
      if (up) Object.assign(meta, up);
    }
    sh.docs[type] = meta;
    logActivity('file', T2(`${sh.id}: رُفع «${DOC_TYPES[type].n.ar}»`, `${sh.id}: uploaded “${DOC_TYPES[type].n.en}”`), sh.id);
    commit(tr(`تم رفع ${docName(type)}`, `${docName(type)} uploaded`));
  });
}
function openDocSheet(sh, type) {
  openSheet({
    title: docName(type),
    build: (body, ctrl) => {
      const d = sh.docs && sh.docs[type];
      body.append(
        d ? h('div', { class: 'card flat col' }, kv(tr('الملف', 'File'), h('span', { class: 'mono' }, d.file)), kv(tr('تاريخ الرفع', 'Uploaded'), fmtDate(D(d.at))), kv(tr('الرحلة', 'Shipment'), sh.id)) : h('div', { class: 'empty' }, tr('لم يُرفع بعد', 'Not uploaded yet')),
        docHint(type) ? h('div', { class: 'note' }, icon('info'), h('span', null, docHint(type))) : null,
        h('div', { class: 'row' },
          h('button', { class: 'btn gold grow', type: 'button', onclick: () => { ctrl.close(); uploadDoc(sh, type); } }, icon('upload'), d ? tr('استبدال', 'Replace') : tr('رفع', 'Upload')),
          d ? h('button', { class: 'btn danger', type: 'button', onclick: () => { delete sh.docs[type]; ctrl.close(); commit(tr('تم حذف المستند', 'Document removed')); } }, icon('trash'), tr('حذف', 'Remove')) : null),
        Cloud && Cloud.active() ? null : h('p', { class: 'lbl' }, tr('في هذا الوضع يُحفظ اسم الملف فقط على جهازك، ولا يُرفع المحتوى.', 'In this mode only the file name is kept on your device; the content is not uploaded.')));
    },
  });
}

function nextAction(sh, t) {
  if (!t) return null;
  if (t.kind === 'doc') return { label: tr('رفع ', 'Upload ') + docName(t.docType), fn: () => uploadDoc(sh, t.docType) };
  if (t.kind === 'manual') return { label: tr('وضع علامة مكتمل', 'Mark as done'), fn: () => toggleTask(sh, t) };
  if (t.kind === 'aci') return t.id === 'aci.2' && sh.aci.status === 'importer_review' ? { label: tr('مراجعة وموافقة', 'Review and approve'), fn: () => openApproval(sh.id) } : { label: tr('فتح مُنسّق ACI', 'Open the ACI composer'), fn: () => openACI(sh.id) };
  if (t.kind === 'lc') return lcOf(sh) ? { label: tr('فتح الاعتماد', 'Open the credit'), fn: () => openLC(sh.lcNo) } : { label: tr('تجهيز اعتماد جديد', 'Prepare a new credit'), fn: () => openNewLC({ shipId: sh.id }) };
  return null;
}

function taskRow(sh, t) {
  const act = nextAction(sh, t);
  const tick = h('button', { class: 'tick', type: 'button', 'aria-label': t.label + (t.done ? tr(' (مكتمل)', ' (done)') : ''), onclick: () => {
    if (t.kind === 'manual') toggleTask(sh, t);
    else if (t.kind === 'doc') (t.done ? openDocSheet(sh, t.docType) : uploadDoc(sh, t.docType));
    else if (act) act.fn();
  } }, t.done ? icon('check') : null);
  const acts = h('div', { class: 'acts' });
  if (!t.done && act && t.kind !== 'manual') acts.append(h('button', { class: 'btn sm ghost', type: 'button', onclick: act.fn }, t.kind === 'doc' ? icon('upload') : null, t.kind === 'doc' ? tr('رفع', 'Upload') : t.kind === 'aci' && t.id === 'aci.2' && sh.aci.status === 'importer_review' ? tr('راجع', 'Review') : tr('فتح', 'Open')));
  if (t.done && t.kind === 'doc') acts.append(h('button', { class: 'btn sm quiet', type: 'button', onclick: () => openDocSheet(sh, t.docType) }, tr('عرض', 'View')));
  if (!t.done && t.sys && t.kind !== 'doc') acts.append(extLink(t.sys));
  return h('div', { class: 'task' + (t.done ? ' done' : '') + (['auto', 'aci', 'lc'].includes(t.kind) ? ' auto' : '') + (t.key && !t.done ? ' warn' : '') },
    tick,
    h('div', null, h('div', { class: 'tt' }, t.label, ' ', !t.done && t.who !== 'me' && t.who !== 'system' ? whoChip(t.who) : null), t.hint ? h('span', { class: 'th' + (t.key && !t.done ? ' w' : '') }, t.hint) : null),
    acts);
}

function simBtn(label, fn) { return h('button', { type: 'button', onclick: fn }, tr('محاكاة: ', 'Simulate: ') + label); }
function gateEl(sh, g, openSet) {
  const lc = lcOf(sh);
  const isOpen = openSet.has(g.id);
  const el = h('div', { class: `gate ${g.state}${g.blocked ? ' blocked' : ''}${isOpen ? ' open' : ''}`, id: `${sh.id}-${g.id}` });
  const node = h('div', { class: 'node' }, g.state === 'done' ? icon('check') : g.blocked ? icon('alert') : String(g.i + 1));
  const head = h('button', { class: 'ghead', type: 'button', 'aria-expanded': String(isOpen), onclick: () => {
    if (openSet.has(g.id)) openSet.delete(g.id); else openSet.add(g.id);
    el.classList.toggle('open'); head.setAttribute('aria-expanded', String(openSet.has(g.id)));
  } },
    h('div', { class: 'grow' }, h('b', null, g.name), h('small', null, g.sub)),
    h('span', { class: 'lbl num' }, `${g.ndone}/${g.tasks.length}`), icon('fwd', 'chev'));
  const body = h('div', { class: 'gbody' });
  if (g.blocked) body.append(h('div', { class: 'note bad' }, icon('alert'), h('span', null, g.blockMsg)));
  if (g.id === 'aci') {
    const r = g.risk;
    body.append(
      h('div', { class: 'row wrap', style: { padding: '4px 0 6px' } }, pill(aciLabel(sh.aci.status), aciIndex(sh.aci.status) >= 6 ? 'ok' : sh.aci.status === 'importer_review' ? 'gold' : 'info', 'shield'),
        sh.aci.number ? h('button', { class: 'chip mono', type: 'button', onclick: async () => toast((await copyText(sh.aci.number)) ? tr('تم نسخ رقم ACI', 'ACI number copied') : sh.aci.number) }, sh.aci.number, icon('copy')) : null),
      r ? h('div', { class: `note ${r.tone === 'bad' ? 'bad' : r.tone === 'warn' ? 'warn' : ''}` }, icon('clock'), h('span', null, r.text + ' · ' + fmtDate(r.dead))) : null);
  }
  g.tasks.forEach((t) => body.append(taskRow(sh, t)));
  if (g.id === 'aci') body.append(h('div', { class: 'row wrap', style: { paddingTop: '10px' } },
    h('button', { class: 'btn sm gold', type: 'button', onclick: () => (sh.aci.status === 'importer_review' ? openApproval(sh.id) : openACI(sh.id)) }, icon('shield'), sh.aci.status === 'importer_review' ? tr('راجع ووافق', 'Review and approve') : tr('مُنسّق ACI', 'ACI composer')),
    h('button', { class: 'btn sm ghost', type: 'button', onclick: () => openMessageReader(sh.id) }, icon('mail'), tr('لصق إشعار البوابة', 'Paste portal email')),
    extLink('aci', tr('بوابة ACI', 'ACI portal'))));
  if (g.id === 'fund' && lc) body.append(h('div', { class: 'row wrap', style: { paddingTop: '10px' } }, h('button', { class: 'btn sm ghost', type: 'button', onclick: () => openLC(lc.no) }, icon('bank'), tr(`الاعتماد ${lc.no}`, `Credit ${lc.no}`)), extLink('fcms', 'FCMS')));
  if (g.id === 'ship' && sh.containers.length) body.append(h('div', { class: 'row wrap', style: { paddingTop: '10px' } }, sh.containers.map((c) => h('span', { class: 'chip mono' }, c.no))));
  if (g.id === 'cus') body.append(h('div', { class: 'row wrap', style: { paddingTop: '10px' } }, extLink('ecustom', 'E-Custom'), extLink('elogistic', 'E-Logistic')));

  if (isDemo() && g.state !== 'todo') {
    const sims = [];
    if (g.id === 'fund' && lc && lcIndex(lc.status) < 3) sims.push(simBtn(tr('صدور الاعتماد وتغطية المركزي', 'credit issued and CBL cover'), () => { lc.status = 'issued'; logActivity('bank', T2(`صدر الاعتماد ${lc.no}`, `Credit ${lc.no} issued`), lc.no); commit(tr('تمت المحاكاة', 'Simulated')); }));
    if (g.id === 'docs' && !g.done) sims.push(simBtn(tr('رفع المستندات الناقصة', 'upload the missing documents'), () => { g.tasks.filter((t) => !t.done).forEach((t) => { sh.docs[t.docType] = { file: `${t.docType}-demo.pdf`, at: iso(TODAY) }; }); commit(tr('تمت المحاكاة', 'Simulated')); }));
    if (g.id === 'aci' && aciIndex(sh.aci.status) < aciIndex('released')) {
      sims.push(simBtn(tr('تقدّم الحالة', 'advance the status'), () => { setAci(sh, ACI_FLOW[aciIndex(sh.aci.status) + 1].id); if (aciIndex(sh.aci.status) >= 6 && !sh.docs.bl) sh.docs.bl = { file: 'BL-demo.pdf', at: iso(TODAY) }; commit(tr('تمت المحاكاة', 'Simulated')); }));
      if (aciIndex(sh.aci.status) >= 3 && aciIndex(sh.aci.status) < 4) sims.push(simBtn(tr('استفسار من الجمارك', 'customs query'), () => { setAci(sh, 'supplier_completion', { note: tr('رقم الحاوية لا يطابق بوليصة الحجز', 'The container number does not match the booking') }); commit(tr('وصل استفسار الجمارك', 'Customs query received')); }));
    }
    if (g.id === 'ship' && !sh.arrived) sims.push(simBtn(tr('وصول الشحنة', 'cargo arrives'), () => { sh.arrived = iso(TODAY); sh.noticeFiled = true; logActivity('anchor', T2(`وصلت الشحنة ${sh.id} إلى ميناء ${portName(sh.pod)}`, `Shipment ${sh.id} arrived at ${portName(sh.pod)} port`), sh.id); commit(tr('تمت المحاكاة', 'Simulated')); }));
    if (g.id === 'cus' && !g.done) {
      if (!sh.docs.valueProof) sims.push(simBtn(tr('تقديم إثبات القيمة', 'provide proof of value'), () => { sh.docs.valueProof = { file: 'value-proof-demo.pdf', at: iso(TODAY) }; commit(tr('تمت المحاكاة', 'Simulated')); }));
      else sims.push(simBtn(tr('الإفراج الجمركي', 'customs release'), () => { sh.docs.declaration = sh.docs.declaration || { file: 'declaration-demo.pdf', at: iso(TODAY) }; sh.manual['cus.conf'] = true; sh.customs = { ...(sh.customs || {}), released: true }; if (sh.aci.status === 'completed') setAci(sh, 'released'); commit(tr('تم الإفراج (محاكاة)', 'Released (simulated)')); }));
    }
    if (g.id === 'set' && !g.done) sims.push(simBtn(tr('إقفال الاعتماد', 'close the credit'), () => { sh.manual['set.match'] = true; if (lc) lc.status = 'closed'; logActivity('check', T2(`أُقفلت الرحلة ${sh.id}`, `Shipment ${sh.id} closed`), sh.id); commit(tr('تمت المحاكاة', 'Simulated')); }));
    if (sims.length) body.append(h('div', { class: 'sim' }, sims));
  }
  el.append(h('div', { class: 'rail' }, node), h('div', { class: 'card gcard' }, head, body));
  return el;
}

function supplierRequestText(sh) {
  const missing = buildGates(sh).flatMap((g) => g.tasks).filter((t) => !t.done && t.who === 'supplier' && t.kind === 'doc').map((t) => '- ' + docName(t.docType));
  const lines = [`Subject: Documents needed for shipment ${sh.id}${sh.lcNo ? ` (LC ${sh.lcNo})` : ''}`, '', `Dear ${sh.supplier.name},`, ''];
  if (missing.length) lines.push('Please send us the following documents:', ...missing, '');
  if (aciIndex(sh.aci.status) < aciIndex('awaiting_bl')) lines.push(`Please also submit the Advance Cargo Information (ACI) at ${SYS.aci.url} using our statistical code ${sh.aci.importerStat || S.org.stat || '(to be provided)'}. The ACI number must be validated at least 48 hours before loading and appear on the bill of lading.`, '');
  lines.push('Thank you.', orgName());
  return lines.join('\n');
}

/* ---------- shipment detail (simple view first: what is on you, who we wait for, then the full journey) ---------- */
function openShip(id, opts = {}) {
  const key = 'ship:' + id;
  if (!OPEN_GATES[id]) OPEN_GATES[id] = new Set();
  if (opts.open && opts.open.startsWith('gate-')) OPEN_GATES[id].add(opts.open.slice(5));
  const first = !UI.pages.find((p) => p.key === key);
  openPage(key, () => {
    const sh = shipOf(id);
    if (!sh) return [pageShell({ title: tr('غير موجودة', 'Not found'), body: h('div', { class: 'empty' }, tr('تعذر العثور على الرحلة', 'Shipment not found')) })];
    const sm = shipSummary(sh);
    const lc = lcOf(sh);
    const openSet = OPEN_GATES[id];
    if (!openSet.size && sm.cur) openSet.add(sm.cur.id);
    const hero = h('div', { class: 'card hero rise' },
      h('div', { class: 'row', style: { alignItems: 'flex-start' } },
        h('div', { class: 'col grow' },
          h('span', { class: 'mono lbl' }, sh.id),
          h('div', { style: { font: '600 1.25rem/1.35 var(--f-disp)' } }, shipTitle(sh)),
          h('div', { class: 'row wrap', style: { gap: '6px' } }, h('span', { class: 'cc' }, sh.supplier.country), h('span', { class: 'lbl ltr', style: { color: 'var(--hero-mute)' } }, sh.supplier.name)),
          h('div', null, pill(sm.label, sm.tone))),
        ring({ pct: sm.pct, size: 84, stroke: 8, mid: h('b', { class: 'num', style: { font: '600 1.1rem var(--f-disp)' } }, sm.pct + '%') })),
      h('div', { class: 'mini3' },
        h('div', null, h('b', null, '$' + short(sh.valueUsd)), h('span', null, tr('القيمة', 'Value'))),
        h('div', null, h('b', { style: { fontSize: '.88rem' } }, sh.channel === 'LC' ? tr('اعتماد', 'Credit') : sh.channel === 'SOLE' ? tr('نشاط فردي', 'Sole trader') : tr('تحويل', 'Transfer')), h('span', null, tr('القناة', 'Channel'))),
        h('div', null, h('b', { class: 'mono', style: { fontSize: '.85rem' } }, lc ? lc.no : '—'), h('span', null, tr('الاعتماد', 'Credit')))));

    const todoCard = sm.allDone ? h('div', { class: 'note ok rise' }, icon('check'), h('span', null, h('b', null, tr('الرحلة مكتملة. ', 'Shipment complete. '), tr('أُفرج عن الشحنة وأُقفل الاعتماد.', 'The cargo was released and the credit closed.'))))
      : h('div', { class: 'card col rise', style: { '--i': 1, borderColor: sm.todo.length ? 'color-mix(in srgb,var(--gold-b) 55%,transparent)' : null } },
        h('div', { class: 'row' }, h('h2', { class: 'grow', style: { font: '500 1rem var(--f-disp)' } }, tr('ما عليك الآن', 'What you need to do now')), pill(String(sm.todo.length), sm.todo.length ? 'gold' : 'ok')),
        sm.todo.length ? h('div', { class: 'todo' }, sm.todo.slice(0, 4).map((t) => taskRow(sh, t))) : h('p', { class: 'lbl' }, tr('لا شيء مطلوب منك الآن.', 'Nothing is needed from you right now.')));

    const waitCard = !sm.allDone && sm.waiting.length ? h('div', { class: 'card col rise', style: { '--i': 2 } },
      h('h2', { style: { font: '500 1rem var(--f-disp)' } }, tr('بانتظار الآخرين', 'Waiting for others')),
      sm.waiting.map((t) => h('div', { class: 'row', style: { alignItems: 'flex-start', padding: '4px 0' } }, whoChip(t.who), h('div', { class: 'col grow', style: { gap: '2px' } }, h('span', { style: { fontSize: '.86rem', lineHeight: 1.5 } }, t.label), t.hint ? h('span', { class: 'lbl' }, t.hint) : null))),
      sm.waiting.some((t) => t.who === 'supplier') ? h('button', { class: 'btn sm ghost', type: 'button', onclick: async () => toast((await copyText(supplierRequestText(sh))) ? tr('تم نسخ رسالة للمورد (بالإنجليزية)', 'Supplier message copied (in English)') : tr('تعذر النسخ', 'Could not copy')) }, icon('copy'), tr('انسخ رسالة للمورد', 'Copy a message to the supplier')) : null) : null;

    const facts = h('details', { class: 'adv' }, h('summary', null, icon('list'), tr('تفاصيل الرحلة', 'Shipment details'), icon('chevD')),
      h('div', { class: 'adv-body' },
        kv(tr('المغادرة المتوقعة', 'Expected departure'), sh.etd ? `${fmtDate(D(sh.etd))} · ${inDays(daysBetween(TODAY, D(sh.etd)))}` : '—'),
        kv(tr('الوصول المتوقع', 'Expected arrival'), sh.eta ? fmtDate(D(sh.eta)) : '—'),
        kv(tr('من / إلى', 'From / to'), `${sh.pol || '—'} → ${portName(sh.pod)}`),
        kv(tr('السفينة', 'Vessel'), sh.vessel ? `${sh.vessel}${sh.imo ? ' · IMO ' + sh.imo : ''}` : '—'),
        kv(tr('الحاويات', 'Containers'), sh.containers.length ? String(sh.containers.length) : '—')));

    const journey = h('details', { class: 'adv', open: S.simple ? null : true }, h('summary', null, icon('route'), tr('المسار الكامل (6 مراحل)', 'Full journey (6 stages)'), icon('chevD')),
      h('div', { class: 'adv-body' }, h('div', { class: 'gates' }, sm.gates.map((g) => gateEl(sh, g, openSet)))));
    return pageShell({ title: sh.id, body: h('div', { class: 'stack' }, hero, todoCard, waitCard, journey, facts, isDemo() ? h('p', { class: 'lbl', style: { textAlign: 'center' } }, tr('أزرار «محاكاة» تظهر في وضع العرض فقط، وتحاكي ردّ الجهات الرسمية.', '“Simulate” buttons appear in demo mode only and imitate the official bodies’ replies.')) : null) });
  });
  if (first && opts.open === 'aci-approve') setTimeout(() => openApproval(id), 380);
  if (first && opts.open && opts.open.startsWith('gate-')) setTimeout(() => { const j = $(`#${CSS.escape(id + '-' + opts.open.slice(5))}`); if (j) { const dtl = j.closest('details'); if (dtl) dtl.open = true; j.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 520);
}
