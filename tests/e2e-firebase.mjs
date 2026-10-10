// End-to-end test of the cloud mode against the Firebase emulators (Auth + Firestore + Storage).
//   npx firebase emulators:exec --only auth,firestore,storage --project demo-darb "node tests/e2e-firebase.mjs"
// (behind an HTTP proxy, unset HTTPS_PROXY first). It builds the app with --emulators, serves it locally,
// serves the Firebase SDK from node_modules, and drives two browser contexts: an owner and an invited member.
import { createServer } from 'node:http';
import { readFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

let chromium;
if (process.env.PW_ROOT) ({ chromium } = createRequire(process.env.PW_ROOT.replace(/\/?$/, '/'))('playwright'));
else ({ chromium } = await import('playwright'));

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'e2e-'));
execFileSync('node', [join(root, 'scripts/build.mjs'), '--emulators', '--out', join(tmp, 'index.html')], { stdio: 'inherit' });
const html = readFileSync(join(tmp, 'index.html'));
const PORT = 5199, ORIGIN = `http://127.0.0.1:${PORT}`;
const server = createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); }).listen(PORT, '127.0.0.1');

const FS = 'http://127.0.0.1:8080/v1/projects/demo-darb/databases/(default)/documents';
const fsGet = async (path) => { const r = await fetch(`${FS}/${path}`, { headers: { Authorization: 'Bearer owner' } }); return r.ok ? r.json() : null; };
const str = (f) => f && (f.stringValue ?? f.booleanValue ?? f.integerValue);
const until = async (fn, ms = 8000, label = 'condition') => { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) throw new Error('timeout: ' + label); await new Promise((r) => setTimeout(r, 150)); } };

