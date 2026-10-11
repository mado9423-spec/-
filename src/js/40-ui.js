/* ---------- UI primitives ---------- */
const UI = { tab: 'home', pages: [], sheets: [], shipFilter: 'all', shipQuery: '', lcFilter: 'all', docsTab: 'company', faqQuery: '', onb: null };
const tabs = () => [
  { id: 'home', n: tr('الرئيسية', 'Home'), ic: 'home' },
  { id: 'ships', n: tr('رحلاتي', 'Shipments'), ic: 'box' },
  { id: 'fin', n: tr('التمويل', 'Finance'), ic: 'bank' },
  { id: 'more', n: tr('المزيد', 'More'), ic: 'hub' },
];
const TAB_IDS = ['home', 'ships', 'fin', 'more'];

function rich(text) {
  const f = document.createDocumentFragment();
  String(text).split(/(\*\*[^*]+\*\*)/).forEach((p) => {
    if (!p) return;
    if (p.startsWith('**')) f.append(h('b', null, p.slice(2, -2)));
    else f.append(document.createTextNode(bidi(p)));
  });
  return f;
}
const pill = (text, tone = 'idle', ic) => h('span', { class: 'pill ' + tone }, ic ? icon(ic) : null, text);
const confTag = (c) => h('span', { class: 'conf ' + c }, c === 'hi' ? tr('مؤكد', 'Confirmed') : c === 'mid' ? tr('متوسط التأكد', 'Fairly sure') : tr('غير مؤكد', 'Unconfirmed'));
const kv = (k, v) => h('div', { class: 'kv' }, h('span', null, k), h('b', null, v));
const whoChip = (w) => h('span', { class: 'who' + (w === 'me' ? ' me' : '') }, whoName(w));
function extLink(key, label) {
  const s = SYS[key];
  return h('a', { class: 'sysbtn', href: s.url, target: '_blank', rel: 'noopener noreferrer', onclick: (e) => e.stopPropagation() }, label || s.code, icon('ext'));
}
function srcLink(label, url) { return h('a', { class: 'src', href: url, target: '_blank', rel: 'noopener noreferrer' }, L(label), icon('ext')); }

let toastT = 0;
function toast(msg) {
  const box = $('#toast');
  clear(box).append(h('div', null, msg));
  box.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => box.classList.remove('show'), 2600);
}

function ring({ pct, size = 118, stroke = 10, track = 'rgba(255,255,255,.13)', c1 = '#f4dca0', c2 = '#d1a24d', mid, delay = 120 }) {
  const id = uid('g');
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
    <circle class="arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="0 ${C}"/>`;
  const arc = svg.querySelector('.arc');
  arc.style.transition = 'stroke-dasharray 1.1s cubic-bezier(.2,.9,.25,1)'; /* via CSSOM: inline style attributes are blocked by the CSP */
  const target = `${Math.max(0.5, (clamp(pct, 0, 100) / 100) * C)} ${C}`;
  setTimeout(() => arc.setAttribute('stroke-dasharray', target), delay);
  return h('div', { class: 'ringbox', style: { width: size + 'px', height: size + 'px' } }, svg, mid ? h('div', { class: 'mid' }, mid) : null);
}

/* swipe-to-confirm: the thumb starts at the reading-start side and travels toward the end side */
function swipeConfirm(label, onDone) {
  const rtl = isRTL();
  const root = h('div', { class: 'swipe' + (rtl ? '' : ' fwd'), role: 'group' });
  const fill = h('div', { class: 'fill' });
  const tx = h('div', { class: 'tx' }, label);
  const th = h('button', { class: 'th', type: 'button', 'aria-label': label }, icon('fwd'));
  root.append(fill, tx, th);
  let drag = false, sx = 0, max = 0, done = false;
  const sign = rtl ? -1 : 1;
  const finish = () => {
    if (done) return;
    done = true; root.classList.add('done');
    th.style.transform = `translateX(${sign * max}px)`; fill.style.width = '100%';
    clear(th).append(icon('check'));
    tx.textContent = tr('تم', 'Done');
    vibrate(24);
    setTimeout(onDone, 260);
  };
  const delta = (e) => clamp(rtl ? sx - e.clientX : e.clientX - sx, 0, max);
  th.addEventListener('pointerdown', (e) => { if (done) return; drag = true; sx = e.clientX; max = root.clientWidth - th.clientWidth - 8; th.setPointerCapture(e.pointerId); th.style.transition = 'none'; fill.style.transition = 'none'; });
  th.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = delta(e);
    th.style.transform = `translateX(${sign * dx}px)`; fill.style.width = dx + 48 + 'px';
    tx.style.opacity = String(1 - dx / max);
  });
  const end = (e) => {
    if (!drag) return;
    drag = false;
    const dx = delta(e);
    th.style.transition = 'transform .3s'; fill.style.transition = 'width .3s';
    if (dx / max > 0.82) finish();
    else { th.style.transform = ''; fill.style.width = '0'; tx.style.opacity = '1'; }
  };
  th.addEventListener('pointerup', end);
  th.addEventListener('pointercancel', end);
  th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); max = root.clientWidth - th.clientWidth - 8; finish(); } });
  return root;
}

