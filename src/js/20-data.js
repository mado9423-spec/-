/* ---------- reference data ---------- */
const DATA_VERSION = 1;
const RULES_AS_OF = '2026-10-07';

/* Official CBL rate as carried in the original Sanad dashboard (illustrative; refresh from cbl.gov.ly) */
const RATE = { avg: 6.3967, buy: 6.3808, sell: 6.4127, date: '2026-09-28' };

const BANKS = [
  { id: 'com', n: 'مصرف التجارة والتنمية', acc: '252252', bal: 12480000, g: 'g1', col: '#e0b062' },
  { id: 'jum', n: 'مصرف الجمهورية', acc: '310481', bal: 8920000, g: 'g2', col: '#3fce9f' },
  { id: 'wah', n: 'مصرف الوحدة', acc: '447120', bal: 5310000, g: 'g3', col: '#6d8cff' },
  { id: 'sah', n: 'مصرف الصحارى', acc: '508833', bal: 3760000, g: 'g4', col: '#7b879b' },
  { id: 'nat', n: 'المصرف التجاري الوطني', acc: '612905', bal: 9840000, g: 'g5', col: '#f2778f' },
  { id: 'ama', n: 'مصرف الأمان', acc: '845017', bal: 4470000, g: 'g6', col: '#a487f7' },
];
const bankOf = (id) => BANKS.find((b) => b.id === id) || BANKS[0];

/* Official portals (URLs verified in research) */
const SYS = {
  fcms: { code: 'FCMS', ar: 'نظام إدارة النقد الأجنبي', by: 'المصرف المركزي', url: 'https://fcms.cbl.gov.ly' },
  aci: { code: 'ACI', ar: 'التسجيل المسبق للشحنات', by: 'مصلحة الجمارك', url: 'https://aci.customs.gov.ly' },
  etrade: { code: 'E-TRADE', ar: 'تجارة PTS (سجل المستوردين)', by: 'شبكة ليبيا للتجارة', url: 'https://e-trade.ltnet.gov.ly' },
  elogistic: { code: 'E-LOGISTIC', ar: 'لوجستيات PTS', by: 'شبكة ليبيا للتجارة', url: 'https://e-logistic.ltnet.gov.ly' },
  ecustom: { code: 'E-CUSTOM', ar: 'جمارك PTS', by: 'شبكة ليبيا للتجارة', url: 'https://pts.ltnet.gov.ly' },
  pts: { code: 'PTS', ar: 'النظام الرقمي الموحد للتجارة', by: 'شبكة ليبيا للتجارة', url: 'https://pts.ltnet.gov.ly' },
  ltfu: { code: 'LTFU', ar: 'نقطة استعلام تسهيل التجارة', by: 'شبكة ليبيا للتجارة', url: 'https://ltfu.ltnet.gov.ly' },
  customs: { code: 'CUSTOMS', ar: 'مصلحة الجمارك', by: 'مصلحة الجمارك', url: 'https://customs.gov.ly' },
  cbl: { code: 'CBL', ar: 'المصرف المركزي', by: 'المصرف المركزي', url: 'https://cbl.gov.ly' },
};

const COUNTRIES = [
  { c: 'TR', n: 'تركيا' }, { c: 'CN', n: 'الصين' }, { c: 'IT', n: 'إيطاليا' }, { c: 'IN', n: 'الهند' },
  { c: 'AE', n: 'الإمارات' }, { c: 'EG', n: 'مصر' }, { c: 'TN', n: 'تونس' }, { c: 'ES', n: 'إسبانيا' },
  { c: 'DE', n: 'ألمانيا' }, { c: 'FR', n: 'فرنسا' }, { c: 'MY', n: 'ماليزيا' }, { c: 'JO', n: 'الأردن' },
  { c: 'GR', n: 'اليونان' }, { c: 'KR', n: 'كوريا الجنوبية' },
];
const countryName = (c) => (COUNTRIES.find((x) => x.c === c) || { n: c || '—' }).n;

const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];
const PORTS_LY = ['طرابلس', 'الخمس', 'مصراتة', 'بنغازي', 'الزاوية'];
const CONTAINER_TYPES = ['20GP', '40GP', '40HC', '20RF', '40RF'];
const PKG_TYPES = ['كرتون', 'طبلية', 'كيس', 'برميل', 'صندوق', 'لفة'];

