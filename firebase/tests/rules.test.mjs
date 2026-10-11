// Security-rules tests. Run with the emulators:
//   npx firebase emulators:exec --only firestore,storage --project demo-darb "node --test firebase/tests/rules.test.mjs"
// Behind an HTTP proxy, unset HTTPS_PROXY first: the Storage emulator calls the Firestore emulator for cross-service rules.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

firebase.firestore.setLogLevel('silent'); // denied writes are expected in these tests
const PROJECT = 'demo-darb';
let env;
const TS = () => firebase.firestore.FieldValue.serverTimestamp();
const IN = (days) => firebase.firestore.Timestamp.fromMillis(Date.now() + days * 864e5);
const ORG = 'org1';
const ctx = {
  owner: () => env.authenticatedContext('owner', { email: 'owner@example.com', email_verified: true }),
  admin: () => env.authenticatedContext('admin', { email: 'admin@example.com', email_verified: true }),
  member: () => env.authenticatedContext('member', { email: 'member@example.com', email_verified: true }),
  viewer: () => env.authenticatedContext('viewer', { email: 'viewer@example.com', email_verified: true }),
  stranger: () => env.authenticatedContext('stranger', { email: 'stranger@example.com', email_verified: true }),
  anon: () => env.authenticatedContext('guest', { firebase: { sign_in_provider: 'anonymous' } }),
  invitee: () => env.authenticatedContext('invitee', { email: 'New.Person@Example.com', email_verified: true }),
  unverified: () => env.authenticatedContext('unv', { email: 'new.person@example.com', email_verified: false }),
  phoneUser: () => env.authenticatedContext('phoneUser', { phone_number: '+218912345678' }),
  none: () => env.unauthenticatedContext(),
};
const db = (c) => c.firestore();
const orgBody = (uid) => ({ name: 'Al-Nour Foods', type: 'company', stat: '', ptsCode: '', goods: 'food', valueBand: 'mid', resell: true, requirements: { pts: { done: false, note: '' } }, tax: { income: 0, payroll: 0 }, schema: 2, createdBy: uid, createdAt: TS(), updatedAt: TS() });
const memberBody = (role, extra) => ({ role, joinedAt: TS(), displayName: null, email: null, phone: null, ...extra });
const ship = (uid) => ({ id: 's1', title: 'x', updatedAt: TS(), updatedBy: uid });

async function seedOrg() {
  await env.withSecurityRulesDisabled(async (c) => {
    const f = c.firestore();
    await f.doc(`orgs/${ORG}`).set({ ...orgBody('owner'), createdAt: new Date(), updatedAt: new Date() });
    for (const [uid, role] of [['owner', 'owner'], ['admin', 'admin'], ['member', 'member'], ['viewer', 'viewer']]) await f.doc(`orgs/${ORG}/members/${uid}`).set({ role, joinedAt: new Date() });
    await f.doc(`orgs/${ORG}/shipments/s0`).set({ id: 's0', title: 'seed' });
  });
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8') },
    storage: { rules: readFileSync('firebase/storage.rules', 'utf8') },
  });
});
after(async () => { if (env) await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await env.clearStorage(); });

/* ---------- users ---------- */
test('users: own document only, valid fields only', async () => {
  const me = db(ctx.anon());
  await assertSucceeds(me.doc('users/guest').set({ lang: 'ar', theme: null, createdAt: TS(), updatedAt: TS() }));
  await assertSucceeds(me.doc('users/guest').get());
  await assertFails(db(ctx.stranger()).doc('users/guest').get());
  await assertFails(me.doc('users/guest').set({ lang: 'fr', updatedAt: TS() }));
  await assertFails(me.doc('users/guest').set({ lang: 'en', isAdmin: true, updatedAt: TS() }));
  await assertFails(db(ctx.none()).doc('users/guest').get());
});
test('users: activeOrgId only for an org the user belongs to', async () => {
  await seedOrg();
  await assertSucceeds(db(ctx.member()).doc('users/member').set({ activeOrgId: ORG, lang: 'en', updatedAt: TS() }));
  await assertFails(db(ctx.stranger()).doc('users/stranger').set({ activeOrgId: ORG, lang: 'en', updatedAt: TS() }));
});