/* ---------- sheets ---------- */
function openSheet({ title, build, onClose }) {
  const wrap = h('div', { class: 'sheet-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  const bg = h('div', { class: 'sheet-bg' });
  const sheet = h('div', { class: 'sheet' });
  const grab = h('div', { class: 'grab', 'aria-hidden': 'true' }, h('i'));
  const closeBtn = h('button', { class: 'ibtn', type: 'button', 'aria-label': tr('إغلاق', 'Close') }, icon('x'));
  const head = h('div', { class: 'sheet-head' }, h('h2', null, title), closeBtn);
  const body = h('div', { class: 'sheet-body' });
  sheet.append(grab, head, body);
  wrap.append(bg, sheet);
  $('#layer').append(wrap);
  const ctrl = {
    el: wrap, body,
    close() {
      if (ctrl.closed) return;
      ctrl.closed = true;
      wrap.classList.remove('in');
      UI.sheets = UI.sheets.filter((s) => s !== ctrl);
      setTimeout(() => wrap.remove(), 420);
      if (onClose) onClose();
    },
    update() {
      const st = body.scrollTop;
      clear(body);
      build(body, ctrl);
      body.scrollTop = st;
    },
    setTitle(t) { head.querySelector('h2').textContent = t; wrap.setAttribute('aria-label', t); },
  };
  UI.sheets.push(ctrl);
  build(body, ctrl);
  closeBtn.onclick = ctrl.close;
  bg.onclick = ctrl.close;
  let dragging = false, y0 = 0, dy = 0, t0 = 0;
  grab.addEventListener('pointerdown', (e) => { dragging = true; y0 = e.clientY; t0 = performance.now(); sheet.classList.add('drag'); grab.setPointerCapture(e.pointerId); });
  grab.addEventListener('pointermove', (e) => { if (!dragging) return; dy = Math.max(0, e.clientY - y0); sheet.style.transform = `translateY(${dy}px)`; });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false; sheet.classList.remove('drag');
    const v = dy / Math.max(1, performance.now() - t0);
    if (dy > 120 || v > 0.6) ctrl.close(); else sheet.style.transform = '';
    dy = 0;
  };
  grab.addEventListener('pointerup', endDrag);
  grab.addEventListener('pointercancel', endDrag);
  requestAnimationFrame(() => requestAnimationFrame(() => { wrap.classList.add('in'); closeBtn.focus({ preventScroll: true }); }));
  return ctrl;
}
function closeTopSheet() { const s = UI.sheets[UI.sheets.length - 1]; if (s) { s.close(); return true; } return false; }
function closeAllSheets() { while (UI.sheets.length) UI.sheets[UI.sheets.length - 1].close(); }

/* ---------- pages (push navigation) ---------- */
function pageShell({ title, right, body, foot, onBack }) {
  const back = h('button', { class: 'ibtn', type: 'button', 'aria-label': tr('رجوع', 'Back'), onclick: onBack || closePage }, icon('back'));
  const head = h('div', { class: 'page-head' }, back, h('h1', { class: 'clip' }, title), right || null);
  const bodyEl = h('div', { class: 'page-body' }, body);
  return [head, bodyEl, foot ? h('div', { class: 'page-foot' }, foot) : null];
}
function openPage(key, build) {
  const found = UI.pages.find((p) => p.key === key);
  if (found) { renderPage(found); return found; }
  const el = h('section', { class: 'page', 'aria-label': key });
  const p = { key, el, build };
  UI.pages.push(p);
  $('#pages').append(el);
  renderPage(p);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  return p;
}
function renderPage(p) {
  const old = p.el.querySelector('.page-body');
  const st = old ? old.scrollTop : 0;
  const parts = p.build(p);
  clear(p.el);
  append(p.el, parts);
  const nb = p.el.querySelector('.page-body');
  if (nb) nb.scrollTop = st;
}
function closePage() {
  const p = UI.pages.pop();
  if (!p) return;
  p.el.classList.remove('in'); p.el.classList.add('out');
  setTimeout(() => p.el.remove(), 420);
}
function closeAllPages() { while (UI.pages.length) closePage(); }

/* ---------- overlay ---------- */
function celebrate({ title, sub, cta, onClose }) {
  const o = $('#ovl');
  clear(o).append(h('div', null, h('div', { class: 'ck' }, icon('check')), h('h2', null, title), h('p', null, sub), h('button', { class: 'btn gold', type: 'button', onclick: () => { o.classList.remove('show'); if (onClose) onClose(); } }, cta || tr('متابعة', 'Continue'))));
  o.classList.add('show');
  vibrate(30);
}

/* ---------- chrome: top bar, theme, language ---------- */
function topbar() {
  const alerts = buildAlerts();
  const bell = h('button', { class: 'ibtn', type: 'button', 'aria-label': tr('التنبيهات', 'Alerts'), onclick: openNotifications }, icon('bell'), alerts.length && !S.seenNotif ? h('span', { class: 'dot' }) : null);
  const theme = h('button', { class: 'ibtn', type: 'button', 'aria-label': tr('تبديل المظهر', 'Toggle theme'), onclick: toggleTheme }, icon(currentTheme() === 'dark' ? 'sun' : 'moon'));
  const lang = h('button', { class: 'ibtn', type: 'button', 'aria-label': tr('English', 'العربية'), onclick: () => setLanguage(LANG === 'ar' ? 'en' : 'ar'), style: { font: '600 .78rem var(--f-body)' } }, LANG === 'ar' ? 'EN' : 'ع');
  return h('div', { class: 'topbar' },
    h('div', { class: 'logo' }, h('div', { class: 'logo-mark' }, brandMark()), h('div', null, h('b', null, B()), h('small', null, brandTag()))),
    h('div', { class: 'sp' }), lang, theme, bell);
}
function currentTheme() { return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); }
function applyTheme(t) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
function toggleTheme() {
  S.theme = currentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(S.theme); saveState(); rerender();
}
function setLanguage(l) {
  if (l === LANG) return;
  applyLang(l);
  document.title = `${B()} · ${brandTag()}`;
  closeAllSheets(); closeAllPages();
  refreshStory();
  rerender();
}