/* Goods categories; conf = conformity certificate expected (ARN 2020/68 list as reported by Bureau Veritas) */
const CATS = [
  { id: 'food', ar: 'أغذية وأعلاف', conf: true },
  { id: 'toys', ar: 'ألعاب أطفال', conf: true },
  { id: 'kitchen', ar: 'أدوات طبخ ومنزل', conf: true },
  { id: 'tyres', ar: 'إطارات المركبات', conf: true },
  { id: 'oils', ar: 'زيوت ومزيتات المركبات', conf: true },
  { id: 'appliances', ar: 'أجهزة كهربائية', conf: false },
  { id: 'building', ar: 'مواد بناء', conf: false },
  { id: 'textile', ar: 'منسوجات وملابس', conf: false },
  { id: 'other', ar: 'أخرى', conf: false },
];
const catOf = (id) => CATS.find((c) => c.id === id) || CATS[CATS.length - 1];

const DOC_TYPES = {
  invoice: { ar: 'الفاتورة التجارية', hint: 'نوع السلعة ووصفها ووزنها وكميتها وسعرها وبلد منشئها' },
  packing: { ar: 'قائمة التعبئة', hint: '' },
  origin: { ar: 'شهادة المنشأ', hint: '' },
  inspection: { ar: 'شهادة التفتيش', hint: 'شركة تفتيش محلية أو دولية (ISO 9001:2015)' },
  insurance: { ar: 'وثيقة التأمين', hint: 'من شركة تأمين محلية، مبنية على الفاتورة الأولية' },
  conformity: { ar: 'شهادة المطابقة', hint: 'للسلع المشمولة (ARN 2020/68)' },
  booking: { ar: 'تأكيد الحجز', hint: '' },
  bl: { ar: 'بوليصة الشحن', hint: 'يجب أن تحمل رقم ACI' },
  declaration: { ar: 'الإقرار الجمركي', hint: '' },
  valueProof: { ar: 'مستندات إثبات القيمة الفعلية', hint: 'الفاتورة النهائية وإثبات التحويل أو الاعتماد' },
};
const PRE_DOCS = ['invoice', 'inspection', 'insurance', 'origin', 'packing'];

/* ACI lifecycle as described in the official user guide (July 2024) */
const ACI_FLOW = [
  { id: 'draft', ar: 'مسودة لدى المورد', who: 'المورد', hint: 'المورد يدخل الرقم الضريبي والرمز الإحصائي وبلد التصدير والفاتورة التجارية.' },
  { id: 'importer_review', ar: 'بانتظار موافقتك', who: 'أنت', hint: 'يصلك بريد من ACI لمراجعة بيانات المورد والفاتورة ثم الموافقة أو الرفض.' },
  { id: 'supplier_completion', ar: 'المورد يستكمل البيانات', who: 'المورد', hint: 'النقل والبيانات المالية والأصناف والحاويات والمستندات ثم الإرسال.' },
  { id: 'customs_review', ar: 'مراجعة الجمارك', who: 'الجمارك', hint: 'مسؤول ACI يوافق أو يرفض أو يفتح استفسارًا.' },
  { id: 'awaiting_bl', ar: 'تمت الموافقة – في انتظار بوليصة الشحن', who: 'المورد', hint: 'صدر رقم ACI. يسلّمه المورد للناقل ليُدرج في بوليصة الشحن النهائية.' },
  { id: 'bl_review', ar: 'مراجعة بوليصة الشحن', who: 'الجمارك', hint: 'رُفعت البوليصة وتنتظر اعتماد الجمارك.' },
  { id: 'completed', ar: 'مكتمل', who: '', hint: 'ACI مكتمل. يمكن تحميل الشحنة.' },
  { id: 'released', ar: 'مفرج عنه', who: '', hint: 'أفرجت الجمارك عن الشحنة وأرفقت الإقرار الجمركي.' },
];
const aciIndex = (id) => ACI_FLOW.findIndex((s) => s.id === id);
const aciLabel = (id) => (id === 'query' ? 'استفسار من الجمارك' : id === 'rejected' ? 'مرفوض' : (ACI_FLOW[aciIndex(id)] || {}).ar || '—');

const LC_FLOW = [
  { id: 'draft', ar: 'مسودة' },
  { id: 'submitted', ar: 'لدى المصرف' },
  { id: 'awaiting_cover', ar: 'بانتظار تغطية المركزي' },
  { id: 'issued', ar: 'صادر' },
  { id: 'closed', ar: 'مقفل' },
];
const lcIndex = (id) => LC_FLOW.findIndex((s) => s.id === id);

