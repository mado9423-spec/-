/* ---------- local persistence (offline cache; cloud sync hooks in via Cloud.queue) ---------- */
const STORE_KEY = 'app.state.v2';
const STASH_SUFFIXES = ['unreadable', 'repaired', 'unsynced'];
const stashKey = (why) => `${STORE_KEY}.${why}`;

/* never overwrite something we could not read: keep the raw text under a side key so it can still be recovered */
function stashLocal(why, raw) { try { localStorage.setItem(stashKey(why), raw); } catch (e) { /* storage unavailable */ } }
function hasStash(why) { try { return !!localStorage.getItem(stashKey(why)); } catch (e) { return false; } }
function readStash(why) { try { return localStorage.getItem(stashKey(why)); } catch (e) { return null; } }

function loadLocal() {
  let raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  if (!raw) return null;
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch (e) { /* corrupt text */ }
  const res = parsed ? normalizeState(parsed) : { state: null };
  if (res.state) {
    if (res.dropped) stashLocal('repaired', raw); /* some records were invalid and dropped: keep the original once */
    return res.state;
  }
  stashLocal('unreadable', raw);
  return null;
}
let storeWarned = false;
function saveLocal() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); return true; }
  catch (e) {
    if (!storeWarned && typeof toast === 'function') { storeWarned = true; toast(tr('تعذر الحفظ على هذا الجهاز (التخزين ممتلئ أو معطّل). صدّر نسخة احتياطية.', 'Could not save on this device (storage full or disabled). Export a backup.')); }
    return false;
  }
}
function saveState() {
  if (typeof Cloud !== 'undefined' && Cloud.active() && Cloud.readOnly() && Cloud.hasChanges()) { Cloud.deny(); return false; } /* the caller must not announce success */
  saveLocal();
  if (typeof Cloud !== 'undefined' && Cloud.active()) Cloud.queue();
  return true;
}
/* removes every local trace of the business: the state, the side copies and the pending sign-in email */
function purgeLocal() {
  try { [STORE_KEY, ...STASH_SUFFIXES.map(stashKey), 'app.dirty', 'app.emailForLink'].forEach((k) => localStorage.removeItem(k)); } catch (e) { /* storage unavailable */ }
}
function resetState(mode) {
  purgeLocal();
  S = mode === 'demo' ? seedDemo() : emptyState();
  saveState();
}
