/* ---------- guide: plain terms first, then the decision, the systems and the FAQ ---------- */
let guideTab = 'glossary';
function fillFaq(box) {
  const q = UI.faqQuery.trim().toLowerCase();
  clear(box);
  const rows = FAQ.filter((f) => !q || (L(f.q) + ' ' + f.tags + ' ' + (f.a[LANG] || []).join(' ')).toLowerCase().includes(q));
  if (!rows.length) { box.append(h('div', { class: 'empty' }, tr('لا نتائج. جرّب كلمة أخرى مثل: ACI، سقف، إفراج.', 'No results. Try another word such as ACI, ceiling or release.'))); return; }
  rows.forEach((f) => box.append(h('details', null,
    h('summary', null, icon('fwd'), h('span', { class: 'grow' }, L(f.q)), confTag(f.c)),
    h('div', { class: 'ans' }, (f.a[LANG] || []).map((p) => h('p', null, rich(p))), f.src.length ? h('div', { class: 'row wrap' }, f.src.map(([t, u]) => srcLink(t, u))) : null))));
}

function guideGlossary() {
  return h('div', { class: 'stack' },
    h('div', { class: 'note gold' }, icon('help'), h('span', null, tr('ثلاثة أنظمة تقابلها: PTS (التسجيل والمستندات)، ACI (تسجيل الشحنة قبل التحميل)، FCMS (النقد الأجنبي عبر المركزي).', 'You will meet three systems: PTS (registration and documents), ACI (registering the shipment before loading) and FCMS (foreign currency through the Central Bank).'))),
    GLOSSARY.map((g) => h('div', { class: 'card col' },
      h('div', { class: 'row' }, h('b', { style: { font: '600 1rem var(--f-disp)', color: 'var(--gold-text)' } }, L(g.term)), h('span', { class: 'sp' }), g.sys ? extLink(g.sys) : null),
      h('span', { style: { fontSize: '.86rem', lineHeight: 1.7 } }, L(g.what)),
      h('div', { class: 'note' }, icon('user'), h('span', null, h('b', null, tr('بالنسبة لك: ', 'For you: ')), L(g.you))))));
}
function guide449() {
  const fact = (c, t) => h('div', { class: 'chk' }, icon('check'), h('span', null, rich(t), ' ', confTag(c)));
  return h('div', { class: 'stack' }, h('div', { class: 'card col' },
    h('div', { class: 'row' }, h('div', { class: 'h3 grow' }, tr('القرار 449 لسنة 2026 باختصار', 'Decision 449 of 2026 in brief')), pill(tr('ساري منذ 30 سبتمبر', 'In force since 30 Sept'), 'warn')),
    fact('hi', tr('الجهة: **وزير الاقتصاد والتجارة** (طرابلس) بتاريخ 6 سبتمبر 2026. المركزي يحدد «القنوات المصرفية الرسمية».', 'Issued by the **Minister of Economy and Trade** (Tripoli) on 6 September 2026. The Central Bank defines the “official banking channels”.')),
    fact('hi', tr('يحظر استيراد البضائع **للتجارة وإعادة البيع** خارج القنوات المصرفية من 30 سبتمبر 2026.', 'Bans importing goods **for trade and resale** outside banking channels from 30 September 2026.')),
    fact('hi', tr('لا تخليص جمركي قبل استيفاء المتطلبات المصرفية والتجارية والجمركية و**إثبات القيمة الفعلية**.', 'No customs clearance until the banking, commercial and customs requirements are met and the **actual value is proven**.')),
    fact('lo', tr('استثناء **النشاط الفردي** ضمن سقف سنوي برخصة سارية. الرقم غير منشور (ذُكر 100 ألف$).', '**Sole-trader** exemption within an annual limit, with a valid license. The figure is not published (USD 100K was mentioned).')),
    h('div', { class: 'note' }, icon('info'), h('span', null, tr('غير منشور في المصادر: الغرامات وأدوار الجهات التفصيلية والأحكام الانتقالية. لم نصل إلى النص الرسمي. ', 'Not published in the sources: penalties, the detailed roles of each body and the transitional provisions. We did not reach the official text. '), srcLink('Libya Herald', URLS.h449)))));
}
function guideSystems() {
  const sysCard = (code, title, by, desc, steps, links) => h('div', { class: 'card col' },
    h('div', { class: 'sys' }, h('div', { class: 'bx' }, code), h('div', null, h('b', null, title), h('span', { class: 'lbl' }, by), h('p', null, desc))),
    steps ? h('ol', { class: 'steps' }, steps.map((s) => h('li', null, s))) : null,
    h('div', { class: 'row wrap' }, links));
  return h('div', { class: 'stack' },
    sysCard('PTS', tr('النظام الرقمي الموحد للتجارة', 'Unified Digital Trade System'), tr('شبكة ليبيا للتجارة · وزارة الاقتصاد', 'Libya Trade Network · Ministry of Economy'), tr('أربع وحدات: E-Trade (سجل المستوردين والموردين وشهادات المنشأ والاعتمادات)، E-Logistic (إشعارات وصول السفن والمانيفست)، TCN-ACI (التحقق المسبق)، E-Custom (الإقرارات وشهادات المطابقة). التسجيل ينتج رقم PTS إلكترونيًا.', 'Four modules: E-Trade (importers and suppliers register, certificates of origin, credits), E-Logistic (vessel arrival notices and manifests), TCN-ACI (advance verification), E-Custom (declarations and conformity certificates). Registration gives you an electronic PTS number.'), null, [extLink('pts', tr('بوابة PTS', 'PTS portal')), extLink('etrade'), extLink('elogistic'), extLink('ltfu')]),
    sysCard('ACI', tr('التسجيل المسبق للشحنات', 'Advance Cargo Information'), tr('مصلحة الجمارك · مشغّل: Webb Fontaine', 'Libyan Customs · operator: Webb Fontaine'), tr('لا شحن إلى ليبيا بلا رقم ACI على بوليصة الشحن. الدورة الرسمية:', 'No cargo ships to Libya without an ACI number on the bill of lading. The official cycle:'), [
      tr('المورد يدخل الرقم الضريبي والرمز الإحصائي لك وبلد التصدير والفاتورة', 'The supplier enters the tax ID, your statistical code, country of export and the invoice'), tr('تصلك رسالة بريد: راجع ووافق (مع رسالة) أو ارفض', 'You get an email: review and approve (with a message) or reject'), tr('المورد يستكمل النقل والمالية والأصناف والحاويات والمستندات', 'The supplier completes transport, financial data, items, containers and documents'), tr('الجمارك توافق أو ترفض أو تفتح استفسارًا', 'Customs approves, rejects or opens a query'), tr('يصدر رقم ACI ويُدرج في بوليصة الشحن النهائية', 'The ACI number is issued and put on the final bill of lading'), tr('مراجعة البوليصة ثم «مكتمل»، وعند الإفراج «مفرج عنه»', 'The bill of lading is reviewed, then “Completed”, and on release “Released”'),
    ], [extLink('aci', tr('بوابة ACI', 'ACI portal')), srcLink(tr('دليل المستخدم', 'User guide'), URLS.aciGuide)]),
    sysCard('FCMS', tr('نظام إدارة النقد الأجنبي', 'Foreign Currency Management System'), tr('المصرف المركزي', 'Central Bank of Libya'), tr('تسجيل الشركات الراغبة في النقد الأجنبي وطلب الاعتمادات وقسم التحويل المباشر.', 'Registration of businesses that want foreign currency, credit requests and the Direct Transfers section.'), [
      tr('مفتاح المركزي (CBL Key) ورقم IBAN لحساب مصرفي', 'A CBL Key and an IBAN for a bank account'), tr('المفوّضون على الحساب فقط يديرون ملف الشركة', 'Only authorized users on the account manage the business profile'), tr('التحقق من الرقم الوطني والهاتف والجواز مقابل قاعدتي CBL Key وFCMS', 'National ID, phone and passport are verified against the CBL Key and FCMS databases'),
    ], [extLink('fcms', tr('بوابة FCMS', 'FCMS portal')), srcLink(tr('إعلان المركزي', 'CBL announcement'), URLS.fcms)]));
}
function guideFaq() {
  const faqBox = h('div', { class: 'faq' });
  const search = h('div', { class: 'search' }, h('input', { id: 'faq-q', type: 'search', placeholder: tr('اسأل: ACI، سقف، إفراج…', 'Ask: ACI, ceiling, release…'), 'aria-label': tr('بحث في الأسئلة', 'Search the questions'), value: UI.faqQuery, oninput: (e) => { UI.faqQuery = e.target.value; fillFaq(faqBox); } }), icon('search'));
  fillFaq(faqBox);
  const srcCard = h('div', { class: 'card col' }, h('div', { class: 'h3' }, tr('المصادر', 'Sources')), SOURCES.map((g) => h('div', { class: 'col' }, h('span', { class: 'lbl' }, L(g.g)), h('div', { class: 'row wrap' }, g.items.map(([t, u]) => srcLink(t, u))))));
  return h('div', { class: 'stack' }, search, h('div', { class: 'card' }, faqBox), srcCard);
}

function openGuide(tab) {
  if (tab) guideTab = tab;
  openPage('guide', () => {
    const view = h('div');
    const draw = () => { clear(view).append({ glossary: guideGlossary, d449: guide449, systems: guideSystems, faq: guideFaq }[guideTab]()); };
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': tr('أقسام الدليل', 'Guide sections') }, [['glossary', tr('مصطلحات', 'Terms')], ['d449', tr('القرار 449', 'Decision 449')], ['systems', tr('المنظومات', 'Systems')], ['faq', tr('أسئلة', 'FAQ')]].map(([id, label]) => h('button', { type: 'button', class: guideTab === id ? 'on' : '', onclick: (e) => { guideTab = id; $$('button', seg).forEach((b) => b.classList.toggle('on', b === e.currentTarget)); draw(); } }, label)));
    draw();
    return pageShell({ title: tr('الدليل والقواعد', 'Guide and rules'), body: h('div', { class: 'stack' }, seg, view) });
  });
}
