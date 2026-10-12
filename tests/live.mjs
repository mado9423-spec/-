// Post-deploy check of a published URL: headers, CSP hashes against the served page, assets, then a real browser pass
// (onboarding in both languages, no CSP violations, no third-party requests, service worker, installable manifest).
//   node tests/live.mjs https://your-site.example     (PW_ROOT=<dir containing node_modules/playwright> for a global install)
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

let chromium;
if (process.env.PW_ROOT) ({ chromium } = createRequire(process.env.PW_ROOT.replace(/\/?$/, '/'))('playwright'));
else ({ chromium } = await import('playwright'));

const base = (process.argv[2] || '').replace(/\/?$/, '/');
if (!/^https?:\/\//.test(base)) { console.error('usage: node tests/live.mjs <url>'); process.exit(2); }
let failed = 0;
const ok = (c, m) => { if (c) console.log('  ok  ', m); else { failed++; console.log('  FAIL', m); } };

console.log('headers and files');
const res = await fetch(base);
const html = await res.text();
const h = (k) => res.headers.get(k) || '';
const csp = h('content-security-policy');
const hash = (t) => `'sha256-${createHash('sha256').update(t, 'utf8').digest('base64')}'`;
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
ok(res.status === 200 && /text\/html/.test(h('content-type')), 'page served as HTML');
ok(scripts.length >= 1 && scripts.every((s) => csp.includes(hash(s))), 'every inline script is allowed by its hash in the CSP header');
ok(styles.length === 1 && csp.includes(hash(styles[0])), 'the inline stylesheet is allowed by its hash');
ok(!/unsafe-inline|unsafe-eval/.test(csp), "the CSP has no 'unsafe-inline' or 'unsafe-eval'");
ok(/default-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /base-uri 'none'/.test(csp) && /object-src 'none'/.test(csp), 'CSP: default-src, frame-ancestors, base-uri and object-src are closed');
ok(/max-age=\d{7,}/.test(h('strict-transport-security')), 'HSTS');
ok(h('x-content-type-options') === 'nosniff', 'nosniff');
ok(/deny/i.test(h('x-frame-options')), 'X-Frame-Options');
ok(h('referrer-policy') === 'no-referrer', 'Referrer-Policy');
ok(/camera=\(\)/.test(h('permissions-policy')), 'Permissions-Policy');
ok(/noindex/.test(h('x-robots-tag')), 'noindex while this is a prototype');
for (const p of ['sw.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'fonts/readex-pro-var-arabic.woff2', 'fonts/ibm-plex-sans-arabic-400-arabic.woff2']) {
  const r = await fetch(base + p);
  ok(r.status === 200, `${p} → ${r.status}`);
}
const sw = await (await fetch(base + 'sw.js')).text();
ok((await fetch(base + 'sw.js')).headers.get('cache-control') === 'no-cache' && /no-cache/.test(h('cache-control')), 'sw.js and the page are never served stale');

console.log('browser');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errors = [];
for (const [lang, who, name] of [['ar', 'شركة', 'شركة النور'], ['en', 'A sole trader', 'Salem Trading']]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: lang });
  await ctx.addInitScript((l) => { if (!localStorage.getItem('app.lang')) localStorage.setItem('app.lang', l); window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`)); }, lang);
  const page = await ctx.newPage();
  const outside = [];
  page.on('pageerror', (e) => errors.push(`${lang} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${lang} console: ${m.text()}`); });
  page.on('request', (r) => { if (!r.url().startsWith(base) && !/^(data|blob):/.test(r.url())) outside.push(r.url()); });
  await page.goto(base);
  await page.waitForSelector('.onb');
  const T = lang === 'ar' ? { go: 'ابدأ', next: 'التالي', plan: 'أنشئ خطتي', app: 'ادخل التطبيق' } : { go: 'Get started', next: 'Next', plan: 'Build my plan', app: 'Go to the app' };
  const click = (t) => page.locator(`.onb button:has-text("${t}")`).first().click();
  await click(T.go); await click(who); await page.fill('#onb-name', name);
  await click(T.next); await click(T.next); await click(T.plan); await click(T.app);
  await page.waitForSelector('.screen[data-tab=home]:not(:empty)');
  ok((await page.locator('.screen[data-tab=home]').innerText()).includes(name), `${lang}: onboarding completes and the home screen greets the business`);
  ok(await page.evaluate(() => document.documentElement.dir) === (lang === 'ar' ? 'rtl' : 'ltr'), `${lang}: direction`);
  ok(await page.evaluate(() => document.fonts.check('16px "Readex Pro"') && document.fonts.check('16px "IBM Plex Sans Arabic"')), `${lang}: the self-hosted fonts are available`);
  ok(await page.locator('.topbar .logo-mark svg path').count() === 1, `${lang}: the ship mark renders`);
  await page.waitForTimeout(1500);
  const swReady = await page.evaluate(async () => { try { const r = await navigator.serviceWorker.getRegistration(); return !!r; } catch (e) { return false; } });
  ok(swReady, `${lang}: the service worker registered`);
  ok(outside.length === 0, `${lang}: every request stays on the site's own origin` + (outside.length ? ': ' + outside.join(' ') : ''));
  const v = await page.evaluate(() => window.__csp);
  ok(v.length === 0, `${lang}: no Content-Security-Policy violations` + (v.length ? ': ' + v.join(' | ') : ''));
  await ctx.close();
}
await browser.close();
console.log(errors.length ? 'console errors:\n' + errors.join('\n') : 'no console errors');
if (errors.length) failed++;
console.log(failed ? `\n${failed} problem(s)` : '\nthe published site passes');
process.exit(failed ? 1 : 0);
