// End-to-end smoke test: drives the main flows in headless Chromium and fails on any console/page error.
// Usage: node tests/smoke.mjs   (PW_ROOT=<dir containing node_modules/playwright> if playwright is installed globally)
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire(process.env.PW_ROOT || '/opt/node22/lib/node_modules/')('playwright')); }

const url = 'file://' + join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'index.html');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto(url);
await page.waitForTimeout(900);

let failed = 0;
const step = async (name, fn) => {
  try { await fn(); console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + ' - ' + String(e.message).split('\n')[0]); }
};
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const wait = (ms = 450) => page.waitForTimeout(ms);
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('sanad.v1')));

await step('home renders readiness + alerts', async () => {
  const t = await page.innerText('.screen[data-tab=home]');
  expect(/71%/.test(t), 'readiness 71% missing');
  expect(t.includes('متوقفة عند الإفراج'), 'blocked-shipment alert missing');
});
await step('channel advisor recommends a path', async () => {
  await page.click('.tool:has-text("مرشد القناة")'); await wait();
  await page.fill('#ca-usd', '80000'); await wait(200);
  expect((await page.innerText('.sheet')).includes('تحويل مباشر'), 'direct transfer not suggested for $80k');
  await page.fill('#ca-usd', '250000'); await wait(200);
  expect((await page.innerText('.sheet')).includes('اعتماد مستندي'), 'LC not suggested for $250k');
  await page.keyboard.press('Escape'); await wait();
});
await step('document matcher flags weight mismatch then clears', async () => {
  await page.click('.tool:has-text("مطابقة المستندات")'); await wait();
  expect((await page.innerText('.sheet')).includes('الوزن'), 'mismatch not listed');
  await page.click('.sheet button:has-text("اجعل الشهادة مطابقة")'); await wait(200);
  expect((await page.innerText('.sheet')).includes('متطابقة'), 'did not turn green');
  await page.keyboard.press('Escape'); await wait();
});
await step('importer approval requires a message, then advances ACI', async () => {
  await page.click('#tab-ships'); await wait(250);
  await page.click('.screen[data-tab=ships] .ship:has-text("SH-2610-014")'); await wait(700);
  await page.click('.page .card.tint-lilac button:has-text("مراجعة وموافقة")'); await wait();
  await page.click('.sheet button:has-text("موافقة")'); await wait(250);
  expect((await state()).ships.find((s) => s.id === 'SH-2610-014').aci.status === 'importer_review', 'approved without message');
  await page.fill('#ap-msg', 'تمت المراجعة'); await page.click('.sheet button:has-text("موافقة")'); await wait(800);
  expect((await state()).ships.find((s) => s.id === 'SH-2610-014').aci.status === 'supplier_completion', 'status did not advance');
});
await step('ACI composer validates ISO 6346 container numbers', async () => {
  await page.keyboard.press('Escape'); await wait(600);
  await page.click('.screen[data-tab=ships] .ship:has-text("SH-2609-007")'); await wait(700);
  await page.evaluate(() => { const g = [...document.querySelectorAll('.page .gate')].find((x) => x.id.endsWith('-aci')); if (!g.classList.contains('open')) g.querySelector('.ghead').click(); });
  await page.click('.page .gate.open button:has-text("مُنسّق")'); await wait(800);
  await page.evaluate(() => [...document.querySelectorAll('.page')].pop().querySelectorAll('details').forEach((d) => { d.open = true; }));
  const box = page.locator('.page details:has-text("الحاويات") .mini-card').first().locator('input').first();
  await box.fill('OLCU4829170'); await box.blur(); await wait();
  expect((await page.locator('.page').last().innerText()).includes('غير صحيح'), 'invalid container not flagged');
  await box.fill('OLCU4829175'); await box.blur(); await wait();
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await wait(600);
});
await step('new LC wizard: swipe to confirm creates a draft LC', async () => {
  await page.click('#tab-lcs'); await wait(300);
  await page.click('.screen[data-tab=lcs] .btn.gold:has-text("تجهيز")'); await wait(700);
  await page.fill('#lc-sup', 'Test Supplier Ltd');
  await page.click('.page-foot button:has-text("التالي")'); await wait(400);
  await page.click('.page-foot button:has-text("التالي")'); await wait(400);
  const th = await page.locator('.swipe .th').boundingBox(); const sw = await page.locator('.swipe').boundingBox();
  await page.mouse.move(th.x + th.width / 2, th.y + th.height / 2); await page.mouse.down();
  await page.mouse.move(sw.x + 40, th.y + th.height / 2, { steps: 10 }); await page.mouse.up(); await wait(900);
  expect((await state()).lcs.some((l) => l.supplier === 'Test Supplier Ltd' && l.status === 'draft'), 'LC not created');
  await page.click('#ovl button'); await wait(900);
  await page.keyboard.press('Escape'); await wait(400);
});
await step('portal message reader updates ACI status and number', async () => {
  await page.click('#tab-docs'); await wait(300); await page.click('.seg button:has-text("أدوات")'); await wait(300);
  await page.click('.screen[data-tab=docs] .card:has-text("قراءة إشعار")'); await wait();
  await page.selectOption('#mr-ship', 'SH-2610-014');
  await page.fill('#mr-text', 'تمت الموافقة - في انتظار بوليصة الشحن. رقم ACI: ACI-26-558210'); await wait(500);
  await page.click('.sheet button:has-text("تطبيق على")'); await wait(700);
  const s = (await state()).ships.find((x) => x.id === 'SH-2610-014');
  expect(s.aci.status === 'awaiting_bl' && s.aci.number === 'ACI-26-558210', `got ${s.aci.status} / ${s.aci.number}`);
});
await step('FAQ search filters answers', async () => {
  await page.click('#tab-hub'); await wait(300);
  await page.fill('#faq-q', 'ACI'); await wait(300);
  const n = await page.locator('.faq details').count();
  expect(n > 0 && n < 14, 'unexpected FAQ count ' + n);
});
await step('theme toggle persists', async () => {
  await page.click('#tab-home'); await wait(300);
  await page.click('button[aria-label="تبديل المظهر"]'); await wait(300);
  expect(['light', 'dark'].includes(await page.evaluate(() => document.documentElement.dataset.theme)), 'theme not set');
});

if (errors.length) { failed++; console.log('ERRORS:\n' + errors.join('\n')); }
await browser.close();
console.log(failed ? `\n${failed} failure(s)` : '\nall passed');
process.exit(failed ? 1 : 0);
