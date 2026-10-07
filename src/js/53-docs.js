/* ---------- documents ---------- */
const COMPANY_DOC_TYPES = [
  { v: 'license', t: 'رخصة النشاط', profile: 'license' },
  { v: 'tax', t: 'شهادة الضرائب', profile: 'tax' },
  { v: 'ss', t: 'شهادة الضمان الاجتماعي', profile: 'ss' },
  { v: 'pts', t: 'شهادة تسجيل PTS', profile: 'pts' },
  { v: 'aci', t: 'إثبات تسجيل ACI', profile: 'aci' },
  { v: 'cblkey', t: 'خطاب مفتاح المركزي وIBAN', profile: 'cblkey' },
];
function syncProfileFromDocs() {
  COMPANY_DOC_TYPES.forEach((ct) => {
    const d = S.companyDocs.find((x) => x.type === ct.v);
    const p = S.profile.find((x) => x.id === ct.profile);
    if (!p || !d) return;
    const ok = docStatus(d).tone !== 'bad';
    if (['license', 'tax', 'ss'].includes(ct.profile)) { p.done = ok; p.note = ok ? '' : 'منتهية'; }
  });
}

function openCompanyDoc(type) {
  const meta = COMPANY_DOC_TYPES.find((x) => x.v === type) || COMPANY_DOC_TYPES[0];
  const cur = S.companyDocs.find((d) => d.type === meta.v);
  openSheet({
    title: cur ? meta.t : 'إضافة مستند',
    build: (body, ctrl) => {
      const f = { type: meta.v, exp: cur && cur.exp ? cur.exp : '', file: cur ? cur.file : '' };
      const sel = h('select', { id: 'cd-type', onchange: (e) => { f.type = e.target.value; } }, COMPANY_DOC_TYPES.map((c) => h('option', { value: c.v, selected: c.v === f.type }, c.t)));
      const exp = h('input', { id: 'cd-exp', type: 'date', value: f.exp, oninput: (e) => { f.exp = e.target.value; } });
      const fileLbl = h('span', { class: 'mono lbl' }, f.file || 'لم يُختر ملف');
      body.append(
        cur ? h('div', { class: 'card flat col' }, kv('الملف الحالي', h('span', { class: 'mono' }, cur.file)), kv('الحالة', docStatus(cur).text)) : null,
        h('div', { class: 'form' },
          h('div', { class: 'field w2' }, h('label', { for: 'cd-type' }, 'نوع المستند'), sel),
          h('div', { class: 'field w2' }, h('label', { for: 'cd-exp' }, 'تاريخ الانتهاء (إن وجد)'), exp)),
        h('div', { class: 'row' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => pickFile((n) => { f.file = n; fileLbl.textContent = n; }) }, icon('upload'), 'اختر ملفًا'), fileLbl),
        h('button', { class: 'btn gold block', type: 'button', onclick: () => {
          if (!f.file) return toast('اختر ملفًا أولًا');
          const m = COMPANY_DOC_TYPES.find((x) => x.v === f.type);
          const ex = S.companyDocs.find((d) => d.type === f.type);
          if (ex) { ex.file = f.file; ex.exp = f.exp || null; } else S.companyDocs.push({ id: uid('cd'), type: f.type, ar: m.t, file: f.file, exp: f.exp || null });
          syncProfileFromDocs(); logActivity('file', `تحديث مستند الشركة: ${m.t}`);
          ctrl.close(); commit('تم حفظ المستند');
        } }, 'حفظ'),
        h('p', { class: 'lbl' }, 'يُحفظ اسم الملف وتاريخ الانتهاء على جهازك فقط في هذا النموذج.'));
    },
  });
}