/* ---------- org creation ---------- */
test('org: created together with the owner membership (and the user pointer)', async () => {
  const f = db(ctx.anon());
  const b = f.batch();
  b.set(f.doc('orgs/new1'), orgBody('guest'));
  b.set(f.doc('orgs/new1/members/guest'), memberBody('owner'));
  b.set(f.doc('users/guest'), { activeOrgId: 'new1', lang: 'ar', updatedAt: TS() }, { merge: true });
  await assertSucceeds(b.commit());
  await assertSucceeds(f.doc('orgs/new1').get());
});
test('org: not without an owner membership, not with a wrong creator or type', async () => {
  const f = db(ctx.anon());
  await assertFails(f.doc('orgs/n2').set(orgBody('guest')));
  const b = f.batch(); b.set(f.doc('orgs/n3'), orgBody('someone-else')); b.set(f.doc('orgs/n3/members/guest'), memberBody('owner')); await assertFails(b.commit());
  const c = f.batch(); c.set(f.doc('orgs/n4'), { ...orgBody('guest'), type: 'ngo' }); c.set(f.doc('orgs/n4/members/guest'), memberBody('owner')); await assertFails(c.commit());
  const d = f.batch(); d.set(f.doc('orgs/n5'), { ...orgBody('guest'), extra: 1 }); d.set(f.doc('orgs/n5/members/guest'), memberBody('owner')); await assertFails(d.commit());
});
test('org: nobody can make themselves owner of an existing org', async () => {
  await seedOrg();
  await assertFails(db(ctx.stranger()).doc(`orgs/${ORG}/members/stranger`).set(memberBody('owner')));
  await assertFails(db(ctx.stranger()).doc(`orgs/${ORG}/members/stranger`).set(memberBody('member')));
});
test('org: members read, outsiders do not; writers update, viewers do not; nobody deletes', async () => {
  await seedOrg();
  await assertSucceeds(db(ctx.viewer()).doc(`orgs/${ORG}`).get());
  await assertFails(db(ctx.stranger()).doc(`orgs/${ORG}`).get());
  await assertFails(db(ctx.none()).doc(`orgs/${ORG}`).get());
  const upd = { name: 'Renamed', updatedAt: TS() };
  await assertSucceeds(db(ctx.member()).doc(`orgs/${ORG}`).update(upd));
  await assertFails(db(ctx.viewer()).doc(`orgs/${ORG}`).update(upd));
  await assertFails(db(ctx.member()).doc(`orgs/${ORG}`).update({ createdBy: 'member', updatedAt: TS() }));
  await assertFails(db(ctx.owner()).doc(`orgs/${ORG}`).delete());
});

/* ---------- business data ---------- */
test('data: owner, admin and member write; viewer reads only; stranger nothing', async () => {
  await seedOrg();
  for (const who of ['owner', 'admin', 'member']) await assertSucceeds(db(ctx[who]()).doc(`orgs/${ORG}/shipments/s1`).set(ship(who)));
  await assertSucceeds(db(ctx.viewer()).doc(`orgs/${ORG}/shipments/s1`).get());
  await assertFails(db(ctx.viewer()).doc(`orgs/${ORG}/shipments/s2`).set({ ...ship('viewer'), id: 's2' }));
  await assertFails(db(ctx.viewer()).doc(`orgs/${ORG}/shipments/s1`).delete());
  await assertFails(db(ctx.stranger()).doc(`orgs/${ORG}/shipments/s1`).get());
  await assertFails(db(ctx.stranger()).collection(`orgs/${ORG}/shipments`).get());
  await assertSucceeds(db(ctx.member()).collection(`orgs/${ORG}/shipments`).get());
  await assertSucceeds(db(ctx.member()).doc(`orgs/${ORG}/shipments/s1`).delete());
});
test('data: stamps and ids must match', async () => {
  await seedOrg();
  const f = db(ctx.member());
  await assertFails(f.doc(`orgs/${ORG}/shipments/s1`).set({ id: 's1', title: 'x' }));
  await assertFails(f.doc(`orgs/${ORG}/shipments/s1`).set({ ...ship('member'), id: 'other' }));
  await assertFails(f.doc(`orgs/${ORG}/shipments/s1`).set({ ...ship('member'), updatedBy: 'owner' }));
  await assertSucceeds(f.doc(`orgs/${ORG}/credits/522231`).set({ no: '522231', usd: 1, updatedAt: TS(), updatedBy: 'member' }));
  await assertFails(f.doc(`orgs/${ORG}/credits/522231`).set({ no: '999', usd: 1, updatedAt: TS(), updatedBy: 'member' }));
  await assertSucceeds(f.doc(`orgs/${ORG}/documents/d1`).set({ id: 'd1', updatedAt: TS(), updatedBy: 'member' }));
  await assertSucceeds(f.doc(`orgs/${ORG}/activity/e1`).set({ id: 'e1', updatedAt: TS(), updatedBy: 'member' }));
});
test('data: unknown collections are denied', async () => {
  await seedOrg();
  await assertFails(db(ctx.owner()).doc(`orgs/${ORG}/secrets/x`).set({ a: 1 }));
  await assertFails(db(ctx.owner()).doc('mail/x').set({ to: 'a@b.c' }));
});