/* Regulatory dates for the radar */
const REG_DATES = [
  { id: 'd449', date: '2026-09-30', title: 'بدء حظر الاستيراد للتجارة خارج القنوات المصرفية', src: 'القرار 449', tone: 'bad' },
  { id: 'dpts', date: '2026-12-31', title: 'نهاية الفترة الانتقالية لتسجيل PTS', src: 'القرار 465', tone: 'warn' },
  { id: 'd1m', date: '2027-01-01', title: 'تسجيل PTS إلزامي للموردين الأجانب ≥ مليون دولار سنويًا', src: 'القرار 465', tone: 'warn' },
  { id: 'd100k', date: '2027-03-31', title: 'يمتد الإلزام إلى الموردين ≥ 100 ألف دولار سنويًا', src: 'القرار 465', tone: 'info' },
];

/* ---------- FAQ (every answer carries a confidence level and source) ---------- */
const L = {
  h449: 'https://libyaherald.com/2026/09/goods-imported-for-trade-outside-official-banking-channels-banned-from-30-september-minister-of-economy',
  chamber: 'https://libyaherald.com/2026/09/tripoli-chamber-of-commerce-discusses-decision-to-regulate-imports-for-the-purpose-of-trade',
  h465: 'https://libyaherald.com/2026/09/mandatory-registration-of-importers-exporters-in-unified-digital-system-for-trade-pts-announced-by-ministry-of-economy',
  aciGuide: 'https://customs.gov.ly/wp-content/uploads/2024/07/دليل-استخدام-نظام-معلومات-الشحن-المسبقة-ACI-ليبيا-pdf.pdf',
  aciPage: 'https://customs.gov.ly/services/aci/',
  cma: 'https://www.cma-cgm.com/news/4900/the-aci-advanced-cargo-information-mandatory-for-import-shipments-to-libya',
  circ: 'https://www.alaraby.co.uk/economy/%D9%85%D8%B5%D8%B1%D9%81-%D9%84%D9%8A%D8%A8%D9%8A%D8%A7-%D9%8A%D9%84%D8%B2%D9%85-%D8%A7%D9%84%D8%A8%D9%86%D9%88%D9%83-%D8%A8%D8%A7%D9%84%D8%AA%D8%B3%D8%AC%D9%8A%D9%84-%D9%81%D9%8A-%D9%86%D8%B8%D8%A7%D9%85-%D8%AA%D8%AA%D8%A8%D8%B9-%D8%A7%D9%84%D8%A8%D8%B6%D8%A7%D8%A6%D8%B9-%D8%A7%D9%84%D9%85%D8%B3%D8%AA%D9%88%D8%B1%D8%AF%D8%A9',
  fcms: 'https://cbl.gov.ly/en/central-bank-of-libya-announces-the-launch-of-registration-service-for-companies-wishing-to-obtain-foreign-exchange/',
  direct: 'https://libyaherald.com/2026/05/central-bank-of-libya-source-to-libya-herald-direct-transfers-will-effectively-end-the-black-markets-monopoly-on-foreign-currency/',
  ctrl2020: 'https://libyaherald.com/2021/01/cbl-issues-new-regulations-for-opening-business-documentary-credits-with-unified-exchange-rate-and-for-personal-use/',
  formula: 'https://www.riotimesonline.com/libya-hard-currency-formula-letters-of-credit-2026/',
  ports: 'https://libyaherald.com/2026/08/electronic-service-for-receiving-vessel-arrival-notifications-cargo-manifests-activated-at-tripoli-khoms-ports',
  pts: 'https://pts.ltnet.gov.ly/',
  bv: 'https://cdn2-verigates.bureauveritas.com/sites/verigates/files/2023-04/LIBYA%20CBL_Flyer_E%201.2%20EN.pdf',
  aca: 'https://libyaherald.com/2026/09/500-companies-black-listed-in-connection-with-lc-fraud-aca',
};

