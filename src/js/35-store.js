/* ---------- local persistence (offline cache; cloud sync hooks in via Cloud.queue) ---------- */
const STORE_KEY = 'app.state.v2';
function loadLocal() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { const o = JSON.parse(raw); if (o && o.v === DATA_VERSION) return o; }
  } catch (e) { /* storage unavailable */ }
  return null;
}
function saveLocal() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
}
function saveState() {
  saveLocal();
  if (typeof Cloud !== 'undefined' && Cloud.active()) Cloud.queue();
}
function resetState(mode) {
  S = mode === 'demo' ? seedDemo() : emptyState();
  saveState();
}
