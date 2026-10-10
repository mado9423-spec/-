/* ---------- account: local-only by default; with Firebase, a guest account that can be upgraded, plus the team ---------- */
const ROLES = [
  { id: 'owner', n: T2('مالك', 'Owner'), d: T2('كل الصلاحيات وإدارة الفريق', 'Everything, including the team') },
  { id: 'admin', n: T2('مدير', 'Manager'), d: T2('يعدّل البيانات ويدعو أعضاء', 'Edits data and invites people') },
  { id: 'member', n: T2('عضو', 'Member'), d: T2('يضيف ويعدّل الرحلات والمستندات', 'Adds and edits shipments and documents') },
  { id: 'viewer', n: T2('مشاهد', 'Viewer'), d: T2('للاطلاع فقط (محاسب أو مخلّص)', 'Read-only (accountant or broker)') },
];
const roleName = (id) => L((ROLES.find((r) => r.id === id) || ROLES[2]).n);
const canManageTeam = () => ['owner', 'admin'].includes(Cloud.role());

const AUTH_ERR = {
  'auth/invalid-email': T2('البريد الإلكتروني غير صالح.', 'That email address is not valid.'),
  'auth/invalid-phone-number': T2('رقم الهاتف غير صالح. اكتبه بالصيغة الدولية، مثل ‎+218912345678.', 'The phone number is not valid. Use the international form, e.g. +218912345678.'),
  'auth/missing-phone-number': T2('اكتب رقم الهاتف.', 'Enter the phone number.'),
  'auth/too-many-requests': T2('محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.', 'Too many attempts. Wait a little and try again.'),
  'auth/popup-closed-by-user': T2('أُغلقت نافذة الدخول قبل أن تكتمل.', 'The sign-in window was closed before finishing.'),
  'auth/popup-blocked': T2('المتصفح منع نافذة الدخول. اسمح بها ثم أعد المحاولة.', 'The browser blocked the sign-in window. Allow it and try again.'),
  'auth/invalid-verification-code': T2('الرمز غير صحيح.', 'The code is not correct.'),
  'auth/code-expired': T2('انتهت صلاحية الرمز. اطلب رمزًا جديدًا.', 'The code expired. Request a new one.'),
  'auth/operation-not-allowed': T2('طريقة الدخول هذه غير مفعّلة في إعدادات Firebase.', 'This sign-in method is not enabled in the Firebase console.'),
  'auth/unauthorized-domain': T2('نطاق الموقع غير مضاف إلى النطاقات المسموحة في Firebase.', 'This site’s domain is not in the Firebase authorized domains.'),
  'auth/network-request-failed': T2('تعذر الاتصال بالإنترنت.', 'Could not reach the network.'),
  'permission-denied': T2('لا تملك صلاحية هذا الإجراء.', 'You do not have permission for this action.'),
};
const authError = (code) => (AUTH_ERR[code] ? L(AUTH_ERR[code]) : tr('تعذر إكمال العملية', 'Could not complete that') + (code ? ` (${code})` : ''));

/* a signed-in change can reveal an existing account or a pending invitation: reload what the user should see */
async function afterSignIn(res) {
  if (!res || !res.ok) { toast(authError(res && res.error)); return false; }
  if (!Cloud.orgId() && S.onboarded && S.mode === 'live') await Cloud.createOrgFromState();
  closeAllPages();
  rerender();
  if (!(await offerInvites())) toast(res.switched ? tr('تم فتح حسابك السابق', 'Your existing account was opened') : tr('تم ربط حسابك', 'Your account is linked'));
  return true;
}

async function offerInvites() {
  if (!Cloud.signedIn()) return false;
  const list = await Cloud.pendingInvites();
  if (!list.length) return false;
  openSheet({
    title: tr('دعوة للانضمام', 'You are invited'),
    build: (body, ctrl) => {
      list.forEach((inv) => body.append(h('div', { class: 'card col' },
        h('b', { style: { font: '600 1.05rem var(--f-disp)' } }, inv.orgName || tr('منشأة', 'A business')),
        h('span', { class: 'lbl' }, tr('بصفة: ', 'As: '), roleName(inv.role)),
        Cloud.orgId() ? h('div', { class: 'note' }, icon('info'), h('span', null, tr('ستنتقل إلى هذه المنشأة. بياناتك الحالية تبقى محفوظة في حسابها.', 'You will switch to this business. Your current data stays saved in its account.'))) : null,
        h('button', { class: 'btn gold block', type: 'button', onclick: async (e) => {
          const btn = e.currentTarget; btn.disabled = true;
          try { await Cloud.acceptInvite(inv); ctrl.close(); closeAllPages(); rerender(); go('home'); toast(tr('انضممت إلى المنشأة', 'You joined the business')); }
          catch (err) { btn.disabled = false; toast(authError(err && err.code)); }
        } }, tr('قبول الدعوة', 'Accept the invitation')))));
    },
  });
  return true;
}

