/* ---------- notifications ---------- */
function openNotifications() {
  S.seenNotif = true; saveLocal();
  openSheet({
    title: tr('التنبيهات', 'Alerts'),
    onClose: () => rerender(),
    build: (body, ctrl) => {
      const list = buildAlerts();
      body.append(list.length ? list.map((a) => h('button', { class: `card tap alert ${a.tone}`, type: 'button', onclick: () => { ctrl.close(); runAct(a.act); } },
        h('div', { class: 'bx' }, icon(a.ic)), h('div', null, h('b', null, a.title), h('span', { class: 's' }, a.sub)), icon('fwd', 'go'))) : h('div', { class: 'empty' }, tr('لا توجد تنبيهات.', 'No alerts.')));
    },
  });
}

/* ---------- channel advisor ---------- */
function openChannelAdvisor() {
  openSheet({
    title: tr('أي قناة مصرفية أستخدم؟', 'Which banking channel should I use?'),
    build: (body, ctrl) => {
      const f = { trade: S.org.resell !== false, kind: S.org.type === 'sole' ? 'sole' : 'company', usd: String(BAND_USD[S.org.valueBand] || 250000) };
      const result = h('div', { class: 'col' });
      const grp = (title, opts, key) => {
        const box = h('div', { class: 'radio' });
        const draw = () => { clear(box); opts.forEach(([v, t, s]) => box.append(h('button', { type: 'button', class: 'opt' + (f[key] === v ? ' on' : ''), onclick: () => { f[key] = v; draw(); paint(); } }, h('div', { class: 'rd-dot' }), h('div', null, h('b', null, t), s ? h('span', null, s) : null)))); };
        draw();
        return h('div', { class: 'col' }, h('label', { class: 'lbl' }, title), box);
      };
      const usd = h('input', { id: 'ca-usd', class: 'ltr', inputmode: 'numeric', value: f.usd, oninput: (e) => { f.usd = e.target.value; paint(); } });
      function paint() {
        clear(result);
        const v = num(f.usd);
        if (!v) { result.append(h('div', { class: 'note' }, icon('info'), h('span', null, tr('أدخل القيمة التقريبية للشحنة لنقترح المسار.', 'Enter the approximate shipment value and we will suggest a route.')))); return; }
        const a = adviseChannel({ trade: f.trade, kind: f.kind, usd: v });
        const chan = { direct: 'TRANSFER', sole: 'SOLE', lc: 'LC', 'lc-split': 'LC' }[a.id];
        result.append(
          h('div', { class: 'card hero col' },
            h('div', { class: 'row' }, h('span', { class: 'lbl' }, tr('المسار المقترح', 'Suggested route')), h('span', { class: 'sp' }), confTag(a.conf)),
            h('div', { style: { font: '600 1.2rem/1.4 var(--f-disp)' } }, a.title),
            a.why.map((w) => h('span', { style: { fontSize: '.84rem', color: 'var(--hero-ink)', opacity: 0.85 } }, w))),
          a.steps.length ? h('div', { class: 'card flat' }, h('div', { class: 'h3' }, tr('المطلوب', 'What you need')), h('ol', { class: 'steps' }, a.steps.map((s) => h('li', null, s)))) : null,
          a.warn.map((w) => h('div', { class: 'note warn' }, icon('alert'), h('span', null, w))),
          chan ? h('button', { class: 'btn gold block', type: 'button', onclick: () => { ctrl.close(); openNewShip({ channel: chan, usd: String(v) }); } }, icon('plus'), tr('ابدأ رحلة بهذا المسار', 'Start a shipment on this route')) : null,
          h('p', { class: 'lbl' }, tr('القواعد منقولة من تقارير صحفية ومواقع رسمية حتى ', 'Rules are taken from press reports and official sites as of '), fmtDate(D(RULES_AS_OF)), tr('. هذا إرشاد لا استشارة قانونية. ', '. This is guidance, not legal advice. '), srcLink(tr('تفاصيل القرار 449', 'Decision 449 details'), URLS.h449)));
      }
      body.append(
        grp(tr('هل الغرض التجارة وإعادة البيع؟', 'Is it for trade and resale?'), [[true, tr('نعم، للبيع', 'Yes, to resell'), tr('يشمله القرار 449', 'Covered by Decision 449')], [false, tr('لا، للاستخدام الخاص أو التصنيع', 'No, own use or manufacturing'), tr('قد يقع خارج نطاق القرار، تحقق مع مصرفك', 'May fall outside the decision, check with your bank')]], 'trade'),
        grp(tr('صفة المستورد', 'Importer type'), [['company', tr('شركة', 'Company'), tr('سجل تجاري ورقم PTS', 'Registered, with a PTS number')], ['sole', tr('نشاط فردي', 'Sole trader'), tr('رخصة نشاط فردي سارية', 'A valid individual-activity license')]], 'kind'),
        h('div', { class: 'field' }, h('label', { for: 'ca-usd' }, tr('قيمة الشحنة التقريبية (USD)', 'Approximate shipment value (USD)')), h('div', { class: 'u' }, h('b', null, 'USD'), usd)),
        result);
      paint();
    },
  });
}