/* ---------- team ---------- */
const invite = (key, role = 'member', over = {}) => ({ key, role, status: 'pending', invitedBy: 'owner', orgName: 'Al-Nour Foods', createdAt: TS(), expiresAt: IN(14), ...over });
test('invites: owner and admin create; member and viewer cannot; bad shapes are refused', async () => {
  await seedOrg();
  await assertSucceeds(db(ctx.owner()).doc(`orgs/${ORG}/invites/new.person@example.com`).set(invite('new.person@example.com')));
  await assertSucceeds(db(ctx.admin()).doc(`orgs/${ORG}/invites/%2B218912345678`.replace('%2B', '+')).set(invite('+218912345678', 'viewer', { invitedBy: 'admin' })));
  await assertFails(db(ctx.member()).doc(`orgs/${ORG}/invites/x@example.com`).set(invite('x@example.com', 'member', { invitedBy: 'member' })));
  await assertFails(db(ctx.owner()).doc(`orgs/${ORG}/invites/boss@example.com`).set(invite('boss@example.com', 'owner')));
  await assertFails(db(ctx.owner()).doc(`orgs/${ORG}/invites/Upper@Example.com`).set(invite('Upper@Example.com')));
  await assertFails(db(ctx.owner()).doc(`orgs/${ORG}/invites/a@example.com`).set(invite('b@example.com')));
  await assertFails(db(ctx.owner()).doc(`orgs/${ORG}/invites/a@example.com`).set(invite('a@example.com', 'member', { expiresAt: IN(60) })));
  await assertFails(db(ctx.owner()).doc(`orgs/${ORG}/invites/a@example.com`).set(invite('a@example.com', 'member', { status: 'accepted' })));
});
test('invites: only managers list; the invitee finds theirs by key (verified email or phone only)', async () => {
  await seedOrg();
  await env.withSecurityRulesDisabled(async (c) => {
    await c.firestore().doc(`orgs/${ORG}/invites/new.person@example.com`).set({ ...invite('new.person@example.com'), createdAt: new Date() });
    await c.firestore().doc(`orgs/${ORG}/invites/+218912345678`).set({ ...invite('+218912345678'), createdAt: new Date() });
  });
  await assertSucceeds(db(ctx.owner()).collection(`orgs/${ORG}/invites`).get());
  await assertFails(db(ctx.member()).collection(`orgs/${ORG}/invites`).get());
  await assertSucceeds(db(ctx.invitee()).collectionGroup('invites').where('key', '==', 'new.person@example.com').get());
  await assertSucceeds(db(ctx.phoneUser()).collectionGroup('invites').where('key', '==', '+218912345678').get());
  await assertFails(db(ctx.unverified()).collectionGroup('invites').where('key', '==', 'new.person@example.com').get());
  await assertFails(db(ctx.stranger()).collectionGroup('invites').where('key', '==', 'new.person@example.com').get());
  await assertFails(db(ctx.invitee()).collectionGroup('invites').get());
});
async function acceptBatch(who, uid, role) {
  const f = db(ctx[who]());
  const b = f.batch();
  b.set(f.doc(`orgs/${ORG}/members/${uid}`), memberBody(role));
  b.update(f.doc(`orgs/${ORG}/invites/new.person@example.com`), { status: 'accepted', acceptedBy: uid, acceptedAt: TS() });
  b.set(f.doc(`users/${uid}`), { activeOrgId: ORG, updatedAt: TS() }, { merge: true });
  return b.commit();
}
test('invites: accepting creates the membership with exactly the invited role', async () => {
  await seedOrg();
  await env.withSecurityRulesDisabled((c) => c.firestore().doc(`orgs/${ORG}/invites/new.person@example.com`).set({ ...invite('new.person@example.com', 'viewer'), createdAt: new Date() }));
  await assertFails(acceptBatch('invitee', 'invitee', 'admin'));
  await assertFails(acceptBatch('stranger', 'stranger', 'viewer'));
  await assertFails(acceptBatch('unverified', 'unv', 'viewer'));
  await assertSucceeds(acceptBatch('invitee', 'invitee', 'viewer'));
  await assertSucceeds(db(ctx.invitee()).doc(`orgs/${ORG}/shipments/s0`).get());
  await assertFails(db(ctx.invitee()).doc(`orgs/${ORG}/shipments/s9`).set({ ...ship('invitee'), id: 's9' }));
});
test('invites: single-use. A membership cannot be created without consuming the invitation', async () => {
  await seedOrg();
  await env.withSecurityRulesDisabled((c) => c.firestore().doc(`orgs/${ORG}/invites/new.person@example.com`).set({ ...invite('new.person@example.com', 'member'), createdAt: new Date() }));
  const f = db(ctx.invitee());
  await assertFails(f.doc(`orgs/${ORG}/members/invitee`).set(memberBody('member'))); // membership alone: the invite stays pending
  await assertSucceeds(acceptBatch('invitee', 'invitee', 'member'));
  await assertSucceeds(db(ctx.owner()).doc(`orgs/${ORG}/members/invitee`).delete()); // removed by the owner
  await assertFails(acceptBatch('invitee', 'invitee', 'member')); // the consumed invitation cannot bring them back
  await assertFails(f.doc(`orgs/${ORG}/members/invitee`).set(memberBody('member')));
});
test('data: oversized documents are refused', async () => {
  await seedOrg();
  const big = Object.fromEntries(Array.from({ length: 90 }, (_, i) => [`k${i}`, i]));
  await assertFails(db(ctx.member()).doc(`orgs/${ORG}/shipments/s1`).set({ ...ship('member'), ...big }));
});
test('org: field types are validated', async () => {
  await seedOrg();
  const f = db(ctx.owner());
  await assertFails(f.doc(`orgs/${ORG}`).update({ resell: 'yes', updatedAt: TS() }));
  await assertFails(f.doc(`orgs/${ORG}`).update({ stat: 'x'.repeat(41), updatedAt: TS() }));
  await assertFails(f.doc(`orgs/${ORG}`).update({ simple: true, updatedAt: TS() })); // personal preferences are not synced
  await assertSucceeds(f.doc(`orgs/${ORG}`).update({ stat: 'LY-1', resell: false, updatedAt: TS() }));
});
test('invites: an expired or already used invitation cannot be accepted', async () => {
  await seedOrg();
  await env.withSecurityRulesDisabled((c) => c.firestore().doc(`orgs/${ORG}/invites/new.person@example.com`).set({ ...invite('new.person@example.com'), createdAt: new Date(), expiresAt: new Date(Date.now() - 1000) }));
  await assertFails(acceptBatch('invitee', 'invitee', 'member'));
  await env.withSecurityRulesDisabled((c) => c.firestore().doc(`orgs/${ORG}/invites/new.person@example.com`).set({ ...invite('new.person@example.com'), createdAt: new Date(), status: 'accepted' }));
  await assertFails(acceptBatch('invitee', 'invitee', 'member'));
});
test('members: only the owner changes roles; the owner cannot be removed; anyone may leave', async () => {
  await seedOrg();
  await assertFails(db(ctx.admin()).doc(`orgs/${ORG}/members/viewer`).update({ role: 'member' }));
  await assertSucceeds(db(ctx.owner()).doc(`orgs/${ORG}/members/viewer`).update({ role: 'member' }));
  await assertFails(db(ctx.owner()).doc(`orgs/${ORG}/members/member`).update({ role: 'owner' }));
  await assertFails(db(ctx.owner()).doc(`orgs/${ORG}/members/owner`).update({ role: 'viewer' }));
  await assertFails(db(ctx.admin()).doc(`orgs/${ORG}/members/owner`).delete());
  await assertFails(db(ctx.owner()).doc(`orgs/${ORG}/members/owner`).delete());
  await assertFails(db(ctx.admin()).doc(`orgs/${ORG}/members/member`).delete());
  await assertSucceeds(db(ctx.owner()).doc(`orgs/${ORG}/members/member`).delete());
  await assertSucceeds(db(ctx.viewer()).doc(`orgs/${ORG}/members/viewer`).delete());
  await assertFails(db(ctx.member()).doc(`orgs/${ORG}/shipments/s0`).get());
});