function openSignIn(method) {
  const titles = { google: tr('الدخول بحساب Google', 'Sign in with Google'), email: tr('الدخول برابط على البريد', 'Sign in with an email link'), phone: tr('الدخول برقم الهاتف', 'Sign in with your phone') };
  openSheet({
    title: titles[method],
    build: (body, ctrl) => {
      const warn = h('div', { class: 'note' }, icon('info'), h('span', null, tr('بياناتك الحالية تُربط بهذا الحساب. وإن كان لك حساب سابق بنفس الطريقة فسنفتح بياناته.', 'Your current data is linked to this account. If you already have an account with this method, we open its data instead.')));
      const busy = (btn, on) => { btn.disabled = on; };
      if (method === 'google') {
        body.append(warn, h('button', { class: 'btn gold block', type: 'button', onclick: async (e) => { const btn = e.currentTarget; busy(btn, true); const r = await Cloud.google(); busy(btn, false); if (await afterSignIn(r)) ctrl.close(); } }, icon('globe'), tr('متابعة مع Google', 'Continue with Google')));
      } else if (method === 'email') {
        const email = h('input', { id: 'si-email', type: 'email', inputmode: 'email', autocomplete: 'email', placeholder: 'name@example.com', dir: 'ltr' });
        const sent = h('div', { class: 'note', hidden: true }, icon('check'), h('span', null, tr('أرسلنا الرابط. افتحه على هذا الجهاز نفسه لإكمال الدخول.', 'Link sent. Open it on this same device to finish signing in.')));
        body.append(warn,
          h('div', { class: 'field' }, h('label', { for: 'si-email' }, tr('بريدك الإلكتروني', 'Your email')), email),
          h('button', { class: 'btn gold block', type: 'button', onclick: async (e) => {
            const btn = e.currentTarget; busy(btn, true);
            const r = await Cloud.sendEmailLink(email.value.trim());
            busy(btn, false);
            if (r.ok) sent.hidden = false; else toast(authError(r.error));
          } }, icon('mail'), tr('أرسل الرابط', 'Send the link')),
          sent);
      } else {
        const phone = h('input', { id: 'si-phone', type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '+218 9X XXX XXXX', dir: 'ltr' });
        const code = h('input', { id: 'si-code', inputmode: 'numeric', autocomplete: 'one-time-code', placeholder: '123456', dir: 'ltr', maxlength: 6 });
        const step2 = h('div', { class: 'col', hidden: true },
          h('div', { class: 'field' }, h('label', { for: 'si-code' }, tr('رمز التحقق', 'Verification code')), code),
          h('button', { class: 'btn gold block', type: 'button', onclick: async (e) => { const btn = e.currentTarget; busy(btn, true); const r = await Cloud.phoneConfirm(code.value.trim()); busy(btn, false); if (await afterSignIn(r)) ctrl.close(); } }, icon('check'), tr('تأكيد', 'Confirm')));
        body.append(warn,
          h('div', { class: 'field' }, h('label', { for: 'si-phone' }, tr('رقم الهاتف بالصيغة الدولية', 'Phone number, international form')), phone),
          h('button', { class: 'btn gold block', type: 'button', onclick: async (e) => {
            const btn = e.currentTarget; busy(btn, true);
            const r = await Cloud.phoneStart(phone.value.replace(/[\s()-]/g, ''));
            busy(btn, false);
            if (r.ok) { step2.hidden = false; code.focus(); } else toast(authError(r.error));
          } }, icon('phone'), tr('أرسل الرمز', 'Send the code')),
          step2);
      }
    },
  });
}