/* ---------- invoice vs inspection certificate ---------- */
function openMatcher() {
  const SAMPLE = {
    inv: { supplier: 'Shenzhen Brightway Electronics', desc: 'Household refrigerators and washing machines', qty: '1280', gross: '45000', value: '960000', origin: 'China' },
    cert: { supplier: 'Shenzhen Brightway Electronic Co.', desc: 'Washing machines and household refrigerators', qty: '1280', gross: '44100', value: '960000', origin: 'China' },
  };
  openSheet({
    title: tr('مطابقة المستندات', 'Match documents'),
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
          ? h('div', { class: 'note bad' }, icon('alert'), h('span', null, h('b', null, tr(`${bad.length} ${bad.length === 1 ? 'حقل غير متطابق' : 'حقول غير متطابقة'}: `, `${bad.length} ${bad.length === 1 ? 'field does not match' : 'fields do not match'}: `)), bad.map((b) => b.name).join(tr('، ', ', ')), tr('. قد يرفض المصرف المستندات عند اختلاف الفاتورة عن شهادة التفتيش، فصحّح قبل التقديم.', '. The bank may reject the documents when the invoice differs from the inspection certificate, so fix it before submitting.')))
          : h('div', { class: 'note ok' }, icon('check'), h('span', null, h('b', null, tr('متطابقة. ', 'Match. '), tr('الفاتورة وشهادة التفتيش متسقتان في الحقول المفحوصة.', 'The invoice and the inspection certificate agree on the fields checked.')))));
      }
      body.append(
        h('p', { class: 'lbl' }, tr('ضوابط المركزي تلزم المصرف بمطابقة الفاتورة مع شهادة التفتيش ومعقولية الأسعار. عدّل القيم ولاحظ النتيجة.', 'Central Bank controls require the bank to match the invoice with the inspection certificate and check the prices are reasonable. Edit the values and watch the result.')),
        h('div', { class: 'cmp-head' }, h('span'), h('span', null, tr('الفاتورة', 'Invoice')), h('span', null, tr('الشهادة', 'Certificate')), h('span')),
        rows, summary,
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost grow', type: 'button', onclick: () => { MATCH_FIELDS.forEach((f) => { data.cert[f.k] = data.inv[f.k]; els[f.k].querySelectorAll('input')[1].value = data.inv[f.k]; }); paint(); } }, tr('اجعل الشهادة مطابقة', 'Make the certificate match')),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => { MATCH_FIELDS.forEach((f) => { data.inv[f.k] = SAMPLE.inv[f.k]; data.cert[f.k] = SAMPLE.cert[f.k]; const ins = els[f.k].querySelectorAll('input'); ins[0].value = SAMPLE.inv[f.k]; ins[1].value = SAMPLE.cert[f.k]; }); paint(); } }, tr('المثال', 'Example'))),
        h('p', { class: 'lbl' }, tr('الفحص يتسامح مع الاختلافات الطفيفة في الصياغة النصية (60% تطابق كلمات)، ومع فرق 1% في الوزن و0.5% في القيمة.', 'The check tolerates small wording differences (60% word overlap), a 1% weight difference and a 0.5% value difference.')));
      MATCH_FIELDS.forEach((f) => {
        const mk = (side) => h('input', { id: `mt-${side}-${f.k}`, value: data[side][f.k], 'aria-label': `${L(f.n)} (${side === 'inv' ? tr('الفاتورة', 'invoice') : tr('الشهادة', 'certificate')})`, oninput: (e) => { data[side][f.k] = e.target.value; paint(); } });
        const row = h('div', { class: 'cmp-row' }, h('label', null, L(f.n)), mk('inv'), mk('cert'), h('div', { class: 'st' }));
        els[f.k] = row; rows.append(row);
      });
      paint();
    },
  });
}

