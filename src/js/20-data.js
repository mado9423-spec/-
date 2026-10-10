/* ---------- reference data (bilingual) ---------- */
const DATA_VERSION = 2;
const RULES_AS_OF = '2026-10-07';

/* Official CBL rate as carried in the original dashboard (illustrative; refresh from cbl.gov.ly) */
const RATE = { avg: 6.3967, buy: 6.3808, sell: 6.4127, date: '2026-09-28' };

const BANKS = [
  { id: 'com', n: T2('مصرف التجارة والتنمية', 'Bank of Commerce & Development'), acc: '252252', bal: 12480000, g: 'g1', col: '#e0b062' },
  { id: 'jum', n: T2('مصرف الجمهورية', 'Jumhouria Bank'), acc: '310481', bal: 8920000, g: 'g2', col: '#3fce9f' },
  { id: 'wah', n: T2('مصرف الوحدة', 'Wahda Bank'), acc: '447120', bal: 5310000, g: 'g3', col: '#6d8cff' },
  { id: 'sah', n: T2('مصرف الصحارى', 'Sahara Bank'), acc: '508833', bal: 3760000, g: 'g4', col: '#7b879b' },
  { id: 'nat', n: T2('المصرف التجاري الوطني', 'National Commercial Bank'), acc: '612905', bal: 9840000, g: 'g5', col: '#f2778f' },
  { id: 'ama', n: T2('مصرف الأمان', 'Aman Bank'), acc: '845017', bal: 4470000, g: 'g6', col: '#a487f7' },
];
const bankOf = (id) => BANKS.find((b) => b.id === id) || BANKS[0];
const bankName = (id) => L(bankOf(id).n);

/* Official portals (URLs verified in research) */
const SYS = {
  fcms: { code: 'FCMS', n: T2('نظام إدارة النقد الأجنبي', 'Foreign Currency Management System'), by: T2('المصرف المركزي', 'Central Bank of Libya'), url: 'https://fcms.cbl.gov.ly' },
  aci: { code: 'ACI', n: T2('التسجيل المسبق للشحنات', 'Advance Cargo Information'), by: T2('مصلحة الجمارك', 'Libyan Customs Authority'), url: 'https://aci.customs.gov.ly' },
  etrade: { code: 'E-TRADE', n: T2('تجارة PTS (سجل المستوردين)', 'PTS E-Trade (importers register)'), by: T2('شبكة ليبيا للتجارة', 'Libya Trade Network'), url: 'https://e-trade.ltnet.gov.ly' },
  elogistic: { code: 'E-LOGISTIC', n: T2('لوجستيات PTS', 'PTS E-Logistic'), by: T2('شبكة ليبيا للتجارة', 'Libya Trade Network'), url: 'https://e-logistic.ltnet.gov.ly' },
  ecustom: { code: 'E-CUSTOM', n: T2('جمارك PTS', 'PTS E-Custom'), by: T2('شبكة ليبيا للتجارة', 'Libya Trade Network'), url: 'https://pts.ltnet.gov.ly' },
  pts: { code: 'PTS', n: T2('النظام الرقمي الموحد للتجارة', 'Unified Digital Trade System'), by: T2('شبكة ليبيا للتجارة', 'Libya Trade Network'), url: 'https://pts.ltnet.gov.ly' },
  ltfu: { code: 'LTFU', n: T2('نقطة استعلام تسهيل التجارة', 'Trade Facilitation Inquiry Point'), by: T2('شبكة ليبيا للتجارة', 'Libya Trade Network'), url: 'https://ltfu.ltnet.gov.ly' },
  customs: { code: 'CUSTOMS', n: T2('مصلحة الجمارك', 'Libyan Customs Authority'), by: T2('مصلحة الجمارك', 'Libyan Customs Authority'), url: 'https://customs.gov.ly' },
  cbl: { code: 'CBL', n: T2('المصرف المركزي', 'Central Bank of Libya'), by: T2('المصرف المركزي', 'Central Bank of Libya'), url: 'https://cbl.gov.ly' },
};

const COUNTRIES = [
  { c: 'TR', n: T2('تركيا', 'Türkiye') }, { c: 'CN', n: T2('الصين', 'China') }, { c: 'IT', n: T2('إيطاليا', 'Italy') }, { c: 'IN', n: T2('الهند', 'India') },
  { c: 'AE', n: T2('الإمارات', 'UAE') }, { c: 'EG', n: T2('مصر', 'Egypt') }, { c: 'TN', n: T2('تونس', 'Tunisia') }, { c: 'ES', n: T2('إسبانيا', 'Spain') },
  { c: 'DE', n: T2('ألمانيا', 'Germany') }, { c: 'FR', n: T2('فرنسا', 'France') }, { c: 'MY', n: T2('ماليزيا', 'Malaysia') }, { c: 'JO', n: T2('الأردن', 'Jordan') },
  { c: 'GR', n: T2('اليونان', 'Greece') }, { c: 'KR', n: T2('كوريا الجنوبية', 'South Korea') },
];
const countryName = (c) => { const x = COUNTRIES.find((y) => y.c === c); return x ? L(x.n) : (c || '—'); };

