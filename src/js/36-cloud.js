/* ---------- Firebase layer (Auth + Firestore + Storage) ----------
   Optional: active only when the build injects window.FIREBASE_CONFIG and the compat SDK scripts.
   The in-memory model S stays the app's single source of truth; this layer mirrors it to Firestore with a per-document
   diff, listens for remote changes, and uploads files to Storage. Demo mode never touches the cloud. */
const Cloud = (() => {
  const st = { on: false, db: null, auth: null, storage: null, user: null, orgId: null, role: null, unsubs: [], last: null, timer: null, rtimer: null, ready: false };
  const cfg = () => (typeof window !== 'undefined' && window.FIREBASE_CONFIG) || null;
  const COLL = { ships: 'shipments', lcs: 'credits', companyDocs: 'documents', activity: 'activity' };
  const KEYF = { ships: 'id', lcs: 'no', companyDocs: 'id', activity: 'id' };
  const clean = (o) => JSON.parse(JSON.stringify(o));
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const ts = () => firebase.firestore.FieldValue.serverTimestamp();
  const orgRef = (id) => st.db.collection('orgs').doc(id || st.orgId);
  const strip = (d) => { const o = { ...d }; delete o.updatedAt; delete o.updatedBy; return o; };

  function orgDoc() {
    return clean({
      name: S.org.name, type: S.org.type || 'company', stat: S.org.stat || '', ptsCode: S.org.ptsCode || '', goods: S.org.goods || 'other', valueBand: S.org.valueBand || '', resell: S.org.resell !== false,
      requirements: Object.fromEntries(S.profile.map((p) => [p.id, { done: !!p.done, note: p.note || '' }])),
      tax: { income: num(S.tax.income), payroll: num(S.tax.payroll) }, bankSel: S.bankSel || 0, simple: !!S.simple, schema: DATA_VERSION,
    });
  }
  function snapshot() {
    const s = { org: orgDoc() };
    Object.keys(COLL).forEach((k) => { s[k] = {}; S[k].forEach((x) => { s[k][x[KEYF[k]]] = clean(x); }); });
    return s;
  }

  async function flush() {
    if (!st.on || !st.orgId || !S || S.mode !== 'live') return;
    const now = snapshot(), last = st.last || {};
    const ops = [];
    if (!eq(now.org, last.org)) ops.push((b) => b.set(orgRef(), { ...now.org, updatedAt: ts() }, { merge: true }));
    Object.keys(COLL).forEach((k) => {
      const col = orgRef().collection(COLL[k]);
      Object.keys(now[k]).forEach((id) => { if (!eq(now[k][id], (last[k] || {})[id])) ops.push((b) => b.set(col.doc(id), { ...now[k][id], updatedAt: ts(), updatedBy: st.user.uid })); });
      Object.keys(last[k] || {}).forEach((id) => { if (!(id in now[k])) ops.push((b) => b.delete(col.doc(id))); });
    });
    if (!ops.length) return;
    for (let i = 0; i < ops.length; i += 400) { const b = st.db.batch(); ops.slice(i, i + 400).forEach((f) => f(b)); await b.commit(); }
    st.last = now;
  }
  function queue() { clearTimeout(st.timer); st.timer = setTimeout(() => { flush().catch((e) => console.warn('sync failed', e)); }, 700); }

  /* remote -> S (skips our own pending writes and identical data, so typing is never interrupted) */
  function applyRemote(k, snap) {
    if (snap.metadata.hasPendingWrites) return;
    let changed = false;
    if (k === 'org') {
      if (!snap.exists) return;
      const d = snap.data();
      const incoming = clean({ name: d.name, type: d.type, stat: d.stat || '', ptsCode: d.ptsCode || '', goods: d.goods || 'other', valueBand: d.valueBand || '', resell: d.resell !== false, requirements: d.requirements || {}, tax: d.tax || { income: 0, payroll: 0 }, bankSel: d.bankSel || 0, simple: !!d.simple, schema: d.schema });
      if (!eq(incoming, orgDoc())) {
        S.org = { ...S.org, type: d.type, name: d.name, stat: d.stat || '', ptsCode: d.ptsCode || '', goods: d.goods || 'other', valueBand: d.valueBand || '', resell: d.resell !== false };
        S.profile = REQ_ORDER[d.type || 'company'].map((id) => ({ id, done: !!(d.requirements && d.requirements[id] && d.requirements[id].done), note: (d.requirements && d.requirements[id] && d.requirements[id].note) || '' }));
        S.tax = d.tax || { income: 0, payroll: 0 }; S.bankSel = d.bankSel || 0; S.simple = !!d.simple;
        changed = true;
      }
    } else {
      const items = snap.docs.map((x) => strip(x.data()));
      if (k === 'activity') items.sort((a, b) => (a.id < b.id ? 1 : -1));
      const cur = snapshot()[k], inc = {};
      items.forEach((x) => { inc[x[KEYF[k]]] = clean(x); });
      if (!eq(Object.keys(inc).sort().map((i) => inc[i]), Object.keys(cur).sort().map((i) => cur[i]))) { S[k] = items; changed = true; }
    }
    if (changed) {
      st.last = snapshot();
      saveLocal();
      clearTimeout(st.rtimer);
      st.rtimer = setTimeout(() => { if (typeof rerender === 'function') rerender(); }, 120);
    }
  }
  function unwatch() { st.unsubs.forEach((u) => { try { u(); } catch (e) { /* already closed */ } }); st.unsubs = []; }
  function watch() {
    unwatch();
    return new Promise((resolve) => {
      const seen = {};
      const need = 1 + Object.keys(COLL).length;
      let n = 0;
      const hit = (k) => { if (!seen[k]) { seen[k] = 1; if (++n === need) resolve(); } };
      const err = (k) => (e) => { console.warn('listener error', k, e && e.code); hit(k); };
      st.unsubs.push(orgRef().onSnapshot((s) => { applyRemote('org', s); hit('org'); }, err('org')));
      Object.keys(COLL).forEach((k) => st.unsubs.push(orgRef().collection(COLL[k]).onSnapshot((s) => { applyRemote(k, s); hit(k); }, err(k))));
      setTimeout(() => resolve(), 8000); /* never block startup on a slow network */
    });
  }

  async function ensureUserDoc() {
    const ref = st.db.collection('users').doc(st.user.uid);
    const snap = await ref.get();
    if (!snap.exists) await ref.set({ lang: LANG, theme: null, createdAt: ts(), updatedAt: ts() }, { merge: true });
    return snap.exists ? snap.data() : {};
  }
  async function loadOrg(orgId) {
    const keep = { theme: S.theme, seenNotif: S.seenNotif };
    S = { ...emptyState(), mode: 'live', onboarded: true, ...keep };
    st.orgId = orgId; st.last = null;
    const m = await orgRef().collection('members').doc(st.user.uid).get();
    st.role = m.exists ? m.data().role : null;
    await watch();
    st.last = snapshot();
    saveLocal();
  }
  async function afterAuth() {
    const u = await ensureUserDoc();
    if (u.activeOrgId) { await loadOrg(u.activeOrgId); return 'loaded'; }
    return 'empty';
  }

  const api = {
    available: () => !!(cfg() && typeof firebase !== 'undefined'),
    active: () => st.on && !!st.orgId && !!S && S.mode === 'live',
    signedIn: () => !!st.user && st.ready, /* false while init is still resolving the account, so callers never race it */
    user: () => st.user,
    orgId: () => st.orgId,
    role: () => st.role,
    queue, flush,

    async init() {
      const c = cfg();
      if (!c || typeof firebase === 'undefined') return 'off';
      try {
        if (!st.auth) { /* one-time setup; a retry after going offline skips it */
          if (!firebase.apps.length) firebase.initializeApp(c.config);
          st.auth = firebase.auth(); st.db = firebase.firestore(); st.storage = firebase.storage();
          if (c.emulators) { st.auth.useEmulator(c.emulators.auth, { disableWarnings: true }); st.db.useEmulator(...c.emulators.firestore); st.storage.useEmulator(...c.emulators.storage); }
          else { try { await st.db.enablePersistence({ synchronizeTabs: true }); } catch (e) { /* multi-tab or unsupported */ } }
        }
        if (st.auth.isSignInWithEmailLink(location.href)) { await api.completeEmailLink(); }
        st.user = await new Promise((res) => { const un = st.auth.onAuthStateChanged((u) => { un(); res(u); }); });
        if (!st.user) { const cr = await st.auth.signInAnonymously(); st.user = cr.user; }
        st.on = true;
        const res = await afterAuth();
        st.ready = true;
        return res;
      } catch (e) {
        console.warn('Cloud init failed; staying local', e);
        st.on = false; st.ready = false;
        return 'off';
      }
    },

    /* the first time a signed-in user finishes onboarding, or signs in with local data and no org */
    async createOrgFromState() {
      if (!st.on || st.orgId) return;
      const id = st.db.collection('orgs').doc().id;
      const o = orgRef(id);
      const b = st.db.batch();
      b.set(o, { ...orgDoc(), createdBy: st.user.uid, createdAt: ts(), updatedAt: ts() });
      b.set(o.collection('members').doc(st.user.uid), { role: 'owner', joinedAt: ts(), displayName: st.user.displayName || null, email: st.user.email || null, phone: st.user.phoneNumber || null });
      b.set(st.db.collection('users').doc(st.user.uid), { activeOrgId: id, lang: LANG, theme: S.theme || null, updatedAt: ts() }, { merge: true });
      await b.commit();
      st.orgId = id; st.role = 'owner'; st.last = { org: orgDoc() };
      await flush();
      watch();
    },

    async upload(file, folder) {
      if (!api.active()) return null;
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `orgs/${st.orgId}/files/${folder}/${rid('f')}-${safe}`;
      try {
        await st.storage.ref(path).put(file, { contentType: file.type || 'application/octet-stream' });
        return { path, size: file.size, contentType: file.type || 'application/octet-stream' };
      } catch (e) { console.warn('upload failed', e); toast(tr('تعذر رفع الملف. يُحفظ اسمه فقط.', 'Upload failed. Only the file name is kept.')); return null; }
    },
    url: (path) => st.storage.ref(path).getDownloadURL(),

    /* ----- sign-in upgrades: the anonymous account is linked, so nothing is lost ----- */
    kind() { const u = st.user; if (!u) return 'none'; if (u.isAnonymous) return 'anonymous'; return u.email ? 'email' : u.phoneNumber ? 'phone' : 'account'; },
    label() { const u = st.user; return u ? (u.email || u.phoneNumber || u.displayName || '') : ''; },
    async linkWith(credOrProvider, popup) {
      try {
        const u = st.user;
        if (popup) await u.linkWithPopup(credOrProvider); else await u.linkWithCredential(credOrProvider);
        st.user = st.auth.currentUser;
        return { ok: true };
      } catch (e) {
        if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
          const cred = e.credential || credOrProvider;
          const r = await st.auth.signInWithCredential(cred);
          st.user = r.user; unwatch(); st.orgId = null;
          const res = await afterAuth();
          if (res === 'empty' && S.onboarded && S.mode === 'live') await api.createOrgFromState();
          return { ok: true, switched: true };
        }
        return { ok: false, error: e.code || String(e) };
      }
    },
    google() { return api.linkWith(new firebase.auth.GoogleAuthProvider(), true); },
    async sendEmailLink(email) {
      try {
        await st.auth.sendSignInLinkToEmail(email, { url: location.href.split('#')[0], handleCodeInApp: true });
        try { localStorage.setItem('app.emailForLink', email); } catch (e) { /* storage unavailable */ }
        return { ok: true };
      } catch (e) { return { ok: false, error: e.code || String(e) }; }
    },
    async completeEmailLink() {
      let email = null;
      try { email = localStorage.getItem('app.emailForLink'); } catch (e) { /* storage unavailable */ }
      if (!email) return { ok: false, error: 'no-email' };
      const cred = firebase.auth.EmailAuthProvider.credentialWithLink(email, location.href);
      if (st.auth.currentUser) return api.linkWith(cred, false);
      const r = await st.auth.signInWithCredential(cred); st.user = r.user;
      return { ok: true };
    },
    async phoneStart(number) {
      try {
        if (!api._rv) api._rv = new firebase.auth.RecaptchaVerifier('recaptcha', { size: 'invisible' });
        api._conf = await st.user.linkWithPhoneNumber(number, api._rv);
        return { ok: true };
      } catch (e) { return { ok: false, error: e.code || String(e) }; }
    },
    async phoneConfirm(code) {
      try {
        await api._conf.confirm(code);
        st.user = st.auth.currentUser;
        return { ok: true };
      } catch (e) {
        if (e.code === 'auth/credential-already-in-use' && e.credential) return api.linkWith(e.credential, false);
        return { ok: false, error: e.code || String(e) };
      }
    },
    async signOut() {
      unwatch(); clearTimeout(st.timer);
      await st.auth.signOut();
      st.orgId = null; st.role = null; st.last = null;
      const cr = await st.auth.signInAnonymously(); st.user = cr.user;
    },

    /* ----- team ----- */
    async members() {
      const q = await orgRef().collection('members').get();
      return q.docs.map((d) => ({ uid: d.id, ...d.data() }));
    },
    async invites() {
      const q = await orgRef().collection('invites').get();
      return q.docs.map((d) => ({ key: d.id, ...d.data() }));
    },
    async invite(rawKey, role) {
      const key = String(rawKey).trim().toLowerCase();
      if (!key) return { ok: false, error: 'empty' };
      try {
        await orgRef().collection('invites').doc(key).set({ key, role, status: 'pending', invitedBy: st.user.uid, orgName: S.org.name || '', createdAt: ts(), expiresAt: firebase.firestore.Timestamp.fromMillis(Date.now() + 14 * DAY) });
        return { ok: true };
      } catch (e) { return { ok: false, error: e.code || String(e) }; }
    },
    async revokeInvite(key) { await orgRef().collection('invites').doc(key).delete(); },
    async setRole(uid, role) { await orgRef().collection('members').doc(uid).update({ role }); },
    async removeMember(uid) { await orgRef().collection('members').doc(uid).delete(); },
    async pendingInvites() {
      const u = st.user;
      const key = u && ((u.email && u.emailVerified) ? u.email.toLowerCase() : u.phoneNumber);
      if (!key) return [];
      try {
        const q = await st.db.collectionGroup('invites').where('key', '==', key).get();
        return q.docs.filter((d) => d.data().status === 'pending').map((d) => ({ ref: d.ref, orgId: d.ref.parent.parent.id, ...d.data() }));
      } catch (e) { return []; }
    },
    async acceptInvite(inv) {
      const b = st.db.batch();
      const o = orgRef(inv.orgId);
      b.set(o.collection('members').doc(st.user.uid), { role: inv.role, joinedAt: ts(), invitedBy: inv.invitedBy || null, displayName: st.user.displayName || null, email: st.user.email || null, phone: st.user.phoneNumber || null });
      b.update(inv.ref, { status: 'accepted', acceptedBy: st.user.uid, acceptedAt: ts() });
      b.set(st.db.collection('users').doc(st.user.uid), { activeOrgId: inv.orgId, updatedAt: ts() }, { merge: true });
      await b.commit();
      await loadOrg(inv.orgId);
    },
    async saveUserPrefs() { if (st.on && st.user) await st.db.collection('users').doc(st.user.uid).set({ lang: LANG, theme: S.theme || null, updatedAt: ts() }, { merge: true }); },
  };
  return api;
})();