const SHIP_DOC_ORDER = ['invoice', 'inspection', 'insurance', 'origin', 'packing', 'conformity', 'booking', 'bl', 'declaration', 'valueProof'];
function fillDocs(box) {
  clear(box);
  if (UI.docsTab === 'company') {
    const ok = S.companyDocs.filter((d) => docStatus(d).tone === 'ok').length;
    box.append(
      h('div', { class: 'card flat row' }, ring({ pct: (ok / S.companyDocs.length) * 100, size: 56, stroke: 6, track: 'var(--line-2)', mid: h('b', { class: 'num', style: { fontSize: '.8rem' } }, `${ok}/${S.companyDocs.length}`) }), h('div', { class: 'col grow' }, h('b', null, 'مستندات الشركة'), h('span', { class: 'lbl' }, 'يطلب المصرف شهادتي الضرائب والضمان أصليتين وحديثتين عند كل اعتماد.'))),
      S.companyDocs.map((d, i) => { const st = docStatus(d); return h('button', { class: 'card tap row rise', style: { '--i': i }, type: 'button', onclick: () => openCompanyDoc(d.type) },
        h('div', { class: 'ibtn', style: { flex: 'none' } }, icon('file')),
        h('div', { class: 'col grow' }, h('b', { style: { font: '500 .92rem var(--f-body)' } }, d.ar), h('span', { class: 'mono lbl clip' }, d.file)),
        pill(st.text, st.tone)); }),
      h('button', { class: 'btn ghost block', type: 'button', onclick: () => openCompanyDoc('license') }, icon('plus'), 'إضافة أو تحديث مستند'));
  } else if (UI.docsTab === 'ships') {
    S.ships.filter((s) => !shipSummary(s).allDone).forEach((sh, i) => {
      const types = SHIP_DOC_ORDER.filter((t) => t !== 'conformity' || catOf(sh.cat).conf);
      const have = types.filter((t) => sh.docs && sh.docs[t]).length;
      box.append(h('div', { class: 'card col rise', style: { '--i': i } },
        h('div', { class: 'row' }, h('div', { class: 'col grow' }, h('span', { class: 'mono lbl' }, sh.id), h('b', null, sh.title)), pill(`${have}/${types.length}`, have === types.length ? 'ok' : 'warn')),
        h('div', { class: 'row wrap' }, types.map((t) => { const d = sh.docs && sh.docs[t]; return h('button', { class: 'chip' + (d ? ' on' : ''), type: 'button', style: d ? null : { borderStyle: 'dashed' }, onclick: () => (d ? openDocSheet(sh, t) : uploadDoc(sh, t)) }, d ? icon('check') : icon('plus'), DOC_TYPES[t].ar); }))));
    });
    if (!box.children.length) box.append(h('div', { class: 'card empty' }, 'لا توجد رحلات نشطة.'));
  } else {
    const t = (cls, ic, title, sub, fn) => h('button', { class: `card tap row ${cls}`, type: 'button', onclick: fn }, h('div', { class: 'tool', style: { minHeight: 0, padding: 0, flex: 'none' } }, h('div', { class: 'bx' }, icon(ic))), h('div', { class: 'col grow' }, h('b', null, title), h('span', { class: 'lbl', style: { color: 'inherit', opacity: 0.8 } }, sub)), icon('chevL'));
    box.append(
      t('tint-peach', 'scale', 'مطابقة الفاتورة مع شهادة التفتيش', 'يفعلها المصرف قبل قبول المستندات. اكتشف الفروق قبله.', () => openMatcher()),
      t('tint-mint', 'mail', 'قراءة إشعار البوابة', 'الصق بريد ACI فتتحدث حالة رحلتك تلقائيًا.', () => openMessageReader()),
      t('tint-lilac', 'route', 'مرشد القناة المصرفية', 'اعتماد أم تحويل مباشر أم نشاط فردي.', () => openChannelAdvisor()),
      t('tint-sky', 'swap', 'محوّل العملة', 'بسعر المركزي الرسمي.', () => openConverter()));
  }
}
SCREENS.docs = (root) => {
  const box = h('div', { class: 'stack' });
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'أقسام المستندات' }, [['company', 'الشركة'], ['ships', 'الرحلات'], ['tools', 'أدوات']].map(([id, ar]) => h('button', { type: 'button', class: UI.docsTab === id ? 'on' : '', onclick: (e) => { UI.docsTab = id; $$('button', seg).forEach((b) => b.classList.toggle('on', b === e.currentTarget)); fillDocs(box); } }, ar)));
  root.append(h('div', { class: 'title-row' }, h('h1', null, 'المستندات'), h('button', { class: 'ibtn', type: 'button', 'aria-label': 'إضافة مستند', onclick: () => openCompanyDoc('license') }, icon('plus'))), h('div', { class: 'stack' }, seg, box));
  fillDocs(box);
};