const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];
const PORTS_LY = [
  { id: 'TIP', n: T2('طرابلس', 'Tripoli') }, { id: 'KHM', n: T2('الخمس', 'Khoms') }, { id: 'MRA', n: T2('مصراتة', 'Misrata') },
  { id: 'BEN', n: T2('بنغازي', 'Benghazi') }, { id: 'ZWA', n: T2('الزاوية', 'Zawiya') },
];
const portName = (id) => { const p = PORTS_LY.find((x) => x.id === id); return p ? L(p.n) : (id || '—'); };
const CONTAINER_TYPES = ['20GP', '40GP', '40HC', '20RF', '40RF'];
const PKG_TYPES = [
  { id: 'carton', n: T2('كرتون', 'Carton') }, { id: 'pallet', n: T2('طبلية', 'Pallet') }, { id: 'bag', n: T2('كيس', 'Bag') },
  { id: 'drum', n: T2('برميل', 'Drum') }, { id: 'box', n: T2('صندوق', 'Box') }, { id: 'roll', n: T2('لفة', 'Roll') },
];
const pkgName = (id) => { const p = PKG_TYPES.find((x) => x.id === id); return p ? L(p.n) : (id || '—'); };

/* Goods categories; conf = conformity certificate expected (ARN 2020/68 list as reported by Bureau Veritas) */
const CATS = [
  { id: 'food', n: T2('أغذية وأعلاف', 'Food & feed'), conf: true },
  { id: 'toys', n: T2('ألعاب أطفال', "Children's toys"), conf: true },
  { id: 'kitchen', n: T2('أدوات طبخ ومنزل', 'Cookware & household'), conf: true },
  { id: 'tyres', n: T2('إطارات المركبات', 'Vehicle tyres'), conf: true },
  { id: 'oils', n: T2('زيوت ومزيتات المركبات', 'Vehicle oils & lubricants'), conf: true },
  { id: 'appliances', n: T2('أجهزة كهربائية', 'Electrical appliances'), conf: false },
  { id: 'building', n: T2('مواد بناء', 'Building materials'), conf: false },
  { id: 'textile', n: T2('منسوجات وملابس', 'Textiles & clothing'), conf: false },
  { id: 'other', n: T2('أخرى', 'Other'), conf: false },
];
const catOf = (id) => CATS.find((c) => c.id === id) || CATS[CATS.length - 1];
const catName = (id) => L(catOf(id).n);

const DOC_TYPES = {
  invoice: { n: T2('الفاتورة التجارية', 'Commercial invoice'), hint: T2('نوع السلعة ووصفها ووزنها وكميتها وسعرها وبلد منشئها', 'Goods type, description, weight, quantity, price and country of origin') },
  packing: { n: T2('قائمة التعبئة', 'Packing list'), hint: T2('', '') },
  origin: { n: T2('شهادة المنشأ', 'Certificate of origin'), hint: T2('', '') },
  inspection: { n: T2('شهادة التفتيش', 'Inspection certificate'), hint: T2('شركة تفتيش محلية أو دولية (ISO 9001:2015)', 'Local or international inspection company (ISO 9001:2015)') },
  insurance: { n: T2('وثيقة التأمين', 'Insurance policy'), hint: T2('من شركة تأمين محلية، مبنية على الفاتورة الأولية', 'From a local insurer, based on the initial invoice') },
  conformity: { n: T2('شهادة المطابقة', 'Conformity certificate'), hint: T2('للسلع المشمولة (ARN 2020/68)', 'For covered goods (ARN 2020/68)') },
  booking: { n: T2('تأكيد الحجز', 'Booking confirmation'), hint: T2('', '') },
  bl: { n: T2('بوليصة الشحن', 'Bill of lading'), hint: T2('يجب أن تحمل رقم ACI', 'Must carry the ACI number') },
  declaration: { n: T2('الإقرار الجمركي', 'Customs declaration'), hint: T2('', '') },
  valueProof: { n: T2('مستندات إثبات القيمة الفعلية', 'Proof of actual value'), hint: T2('الفاتورة النهائية وإثبات التحويل أو الاعتماد', 'Final invoice and proof of transfer or credit') },
};
const docName = (t) => L(DOC_TYPES[t].n);
const docHint = (t) => L(DOC_TYPES[t].hint);
const PRE_DOCS = ['invoice', 'inspection', 'insurance', 'origin', 'packing'];

