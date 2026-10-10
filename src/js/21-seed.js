/* ---------- state factories ---------- */
function emptyState() {
  return {
    v: DATA_VERSION, mode: 'live', onboarded: false, theme: null, simple: true, seenNotif: false, bankSel: 0,
    org: { type: null, name: '', stat: '', ptsCode: '', goods: 'other', valueBand: '' },
    tax: { income: 0, payroll: 0 },
    profile: [], companyDocs: [], lcs: [], ships: [], activity: [],
  };
}
const orgName = () => L(S.org.name) || tr('نشاطي', 'My business');

/* Demo data: every name and figure is an example (bilingual so the language switch works on the sample too) */
function seedDemo() {
  const d = (n) => iso(addDays(TODAY, n));
  const ct = (o, s, type, seal, pkgs, tare, gross) => ({ no: makeContainer(o, s), type, seal, pkgs, tare, gross });

  const lcs = [
    { no: '522231', desc: T2('مواد غذائية معلّبة · تركيا', 'Canned foods · Türkiye'), bank: 'jum', open: d(-6), days: 60, usd: 480000, rate: 6.34, cover: 20, dev: 5, status: 'issued', paid: 300000, invoices: [], sector: 'commercial', supplier: 'Mersin Gida A.S.' },
    { no: '522226', desc: T2('أجهزة منزلية · الصين', 'Home appliances · China'), bank: 'com', open: d(-26), days: 60, usd: 1000000, rate: 6.32, cover: 15, dev: 10, status: 'issued', paid: 948000, invoices: [960000], sector: 'commercial', supplier: 'Shenzhen Brightway Electronics' },
    { no: '522240', desc: T2('إطارات مركبات · الهند', 'Vehicle tyres · India'), bank: 'nat', open: d(-62), days: 90, usd: 210000, rate: 6.28, cover: 30, dev: 5, status: 'issued', paid: 395000, invoices: [208000], sector: 'commercial', supplier: 'Gujarat Tyre Works Pvt' },
    { no: '522198', desc: T2('معدات تعبئة · إيطاليا', 'Packaging equipment · Italy'), bank: 'wah', open: d(-3), days: 60, usd: 3200000, rate: 6.3, cover: 25, dev: 10, status: 'awaiting_cover', paid: 0, invoices: [], sector: 'industrial', supplier: 'Packlinea S.r.l.' },
    { no: '522150', desc: T2('أجهزة تكييف · إيطاليا', 'Air conditioners · Italy'), bank: 'sah', open: d(-150), days: 90, usd: 650000, rate: 6.28, cover: 100, dev: 0, status: 'closed', paid: 4082000, invoices: [650000], sector: 'commercial', supplier: 'Clima Nord S.p.A.' },
  ];

  const ships = [
    {
      id: 'SH-2610-014', title: T2('مواد غذائية معلّبة', 'Canned foods'), cat: 'food', supplier: { name: 'Mersin Gida A.S.', country: 'TR', pts: true },
      channel: 'LC', lcNo: '522231', valueUsd: 480000, created: d(-6), etd: d(9), eta: d(21), pol: 'Mersin', pod: 'MRA', dest: 'MRA',
      vessel: '', imo: '', voyage: '', carrier: '', agent: '', booking: '', incoterm: 'CFR', freight: 0, insurance: 0, currency: 'USD',
      items: [], containers: [], arrived: null, noticeFiled: false,
      docs: { invoice: { file: 'proforma-MG-2210.pdf', at: d(-5) }, inspection: { file: 'SGS-cert-88213.pdf', at: d(-4) }, origin: { file: 'CoO-TR-4471.pdf', at: d(-4) } },
      manual: {},
      aci: { status: 'importer_review', number: null, exporterTin: '4820193756', importerStat: 'LY-33018', exportCountry: 'TR', history: [{ s: 'draft', at: d(-2) }, { s: 'importer_review', at: d(0) }] },
    },
    {
      id: 'SH-2609-007', title: T2('أجهزة منزلية', 'Home appliances'), cat: 'appliances', supplier: { name: 'Shenzhen Brightway Electronics', country: 'CN', pts: true },
      channel: 'LC', lcNo: '522226', valueUsd: 960000, created: d(-24), etd: d(-12), eta: d(9), pol: 'Shanghai', pod: 'TIP', dest: 'TIP',
      vessel: 'MV Marina Dawn', imo: '9456123', voyage: '026E', carrier: 'Orient Lines', agent: 'Med Shipping Agency', booking: 'OL-5530921', incoterm: 'CIF', freight: 38000, insurance: 4800, currency: 'USD',
      items: [{ desc: 'Household refrigerators and washing machines', hs: '8418.10', origin: 'CN', pkgs: 1280, pkgType: 'carton', gross: 45000, net: 41200 }],
      containers: [ct('OLC', '482917', '40HC', 'SL770412', 640, 3900, 26400), ct('OLC', '482933', '40HC', 'SL770413', 640, 3900, 26400)],
      arrived: null, noticeFiled: false,
      docs: { invoice: { file: 'CI-BW-7731.pdf', at: d(-20) }, inspection: { file: 'BV-cert-5521.pdf', at: d(-18) }, insurance: { file: 'policy-LI-90442.pdf', at: d(-17) }, origin: { file: 'CoO-CN-2299.pdf', at: d(-16) }, packing: { file: 'PL-BW-7731.pdf', at: d(-16) }, booking: { file: 'booking-OL5530921.pdf', at: d(-15) }, bl: { file: 'BL-OL5530921.pdf', at: d(-12) } },
      manual: {},
      aci: { status: 'completed', number: 'ACI-DEMO-481772', exporterTin: '91440300MA5F', importerStat: 'LY-33018', exportCountry: 'CN', history: [{ s: 'draft', at: d(-21) }, { s: 'importer_review', at: d(-20) }, { s: 'supplier_completion', at: d(-19) }, { s: 'customs_review', at: d(-17) }, { s: 'awaiting_bl', at: d(-14) }, { s: 'bl_review', at: d(-12) }, { s: 'completed', at: d(-11) }] },
    },
    {
      id: 'SH-2608-019', title: T2('إطارات مركبات', 'Vehicle tyres'), cat: 'tyres', supplier: { name: 'Gujarat Tyre Works Pvt', country: 'IN', pts: false },
      channel: 'LC', lcNo: '522240', valueUsd: 208000, created: d(-58), etd: d(-27), eta: d(-3), pol: 'Mundra', pod: 'KHM', dest: 'KHM',
      vessel: 'MV Gulf Harmony', imo: '9387410', voyage: '0914', carrier: 'Indus Container Line', agent: 'Khoms Maritime', booking: 'ICL-77120', incoterm: 'CFR', freight: 5200, insurance: 900, currency: 'USD',
      items: [{ desc: 'New passenger car tyres 205/55R16', hs: '4011.10', origin: 'IN', pkgs: 1100, pkgType: 'pallet', gross: 21000, net: 19600 }],
      containers: [ct('ICL', '774029', '40HC', 'IC334110', 1100, 4000, 25000)],
      arrived: d(-3), noticeFiled: true,
      docs: { invoice: { file: 'CI-GT-1180.pdf', at: d(-40) }, inspection: { file: 'Intertek-90218.pdf', at: d(-38) }, insurance: { file: 'policy-LI-88120.pdf', at: d(-37) }, origin: { file: 'CoO-IN-0771.pdf', at: d(-36) }, packing: { file: 'PL-GT-1180.pdf', at: d(-36) }, conformity: { file: 'CoC-ARN-3345.pdf', at: d(-35) }, booking: { file: 'booking-ICL77120.pdf', at: d(-30) }, bl: { file: 'BL-ICL77120.pdf', at: d(-27) }, declaration: { file: 'import-declaration-draft.pdf', at: d(-2) } },
      manual: {},
      aci: { status: 'completed', number: 'ACI-DEMO-390518', exporterTin: '24AAACG1182M', importerStat: 'LY-33018', exportCountry: 'IN', history: [{ s: 'draft', at: d(-45) }, { s: 'importer_review', at: d(-44) }, { s: 'supplier_completion', at: d(-43) }, { s: 'customs_review', at: d(-40) }, { s: 'awaiting_bl', at: d(-31) }, { s: 'bl_review', at: d(-27) }, { s: 'completed', at: d(-26) }] },
    },
    {
      id: 'SH-2605-003', title: T2('أجهزة تكييف', 'Air conditioners'), cat: 'appliances', supplier: { name: 'Clima Nord S.p.A.', country: 'IT', pts: true },
      channel: 'LC', lcNo: '522150', valueUsd: 650000, created: d(-148), etd: d(-120), eta: d(-104), pol: 'Genoa', pod: 'TIP', dest: 'TIP',
      vessel: 'MV Ligure Star', imo: '9301552', voyage: '012W', carrier: 'Tyrrhenian Lines', agent: 'Tripoli Marine Services', booking: 'TL-41007', incoterm: 'CIF', freight: 21000, insurance: 3000, currency: 'EUR',
      items: [{ desc: 'Split-system air conditioners', hs: '8415.10', origin: 'IT', pkgs: 900, pkgType: 'carton', gross: 30000, net: 27500 }],
      containers: [ct('TLN', '118842', '40HC', 'TL220091', 900, 3900, 33900)],
      arrived: d(-104), noticeFiled: true,
      docs: { invoice: { file: 'CI-CN-5521.pdf', at: d(-130) }, inspection: { file: 'cert-1.pdf', at: d(-128) }, insurance: { file: 'policy.pdf', at: d(-127) }, origin: { file: 'coo.pdf', at: d(-127) }, packing: { file: 'pl.pdf', at: d(-126) }, bl: { file: 'bl.pdf', at: d(-120) }, declaration: { file: 'decl.pdf', at: d(-100) }, valueProof: { file: 'proof.pdf', at: d(-100) } },
      manual: { 'set.match': true },
      customs: { released: true },
      aci: { status: 'released', number: 'ACI-DEMO-205514', exporterTin: 'IT01234567890', importerStat: 'LY-33018', exportCountry: 'IT', history: [{ s: 'released', at: d(-100) }] },
    },
  ];

  const profile = REQ_ORDER.company.map((id) => ({ id, done: !['fcms', 'tax'].includes(id), note: id === 'fcms' ? T2('مفوّض واحد بانتظار التوثيق', 'One authorized user is awaiting verification') : id === 'tax' ? T2('منتهية', 'Expired') : '' }));

  const companyDocs = [
    { id: 'cd1', type: 'license', file: 'license-2026.pdf', exp: d(214) },
    { id: 'cd2', type: 'tax', file: 'tax-cert-2025.pdf', exp: d(-12) },
    { id: 'cd3', type: 'ss', file: 'ss-cert.pdf', exp: d(88) },
    { id: 'cd4', type: 'pts', file: 'pts-registration.pdf', exp: null },
    { id: 'cd5', type: 'aci', file: 'aci-account.pdf', exp: null },
    { id: 'cd6', type: 'cblkey', file: 'cbl-key-letter.pdf', exp: null },
  ];

  const activity = [
    { id: 'ev1', at: d(0), ic: 'mail', t: T2('بريد من ACI: بيانات شحنة SH-2610-014 بانتظار مراجعتك', 'ACI email: shipment SH-2610-014 data is waiting for your review'), ref: 'SH-2610-014' },
    { id: 'ev2', at: d(-1), ic: 'bank', t: T2('صدر الاعتماد 522231 لدى مصرف الجمهورية', 'Credit 522231 was issued at Jumhouria Bank'), ref: '522231' },
    { id: 'ev3', at: d(-3), ic: 'anchor', t: T2('وصلت الشحنة SH-2608-019 إلى ميناء الخمس', 'Shipment SH-2608-019 arrived at Khoms port'), ref: 'SH-2608-019' },
    { id: 'ev4', at: d(-11), ic: 'shield', t: T2('اكتمل ACI للشحنة SH-2609-007 (ACI-DEMO-481772)', 'ACI completed for shipment SH-2609-007 (ACI-DEMO-481772)'), ref: 'SH-2609-007' },
  ];

  return {
    v: DATA_VERSION, mode: 'demo', onboarded: true, theme: null, simple: true, seenNotif: false, bankSel: 0,
    org: { type: 'company', name: T2('شركة الأفق للاستيراد', 'Horizon Import Co.'), stat: 'LY-33018', ptsCode: 'PTS-DEMO-30417', goods: 'appliances', valueBand: 'mid' },
    tax: { income: 2400000, payroll: 700000 },
    profile, companyDocs, lcs, ships, activity,
  };
}
