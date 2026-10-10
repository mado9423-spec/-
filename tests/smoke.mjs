// Browser smoke test of the local (no-cloud) app: first-run onboarding for a company and a sole trader, Arabic and English,
// direction switching, the simplified shipment view, demo data, brand preview, backup, and layout sanity. Fails on any console/page error.
// Usage: node scripts/build.mjs && node tests/smoke.mjs      (PW_ROOT=<dir containing node_modules/playwright> for a global install)
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

let chromium;
if (process.env.PW_ROOT) ({ chromium } = createRequire(process.env.PW_ROOT.replace(/\/?$/, '/'))('playwright'));
else ({ chromium } = await import('playwright'));

const url = 'file://' + join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'index.html');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errors = [];
let failed = 0;
const ok = (cond, msg) => { if (cond) console.log('  ok  ', msg); else { failed++; console.log('  FAIL', msg); } };

async function open(lang, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, locale: lang, acceptDownloads: true });
  await ctx.addInitScript((l) => { if (!localStorage.getItem('app.lang')) localStorage.setItem('app.lang', l); }, lang);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${lang} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(`${lang} console: ${m.text()}`); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(url);
  await page.waitForTimeout(500);
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
  await page.waitForTimeout(600); /* let the browser flush localStorage before a file:// reload */
  await page.reload();
  ok(await page.waitForFunction((o) => document.documentElement.lang === o && !!document.querySelector('.screen[data-tab=home]')?.innerText, other, { timeout: 8000 }).then(() => true, () => false), 'language choice persists across reload');
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

  /* settings: brand preview and backup */
  await page.click('#tab-more');
  await page.locator(`.screen[data-tab=more] button:has-text("${T.en.settings}")`).click();
  await page.selectOption('#brand-sel', 'sanad');
  await page.waitForTimeout(300);
  ok((await page.locator('#story').innerText()).includes('Sanad') || (await page.locator('.topbar').count()) === 0, 'brand preview applies');
  ok((await page.evaluate(() => localStorage.getItem('app.brand'))) === 'sanad', 'brand choice remembered');
  await page.selectOption('#brand-sel', 'darb');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.locator('.page button:has-text("Export")').click()]);
  ok(/backup-.*\.json$/.test(dl.suggestedFilename()), 'backup file downloads');
  await ctx.close();
}

console.log('desktop layout');
{
  const { ctx, page } = await open('ar', { width: 1280, height: 860 });
  ok(await page.locator('#story').isVisible(), 'product story panel shown beside the device frame');
  ok((await page.locator('#story h1').innerText()).length > 10, 'story panel is filled');
  ok(!(await overflowX(page)), 'no horizontal overflow on desktop');
  await ctx.close();
}

console.log(errors.length ? 'console errors:\n' + errors.join('\n') : 'no console errors');
if (errors.length) failed++;
await browser.close();
console.log(failed ? `\n${failed} problem(s)` : '\nall smoke checks passed');
process.exit(failed ? 1 : 0);