/* ---------- tabs + render ---------- */
const SCREENS = {};
function buildDock() {
  const nav = $('#dock nav');
  clear(nav);
  tabs().forEach((t) => {
    const b = h('button', { type: 'button', role: 'tab', id: 'tab-' + t.id, 'aria-selected': String(UI.tab === t.id), 'aria-label': t.n, onclick: () => go(t.id) }, icon(t.ic), h('span', { class: 't' }, t.n));
    if (t.id === 'ships') {
      const n = S.ships.filter((s) => { const m = shipSummary(s); return m.mine && !m.allDone; }).length;
      if (n) b.append(h('span', { class: 'badge' }, String(n)));
    }
    nav.append(b);
  });
}
function go(tab) {
  closeAllPages();
  UI.tab = tab;
  $$('.screen').forEach((s) => { s.hidden = s.dataset.tab !== tab; });
  $$('#dock button').forEach((b) => b.setAttribute('aria-selected', String(b.id === 'tab-' + tab)));
  renderScreen(tab);
  const sc = $('.screen[data-tab="' + tab + '"]');
  if (sc) sc.scrollTop = 0;
}
function renderScreen(tab) {
  const root = $('.screen[data-tab="' + tab + '"]');
  if (!root || !SCREENS[tab]) return;
  const st = root.scrollTop;
  clear(root);
  SCREENS[tab](root);
  root.scrollTop = st;
}
function rerender() {
  buildDock();
  renderScreen(UI.tab);
  UI.pages.forEach(renderPage);
  if (UI.onb) UI.onb.render();
}
function commit(msg) { const saved = saveState(); rerender(); if (msg && saved !== false) toast(msg); }

/* ---------- file picking: returns the File; the caller decides whether to upload it ---------- */
function pickFile(cb) {
  const inp = h('input', { type: 'file', accept: '.pdf,.png,.jpg,.jpeg,image/*,application/pdf', style: { display: 'none' } });
  inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if (f) cb(f); inp.remove(); });
  document.body.append(inp);
  inp.click();
}

/* ---------- shared actions ---------- */
function runAct(act) {
  if (!act) return;
  if (act.type === 'ship') openShip(act.id, { open: act.open });
  else if (act.type === 'lc') openLC(act.no);
  else if (act.type === 'tab') go(act.tab);
  else if (act.type === 'profile') openProfileList(act.id);
  else if (act.type === 'docs') openDocsPage();
  else if (act.type === 'radar') openRadar();
  else if (act.type === 'newShip') openNewShip();
}