/* ---------- storage ---------- */
const bytes = (n) => new Uint8Array(n);
test('storage: members upload pdf/images up to 10 MB; viewers and strangers do not', async () => {
  await seedOrg();
  const path = `orgs/${ORG}/files/SH-1/a.pdf`;
  const put = (who, p, size, type) => ctx[who]().storage().ref(p).put(bytes(size), { contentType: type });
  await assertSucceeds(put('member', path, 100, 'application/pdf'));
  await assertSucceeds(put('owner', `orgs/${ORG}/files/company/p.png`, 100, 'image/png'));
  await assertFails(put('member', `orgs/${ORG}/files/SH-1/big.pdf`, 11 * 1024 * 1024, 'application/pdf'));
  await assertFails(put('member', `orgs/${ORG}/files/SH-1/run.exe`, 100, 'application/x-msdownload'));
  await assertFails(put('viewer', `orgs/${ORG}/files/SH-1/v.pdf`, 100, 'application/pdf'));
  await assertFails(put('stranger', `orgs/${ORG}/files/SH-1/s.pdf`, 100, 'application/pdf'));
  await assertSucceeds(ctx.viewer().storage().ref(path).getMetadata());
  await assertFails(ctx.stranger().storage().ref(path).getMetadata());
  await assertFails(ctx.none().storage().ref(path).getMetadata());
});