const FAQ = [
  { q: 'من أصدر القرار 449 ومتى يسري؟', c: 'hi', tags: 'قرار 449 وزارة الاقتصاد 30 سبتمبر',
    a: ['صدر القرار عن **وزير الاقتصاد والتجارة** في حكومة الوحدة الوطنية بتاريخ 6 سبتمبر 2026، وليس عن المصرف المركزي. يسري حظر الاستيراد بغرض التجارة خارج القنوات المصرفية من **30 سبتمبر 2026**.', 'المركزي هو الجهة التي تحدد «القنوات المصرفية الرسمية» وتغطي النقد الأجنبي.'],
    src: [['Libya Herald', L.h449]] },
  { q: 'هل يعني القرار أن الاعتماد المستندي هو الطريق الوحيد؟', c: 'mid', tags: 'اعتماد تحويل مباشر قناة مصرفية',
    a: ['لا. المحظور هو الاستيراد **خارج القنوات المصرفية الرسمية**. تذكر تقارير أن المركزي أتاح قناة **التحويل المباشر** حتى 100 ألف دولار عبر FCMS (المنشور 14 لسنة 2026)، إضافةً إلى الاعتماد المستندي.', 'القرار نفسه لا يعرّف القنوات، ويحيل إلى ما يحدده المركزي. تحقق من مصرفك.'],
    src: [['Libya Herald', L.direct], ['القرار 449', L.h449]] },
  { q: 'ما استثناء النشاط الفردي؟', c: 'lo', tags: 'نشاط فردي سقف 100 ألف',
    a: ['القرار يسمح للأنشطة الفردية بالاستيراد للتجارة **ضمن سقف سنوي** بشرط رخصة نشاط سارية والالتزام بالإجراءات المصرفية والتجارية والجمركية وتوثيق قيمة الشحنة.', 'المصدر الأساسي لا يذكر رقم السقف. تقارير أخرى ذكرت **100 ألف دولار حتى نهاية 2026**. لم نتحقق من النص الرسمي.'],
    src: [['Libya Herald', L.h449]] },
  { q: 'ما الذي يمنع الإفراج الجمركي؟', c: 'mid', tags: 'إفراج جمارك إثبات القيمة',
    a: ['وفق القرار لا تُخلَّص الشحنة التجارية قبل استيفاء المتطلبات **المصرفية والتجارية والجمركية** وتقديم **ما يثبت قيمتها الفعلية**.', 'لذلك يتتبع سَنَد مستندات إثبات القيمة (الفاتورة النهائية وإثبات التحويل أو الاعتماد) كبوابة مستقلة قبل الإفراج.'],
    src: [['Libya Herald', L.h449]] },
  { q: 'متى يلزم تسجيل المورد الأجنبي في PTS؟', c: 'hi', tags: 'PTS تسجيل مورد 465 مليون',
    a: ['بموجب القرار 465 لسنة 2026: فترة انتقالية حتى **31 ديسمبر 2026**، ثم إلزام من **1 يناير 2027** للموردين الذين تبلغ شحناتهم إلى ليبيا **مليون دولار فأكثر سنويًا**، ويمتد من **31 مارس 2027** إلى من يبلغ **100 ألف دولار** سنويًا.', 'التسجيل ينتج شهادة تسجيل ورقمًا تعريفيًا إلكترونيًا (PTS Code).'],
    src: [['Libya Herald', L.h465]] },
  { q: 'ما الفرق بين PTS وACI وFCMS؟', c: 'hi', tags: 'الفرق منظومة',
    a: ['**PTS**: بوابة شبكة ليبيا للتجارة (E-Trade وE-Logistic وTCN-ACI وE-Custom) لتسجيل المستوردين والموردين ومستندات التجارة واللوجستيات.', '**ACI**: نظام الجمارك للتسجيل المسبق للشحنات قبل التحميل، وينتج رقمًا يجب أن يظهر في بوليصة الشحن.', '**FCMS**: نظام المركزي لإدارة النقد الأجنبي، ومنه يُطلب غطاء الاعتماد والتحويل المباشر.'],
    src: [['بوابة PTS', L.pts], ['خدمة ACI', L.aciPage], ['إعلان FCMS', L.fcms]] },
  { q: 'قبل كم ساعة من التحميل يجب اعتماد رقم ACI؟', c: 'mid', tags: 'ACI 48 ساعة تحميل',
    a: ['إشعار الناقل CMA CGM يطلب التحقق من الرقم **قبل التحميل بـ 48 ساعة على الأقل** وتطبّق «لا ACI = لا تحميل». دليل آخر يذكر 24 ساعة.', 'يعتمد سَنَد 48 ساعة كحد أمان، وراجع شركة الشحن لموعدها.'],
    src: [['CMA CGM', L.cma]] },
  { q: 'هل أستطيع فتح اعتماد دون تسجيل في ACI؟', c: 'mid', tags: 'ACI شرط اعتماد تعميم',
    a: ['تقرير عن تعميم المركزي (سبتمبر 2025) يقول إن المصارف **لا تفتح اعتمادات** لاستيراد البضائع ما لم يُسجَّل الطالب في ACI، بدءًا من 1 نوفمبر 2025. لم نتحقق من التطبيق الفعلي لدى كل مصرف.'],
    src: [['العربي الجديد', L.circ]] },
  { q: 'ما المستندات التي يطلبها المصرف عادةً؟', c: 'mid', tags: 'مستندات اعتماد مصرف تفتيش تأمين',
    a: ['حسب ضوابط المركزي المعتمدة في ديسمبر 2020: فاتورة أولية من المصدّر، وثيقة تأمين من شركة محلية، **شهادة تفتيش**، شهادات ضرائب وضمان اجتماعي أصلية وحديثة، وتطابق الفاتورة مع شهادة التفتيش.', 'قد تكون هناك تحديثات لاحقة لم نصل إليها. اسأل قسم الاعتمادات في مصرفك.'],
    src: [['Libya Herald (2021)', L.ctrl2020]] },
  { q: 'ما الحد الأقصى للاعتماد الواحد؟', c: 'lo', tags: 'سقف اعتماد 5 مليون',
    a: ['ضوابط 2020: **5 ملايين$ تجاري، 10 ملايين$ صناعي، 3 ملايين$ خدمات**. تعليق من غرفة التجارة الدولية (2025) يذكر 3 ملايين تجاري و5 ملايين صناعي. المصادر متعارضة ولا نص رسمي حديثًا بين أيدينا.'],
    src: [['Libya Herald (2021)', L.ctrl2020]] },
  { q: 'ما صيغة سقف الاعتمادات المرتبطة بالضرائب؟', c: 'lo', tags: 'سقف ضرائب 30 ضعف',
    a: ['أعلنت الوزارة (20 أغسطس 2026) أن السقف السنوي للاعتمادات والتحويلات = **30 ضعف متوسط ضريبة الدخل + 10 أضعاف متوسط ضريبة المرتبات** لثلاث سنوات.', 'لم يصدر قرار منشور ولا تاريخ نفاذ، ولم يعلّق المركزي. نعرضها كتقدير فقط في شاشة الاعتمادات.'],
    src: [['Rio Times', L.formula]] },
  { q: 'هل يوجد تطبيق رسمي لإدخال البيانات الجمركية؟', c: 'mid', tags: 'تطبيق جوال رسمي',
    a: ['لم نجد تطبيقًا رسميًا للجوال من الجمارك أو شبكة ليبيا للتجارة أو المركزي. بوابات PTS وACI وFCMS تعمل عبر المتصفح. غياب الدليل ليس إثباتًا قاطعًا، فتحقق من المتجرين.'],
    src: [['بوابة PTS', L.pts]] },
  { q: 'هل سَنَد جهة رسمية أو موصول بالبوابات؟', c: 'hi', tags: 'سند رسمي تكامل',
    a: ['لا. سَنَد نموذج تجريبي لتطبيق **مرافق**: يجهّز بياناتك ويتحقق منها ويتتبع المتطلبات والمواعيد. الدخول إلى البوابات الرسمية يتم من بواباتها، وبيانات العرض كلها أمثلة.'],
    src: [] },
  { q: 'هل ينطبق القرار شرق ليبيا؟', c: 'lo', tags: 'شرق ليبيا الحكومتان',
    a: ['القرار صادر عن وزارة في طرابلس، ولم نجد إعلانًا عن تطبيقه من السلطات في الشرق. التقارير تشير إلى احتمال التفاوت بين الجانبين. تحقق قبل أي شحنة إلى بنغازي.'],
    src: [['Rio Times', L.formula]] },
];

