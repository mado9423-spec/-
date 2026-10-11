/* ---------- data integrity: everything that enters the app from outside (this device's storage, a backup file, the cloud)
   passes through here, so one malformed record cannot crash a screen, poison a calculation or inject markup. ---------- */
const MAX_STR = 2000;
const MAX_ITEMS = 3000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

/* deep copy that keeps only plain JSON: bounded depth, string length and array size; no prototype keys; finite numbers */
function scrub(x, depth = 0) {
  if (x === null) return null;
  const t = typeof x;
  if (t === 'string') return x.length > MAX_STR ? x.slice(0, MAX_STR) : x;
  if (t === 'number') return Number.isFinite(x) ? x : 0;
  if (t === 'boolean') return x;
  if (t !== 'object' || depth > 8) return undefined;
  if (Array.isArray(x)) return x.slice(0, MAX_ITEMS).map((v) => scrub(v, depth + 1)).filter((v) => v !== undefined);
  const o = {};
  for (const k of Object.keys(x)) {
    if (FORBIDDEN_KEYS.has(k)) continue;
    const v = scrub(x[k], depth + 1);
    if (v !== undefined) o[k] = v;
  }
  return o;
}

const sStr = (v, max = 300) => (typeof v === 'string' ? v : v == null ? '' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '').slice(0, max);
const sNum = (v, min = -Infinity, max = Infinity, dflt = 0) => { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt; };
const sDay = (v) => (typeof v === 'string' && ISO_DAY.test(v) && !Number.isNaN(Date.parse(v)) ? v : '');
const sBi = (v) => (isObj(v) ? { ar: sStr(v.ar, 400), en: sStr(v.en, 400) } : sStr(v, 400)); /* a bilingual title or a plain string */
const sEnum = (v, list, dflt) => (list.includes(v) ? v : dflt);
const sObjList = (v, fn, max = 500) => (Array.isArray(v) ? v.slice(0, max).filter(isObj).map(fn) : []);

const LC_STATUSES = ['draft', 'submitted', 'awaiting_cover', 'issued', 'closed'];
const CHANNELS = ['LC', 'TRANSFER', 'SOLE'];

function normLc(x) {
  if (!isObj(x) || !sStr(x.no, 40).trim()) return null;
  return {
    ...scrub(x),
    no: sStr(x.no, 40).trim(), desc: sBi(x.desc), bank: sStr(x.bank, 20), open: sDay(x.open) || iso(TODAY),
    days: Math.round(sNum(x.days, 1, 3650, 60)), usd: sNum(x.usd, 0, 1e12), rate: sNum(x.rate, 0.0001, 1000, RATE.avg), cover: sNum(x.cover, 0, 100, 100), dev: sNum(x.dev, 0, 100, 0),
    status: sEnum(x.status, LC_STATUSES, 'draft'), paid: sNum(x.paid, 0, 1e15), invoices: (Array.isArray(x.invoices) ? x.invoices.slice(0, 500) : []).map((n) => sNum(n, 0, 1e12)),
    sector: sEnum(x.sector, Object.keys(SECTORS), 'commercial'), supplier: sStr(x.supplier, 200),
  };
}
function normShip(x) {
  if (!isObj(x) || !sStr(x.id, 60).trim()) return null;
  const a = isObj(x.aci) ? x.aci : {};
  const sup = isObj(x.supplier) ? x.supplier : {};
  const docs = {};
  if (isObj(x.docs)) for (const k of Object.keys(x.docs)) { if (!FORBIDDEN_KEYS.has(k) && isObj(x.docs[k])) docs[k] = { ...scrub(x.docs[k]), file: sStr(x.docs[k].file, 260), at: sDay(x.docs[k].at) }; }
  const manual = {};
  if (isObj(x.manual)) for (const k of Object.keys(x.manual)) { if (!FORBIDDEN_KEYS.has(k)) manual[k] = !!x.manual[k]; }
  return {
    ...scrub(x),
    id: sStr(x.id, 60).trim(), title: sBi(x.title), cat: sStr(x.cat, 30), supplier: { name: sStr(sup.name, 200), country: sStr(sup.country, 4), pts: !!sup.pts },
    channel: sEnum(x.channel, CHANNELS, 'LC'), lcNo: sStr(x.lcNo, 40), valueUsd: sNum(x.valueUsd, 0, 1e12), created: sDay(x.created) || iso(TODAY), etd: sDay(x.etd), eta: sDay(x.eta),
    pol: sStr(x.pol, 80), pod: sStr(x.pod, 10), dest: sStr(x.dest, 10), vessel: sStr(x.vessel, 120), imo: sStr(x.imo, 12), voyage: sStr(x.voyage, 40), carrier: sStr(x.carrier, 120), agent: sStr(x.agent, 120), booking: sStr(x.booking, 60),
    incoterm: sStr(x.incoterm, 4), freight: sNum(x.freight, 0, 1e12), insurance: sNum(x.insurance, 0, 1e12), currency: sStr(x.currency, 4) || 'USD',
    items: sObjList(x.items, (it) => ({ ...scrub(it), desc: sStr(it.desc, 400), hs: sStr(it.hs, 16), origin: sStr(it.origin, 4), pkgs: sNum(it.pkgs, 0, 1e9), pkgType: sStr(it.pkgType, 20), gross: sNum(it.gross, 0, 1e9), net: sNum(it.net, 0, 1e9) })),
    containers: sObjList(x.containers, (c) => ({ ...scrub(c), no: sStr(c.no, 16), type: sStr(c.type, 8), seal: sStr(c.seal, 30), pkgs: sNum(c.pkgs, 0, 1e9), tare: sNum(c.tare, 0, 1e6), gross: sNum(c.gross, 0, 1e6) })),
    arrived: sDay(x.arrived) || null, noticeFiled: !!x.noticeFiled, docs, manual,
    aci: {
      ...scrub(a), status: aciIndex(a.status) >= 0 ? a.status : 'draft', number: a.number == null ? null : sStr(a.number, 60), exporterTin: sStr(a.exporterTin, 40), importerStat: sStr(a.importerStat, 40), exportCountry: sStr(a.exportCountry, 4),
      history: sObjList(a.history, (h_) => ({ s: aciIndex(h_.s) >= 0 ? h_.s : 'draft', at: sDay(h_.at) }), 100),
    },
  };
}
function normDoc(x) {
  if (!isObj(x) || !sStr(x.id, 60).trim()) return null;
  return { ...scrub(x), id: sStr(x.id, 60).trim(), type: sStr(x.type, 20), file: sStr(x.file, 260), exp: sDay(x.exp) || null };
}
function normActivity(x) {
  if (!isObj(x) || !sStr(x.id, 60).trim()) return null;
  return { id: sStr(x.id, 60).trim(), at: sDay(x.at) || iso(TODAY), ic: sStr(x.ic, 20), t: sBi(x.t), ref: sStr(x.ref, 60) };
}
const NORMALIZERS = { ships: normShip, lcs: normLc, companyDocs: normDoc, activity: normActivity };