let failed = 0;
const ok = (cond, msg) => { if (cond) console.log('  ok  ', msg); else { failed++; console.log('  FAIL', msg); } };

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errors = [];
async function newPage(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en', serviceWorkers: 'block' });
  await ctx.addInitScript(() => { if (!localStorage.getItem('app.lang')) localStorage.setItem('app.lang', 'en'); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name} pageerror: ${e.message}`));
  page.on('console', (m) => { if (process.env.DEBUG_E2E && m.type() !== 'log') console.log(`   [${name} ${m.type()}]`, m.text().slice(0, 300)); if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(`${name} console: ${m.text()}`); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+-compat\.js)/, (r) => { const f = r.request().url().split('/').pop(); r.fulfill({ contentType: 'application/javascript', body: readFileSync(join(root, 'node_modules/firebase', f)) }); });
  await page.route(ORIGIN + '/**', (r) => (new URL(r.request().url()).pathname === '/' ? r.fallback() : r.fulfill({ status: 204, body: '' })));
  return { ctx, page };
}

try {
  /* ---------- owner: onboarding creates the business in Firestore ---------- */
  console.log('owner');
  const A = await newPage('owner');
  const a = A.page;
  await a.goto(ORIGIN + '/');
  await a.locator('.onb button:has-text("Get started")').click();
  await a.locator('.onb button:has-text("A company")').click();
  await a.fill('#onb-name', 'E2E Foods');
  await a.locator('.onb button:has-text("Next")').click();
  await a.locator('.onb button:has-text("Next")').click();
  await a.locator('.onb button:has-text("Build my plan")').click();
  await a.locator('.onb button:has-text("Go to the app")').click();

  const orgs = await until(async () => { const l = await fsGet('orgs'); return l && l.documents && l.documents.length ? l.documents : null; }, 10000, 'org created');
  const orgId = orgs[0].name.split('/').pop();
  ok(str(orgs[0].fields.name) === 'E2E Foods', 'org document holds the business name');
  ok(str(orgs[0].fields.type) === 'company', 'org type stored');
  const members = await fsGet(`orgs/${orgId}/members`);
  ok(members.documents.length === 1 && str(members.documents[0].fields.role) === 'owner', 'creator is the owner member');

  /* a new shipment is mirrored to Firestore */
  await a.click('#tab-ships');
  await a.locator('.screen[data-tab=ships] button[aria-label="New shipment"]').click();
  await a.fill('#ns-sup', 'Mersin Gida');
  await a.fill('#ns-usd', '120000');
  await a.locator('.sheet button:has-text("Create shipment")').click();
  const ships = await until(async () => { const l = await fsGet(`orgs/${orgId}/shipments`); return l && l.documents ? l.documents : null; }, 8000, 'shipment synced');
  ok(ships.length === 1, 'shipment document created');
  ok(str(ships[0].fields.supplier.mapValue.fields.name) === 'Mersin Gida', 'shipment carries the supplier');
  ok(!!ships[0].fields.updatedAt && str(ships[0].fields.updatedBy), 'server stamps present');

  /* reload with the local cache wiped: the business comes back from the cloud */
  await a.evaluate(() => localStorage.removeItem('app.state.v2'));
  await a.goto(ORIGIN + '/');
  await a.waitForSelector('.screen[data-tab=home] >> text=E2E Foods', { timeout: 10000 }).catch(() => {});
  ok((await a.locator('.screen[data-tab=home]').innerText()).includes('E2E Foods'), 'business reloaded from Firestore after clearing the local cache');
  await a.click('#tab-ships');
  ok((await a.locator('.screen[data-tab=ships]').innerText()).includes('Mersin Gida') || (await a.locator('.screen[data-tab=ships]').innerText()).includes('SH-'), 'shipment reloaded from Firestore');

  /* ---------- owner invites someone by email ---------- */
  await a.click('#tab-more');
  await a.locator('.screen[data-tab=more] button:has-text("Settings")').click();
  await a.locator('.page button:has-text("Invite someone")').waitFor({ timeout: 8000 });
  await a.locator('.page button:has-text("Invite someone")').click();
  await a.fill('#inv-key', 'New.Person@Example.com');
  await a.locator('.sheet button:has-text("Create the invitation")').click();
  const inv = await until(async () => { const l = await fsGet(`orgs/${orgId}/invites`); return l && l.documents ? l.documents : null; }, 6000, 'invite created');
  ok(inv[0].name.endsWith('/new.person@example.com') && str(inv[0].fields.role) === 'member', 'invitation stored under the lower-cased email with the chosen role');

  /* ---------- invitee: guest -> email link -> accepts ---------- */
  console.log('invitee');
  const B = await newPage('invitee');
  const b = B.page;
  await b.goto(ORIGIN + '/');
  await b.locator('.onb button:has-text("Explore with demo data")').click();
  await b.click('#tab-more');
  await b.locator('.screen[data-tab=more] button:has-text("Settings")').click();
  await b.locator('.page button:has-text("Email")').waitFor({ timeout: 8000 });
  await b.locator('.page button:has-text("Email")').click();
  await b.fill('#si-email', 'new.person@example.com');
  await b.locator('.sheet button:has-text("Send the link")').click();
  const code = await until(async () => {
    const r = await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-darb/oobCodes');
    const j = await r.json();
    const hit = (j.oobCodes || []).filter((o) => o.email === 'new.person@example.com' && o.requestType === 'EMAIL_SIGNIN').pop();
    return hit && hit.oobCode;
  }, 6000, 'email link issued');
  await b.goto(`${ORIGIN}/?apiKey=demo-key&oobCode=${code}&mode=signIn&lang=en`);
  const sheet = b.locator('.sheet-wrap').filter({ hasText: 'Accept the invitation' });
  await sheet.waitFor({ timeout: 12000 });
  ok((await sheet.innerText()).includes('E2E Foods'), 'invitation names the business');
  await sheet.locator('button:has-text("Accept the invitation")').click();
  await b.waitForSelector('.screen[data-tab=home] >> text=E2E Foods', { timeout: 12000 });
  ok(true, 'invitee sees the owner business after accepting');
  const members2 = await until(async () => { const l = await fsGet(`orgs/${orgId}/members`); return l && l.documents.length === 2 ? l.documents : null; }, 6000, 'membership created');
  ok(members2.some((m) => str(m.fields.role) === 'member'), 'membership created with the invited role');
  await b.click('#tab-ships');
  ok((await b.locator('.screen[data-tab=ships]').innerText()).includes('Mersin Gida') || (await b.locator('.screen[data-tab=ships]').innerText()).includes('SH-'), 'invitee sees the shared shipment');

  /* realtime: a change by the member reaches the owner without a reload */
  await b.locator('.screen[data-tab=ships] button[aria-label="New shipment"]').click();
  await b.fill('#ns-sup', 'Realtime Supplier');
  await b.fill('#ns-usd', '5000');
  await b.locator('.sheet button:has-text("Create shipment")').click();
  await until(async () => (await fsGet(`orgs/${orgId}/shipments`)).documents.length === 2, 8000, 'second shipment synced');
  ok(true, 'member write reached Firestore');
  await a.keyboard.press('Escape'); await a.click('#tab-ships'); /* the owner is looking at the shipment list: the listener repaints it without a reload */
  await until(async () => (await a.locator('.screen[data-tab=ships]').innerText()).includes('Realtime Supplier'), 8000, 'owner screen updated live').then(() => ok(true, 'owner list updated in real time')).catch(() => ok(false, 'owner list updated in real time'));
} catch (e) {
  failed++;
  console.log('ERROR', e.message);
  if (process.env.DEBUG_E2E) for (const pg of browser.contexts().flatMap((c) => c.pages())) await pg.screenshot({ path: join(tmp, `fail-${Math.random().toString(36).slice(2, 6)}.png`) }).then(() => console.log('screenshots in', tmp));
}
console.log(errors.length ? 'console errors:\n' + errors.join('\n') : 'no console errors');
if (errors.length) failed++;
await browser.close();
server.close();
console.log(failed ? `\n${failed} problem(s)` : '\nall cloud checks passed');
process.exit(failed ? 1 : 0);
