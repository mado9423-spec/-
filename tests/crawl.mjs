// Seeded random-click crawl over the demo data: finds crashes, CSP violations and untranslated (Arabic) text in English mode.
//   LANGV=en|ar N=400 SEED=7 node tests/crawl.mjs        (PW_ROOT=<dir containing node_modules/playwright> for a global install)
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { buildCsp } from '../scripts/csp.mjs';

let chromium;
if (process.env.PW_ROOT) ({ chromium } = createRequire(process.env.PW_ROOT.replace(/\/?$/, '/'))('playwright'));
else ({ chromium } = await import('playwright'));

const LANGV = process.env.LANGV || 'en';
const N = +(process.env.N || 300);
let seed = +(process.env.SEED || 7);
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const TYPES = { html: 'text/html; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', webmanifest: 'application/manifest+json', woff2: 'font/woff2' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname.replace(/^\/+/, '') || 'index.html';
  const file = join(appDir, path);
  if (!file.startsWith(appDir) || !existsSync(file)) { res.writeHead(404); return res.end(); }
  const body = readFileSync(file);
  const headers = { 'content-type': TYPES[path.split('.').pop()] || 'application/octet-stream' };
  if (path === 'index.html') headers['content-security-policy'] = buildCsp(body.toString('utf8'));
  res.writeHead(200, headers); res.end(body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: LANGV, serviceWorkers: 'block' });
await ctx.addInitScript((l) => { if (!localStorage.getItem('app.lang')) localStorage.setItem('app.lang', l); window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`)); }, LANGV);
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => { /* not supported in every build */ });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('filechooser', async (fc) => { await fc.setFiles({ name: 'doc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') }).catch(() => { /* chooser closed */ }); });
await page.goto(url);
await page.locator('.onb button').filter({ hasText: LANGV === 'ar' ? 'جرّب ببيانات تجريبية' : 'Explore with demo data' }).click();
await page.waitForTimeout(600);

const arabicScan = () => page.evaluate(() => {
  const out = [];
  const w = document.createTreeWalker(document.querySelector('#app'), NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const t = w.currentNode.nodeValue; if (/[؀-ۿ]/.test(t) && !/^(العربية|ع)$/.test(t.trim())) { const el = w.currentNode.parentElement; if (el && el.offsetParent !== null) out.push(t.trim().slice(0, 80)); } }
  return out;
});
const SKIP = /^(Start over|Reset|Tap to confirm|Sign out|Start with mine|ابدأ ببياناتي|إعادة|العربية|English|ع|EN)$|Explore with demo/;
const seen = new Set();
let clicks = 0;
for (let i = 0; i < N; i++) {
  const vis = [];
  for (const el of await page.$$('#app button:not([disabled]), #app summary, #app [role=tab]')) if (await el.isVisible().catch(() => false)) vis.push(el);
  if (!vis.length) { await page.keyboard.press('Escape'); continue; }
  const el = vis[Math.floor(rnd() * vis.length)];
  const label = ((await el.innerText().catch(() => '')) || (await el.getAttribute('aria-label')) || '').trim().slice(0, 40);
  if (SKIP.test(label)) continue;
  try { await el.click({ timeout: 800 }); clicks++; } catch (e) { await page.keyboard.press('Escape'); continue; }
  await page.waitForTimeout(80);
  if (rnd() < 0.2) await page.keyboard.press('Escape');
  if (LANGV === 'en') (await arabicScan()).forEach((t) => { if (!seen.has(t)) { seen.add(t); errors.push(`arabic-in-en after "${label}": ${t}`); } });
}
const csp = await page.evaluate(() => window.__csp);
csp.forEach((v) => errors.push('csp: ' + v));
console.log(`lang=${LANGV} seed=${process.env.SEED || 7} clicks=${clicks}`);
console.log(errors.length ? errors.join('\n') : 'crawl clean');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