/* who owns a step */
const WHO = {
  me: T2('عليك', 'You'), supplier: T2('المورد', 'Supplier'), bank: T2('المصرف', 'Bank'),
  customs: T2('الجمارك', 'Customs'), agent: T2('المخلّص / الوكيل', 'Clearing / shipping agent'), system: T2('تلقائي', 'Automatic'),
};
const whoName = (w) => L(WHO[w] || WHO.system);

/* ACI lifecycle as described in the official user guide (July 2024) */
const ACI_FLOW = [
  { id: 'draft', n: T2('مسودة لدى المورد', 'Supplier is drafting'), who: 'supplier', hint: T2('المورد يدخل الرقم الضريبي والرمز الإحصائي وبلد التصدير والفاتورة التجارية.', 'The supplier enters the tax ID, statistical code, country of export and the commercial invoice.') },
  { id: 'importer_review', n: T2('بانتظار موافقتك', 'Waiting for your approval'), who: 'me', hint: T2('يصلك بريد من ACI لمراجعة بيانات المورد والفاتورة ثم الموافقة أو الرفض.', 'You get an email from ACI to review the supplier data and invoice, then approve or reject.') },
  { id: 'supplier_completion', n: T2('المورد يستكمل البيانات', 'Supplier completes the data'), who: 'supplier', hint: T2('النقل والبيانات المالية والأصناف والحاويات والمستندات ثم الإرسال.', 'Transport, financial data, items, containers and documents, then submit.') },
  { id: 'customs_review', n: T2('مراجعة الجمارك', 'Customs review'), who: 'customs', hint: T2('مسؤول ACI يوافق أو يرفض أو يفتح استفسارًا.', 'The ACI officer approves, rejects or opens a query.') },
  { id: 'awaiting_bl', n: T2('تمت الموافقة، في انتظار بوليصة الشحن', 'Approved, waiting for the bill of lading'), who: 'supplier', hint: T2('صدر رقم ACI. يسلّمه المورد للناقل ليُدرج في بوليصة الشحن النهائية.', 'The ACI number is issued. The supplier gives it to the carrier for the final bill of lading.') },
  { id: 'bl_review', n: T2('مراجعة بوليصة الشحن', 'Bill of lading review'), who: 'customs', hint: T2('رُفعت البوليصة وتنتظر اعتماد الجمارك.', 'The bill of lading is uploaded and awaits customs approval.') },
  { id: 'completed', n: T2('مكتمل', 'Completed'), who: '', hint: T2('ACI مكتمل. يمكن تحميل الشحنة.', 'ACI is complete. The cargo can be loaded.') },
  { id: 'released', n: T2('مفرج عنه', 'Released'), who: '', hint: T2('أفرجت الجمارك عن الشحنة وأرفقت الإقرار الجمركي.', 'Customs released the cargo and attached the declaration.') },
];
const aciIndex = (id) => ACI_FLOW.findIndex((s) => s.id === id);
const aciLabel = (id) => { const s = ACI_FLOW[aciIndex(id)]; return s ? L(s.n) : '—'; };

const LC_FLOW = [
  { id: 'draft', n: T2('مسودة', 'Draft') },
  { id: 'submitted', n: T2('لدى المصرف', 'With the bank') },
  { id: 'awaiting_cover', n: T2('بانتظار تغطية المركزي', 'Waiting for CBL cover') },
  { id: 'issued', n: T2('صادر', 'Issued') },
  { id: 'closed', n: T2('مقفل', 'Closed') },
];
const lcIndex = (id) => LC_FLOW.findIndex((s) => s.id === id);

/* Regulatory dates for the radar */
const REG_DATES = [
  { id: 'd449', date: '2026-09-30', n: T2('بدء حظر الاستيراد للتجارة خارج القنوات المصرفية', 'Ban on importing for trade outside banking channels starts'), src: T2('القرار 449', 'Decision 449'), tone: 'bad' },
  { id: 'dpts', date: '2026-12-31', n: T2('نهاية الفترة الانتقالية لتسجيل PTS', 'End of the PTS registration transition period'), src: T2('القرار 465', 'Decision 465'), tone: 'warn' },
  { id: 'd1m', date: '2027-01-01', n: T2('تسجيل PTS إلزامي للموردين الأجانب ≥ مليون دولار سنويًا', 'PTS registration mandatory for foreign suppliers at USD 1M+ per year'), src: T2('القرار 465', 'Decision 465'), tone: 'warn' },
  { id: 'd100k', date: '2027-03-31', n: T2('يمتد الإلزام إلى الموردين ≥ 100 ألف دولار سنويًا', 'Mandate extends to suppliers at USD 100K+ per year'), src: T2('القرار 465', 'Decision 465'), tone: 'info' },
];