/* ---------- portal message reader ---------- */
function openMessageReader(shipId) {
  const cands = S.ships;
  if (!cands.length) { toast(tr('أنشئ رحلة أولًا', 'Create a shipment first')); return; }
  openSheet({
    title: tr('قراءة إشعار البوابة', 'Read a portal email'),
    build: (body, ctrl) => {
      let sid = shipId || (cands.find((s) => aciIndex(s.aci.status) < aciIndex('completed')) || cands[0]).id;
      const sel = h('select', { id: 'mr-ship', onchange: (e) => { sid = e.target.value; } }, cands.map((s) => h('option', { value: s.id, selected: s.id === sid }, `${s.id} · ${shipTitle(s)}`)));
      const ta = h('textarea', { id: 'mr-text', placeholder: tr('الصق نص البريد أو الإشعار القادم من بوابة ACI…', 'Paste the text of the email or notification from the ACI portal…') });
      const out = h('div');
      let found = null;
      const analyze = () => {
        found = parsePortalMessage(ta.value);
        clear(out);
        if (!ta.value.trim()) return;
        if (!found.status && !found.number) { out.append(h('div', { class: 'note warn' }, icon('alert'), h('span', null, tr('لم نتعرف على حالة في النص. تأكد أنه من بوابة ACI أو غيّر الصياغة.', 'We could not recognise a status in the text. Make sure it comes from the ACI portal, or reword it.')))); return; }
        out.append(h('div', { class: 'card flat col' },
          found.status ? kv(tr('الحالة المكتشفة', 'Detected status'), aciLabel(found.status)) : null,
          found.number ? kv(tr('رقم ACI', 'ACI number'), h('span', { class: 'mono' }, found.number)) : null,
          h('button', { class: 'btn gold block', type: 'button', onclick: () => {
            const sh = shipOf(sid);
            if (found.status) setAci(sh, found.status, { number: found.number });
            if (found.number) sh.aci.number = found.number;
            ctrl.close(); commit(tr('تم تحديث حالة ACI', 'ACI status updated'));
          } }, tr('تطبيق على ', 'Apply to ') + sid)));
      };
      ta.oninput = debounce(analyze, 150);
      const samples = LANG === 'ar' ? ['تمت الموافقة - في انتظار بوليصة الشحن. رقم ACI: ACI-26-558210', 'مراجعة بوليصة الشحن المعتمدة', 'مكتمل'] : ['Approved - awaiting bill of lading. ACI number: ACI-26-558210', 'Bill of lading under review', 'Completed'];
      body.append(
        h('p', { class: 'lbl' }, tr('بوابة ACI ترسل بريدًا عند كل مرحلة. الصق النص هنا ليحدّث التطبيق رحلتك. التحليل يتم على جهازك.', 'The ACI portal emails you at each stage. Paste the text here and the app updates your shipment. The analysis happens on your device.')),
        h('div', { class: 'field' }, h('label', { for: 'mr-ship' }, tr('الرحلة', 'Shipment')), sel),
        h('div', { class: 'field' }, h('label', { for: 'mr-text' }, tr('نص الإشعار', 'Notification text')), ta),
        h('div', { class: 'row wrap' }, samples.map((t) => h('button', { class: 'chip', type: 'button', onclick: () => { ta.value = t; analyze(); } }, t.length > 28 ? t.slice(0, 28) + '…' : t))),
        out);
    },
  });
}