function openInviteSheet(done) {
  openSheet({
    title: tr('دعوة عضو', 'Invite someone'),
    build: (body, ctrl) => {
      let role = 'member';
      const key = h('input', { id: 'inv-key', dir: 'ltr', placeholder: tr('بريد إلكتروني أو رقم هاتف دولي', 'Email or international phone number'), inputmode: 'email', autocomplete: 'off' });
      const roles = h('div', { class: 'col', style: { gap: '8px' } });
      const drawRoles = () => { clear(roles).append(ROLES.filter((r) => r.id !== 'owner').map((r) => h('button', { type: 'button', class: 'checkrow' + (role === r.id ? ' on' : ''), onclick: () => { role = r.id; drawRoles(); } }, h('div', { class: 'tick' }, role === r.id ? icon('check') : null), h('div', null, h('b', null, L(r.n)), h('span', { class: 's' }, L(r.d)))))); };
      drawRoles();
      body.append(
        h('div', { class: 'field' }, h('label', { for: 'inv-key' }, tr('من تريد دعوته؟', 'Who do you want to invite?')), key),
        roles,
        h('div', { class: 'note' }, icon('info'), h('span', null, tr('يدخل المدعو بنفس البريد أو الرقم فيظهر له قبول الدعوة. صلاحية الدعوة 14 يومًا.', 'They sign in with the same email or number and see the invitation. It is valid for 14 days.'))),
        h('button', { class: 'btn gold block', type: 'button', onclick: async (e) => {
          const raw = key.value.trim().replace(/[\s()-]/g, '');
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw) && !/^\+\d{8,15}$/.test(raw)) return toast(tr('اكتب بريدًا صحيحًا أو رقمًا دوليًا يبدأ بـ ‎+', 'Enter a valid email or an international number starting with +'));
          const btn = e.currentTarget; btn.disabled = true;
          const r = await Cloud.invite(raw, role);
          btn.disabled = false;
          if (!r.ok) return toast(authError(r.error));
          ctrl.close(); if (done) done(); toast(tr('تم إنشاء الدعوة', 'Invitation created'));
        } }, icon('send'), tr('إنشاء الدعوة', 'Create the invitation')));
    },
  });
}