/* ---------- requirements before the first shipment ---------- */
const REQS = {
  license: { n: T2('رخصة النشاط سارية', 'A valid business license'), why: T2('شرط الأهلية، وشرط الاستثناء للأنشطة الفردية في القرار 449.', 'Basic eligibility, and the condition for the sole-trader exemption in Decision 449.'), how: T2('من الجهة التي أصدرت رخصتك. جدّدها قبل انتهائها.', 'From the authority that issued it. Renew before it expires.'), sys: null, who: 'me' },
  cblkey: { n: T2('مفتاح المركزي (CBL Key) وIBAN', 'CBL Key and IBAN'), why: T2('متطلب تسجيل الشركات في FCMS.', 'Required to register a business in FCMS.'), how: T2('اطلبهما من مصرفك التجاري.', 'Ask your commercial bank.'), sys: 'fcms', who: 'bank' },
  pts: { n: T2('رقم PTS في سجل المستوردين', 'PTS number in the importers register'), why: T2('يمنحك هوية إلكترونية لمعاملات التجارة الخارجية.', 'Gives you an electronic identity for foreign trade transactions.'), how: T2('سجّل من بوابة E-Trade.', 'Register on the E-Trade portal.'), sys: 'etrade', who: 'me' },
  aci: { n: T2('التسجيل في ACI', 'ACI registration'), why: T2('شرط لفتح الاعتماد حسب تعميم المركزي (سبتمبر 2025)، وبه يتمكن المورد من إدخال بيانات شحنتك.', 'Required to open a credit per the CBL circular (Sept 2025), and lets your supplier enter your shipment data.'), how: T2('سجّل من بوابة ACI.', 'Register on the ACI portal.'), sys: 'aci', who: 'me' },
  fcms: { n: T2('توثيق المفوّضين في FCMS', 'Authorized users verified in FCMS'), why: T2('يُتحقق من الرقم الوطني والهاتف والجواز مقابل قاعدتي CBL Key وFCMS.', 'National ID, phone and passport are checked against the CBL Key and FCMS databases.'), how: T2('أضف المفوّضين على حسابك المصرفي ثم فعّل الملف.', 'Add authorized users on your bank account, then activate the profile.'), sys: 'fcms', who: 'me' },
  tax: { n: T2('شهادة ضرائب أصلية وحديثة', 'Original, recent tax certificate'), why: T2('من مستندات فتح الاعتماد في ضوابط المركزي المعلنة.', 'One of the documents for opening a credit in the CBL controls as published.'), how: T2('من مصلحة الضرائب. تنتهي صلاحيتها، فجدّدها قبل كل طلب.', 'From the tax authority. It expires, so renew before each request.'), sys: null, who: 'me' },
  ss: { n: T2('شهادة الضمان الاجتماعي', 'Social security certificate'), why: T2('من مستندات فتح الاعتماد في ضوابط المركزي المعلنة.', 'One of the documents for opening a credit in the CBL controls as published.'), how: T2('من صندوق الضمان الاجتماعي.', 'From the social security fund.'), sys: null, who: 'me' },
};
const REQ_ORDER = { company: ['license', 'cblkey', 'pts', 'aci', 'fcms', 'tax', 'ss'], sole: ['license', 'cblkey', 'pts', 'aci', 'fcms'] };

