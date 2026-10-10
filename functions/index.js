'use strict';
/* Optional: a daily digest per business, written to the `mail` collection for the "Trigger Email from Firestore" extension.
   Needs the Blaze plan. Nothing here runs unless you deploy it: `firebase deploy --only functions`. */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { computeReminders, digestMessage } = require('./reminders');

initializeApp();

const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tripoli' }).format(new Date()); // YYYY-MM-DD

exports.dailyReminders = onSchedule({ schedule: 'every day 07:00', timeZone: 'Africa/Tripoli', region: 'europe-west1', retryCount: 1 }, async () => {
  const db = getFirestore();
  const today = todayIso();
  const orgs = await db.collection('orgs').get();
  for (const org of orgs.docs) {
    const [ships, credits, documents, members] = await Promise.all(['shipments', 'credits', 'documents', 'members'].map((c) => org.ref.collection(c).get()));
    const reminders = computeReminders({ ships: ships.docs.map((d) => d.data()), credits: credits.docs.map((d) => d.data()), documents: documents.docs.map((d) => d.data()) }, today);
    const msg = digestMessage(org.get('name') || org.id, reminders);
    const to = members.docs.map((m) => m.data()).filter((m) => m.email && ['owner', 'admin', 'member'].includes(m.role)).map((m) => m.email);
    if (!msg || !to.length) continue;
    // create() fails with ALREADY_EXISTS (6) on a retried run, so a digest is never sent twice for the same day
    await db.collection('mail').doc(`${org.id}_${today}`).create({ to, message: msg, createdAt: FieldValue.serverTimestamp() }).catch((e) => { if (e.code !== 6) throw e; });
  }
});
