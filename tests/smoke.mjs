// Browser smoke test of the local (no-cloud) app: first-run onboarding for a company and a sole trader, Arabic and English,
// direction switching, the simplified shipment view, demo data, brand preview, backup, and layout sanity. Fails on any console/page error.
// Usage: node scripts/build.mjs && node tests/smoke.mjs      (PW_ROOT=<dir containing node_modules/playwright> for a global install)
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { buildCsp } from '../scripts/csp.mjs';

let chromium;
if (process.env.PW_ROOT) ({ chromium } = createRequire(process.env.PW_ROOT.replace(/\/?$/, '/'))('playwright'));
else ({ chromium } = await import('playwright'));

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const TYPES = { html: 'text/html; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', webmanifest: 'application/manifest+json', js: 'text/javascript', woff2: 'font/woff2', txt: 'text/plain' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname.replace(/^\/+/, '') || 'index.html';
  const file = join(appDir, path);
  if (!file.startsWith(appDir) || !existsSync(file)) { res.writeHead(404); return res.end(); }
  const body = readFileSync(file);
  const headers = { 'content-type': TYPES[path.split('.').pop()] || 'application/octet-stream' };
  if (path === 'index.html') headers['content-security-policy'] = buildCsp(body.toString('utf8')); // the same policy the host will send
  res.writeHead(200, headers);
  res.end(body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errors = [];
let failed = 0;
const ok = (cond, msg) => { if (cond) console.log('  ok  ', msg); else { failed++; console.log('  FAIL', msg); } };

async function open(lang, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, locale: lang, acceptDownloads: true, serviceWorkers: 'block' });
  await ctx.addInitScript((l) => { if (!localStorage.getItem('app.lang')) localStorage.setItem('app.lang', l); }, lang);
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`)); });
  page.on('pageerror', (e) => errors.push(`${lang} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(`${lang} console: ${m.text()}`); });
  await page.goto(url);
  await page.waitForTimeout(500);
  page.cspViolations = () => page.evaluate(() => window.__csp);
  page.outside = [];
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(url) && !/^(data|blob):/.test(u)) page.outside.push(u); });
  return { ctx, page };
}
const T = {
  ar: { go: 'ابدأ', company: 'شركة', sole: 'تاجر فردي', next: 'التالي', plan: 'أنشئ خطتي', app: 'ادخل التطبيق', demo: 'جرّب ببيانات تجريبية', settings: 'الإعدادات', nextStep: 'خطوتك التالية', ships: 'رحلاتي' },
  en: { go: 'Get started', company: 'A company', sole: 'A sole trader', next: 'Next', plan: 'Build my plan', app: 'Go to the app', demo: 'Explore with demo data', settings: 'Settings', nextStep: 'Your next step', ships: 'Shipments' },
};
const onb = (page, t) => page.locator(`.onb button:has-text("${t}")`).first().click();
const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);

for (const [lang, who, name] of [['ar', 'company', 'شركة النور للمواد الغذائية'], ['en', 'sole', 'Salem Trading']]) {
  console.log(`first run · ${lang} · ${who}`);
  const t = T[lang];
  const { ctx, page } = await open(lang);
  ok(await page.evaluate(() => document.documentElement.dir) === (lang === 'ar' ? 'rtl' : 'ltr'), 'direction follows the language');
  await onb(page, t.go);
  ok(await page.locator('#onb-name').count() === 1, 'who-are-you step shown');
  await onb(page, t[who]);
  await page.fill('#onb-name', name);
  await onb(page, t.next); // goods
  await onb(page, t.next); // what you already have
  await page.locator('.onb .checkrow').first().click();
  await onb(page, t.plan);
  ok(await page.locator('.onb .steps li').count() >= 3, 'plan lists the remaining steps');
  await onb(page, t.app);
  await page.waitForTimeout(500);
  const home = await page.locator('.screen[data-tab=home]').innerText();
  ok(home.includes(name), 'home greets the business by name');
  ok(home.includes(t.nextStep), 'home shows one clear next step');
  ok(!(await overflowX(page)), 'no horizontal overflow on a phone');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('app.state.v2')));
  ok(saved.org.type === (who === 'sole' ? 'sole' : 'company') && saved.onboarded && saved.profile.some((p) => p.done), 'profile saved locally with the ticked requirement');

  /* switch language from the top bar: direction, labels and stored data stay consistent */
  await page.locator('.topbar button:has-text("' + (lang === 'ar' ? 'EN' : 'ع') + '")').click();
  await page.waitForFunction((o) => document.documentElement.lang === o, lang === 'ar' ? 'en' : 'ar');
  const other = lang === 'ar' ? 'en' : 'ar';
  ok(await page.evaluate(() => document.documentElement.dir) === (other === 'ar' ? 'rtl' : 'ltr'), 'direction flips with the language');
  ok((await page.locator('.screen[data-tab=home]').innerText()).includes(T[other].nextStep), 'screen text switches language');
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('app.state.v2')).org.name)) === name, 'stored data is language-neutral');
  await page.reload();
  ok(await page.waitForFunction((o) => document.documentElement.lang === o && !!document.querySelector('.screen[data-tab=home]')?.innerText, other, { timeout: 8000 }).then(() => true, () => false), 'language choice persists across reload');
  ok(page.outside.length === 0, 'every request stays on the app\'s own origin (no analytics, CDN or font host)' + (page.outside.length ? ': ' + page.outside.join(' ') : ''));
  ok((await page.cspViolations()).length === 0, 'no Content-Security-Policy violations' + ((await page.cspViolations()).length ? ': ' + (await page.cspViolations()).join(' | ') : ''));
  await ctx.close();
}