/* ---------- backup (works without any cloud) ---------- */
function exportBackup() {
  const blob = new Blob([JSON.stringify({ app: 'importer-companion', exportedAt: new Date().toISOString(), data: S }, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `${BRAND_ID}-backup-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function importBackup() {
  const inp = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
  inp.addEventListener('change', async () => {
    const f = inp.files && inp.files[0]; inp.remove();
    if (!f) return;
    try {
      const o = JSON.parse(await f.text());
      const d = o && o.data;
      if (!d || d.v !== DATA_VERSION || !Array.isArray(d.ships) || !Array.isArray(d.lcs)) throw new Error('shape');
      S = { ...emptyState(), ...d, mode: d.mode === 'demo' ? 'demo' : 'live', onboarded: true };
      saveState(); closeAllPages(); rerender(); toast(tr('تم استرجاع النسخة', 'Backup restored'));
    } catch (e) { toast(tr('الملف ليس نسخة احتياطية صالحة', 'That file is not a valid backup')); }
  });
  document.body.append(inp); inp.click();
}

/* ---------- the settings card ---------- */
function accountCard() {
  const row = (title, sub, ctl) => h('div', { class: 'setrow' }, h('div', { class: 'col' }, h('b', { style: { font: '500 .92rem var(--f-body)' } }, title), sub ? h('span', { class: 'lbl' }, sub) : null), ctl);
  const card = h('div', { class: 'card col' }, h('div', { class: 'h3' }, tr('الحساب والفريق', 'Account and team')));
  const backup = row(tr('نسخة احتياطية', 'Backup'), tr('احفظ بياناتك في ملف أو استرجعها منه.', 'Save your data to a file, or restore from one.'),
    h('div', { class: 'row' }, h('button', { class: 'chip', type: 'button', onclick: exportBackup }, tr('تصدير', 'Export')), h('button', { class: 'chip', type: 'button', onclick: importBackup }, tr('استرجاع', 'Restore'))));

  if (!Cloud.available()) {
    card.append(row(tr('الحفظ على هذا الجهاز', 'Saved on this device'), tr('الحفظ السحابي ومشاركة الفريق غير مفعّلين في هذه النسخة.', 'Cloud saving and team sharing are not enabled in this build.'), pill(tr('محلي', 'Local'), 'idle')), backup);
    return card;
  }
  if (!Cloud.signedIn()) {
    card.append(row(tr('غير متصل بالسحابة', 'Not connected to the cloud'), tr('نعمل على جهازك الآن ونعيد المحاولة عند توفر الإنترنت.', 'Working on your device for now; we retry when you are online.'), h('button', { class: 'chip', type: 'button', onclick: () => bootCloud(true) }, tr('أعد المحاولة', 'Retry'))), backup);
    return card;
  }

  const kind = Cloud.kind();
  if (kind === 'anonymous') {
    card.append(
      row(tr('حساب ضيف', 'Guest account'), tr('بياناتك محفوظة، لكن اربط حسابك لتفتحها من أي جهاز ولا تفقدها إن مُسح المتصفح.', 'Your data is saved, but link an account to open it on any device and not lose it if the browser is cleared.'), pill(tr('ضيف', 'Guest'), 'warn')),
      h('div', { class: 'row wrap' },
        h('button', { class: 'chip on', type: 'button', onclick: () => openSignIn('google') }, icon('globe'), 'Google'),
        h('button', { class: 'chip', type: 'button', onclick: () => openSignIn('email') }, icon('mail'), tr('بريد إلكتروني', 'Email')),
        h('button', { class: 'chip', type: 'button', onclick: () => openSignIn('phone') }, icon('phone'), tr('رقم هاتف', 'Phone'))));
  } else {
    card.append(row(Cloud.label() || tr('حسابك', 'Your account'), tr('مرتبط. بياناتك متاحة من أي جهاز.', 'Linked. Your data is available on any device.'),
      h('button', { class: 'chip', type: 'button', onclick: async (e) => {
        const b = e.currentTarget;
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = tr('اضغط للتأكيد', 'Tap to confirm'); b.classList.add('on'); setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = tr('خروج', 'Sign out'); b.classList.remove('on'); } }, 3000); return; }
        await Cloud.signOut();
        resetState('live'); applyTheme(null); /* the cached copy of the business is removed from this device */
        closeAllPages(); rerender(); startOnboarding();
      } }, icon('logout'), tr('خروج', 'Sign out'))));
  }

  if (!Cloud.orgId()) {
    card.append(row(tr('المزامنة', 'Sync'), tr('تبدأ عند حفظ بياناتك الفعلية. إن دُعيت إلى منشأة فافحص الدعوات.', 'Starts once you save your own data. If you were invited to a business, check for invitations.'), h('button', { class: 'chip', type: 'button', onclick: async () => { if (!(await offerInvites())) toast(tr('لا توجد دعوات', 'No invitations')); } }, tr('افحص الدعوات', 'Check invitations'))), backup);
    return card;
  }

  card.append(row(tr('صلاحيتك', 'Your role'), null, pill(roleName(Cloud.role()), Cloud.role() === 'owner' ? 'gold' : 'info')));
  const team = h('div', { class: 'col', style: { gap: '4px' } }, h('span', { class: 'lbl' }, tr('جارٍ تحميل الفريق…', 'Loading the team…')));
  card.append(h('div', { class: 'h3', style: { marginTop: '6px' } }, tr('الفريق', 'Team')), team);
  (async () => {
    try {
      const [ms, invs] = await Promise.all([Cloud.members(), canManageTeam() ? Cloud.invites() : Promise.resolve([])]);
      const me = Cloud.user().uid;
      const redraw = () => { rerender(); };
      clear(team).append(
        ms.map((m) => row(m.displayName || m.email || m.phone || tr('عضو', 'Member'), (m.uid === me ? tr('أنت · ', 'You · ') : '') + roleName(m.role),
          m.uid !== me && Cloud.role() === 'owner' && m.role !== 'owner'
            ? h('div', { class: 'row' },
              h('select', { 'aria-label': tr('الصلاحية', 'Role'), style: { height: '34px', borderRadius: '10px', background: 'var(--field)', border: '1px solid var(--line)', padding: '0 8px', color: 'inherit' }, onchange: async (e) => { await Cloud.setRole(m.uid, e.target.value); redraw(); } }, ROLES.filter((r) => r.id !== 'owner').map((r) => h('option', { value: r.id, selected: r.id === m.role }, L(r.n)))),
              h('button', { class: 'ibtn', type: 'button', 'aria-label': tr('إزالة', 'Remove'), onclick: async () => { await Cloud.removeMember(m.uid); redraw(); } }, icon('trash')))
            : null)),
        invs.filter((i) => i.status === 'pending').map((i) => row(h('span', { class: 'ltr' }, i.key), tr('دعوة معلّقة · ', 'Pending invitation · ') + roleName(i.role),
          h('div', { class: 'row' },
            h('button', { class: 'ibtn', type: 'button', 'aria-label': tr('نسخ رسالة الدعوة', 'Copy the invitation message'), onclick: async () => { await copyText(tr(`دعوتك إلى ${S.org.name} على ${B()}: ${location.href.split('#')[0]} · ادخل بنفس ${i.key}`, `You are invited to ${S.org.name} on ${B()}: ${location.href.split('#')[0]} · sign in with ${i.key}`)); toast(tr('تم نسخ الرسالة', 'Message copied')); } }, icon('copy')),
            h('button', { class: 'ibtn', type: 'button', 'aria-label': tr('إلغاء الدعوة', 'Cancel the invitation'), onclick: async () => { await Cloud.revokeInvite(i.key); redraw(); } }, icon('x'))))),
        canManageTeam() ? h('button', { class: 'btn ghost block', type: 'button', style: { marginTop: '8px' }, onclick: () => openInviteSheet(redraw) }, icon('plus'), tr('دعوة عضو', 'Invite someone')) : null);
    } catch (e) { clear(team).append(h('span', { class: 'lbl' }, tr('تعذر تحميل الفريق.', 'Could not load the team.'))); }
  })();
  card.append(backup);
  return card;
}