/* ---------- invoice vs inspection certificate ---------- */
function openMatcher() {
  const SAMPLE = {
    inv: { supplier: 'Shenzhen Brightway Electronics', desc: 'Household refrigerators and washing machines', qty: '1280', gross: '45000', value: '960000', origin: 'China' },
    cert: { supplier: 'Shenzhen Brightway Electronic Co.', desc: 'Washing machines and household refrigerators', qty: '1280', gross: '44100', value: '960000', origin: 'China' },
  };
  openSheet({
    title: 'مطابقة المستندات',
    build: (body) => {
      const data = { inv: { ...SAMPLE.inv }, cert: { ...SAMPLE.cert } };
      const rows = h('div', { class: 'cmp' });
      const summary = h('div');
      const els = {};
      function paint() {
        const res = matchDocs(data.inv, data.cert);
        res.forEach((r) => { const row = els[r.k]; row.classList.toggle('mis', !r.ok); clear(row.querySelector('.st')).append(icon(r.ok ? 'check' : 'x')); });
        const bad = res.filter((r) => !r.ok);
        clear(summary).append(bad.length
          ? h('div', { class: 'note bad' }, icon('alert'), h('span', null, h('b', null, `${bad.length} ${bad.length === 1 ? 'حقل غير متطابق' : 'حقول غير متطابقة'}: `), bad.map((b) => b.ar).join('، '), '. قد يرفض المصرف المستندات عند اختلاف الفاتورة عن شهادة التفتيش، فصحّح قبل التقديم.'))
          : h('div', { class: 'note ok' }, icon('check'), h('span', null, h('b', null, 'متطابقة. '), 'الفاتورة وشهادة التفتيش متسقتان في الحقول المفحوصة.')));
      }
      body.append(
        h('p', { class: 'lbl' }, 'ضوابط المركزي تلزم المصرف بمطابقة الفاتورة مع شهادة التفتيش ومعقولية الأسعار. عدّل القيم ولاحظ النتيجة.'),
        h('div', { class: 'cmp-head' }, h('span'), h('span', null, 'الفاتورة'), h('span', null, 'الشهادة'), h('span')),
        rows, summary,
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost grow', type: 'button', onclick: () => { MATCH_FIELDS.forEach((f) => { data.cert[f.k] = data.inv[f.k]; els[f.k].querySelectorAll('input')[1].value = data.inv[f.k]; }); paint(); } }, 'اجعل الشهادة مطابقة'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => { MATCH_FIELDS.forEach((f) => { data.inv[f.k] = SAMPLE.inv[f.k]; data.cert[f.k] = SAMPLE.cert[f.k]; const ins = els[f.k].querySelectorAll('input'); ins[0].value = SAMPLE.inv[f.k]; ins[1].value = SAMPLE.cert[f.k]; }); paint(); } }, 'المثال')),
        h('p', { class: 'lbl' }, 'الفحص يتسامح مع الاختلافات الطفيفة في الصياغة النصية (60% تطابق كلمات)، ومع فرق 1% في الوزن و0.5% في القيمة.'));
      MATCH_FIELDS.forEach((f) => {
        const mk = (side) => h('input', { id: `mt-${side}-${f.k}`, value: data[side][f.k], 'aria-label': `${f.ar} (${side === 'inv' ? 'الفاتورة' : 'الشهادة'})`, oninput: (e) => { data[side][f.k] = e.target.value; paint(); } });
        const row = h('div', { class: 'cmp-row' }, h('label', null, f.ar), mk('inv'), mk('cert'), h('div', { class: 'st' }));
        els[f.k] = row; rows.append(row);
      });
      paint();
    },
  });
}

/* ---------- portal message reader ---------- */
function openMessageReader(shipId) {
  const cands = S.ships;
  openSheet({
    title: 'قراءة إشعار البوابة',
    build: (body, ctrl) => {
      let sid = shipId || (cands.find((s) => aciIndex(s.aci.status) < aciIndex('completed')) || cands[0]).id;
      const sel = h('select', { id: 'mr-ship', onchange: (e) => { sid = e.target.value; } }, cands.map((s) => h('option', { value: s.id, selected: s.id === sid }, `${s.id} · ${s.title}`)));
      const ta = h('textarea', { id: 'mr-text', placeholder: 'الصق نص البريد أو الإشعار القادم من بوابة ACI…' });
      const out = h('div');
      let found = null;
      const analyze = () => {
        found = parsePortalMessage(ta.value);
        clear(out);
        if (!ta.value.trim()) return;
        if (!found.status && !found.number) { out.append(h('div', { class: 'note warn' }, icon('alert'), h('span', null, 'لم نتعرف على حالة في النص. تأكد أنه من بوابة ACI أو غيّر الصياغة.'))); return; }
        out.append(h('div', { class: 'card flat col' },
          found.status ? kv('الحالة المكتشفة', aciLabel(found.status)) : null,
          found.number ? kv('رقم ACI', h('span', { class: 'mono' }, found.number)) : null,
          h('button', { class: 'btn gold block', type: 'button', onclick: () => {
            const sh = shipOf(sid);
            if (found.status) setAci(sh, found.status, { number: found.number });
            else if (found.number) { sh.aci.number = found.number; }
            if (found.number) sh.aci.number = found.number;
            ctrl.close(); commit('تم تحديث حالة ACI');
          } }, 'تطبيق على ' + sid)));
      };
      ta.oninput = debounce(analyze, 150);
      body.append(
        h('p', { class: 'lbl' }, 'بوابة ACI ترسل بريدًا عند كل مرحلة. الصق النص هنا ليحدّث سَنَد رحلتك. التحليل يتم على جهازك.'),
        h('div', { class: 'field' }, h('label', { for: 'mr-ship' }, 'الرحلة'), sel),
        h('div', { class: 'field' }, h('label', { for: 'mr-text' }, 'نص الإشعار'), ta),
        h('div', { class: 'row wrap' }, ['تمت الموافقة - في انتظار بوليصة الشحن. رقم ACI: ACI-26-558210', 'مراجعة بوليصة الشحن المعتمدة', 'مكتمل'].map((t) => h('button', { class: 'chip', type: 'button', onclick: () => { ta.value = t; analyze(); } }, t.length > 28 ? t.slice(0, 28) + '…' : t))),
        out);
    },
  });
}