console.log('demo data · simplified shipment · tools');
{
  const { ctx, page } = await open('en');
  await onb(page, T.en.demo);
  await page.waitForTimeout(500);
  await page.click('#tab-ships');
  const cards = page.locator('.screen[data-tab=ships] .ship');
  ok(await cards.count() >= 4, 'demo shipments listed');
  await cards.first().click();
  await page.waitForSelector('.page .page-body');
  const txt = await page.locator('.page').innerText();
  ok(/next|ACI|importer/i.test(txt), 'shipment page shows its next action');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(450);
  ok(await page.locator('.page').count() === 0, 'Escape closes the page');

  /* new shipment through the sheet */
  await page.locator('.screen[data-tab=ships] button[aria-label="New shipment"]').click();
  await page.fill('#ns-sup', 'Test Supplier Ltd');
  await page.fill('#ns-usd', '90000');
  await page.locator('.sheet button:has-text("Create shipment")').click();
  await page.waitForSelector('.page .page-body');
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('app.state.v2')).ships.some((s) => s.supplier.name === 'Test Supplier Ltd'))), 'new shipment saved');
  await page.keyboard.press('Escape');

  /* brand: the ship mark (no text inside it) beside the name; backup export */
  ok(await page.locator('.topbar .logo-mark svg path').count() === 1, 'ship mark shown as an SVG in the top bar');
  ok((await page.locator('.topbar .logo').innerText()).includes('Dalil'), 'name shown beside the mark');
  await page.click('#tab-more');
  await page.locator(`.screen[data-tab=more] button:has-text("${T.en.settings}")`).click();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.locator('.page button:has-text("Export")').click()]);
  ok(/backup-.*\.json$/.test(dl.suggestedFilename()), 'backup file downloads');
  ok(page.outside.length === 0, 'every request stays on the app\'s own origin (no analytics, CDN or font host)' + (page.outside.length ? ': ' + page.outside.join(' ') : ''));
  ok((await page.cspViolations()).length === 0, 'no Content-Security-Policy violations' + ((await page.cspViolations()).length ? ': ' + (await page.cspViolations()).join(' | ') : ''));
  await ctx.close();
}

console.log('security guards in the browser');
{
  const { ctx, page } = await open('en');
  await page.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__pwned = 1'; document.body.append(s); });
  ok(await page.evaluate(() => window.__pwned) === undefined, 'an injected inline script does not run (the CSP is enforced)');
  ok((await page.cspViolations()).some((v) => v.startsWith('script-src')), 'the blocked script is reported as a violation');
  for (let i = errors.length - 1; i >= 0; i--) if (/Refused to execute inline script/.test(errors[i])) errors.splice(i, 1); // the one console error we provoked on purpose
  await onb(page, T.en.demo);
  await page.waitForTimeout(400);
  /* hostile text in stored data must stay text */
  const XSS = '<img src=x onerror="window.__xss=1"><b>bold</b>';
  await page.evaluate((x) => { const st = JSON.parse(localStorage.getItem('app.state.v2')); st.ships[0].supplier.name = x; st.ships[0].title = x; st.org.name = x; localStorage.setItem('app.state.v2', JSON.stringify(st)); }, XSS);
  await page.reload();
  await page.waitForSelector('.screen[data-tab=home]:not(:empty)');
  await page.click('#tab-ships');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__xss) === undefined, 'markup inside stored names does not execute');
  ok(await page.locator('img[src="x"]').count() === 0 && (await page.locator('.screen[data-tab=ships]').innerText()).includes('<img'), 'it is shown as literal text');
  /* unreadable storage is kept aside, not overwritten */
  await page.evaluate(() => localStorage.setItem('app.state.v2', '{broken'));
  await page.reload();
  await page.waitForSelector('.onb');
  ok(await page.evaluate(() => localStorage.getItem('app.state.v2.unreadable')) === '{broken', 'unreadable data is copied to a side key before anything is saved');
  ok((await page.cspViolations()).filter((v) => !v.startsWith('script-src')).length === 0, 'no other violations');
  await ctx.close();
}

console.log('desktop layout');
{
  const { ctx, page } = await open('ar', { width: 1280, height: 860 });
  ok(await page.locator('#story').isVisible(), 'product story panel shown beside the device frame');
  ok((await page.locator('#story h1').innerText()).length > 10, 'story panel is filled');
  ok(!(await overflowX(page)), 'no horizontal overflow on desktop');
  ok(page.outside.length === 0, 'every request stays on the app\'s own origin (no analytics, CDN or font host)' + (page.outside.length ? ': ' + page.outside.join(' ') : ''));
  ok((await page.cspViolations()).length === 0, 'no Content-Security-Policy violations' + ((await page.cspViolations()).length ? ': ' + (await page.cspViolations()).join(' | ') : ''));
  await ctx.close();
}

console.log(errors.length ? 'console errors:\n' + errors.join('\n') : 'no console errors');
if (errors.length) failed++;
await browser.close();
server.close();
console.log(failed ? `\n${failed} problem(s)` : '\nall smoke checks passed');
process.exit(failed ? 1 : 0);