/* returns { state, dropped } or { state: null } when the input is not a usable state of this data version */
function normalizeState(raw) {
  if (!isObj(raw) || raw.v !== DATA_VERSION) return { state: null, dropped: 0 };
  const base = emptyState();
  let dropped = 0;
  const list = (key) => {
    const src = Array.isArray(raw[key]) ? raw[key].slice(0, MAX_ITEMS) : [];
    const seen = new Set();
    const out = [];
    const idOf = key === 'lcs' ? 'no' : 'id';
    src.forEach((x) => {
      const n = NORMALIZERS[key](x);
      if (!n || seen.has(n[idOf])) { dropped++; return; }
      seen.add(n[idOf]); out.push(n);
    });
    if (Array.isArray(raw[key]) && raw[key].length > MAX_ITEMS) dropped += raw[key].length - MAX_ITEMS;
    return out;
  };
  const o = isObj(raw.org) ? raw.org : {};
  const t = isObj(raw.tax) ? raw.tax : {};
  const reqIds = Object.keys(REQS);
  const state = {
    ...base,
    mode: raw.mode === 'demo' ? 'demo' : 'live', onboarded: !!raw.onboarded, theme: sEnum(raw.theme, ['light', 'dark'], null), simple: raw.simple !== false, seenNotif: !!raw.seenNotif, bankSel: Math.round(sNum(raw.bankSel, 0, 50)),
    org: { ...scrub(o), type: sEnum(o.type, ['company', 'sole'], null), name: sBi(o.name), stat: sStr(o.stat, 40), ptsCode: sStr(o.ptsCode, 40), goods: sStr(o.goods, 30) || 'other', valueBand: sEnum(o.valueBand, ['low', 'mid', 'high', ''], '') },
    tax: { income: sNum(t.income, 0, 1e15), payroll: sNum(t.payroll, 0, 1e15) },
    profile: sObjList(raw.profile, (p) => ({ id: sStr(p.id, 30), done: !!p.done, note: sStr(p.note, 500) }), 50).filter((p) => reqIds.includes(p.id)),
    companyDocs: list('companyDocs'), lcs: list('lcs'), ships: list('ships'), activity: list('activity').slice(0, 40),
  };
  if (o.resell !== undefined) state.org.resell = !!o.resell;
  return { state, dropped };
}