/* ---------- plain-language glossary ---------- */
const GLOSSARY = [
  { id: 'pts', term: 'PTS', what: T2('النظام الرقمي الموحد للتجارة، تديره شبكة ليبيا للتجارة. فيه سجل المستوردين وإشعارات السفن والإقرارات الجمركية.', 'The Unified Digital Trade System run by the Libya Trade Network: importers register, vessel notices, customs declarations.'), you: T2('تحصل منه على رقم PTS. وعلى موردّيك الأجانب التسجيل فيه تدريجيًا من 2027.', 'You get a PTS number. Your foreign suppliers must register there in stages from 2027.'), sys: 'pts' },
  { id: 'aci', term: 'ACI', what: T2('التسجيل المسبق للشحنة لدى الجمارك. ينتج رقمًا يجب أن يظهر في بوليصة الشحن، وبدونه لا تُحمَّل الشحنة.', 'Advance registration of the shipment with Customs. It produces a number that must appear on the bill of lading; without it the cargo is not loaded.'), you: T2('المورد يملأ البيانات وأنت توافق عليها، قبل التحميل بـ 48 ساعة على الأقل.', 'The supplier fills the data and you approve it, at least 48 hours before loading.'), sys: 'aci' },
  { id: 'fcms', term: 'FCMS', what: T2('نظام المصرف المركزي لإدارة النقد الأجنبي. منه يُطلب غطاء الاعتماد والتحويل المباشر.', 'The Central Bank system for foreign currency. Credit cover and direct transfers are requested through it.'), you: T2('تسجّل شركتك فيه بمفتاح المركزي وIBAN، ويرفع مصرفك طلبات الاعتماد عبره.', 'You register your business with a CBL Key and IBAN; your bank files credit requests through it.'), sys: 'fcms' },
  { id: 'lc', term: T2('الاعتماد المستندي', 'Documentary credit (LC)'), what: T2('تعهد من مصرفك بدفع قيمة الشحنة للمورد عند تقديمه مستندات مطابقة.', 'Your bank promises to pay the supplier when matching documents are presented.'), you: T2('تفتحه عند مصرفك التجاري، ويغطيه المركزي بالنقد الأجنبي.', 'You open it at your commercial bank, and the Central Bank covers it with foreign currency.'), sys: null },
  { id: 'cblkey', term: 'CBL Key', what: T2('الرمز الرسمي الذي يعرّف شركتك لدى المصرف المركزي.', 'The official code that identifies your business at the Central Bank.'), you: T2('يصدر عبر مصرفك التجاري.', 'Issued through your commercial bank.'), sys: null },
  { id: 'bl', term: T2('بوليصة الشحن', 'Bill of lading'), what: T2('مستند الناقل الذي يثبت شحن البضاعة، وهو الذي يحمل رقم ACI.', 'The carrier document that proves the goods were shipped; it carries the ACI number.'), you: T2('يسلّمها المورد، وتحتاجها عند الاستلام والتخليص.', 'The supplier provides it; you need it at arrival and clearance.'), sys: null },
  { id: 'hs', term: 'HS code', what: T2('رمز دولي من 6 أرقام على الأقل يصنّف نوع البضاعة.', 'An international code of at least 6 digits that classifies the goods.'), you: T2('يكتبه المورد في بيانات ACI، وتراجعه أنت.', 'The supplier enters it in ACI; you review it.'), sys: null },
  { id: 'inco', term: 'Incoterms', what: T2('شروط التسليم (مثل FOB وCIF) التي تحدد من يدفع الشحن والتأمين.', 'Delivery terms (such as FOB and CIF) that say who pays freight and insurance.'), you: T2('تتفق عليها مع المورد، وتظهر في بيانات ACI المالية.', 'You agree them with the supplier; they appear in the ACI financial data.'), sys: null },
];

