/* ---------- notifications ---------- */
function openNotifications() {
  S.seenNotif = true; saveState();
  openSheet({
    title: 'التنبيهات',
    onClose: () => rerender(),
    build: (body, ctrl) => {
      const list = buildAlerts();
      body.append(list.length ? list.map((a) => h('button', { class: `card tap alert ${a.tone}`, type: 'button', onclick: () => { ctrl.close(); runAct(a.act); } },
        h('div', { class: 'bx' }, icon(a.ic)), h('div', null, h('b', null, a.title), h('span', { class: 's' }, a.sub)), icon('chevL', 'go'))) : h('div', { class: 'empty' }, 'لا توجد تنبيهات.'));
    },
  });
}

/* ---------- channel advisor ---------- */
function openChannelAdvisor() {
  openSheet({
    title: 'مرشد القناة المصرفية',
    build: (body, ctrl) => {
      const f = { trade: true, kind: 'company', usd: '250000' };
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
        if (!v) { result.append(h('div', { class: 'note' }, icon('info'), h('span', null, 'أدخل القيمة التقريبية للشحنة لنقترح المسار.'))); return; }
        const a = adviseChannel({ trade: f.trade, kind: f.kind, usd: v });
        const chan = { direct: 'TRANSFER', sole: 'SOLE', lc: 'LC', 'lc-split': 'LC' }[a.id];
        result.append(
          h('div', { class: 'card hero col' },
            h('div', { class: 'row' }, h('span', { class: 'lbl' }, 'المسار المقترح'), h('span', { class: 'sp' }), confTag(a.conf)),
            h('div', { style: { font: '600 1.2rem/1.4 var(--f-disp)' } }, a.title),
            a.why.map((w) => h('span', { style: { fontSize: '.84rem', color: 'var(--hero-ink)', opacity: 0.85 } }, w))),
          a.steps.length ? h('div', { class: 'card flat' }, h('div', { class: 'h3' }, 'المطلوب'), h('ol', { class: 'steps' }, a.steps.map((s) => h('li', null, s)))) : null,
          a.warn.map((w) => h('div', { class: 'note warn' }, icon('alert'), h('span', null, w))),
          chan ? h('button', { class: 'btn gold block', type: 'button', onclick: () => { ctrl.close(); openNewShip({ channel: chan, usd: String(v) }); } }, icon('plus'), 'ابدأ رحلة بهذا المسار') : null,
          h('p', { class: 'lbl' }, 'القواعد منقولة من تقارير صحفية ومواقع رسمية حتى ', fmtDate(D(RULES_AS_OF)), '. هذا إرشاد لا استشارة قانونية. ', srcLink('تفاصيل القرار 449', L.h449)));
      }
      body.append(
        grp('هل الغرض التجارة وإعادة البيع؟', [[true, 'نعم، للبيع', 'يشمله القرار 449'], [false, 'لا، للاستخدام الخاص أو التصنيع', 'قد يقع خارج نطاق القرار، تحقق مع مصرفك']], 'trade'),
        grp('صفة المستورد', [['company', 'شركة', 'سجل تجاري ورقم PTS'], ['sole', 'نشاط فردي', 'رخصة نشاط فردي سارية']], 'kind'),
        h('div', { class: 'field' }, h('label', { for: 'ca-usd' }, 'قيمة الشحنة التقريبية (USD)'), h('div', { class: 'u' }, h('b', null, 'USD'), usd)),
        result);
      paint();
    },
  });
}

/* ---------- hub ---------- */
function fillFaq(box) {
  const q = UI.faqQuery.trim().toLowerCase();
  clear(box);
  const rows = FAQ.filter((f) => !q || (f.q + ' ' + f.tags + ' ' + f.a.join(' ')).toLowerCase().includes(q));
  if (!rows.length) { box.append(h('div', { class: 'empty' }, 'لا نتائج. جرّب كلمة أخرى مثل: ACI، سقف، إفراج.')); return; }
  rows.forEach((f) => box.append(h('details', null,
    h('summary', null, icon('chevL'), h('span', { class: 'grow' }, f.q), confTag(f.c)),
    h('div', { class: 'ans' }, f.a.map((p) => h('p', null, rich(p))), f.src.length ? h('div', { class: 'row wrap' }, f.src.map(([t, u]) => srcLink(t, u))) : null))));
}