const SOURCES = [
  { g: 'القرارات', items: [['Libya Herald · القرار 449', L.h449], ['Libya Herald · القرار 465 (PTS)', L.h465], ['غرفة تجارة طرابلس', L.chamber]] },
  { g: 'المنظومات', items: [['PTS', L.pts], ['خدمة ACI · الجمارك', L.aciPage], ['دليل مستخدم ACI', L.aciGuide], ['إعلان FCMS · المركزي', L.fcms]] },
  { g: 'المصارف والمركزي', items: [['ضوابط الاعتمادات 2020', L.ctrl2020], ['تعميم ربط الاعتماد بـ ACI', L.circ], ['التحويل المباشر (مايو 2026)', L.direct], ['شهادات المطابقة · Bureau Veritas', L.bv]] },
  { g: 'الشحن والرقابة', items: [['CMA CGM · إشعار ACI', L.cma], ['إشعارات وصول السفن (طرابلس والخمس)', L.ports], ['القائمة السوداء لـ 500 شركة', L.aca], ['صيغة سقف الاعتمادات', L.formula]] },
];

/* ---------- demo seed (all names and figures are examples) ---------- */
function seed() {
  const d = (n) => iso(addDays(TODAY, n));
  const ct = (o, s, type, seal, pkgs, tare, gross) => ({ no: makeContainer(o, s), type, seal, pkgs, tare, gross });

  const lcs = [
    { no: '522231', desc: 'مواد غذائية معلّبة · تركيا', bank: 'jum', open: d(-6), days: 60, usd: 480000, rate: 6.34, cover: 20, dev: 5, status: 'issued', paid: 300000, invoices: [], sector: 'تجاري', supplier: 'Mersin Gida A.S.' },
    { no: '522226', desc: 'أجهزة منزلية · الصين', bank: 'com', open: d(-26), days: 60, usd: 1000000, rate: 6.32, cover: 15, dev: 10, status: 'issued', paid: 948000, invoices: [960000], sector: 'تجاري', supplier: 'Shenzhen Brightway Electronics' },
    { no: '522240', desc: 'إطارات مركبات · الهند', bank: 'nat', open: d(-62), days: 90, usd: 210000, rate: 6.28, cover: 30, dev: 5, status: 'issued', paid: 395000, invoices: [208000], sector: 'تجاري', supplier: 'Gujarat Tyre Works Pvt' },
    { no: '522198', desc: 'معدات تعبئة · إيطاليا', bank: 'wah', open: d(-3), days: 60, usd: 3200000, rate: 6.3, cover: 25, dev: 10, status: 'awaiting_cover', paid: 0, invoices: [], sector: 'صناعي', supplier: 'Packlinea S.r.l.' },
    { no: '522150', desc: 'أجهزة تكييف · إيطاليا', bank: 'sah', open: d(-150), days: 90, usd: 650000, rate: 6.28, cover: 100, dev: 0, status: 'closed', paid: 4082000, invoices: [650000], sector: 'تجاري', supplier: 'Clima Nord S.p.A.' },
  ];

  const ships = [
    {
      id: 'SH-2610-014', title: 'مواد غذائية معلّبة', cat: 'food', supplier: { name: 'Mersin Gida A.S.', country: 'TR', pts: true },
      channel: 'LC', lcNo: '522231', valueUsd: 480000, created: d(-6), etd: d(9), eta: d(21), pol: 'Mersin', pod: 'مصراتة', dest: 'مصراتة',
      vessel: '', imo: '', voyage: '', carrier: '', agent: '', booking: '', incoterm: 'CFR', freight: 0, insurance: 0, currency: 'USD',
      items: [], containers: [], arrived: null, noticeFiled: false,
      docs: { invoice: { file: 'proforma-MG-2210.pdf', at: d(-5) }, inspection: { file: 'SGS-cert-88213.pdf', at: d(-4) }, origin: { file: 'CoO-TR-4471.pdf', at: d(-4) } },
      manual: {},
      aci: { status: 'importer_review', number: null, exporterTin: '4820193756', importerStat: 'LY-33018', exportCountry: 'TR', history: [{ s: 'draft', at: d(-2) }, { s: 'importer_review', at: d(0) }] },
    },
    {
      id: 'SH-2609-007', title: 'أجهزة منزلية', cat: 'appliances', supplier: { name: 'Shenzhen Brightway Electronics', country: 'CN', pts: true },
      channel: 'LC', lcNo: '522226', valueUsd: 960000, created: d(-24), etd: d(-12), eta: d(9), pol: 'Shanghai', pod: 'طرابلس', dest: 'طرابلس',
      vessel: 'MV Marina Dawn', imo: '9456123', voyage: '026E', carrier: 'Orient Lines', agent: 'Med Shipping Agency', booking: 'OL-5530921', incoterm: 'CIF', freight: 38000, insurance: 4800, currency: 'USD',
      items: [{ desc: 'ثلاجات وغسالات منزلية', hs: '8418.10', origin: 'CN', pkgs: 1280, pkgType: 'كرتون', gross: 45000, net: 41200 }],
      containers: [ct('OLC', '482917', '40HC', 'SL770412', 640, 3900, 26400), ct('OLC', '482933', '40HC', 'SL770413', 640, 3900, 26400)],
      arrived: null, noticeFiled: false,
      docs: { invoice: { file: 'CI-BW-7731.pdf', at: d(-20) }, inspection: { file: 'BV-cert-5521.pdf', at: d(-18) }, insurance: { file: 'policy-LI-90442.pdf', at: d(-17) }, origin: { file: 'CoO-CN-2299.pdf', at: d(-16) }, packing: { file: 'PL-BW-7731.pdf', at: d(-16) }, booking: { file: 'booking-OL5530921.pdf', at: d(-15) }, bl: { file: 'BL-OL5530921.pdf', at: d(-12) } },
      manual: {},
      aci: { status: 'completed', number: 'ACI-DEMO-481772', exporterTin: '91440300MA5F', importerStat: 'LY-33018', exportCountry: 'CN', history: [{ s: 'draft', at: d(-21) }, { s: 'importer_review', at: d(-20) }, { s: 'supplier_completion', at: d(-19) }, { s: 'customs_review', at: d(-17) }, { s: 'awaiting_bl', at: d(-14) }, { s: 'bl_review', at: d(-12) }, { s: 'completed', at: d(-11) }] },
    },
    {
      id: 'SH-2608-019', title: 'إطارات مركبات', cat: 'tyres', supplier: { name: 'Gujarat Tyre Works Pvt', country: 'IN', pts: false },
      channel: 'LC', lcNo: '522240', valueUsd: 208000, created: d(-58), etd: d(-27), eta: d(-3), pol: 'Mundra', pod: 'الخمس', dest: 'الخمس',
      vessel: 'MV Gulf Harmony', imo: '9387410', voyage: '0914', carrier: 'Indus Container Line', agent: 'Khoms Maritime', booking: 'ICL-77120', incoterm: 'CFR', freight: 5200, insurance: 900, currency: 'USD',
      items: [{ desc: 'إطارات ركوب جديدة 205/55R16', hs: '4011.10', origin: 'IN', pkgs: 1100, pkgType: 'طبلية', gross: 21000, net: 19600 }],
      containers: [ct('ICL', '774029', '40HC', 'IC334110', 1100, 4000, 25000)],
      arrived: d(-3), noticeFiled: true,
      docs: { invoice: { file: 'CI-GT-1180.pdf', at: d(-40) }, inspection: { file: 'Intertek-90218.pdf', at: d(-38) }, insurance: { file: 'policy-LI-88120.pdf', at: d(-37) }, origin: { file: 'CoO-IN-0771.pdf', at: d(-36) }, packing: { file: 'PL-GT-1180.pdf', at: d(-36) }, conformity: { file: 'CoC-ARN-3345.pdf', at: d(-35) }, booking: { file: 'booking-ICL77120.pdf', at: d(-30) }, bl: { file: 'BL-ICL77120.pdf', at: d(-27) }, declaration: { file: 'import-declaration-draft.pdf', at: d(-2) } },
      manual: {},
      aci: { status: 'completed', number: 'ACI-DEMO-390518', exporterTin: '24AAACG1182M', importerStat: 'LY-33018', exportCountry: 'IN', history: [{ s: 'draft', at: d(-45) }, { s: 'importer_review', at: d(-44) }, { s: 'supplier_completion', at: d(-43) }, { s: 'customs_review', at: d(-40) }, { s: 'awaiting_bl', at: d(-31) }, { s: 'bl_review', at: d(-27) }, { s: 'completed', at: d(-26) }] },
    },
    {
      id: 'SH-2605-003', title: 'أجهزة تكييف', cat: 'appliances', supplier: { name: 'Clima Nord S.p.A.', country: 'IT', pts: true },
      channel: 'LC', lcNo: '522150', valueUsd: 650000, created: d(-148), etd: d(-120), eta: d(-104), pol: 'Genoa', pod: 'طرابلس', dest: 'طرابلس',
      vessel: 'MV Ligure Star', imo: '9301552', voyage: '012W', carrier: 'Tyrrhenian Lines', agent: 'Tripoli Marine Services', booking: 'TL-41007', incoterm: 'CIF', freight: 21000, insurance: 3000, currency: 'EUR',
      items: [{ desc: 'مكيّفات سبليت', hs: '8415.10', origin: 'IT', pkgs: 900, pkgType: 'كرتون', gross: 30000, net: 27500 }],
      containers: [ct('TLN', '118842', '40HC', 'TL220091', 900, 3900, 33900)],
      arrived: d(-104), noticeFiled: true,
      docs: { invoice: { file: 'CI-CN-5521.pdf', at: d(-130) }, inspection: { file: 'cert-1.pdf', at: d(-128) }, insurance: { file: 'policy.pdf', at: d(-127) }, origin: { file: 'coo.pdf', at: d(-127) }, packing: { file: 'pl.pdf', at: d(-126) }, bl: { file: 'bl.pdf', at: d(-120) }, declaration: { file: 'decl.pdf', at: d(-100) }, valueProof: { file: 'proof.pdf', at: d(-100) } },
      manual: { 'settle.match': true },
      customs: { released: true },
      aci: { status: 'released', number: 'ACI-DEMO-205514', exporterTin: 'IT01234567890', importerStat: 'LY-33018', exportCountry: 'IT', history: [{ s: 'released', at: d(-100) }] },
    },
  ];

  const profile = [
    { id: 'license', label: 'رخصة النشاط سارية', done: true, why: 'شرط الأهلية، وشرط الاستثناء للأنشطة الفردية في القرار 449.', sys: null },
    { id: 'pts', label: 'رقم PTS في سجل المستوردين', done: true, why: 'يمنحك هوية إلكترونية لمعاملات التجارة الخارجية.', sys: 'etrade' },
    { id: 'aci', label: 'التسجيل في ACI', done: true, why: 'شرط لفتح الاعتماد حسب تعميم المركزي (سبتمبر 2025) ولتمكين المورد من إدخال بياناتك.', sys: 'aci' },
    { id: 'cblkey', label: 'مفتاح المركزي (CBL Key) وIBAN', done: true, why: 'متطلب تسجيل الشركات في FCMS.', sys: 'fcms' },
    { id: 'fcms', label: 'توثيق المفوّضين في FCMS', done: false, why: 'يتم التحقق من الرقم الوطني والهاتف والجواز مقابل قاعدتي CBL Key وFCMS.', sys: 'fcms', note: 'مفوّض واحد بانتظار التوثيق' },
    { id: 'tax', label: 'شهادة ضرائب أصلية وحديثة', done: false, why: 'من مستندات فتح الاعتماد في ضوابط المركزي المعلنة.', sys: null, note: 'منتهية' },
    { id: 'ss', label: 'شهادة الضمان الاجتماعي', done: true, why: 'من مستندات فتح الاعتماد في ضوابط المركزي المعلنة.', sys: null },
  ];

  const companyDocs = [
    { id: 'cd1', type: 'license', ar: 'رخصة النشاط', file: 'license-2026.pdf', exp: d(214) },
    { id: 'cd2', type: 'tax', ar: 'شهادة الضرائب', file: 'tax-cert-2025.pdf', exp: d(-12) },
    { id: 'cd3', type: 'ss', ar: 'شهادة الضمان الاجتماعي', file: 'ss-cert.pdf', exp: d(88) },
    { id: 'cd4', type: 'pts', ar: 'شهادة تسجيل PTS', file: 'pts-registration.pdf', exp: null },
    { id: 'cd5', type: 'aci', ar: 'إثبات تسجيل ACI', file: 'aci-account.pdf', exp: null },
    { id: 'cd6', type: 'cblkey', ar: 'خطاب مفتاح المركزي وIBAN', file: 'cbl-key-letter.pdf', exp: null },
  ];

  const activity = [
    { at: d(0), ic: 'mail', txt: 'بريد من ACI: بيانات شحنة SH-2610-014 بانتظار مراجعتك', ref: 'SH-2610-014' },
    { at: d(-1), ic: 'bank', txt: 'صدر الاعتماد 522231 لدى مصرف الجمهورية', ref: '522231' },
    { at: d(-3), ic: 'anchor', txt: 'وصلت الشحنة SH-2608-019 إلى ميناء الخمس', ref: 'SH-2608-019' },
    { at: d(-11), ic: 'shield', txt: 'اكتمل ACI للشحنة SH-2609-007 (ACI-DEMO-481772)', ref: 'SH-2609-007' },
  ];

  return {
    v: DATA_VERSION, theme: null, demo: true, seenNotif: false,
    company: { name: 'شركة الأفق للاستيراد', short: 'أ', stat: 'LY-33018', ptsCode: 'PTS-DEMO-30417', sector: 'تجارة عامة' },
    profile, companyDocs, lcs, ships, activity,
    bankSel: 0,
    tax: { income: 2400000, payroll: 700000 },
  };
}