/* ---------- source links ---------- */
const URLS = {
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
  { q: T2('من أصدر القرار 449 ومتى يسري؟', 'Who issued Decision 449 and when does it apply?'), c: 'hi', tags: 'قرار 449 وزارة الاقتصاد 30 سبتمبر decision 449 ministry september',
    a: { ar: ['صدر القرار عن **وزير الاقتصاد والتجارة** في حكومة الوحدة الوطنية بتاريخ 6 سبتمبر 2026، وليس عن المصرف المركزي. يسري حظر الاستيراد بغرض التجارة خارج القنوات المصرفية من **30 سبتمبر 2026**.', 'المركزي هو الجهة التي تحدد «القنوات المصرفية الرسمية» وتغطي النقد الأجنبي.'], en: ['The decision was issued by the **Minister of Economy and Trade** of the Government of National Unity on 6 September 2026, not by the Central Bank. The ban on importing for trade outside banking channels applies from **30 September 2026**.', 'The Central Bank defines the “official banking channels” and covers foreign currency.'] },
    src: [[T2('Libya Herald', 'Libya Herald'), URLS.h449]] },
  { q: T2('هل يعني القرار أن الاعتماد المستندي هو الطريق الوحيد؟', 'Does the decision make a documentary credit the only route?'), c: 'mid', tags: 'اعتماد تحويل مباشر قناة مصرفية credit direct transfer channel',
    a: { ar: ['لا. المحظور هو الاستيراد **خارج القنوات المصرفية الرسمية**. تذكر تقارير أن المركزي أتاح قناة **التحويل المباشر** حتى 100 ألف دولار عبر FCMS (المنشور 14 لسنة 2026)، إضافةً إلى الاعتماد المستندي.', 'القرار نفسه لا يعرّف القنوات، ويحيل إلى ما يحدده المركزي. تحقق من مصرفك.'], en: ['No. What is banned is importing **outside official banking channels**. Reports say the Central Bank opened a **direct transfer** channel up to USD 100,000 through FCMS (Circular 14 of 2026), alongside documentary credits.', 'The decision itself does not define the channels and defers to the Central Bank. Check with your bank.'] },
    src: [[T2('Libya Herald', 'Libya Herald'), URLS.direct], [T2('القرار 449', 'Decision 449'), URLS.h449]] },
  { q: T2('ما استثناء النشاط الفردي؟', 'What is the sole-trader exemption?'), c: 'lo', tags: 'نشاط فردي سقف 100 ألف sole trader cap',
    a: { ar: ['القرار يسمح للأنشطة الفردية بالاستيراد للتجارة **ضمن سقف سنوي** بشرط رخصة نشاط سارية والالتزام بالإجراءات المصرفية والتجارية والجمركية وتوثيق قيمة الشحنة.', 'المصدر الأساسي لا يذكر رقم السقف. تقارير أخرى ذكرت **100 ألف دولار حتى نهاية 2026**. لم نتحقق من النص الرسمي.'], en: ['The decision lets sole traders import for trade **within an annual limit**, provided they hold a valid business license, follow banking, commercial and customs procedures and document the shipment value.', 'The main source does not give the limit. Other reports said **USD 100,000 until the end of 2026**. We have not verified the official text.'] },
    src: [[T2('Libya Herald', 'Libya Herald'), URLS.h449]] },
  { q: T2('ما الذي يمنع الإفراج الجمركي؟', 'What can block customs release?'), c: 'mid', tags: 'إفراج جمارك إثبات القيمة release customs proof value',
    a: { ar: ['وفق القرار لا تُخلَّص الشحنة التجارية قبل استيفاء المتطلبات **المصرفية والتجارية والجمركية** وتقديم **ما يثبت قيمتها الفعلية**.', 'لذلك يتتبع التطبيق مستندات إثبات القيمة (الفاتورة النهائية وإثبات التحويل أو الاعتماد) كبوابة مستقلة قبل الإفراج.'], en: ['Under the decision a commercial shipment is not cleared until the **banking, commercial and customs** requirements are met and **proof of its actual value** is provided.', 'So the app tracks proof-of-value documents (final invoice and proof of transfer or credit) as a separate step before release.'] },
    src: [[T2('Libya Herald', 'Libya Herald'), URLS.h449]] },
  { q: T2('متى يلزم تسجيل المورد الأجنبي في PTS؟', 'When must a foreign supplier register in PTS?'), c: 'hi', tags: 'PTS تسجيل مورد 465 مليون register supplier',
    a: { ar: ['بموجب القرار 465 لسنة 2026: فترة انتقالية حتى **31 ديسمبر 2026**، ثم إلزام من **1 يناير 2027** للموردين الذين تبلغ شحناتهم إلى ليبيا **مليون دولار فأكثر سنويًا**، ويمتد من **31 مارس 2027** إلى من يبلغ **100 ألف دولار** سنويًا.', 'التسجيل ينتج شهادة تسجيل ورقمًا تعريفيًا إلكترونيًا (PTS Code).'], en: ['Under Decision 465 of 2026: a transition period until **31 December 2026**, then mandatory from **1 January 2027** for suppliers shipping **USD 1 million or more per year** to Libya, extending from **31 March 2027** to those at **USD 100,000** per year.', 'Registration produces a certificate and an electronic ID number (PTS Code).'] },
    src: [[T2('Libya Herald', 'Libya Herald'), URLS.h465]] },
  { q: T2('ما الفرق بين PTS وACI وFCMS؟', 'What is the difference between PTS, ACI and FCMS?'), c: 'hi', tags: 'الفرق منظومة difference systems',
    a: { ar: ['**PTS**: بوابة شبكة ليبيا للتجارة (E-Trade وE-Logistic وTCN-ACI وE-Custom) لتسجيل المستوردين والموردين ومستندات التجارة واللوجستيات.', '**ACI**: نظام الجمارك للتسجيل المسبق للشحنات قبل التحميل، وينتج رقمًا يجب أن يظهر في بوليصة الشحن.', '**FCMS**: نظام المركزي لإدارة النقد الأجنبي، ومنه يُطلب غطاء الاعتماد والتحويل المباشر.'], en: ['**PTS**: the Libya Trade Network portal (E-Trade, E-Logistic, TCN-ACI, E-Custom) for registering importers and suppliers, trade documents and logistics.', '**ACI**: the Customs system for registering a shipment before loading; it produces a number that must appear on the bill of lading.', '**FCMS**: the Central Bank system for foreign currency; credit cover and direct transfers are requested through it.'] },
    src: [[T2('بوابة PTS', 'PTS portal'), URLS.pts], [T2('خدمة ACI', 'ACI service'), URLS.aciPage], [T2('إعلان FCMS', 'FCMS announcement'), URLS.fcms]] },
  { q: T2('قبل كم ساعة من التحميل يجب اعتماد رقم ACI؟', 'How long before loading must the ACI number be validated?'), c: 'mid', tags: 'ACI 48 ساعة تحميل hours loading',
    a: { ar: ['إشعار الناقل CMA CGM يطلب التحقق من الرقم **قبل التحميل بـ 48 ساعة على الأقل** وتطبّق «لا ACI = لا تحميل». دليل آخر يذكر 24 ساعة.', 'يعتمد التطبيق 48 ساعة كحد أمان، وراجع شركة الشحن لموعدها.'], en: ['The CMA CGM advisory asks for the number to be validated **at least 48 hours before loading** and applies “no ACI, no load”. Another guide says 24 hours.', 'The app uses 48 hours as the safe limit; check your shipping line for its deadline.'] },
    src: [[T2('CMA CGM', 'CMA CGM'), URLS.cma]] },
  { q: T2('هل أستطيع فتح اعتماد دون تسجيل في ACI؟', 'Can I open a credit without ACI registration?'), c: 'mid', tags: 'ACI شرط اعتماد تعميم circular credit',
    a: { ar: ['تقرير عن تعميم المركزي (سبتمبر 2025) يقول إن المصارف **لا تفتح اعتمادات** لاستيراد البضائع ما لم يُسجَّل الطالب في ACI، بدءًا من 1 نوفمبر 2025. لم نتحقق من التطبيق الفعلي لدى كل مصرف.'], en: ['A report on a Central Bank circular (September 2025) says banks **do not open credits** to import goods unless the applicant is registered in ACI, from 1 November 2025. We have not verified how each bank applies it.'] },
    src: [[T2('العربي الجديد', 'Al-Araby Al-Jadeed'), URLS.circ]] },
  { q: T2('ما المستندات التي يطلبها المصرف عادةً؟', 'Which documents does the bank usually ask for?'), c: 'mid', tags: 'مستندات اعتماد مصرف تفتيش تأمين documents bank inspection insurance',
    a: { ar: ['حسب ضوابط المركزي المعتمدة في ديسمبر 2020: فاتورة أولية من المصدّر، وثيقة تأمين من شركة محلية، **شهادة تفتيش**، شهادات ضرائب وضمان اجتماعي أصلية وحديثة، وتطابق الفاتورة مع شهادة التفتيش.', 'قد تكون هناك تحديثات لاحقة لم نصل إليها. اسأل قسم الاعتمادات في مصرفك.'], en: ['Per the Central Bank controls approved in December 2020: an initial invoice from the exporter, an insurance policy from a local insurer, an **inspection certificate**, original recent tax and social security certificates, and the invoice matching the inspection certificate.', 'There may be later updates we have not found. Ask your bank’s credits desk.'] },
    src: [[T2('Libya Herald (2021)', 'Libya Herald (2021)'), URLS.ctrl2020]] },
  { q: T2('ما الحد الأقصى للاعتماد الواحد؟', 'What is the maximum for a single credit?'), c: 'lo', tags: 'سقف اعتماد 5 مليون cap credit million',
    a: { ar: ['ضوابط 2020: **5 ملايين$ تجاري، 10 ملايين$ صناعي، 3 ملايين$ خدمات**. تعليق من غرفة التجارة الدولية (2025) يذكر 3 ملايين تجاري و5 ملايين صناعي. المصادر متعارضة ولا نص رسمي حديثًا بين أيدينا.'], en: ['2020 controls: **USD 5M commercial, 10M industrial, 3M services**. An ICC commentary (2025) mentions 3M commercial and 5M industrial. Sources conflict and we hold no recent official text.'] },
    src: [[T2('Libya Herald (2021)', 'Libya Herald (2021)'), URLS.ctrl2020]] },
  { q: T2('ما صيغة سقف الاعتمادات المرتبطة بالضرائب؟', 'What is the tax-linked credit ceiling formula?'), c: 'lo', tags: 'سقف ضرائب 30 ضعف ceiling tax formula',
    a: { ar: ['أعلنت الوزارة (20 أغسطس 2026) أن السقف السنوي للاعتمادات والتحويلات = **30 ضعف متوسط ضريبة الدخل + 10 أضعاف متوسط ضريبة المرتبات** لثلاث سنوات.', 'لم يصدر قرار منشور ولا تاريخ نفاذ، ولم يعلّق المركزي. نعرضها كتقدير فقط في شاشة التمويل.'], en: ['The ministry announced (20 August 2026) that the annual ceiling for credits and transfers = **30 times the average income tax + 10 times the average payroll tax** over three years.', 'No decision text or effective date was published and the Central Bank has not commented. We show it only as an estimate in the Finance screen.'] },
    src: [[T2('Rio Times', 'Rio Times'), URLS.formula]] },
  { q: T2('هل يوجد تطبيق رسمي لإدخال البيانات الجمركية؟', 'Is there an official app for entering customs data?'), c: 'mid', tags: 'تطبيق جوال رسمي official mobile app',
    a: { ar: ['لم نجد تطبيقًا رسميًا للجوال من الجمارك أو شبكة ليبيا للتجارة أو المركزي. بوابات PTS وACI وFCMS تعمل عبر المتصفح. غياب الدليل ليس إثباتًا قاطعًا، فتحقق من المتجرين.'], en: ['We found no official mobile app from Customs, the Libya Trade Network or the Central Bank. PTS, ACI and FCMS work in the browser. Absence of evidence is not proof, so check the app stores.'] },
    src: [[T2('بوابة PTS', 'PTS portal'), URLS.pts]] },
  { q: T2('هل هذا التطبيق جهة رسمية أو موصول بالبوابات؟', 'Is this app official, or connected to the portals?'), c: 'hi', tags: 'رسمي تكامل official integration',
    a: { ar: ['لا. هذا نموذج تجريبي لتطبيق **مرافق**: يجهّز بياناتك ويتحقق منها ويتتبع المتطلبات والمواعيد. الدخول إلى البوابات الرسمية يتم من بواباتها، وبيانات العرض كلها أمثلة.'], en: ['No. This is a prototype of a **companion** app: it prepares and checks your data and tracks requirements and deadlines. You still use the official portals themselves, and the demo data are all examples.'] },
    src: [] },
  { q: T2('هل ينطبق القرار شرق ليبيا؟', 'Does the decision apply in eastern Libya?'), c: 'lo', tags: 'شرق ليبيا الحكومتان east libya',
    a: { ar: ['القرار صادر عن وزارة في طرابلس، ولم نجد إعلانًا عن تطبيقه من السلطات في الشرق. التقارير تشير إلى احتمال التفاوت بين الجانبين. تحقق قبل أي شحنة إلى بنغازي.'], en: ['The decision comes from a ministry in Tripoli and we found no announcement of its application by the authorities in the east. Reports point to possible differences between the two sides. Check before any shipment to Benghazi.'] },
    src: [[T2('Rio Times', 'Rio Times'), URLS.formula]] },
];