SCREENS.hub = (root) => {
  const fact = (c, t) => h('div', { class: 'chk' }, icon('check'), h('span', null, rich(t), ' ', confTag(c)));
  const decision = h('div', { class: 'card col rise' },
    h('div', { class: 'row' }, h('div', { class: 'h3 grow' }, 'القرار 449 لسنة 2026 باختصار'), pill('ساري منذ 30 سبتمبر', 'warn')),
    fact('hi', 'الجهة: **وزير الاقتصاد والتجارة** (طرابلس) بتاريخ 6 سبتمبر 2026. المركزي يحدد «القنوات المصرفية الرسمية».'),
    fact('hi', 'يحظر استيراد البضائع **للتجارة وإعادة البيع** خارج القنوات المصرفية من 30 سبتمبر 2026.'),
    fact('hi', 'لا تخليص جمركي قبل استيفاء المتطلبات المصرفية والتجارية والجمركية و**إثبات القيمة الفعلية**.'),
    fact('lo', 'استثناء **النشاط الفردي** ضمن سقف سنوي برخصة سارية. الرقم غير منشور (ذُكر 100 ألف$).'),
    h('div', { class: 'note' }, icon('info'), h('span', null, 'غير منشور في المصادر: الغرامات وأدوار الجهات التفصيلية والأحكام الانتقالية. لم نصل إلى النص الرسمي. ', srcLink('Libya Herald', L.h449))));

  const sysCard = (code, title, by, desc, steps, links) => h('div', { class: 'card col rise' },
    h('div', { class: 'sys' }, h('div', { class: 'bx' }, code), h('div', null, h('b', null, title), h('span', { class: 'lbl' }, by), h('p', null, desc))),
    steps ? h('ol', { class: 'steps' }, steps.map((s) => h('li', null, s))) : null,
    h('div', { class: 'row wrap' }, links));
  const systems = [
    sysCard('PTS', 'النظام الرقمي الموحد للتجارة', 'شبكة ليبيا للتجارة · وزارة الاقتصاد', 'أربع وحدات: E-Trade (سجل المستوردين والموردين وشهادات المنشأ والاعتمادات)، E-Logistic (إشعارات وصول السفن والمانيفست)، TCN-ACI (التحقق المسبق)، E-Custom (الإقرارات وشهادات المطابقة). التسجيل ينتج رقم PTS إلكترونيًا.', null, [extLink('pts', 'بوابة PTS'), extLink('etrade'), extLink('elogistic'), extLink('ltfu')]),
    sysCard('ACI', 'التسجيل المسبق للشحنات', 'مصلحة الجمارك · مشغّل: Webb Fontaine', 'لا شحن إلى ليبيا بلا رقم ACI على بوليصة الشحن. الدورة الرسمية:', [
      'المورد يدخل الرقم الضريبي والرمز الإحصائي لك وبلد التصدير والفاتورة', 'تصلك رسالة بريد: راجع ووافق (مع رسالة) أو ارفض', 'المورد يستكمل النقل والمالية والأصناف والحاويات والمستندات', 'الجمارك توافق أو ترفض أو تفتح استفسارًا', 'يصدر رقم ACI ويُدرج في بوليصة الشحن النهائية', 'مراجعة البوليصة ثم «مكتمل»، وعند الإفراج «مفرج عنه»',
    ], [extLink('aci', 'بوابة ACI'), srcLink('دليل المستخدم', L.aciGuide)]),
    sysCard('FCMS', 'نظام إدارة النقد الأجنبي', 'المصرف المركزي', 'تسجيل الشركات الراغبة في النقد الأجنبي وطلب الاعتمادات وقسم التحويل المباشر.', [
      'مفتاح المركزي (CBL Key) ورقم IBAN لحساب مصرفي', 'المفوّضون على الحساب فقط يديرون ملف الشركة', 'التحقق من الرقم الوطني والهاتف والجواز مقابل قاعدتي CBL Key وFCMS',
    ], [extLink('fcms', 'بوابة FCMS'), srcLink('إعلان المركزي', L.fcms)]),
  ];

  const faqBox = h('div', { class: 'faq' });
  const search = h('div', { class: 'search' }, h('input', { id: 'faq-q', type: 'search', placeholder: 'اسأل سَنَد: ACI، سقف، إفراج…', 'aria-label': 'بحث في الأسئلة', value: UI.faqQuery, oninput: (e) => { UI.faqQuery = e.target.value; fillFaq(faqBox); } }), icon('search'));

  const settings = h('div', { class: 'card col' },
    h('div', { class: 'h3' }, 'الإعدادات'),
    h('div', { class: 'row' }, h('div', { class: 'col grow' }, h('b', null, 'وضع العرض'), h('span', { class: 'lbl' }, 'يُظهر أزرار «محاكاة» لتجربة ردود الجهات الرسمية.')),
      h('button', { class: 'chip' + (S.demo ? ' on' : ''), type: 'button', role: 'switch', 'aria-checked': String(S.demo), onclick: () => { S.demo = !S.demo; commit(S.demo ? 'وضع العرض: تشغيل' : 'وضع العرض: إيقاف'); } }, S.demo ? 'يعمل' : 'متوقف')),
    h('div', { class: 'row' }, h('div', { class: 'col grow' }, h('b', null, 'المظهر')), h('button', { class: 'chip', type: 'button', onclick: toggleTheme }, icon('sun'), 'تبديل')),
    h('div', { class: 'row' }, h('div', { class: 'col grow' }, h('b', null, 'إعادة البيانات التجريبية'), h('span', { class: 'lbl' }, 'تمسح تعديلاتك على هذا الجهاز.')),
      h('button', { class: 'chip', type: 'button', onclick: (e) => {
        const b = e.currentTarget;
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'اضغط للتأكيد'; b.classList.add('on'); setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = 'إعادة'; b.classList.remove('on'); } }, 3000); return; }
        resetState(); applyTheme(null); closeAllPages(); rerender(); toast('أُعيدت البيانات');
      } }, 'إعادة')));

  const srcCard = h('div', { class: 'card col' }, h('div', { class: 'h3' }, 'المصادر'), SOURCES.map((g) => h('div', { class: 'col' }, h('span', { class: 'lbl' }, g.g), h('div', { class: 'row wrap' }, g.items.map(([t, u]) => srcLink(t, u))))));

  const about = h('div', { class: 'note gold' }, icon('shield'), h('span', null, h('b', null, 'عن سَنَد. '), 'نموذج تجريبي لتطبيق مرافق للمستورد. ليس جهة رسمية ولا يرتبط بالجمارك أو المركزي أو شبكة ليبيا للتجارة، وكل الأسماء والأرقام أمثلة. الدخول إلى البوابات يتم من مواقعها الرسمية. القواعد محدثة حتى ' + fmtDate(D(RULES_AS_OF)) + '.'));

  root.append(
    h('div', { class: 'title-row' }, h('h1', null, 'المركز')),
    h('div', { class: 'stack' }, decision,
      h('div', { class: 'sect-h' }, h('h2', { style: { font: '500 1rem var(--f-disp)' } }, 'خريطة المنظومات')), systems,
      h('div', { class: 'sect-h' }, h('h2', { style: { font: '500 1rem var(--f-disp)' } }, 'اسأل سَنَد')), search, h('div', { class: 'card' }, faqBox),
      srcCard, settings, about));
  fillFaq(faqBox);
};