const SOURCES = [
  { g: T2('القرارات', 'Decisions'), items: [[T2('Libya Herald · القرار 449', 'Libya Herald · Decision 449'), URLS.h449], [T2('Libya Herald · القرار 465 (PTS)', 'Libya Herald · Decision 465 (PTS)'), URLS.h465], [T2('غرفة تجارة طرابلس', 'Tripoli Chamber of Commerce'), URLS.chamber]] },
  { g: T2('المنظومات', 'Systems'), items: [['PTS', URLS.pts], [T2('خدمة ACI · الجمارك', 'ACI service · Customs'), URLS.aciPage], [T2('دليل مستخدم ACI', 'ACI user guide'), URLS.aciGuide], [T2('إعلان FCMS · المركزي', 'FCMS announcement · CBL'), URLS.fcms]] },
  { g: T2('المصارف والمركزي', 'Banks & Central Bank'), items: [[T2('ضوابط الاعتمادات 2020', '2020 credit controls'), URLS.ctrl2020], [T2('تعميم ربط الاعتماد بـ ACI', 'Circular linking credits to ACI'), URLS.circ], [T2('التحويل المباشر (مايو 2026)', 'Direct transfers (May 2026)'), URLS.direct], [T2('شهادات المطابقة · Bureau Veritas', 'Conformity certificates · Bureau Veritas'), URLS.bv]] },
  { g: T2('الشحن والرقابة', 'Shipping & oversight'), items: [[T2('CMA CGM · إشعار ACI', 'CMA CGM · ACI advisory'), URLS.cma], [T2('إشعارات وصول السفن (طرابلس والخمس)', 'Vessel arrival notices (Tripoli and Khoms)'), URLS.ports], [T2('القائمة السوداء لـ 500 شركة', 'Blacklist of 500 companies'), URLS.aca], [T2('صيغة سقف الاعتمادات', 'Credit ceiling formula'), URLS.formula]] },
];
