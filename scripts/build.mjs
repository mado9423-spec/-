// Builds the single-file app into app/ (plus the host configuration derived from it).
//   node scripts/build.mjs [--out <file>] [--artifact <file>] [--emulators]
//   BRAND=<key in src/js/02-brand.js>     which brand table entry to build (default: dalil)
//   firebase.config.json                  optional web-app config; when present the (self-hosted) Firebase SDK is added: cloud mode
//   --emulators                           demo project + local emulators (for tests); never use for a release
//   --out <file>                          build only the page (and the SDK beside it) to another location, e.g. for tests
//   --artifact <file>                     also write the claude.ai artifact flavour (no service worker, Google Fonts link)
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCsp, hostingHeaders } from './csp.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };
const flag = (name) => process.argv.includes(name);
const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + '\n');

/* brand table comes from the source of truth in src/js/02-brand.js */
const brandSrc = read('src/js/02-brand.js');
const BRANDS = new Function(`${brandSrc}\nreturn BRANDS;`)();
const BRAND = process.env.BRAND || 'dalil';
if (!BRANDS[BRAND]) { console.error(`Unknown BRAND "${BRAND}". Use one of: ${Object.keys(BRANDS).join(', ')}`); process.exit(1); }
const br = BRANDS[BRAND];

const css = read('src/styles.css');
const fontsCss = read('src/fonts.css');
const shell = read('src/shell.html');
const js = readdirSync(join(root, 'src/js')).filter((f) => f.endsWith('.js')).sort()
  .map((f) => `/* ${f} */\n` + read('src/js/' + f)).join('\n')
  .replace(/\/\*BRAND_DEFAULT\*\/'[a-z]+'\/\*END\*\//, `/*BRAND_DEFAULT*/'${BRAND}'/*END*/`);
new Script(`(function(){'use strict';\n${js}\n})();`, { filename: 'app-bundle.js' }); /* fail the build on a syntax error */

let firebase = null;
if (flag('--emulators')) {
  firebase = { config: { apiKey: 'demo-key', authDomain: 'demo-darb.firebaseapp.com', projectId: 'demo-darb', storageBucket: 'demo-darb.appspot.com', appId: '1:0:web:demo' }, emulators: { auth: 'http://127.0.0.1:9099', firestore: ['127.0.0.1', 8080], storage: ['127.0.0.1', 9199] } };
} else if (existsSync(join(root, 'firebase.config.json'))) {
  firebase = { config: JSON.parse(read('firebase.config.json')) };
}

const outFile = arg('--out') || join(root, 'app/index.html');
const outDir = dirname(outFile);
const release = !arg('--out');
mkdirSync(outDir, { recursive: true });

/* the Firebase SDK is served from this origin (pinned by package-lock, no third-party script host); only copied when cloud mode is on */
const SDK = ['app', 'auth', 'firestore', 'storage'].map((m) => `firebase-${m}-compat.js`);
if (firebase) {
  const src = join(root, 'node_modules/firebase');
  if (!existsSync(join(src, SDK[0]))) { console.error('Firebase mode needs the SDK: run `npm ci` first.'); process.exit(1); }
  mkdirSync(join(outDir, 'vendor/firebase'), { recursive: true });
  SDK.forEach((f) => copyFileSync(join(src, f), join(outDir, 'vendor/firebase', f)));
  if (existsSync(join(src, 'LICENSE'))) copyFileSync(join(src, 'LICENSE'), join(outDir, 'vendor/firebase/LICENSE'));
}

const TITLE = `${br.ar} · ${br.tag.ar}`;
const DESC = 'تطبيق مرافق للمستورد في ليبيا: خطوة واضحة تلو الأخرى من الاعتماد إلى الإفراج الجمركي عبر FCMS وACI وPTS. بالعربية والإنجليزية.';
const script = (embed) => `<script>\n(function(){\n'use strict';\n${embed ? 'window.__EMBED__=true;\n' : ''}${js}\n})();\n</script>`;
const fbTags = firebase ? SDK.map((f) => `<script src="vendor/firebase/${f}"></script>`).join('\n') + `\n<script>window.FIREBASE_CONFIG=${JSON.stringify(firebase)};</script>` : '';

const full = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#070b14">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="preload" href="fonts/readex-pro-var-arabic.woff2" as="font" type="font/woff2" crossorigin>
<style>\n${fontsCss}\n${css}\n</style>
</head>
<body>
${shell}
${fbTags}
${script(false)}
</body>
</html>
`;
writeFileSync(outFile, full);
const csp = buildCsp(full, { firebase: !!firebase, emulators: !!(firebase && firebase.emulators) });
console.log(outFile.replace(root + '/', ''), (full.length / 1024).toFixed(0) + ' KB', `· brand=${BRAND}`, firebase ? (firebase.emulators ? '· firebase=emulators' : '· firebase=cloud') : '· firebase=off');

if (release) {
  const files = (dir, prefix) => (existsSync(join(root, 'app', dir)) ? readdirSync(join(root, 'app', dir)).filter((f) => !/\.(txt|md)$|LICENSE/i.test(f)).sort().map((f) => `${prefix}${f}`) : []);
  const shellList = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', ...files('fonts', 'fonts/'), ...(firebase ? files('vendor/firebase', 'vendor/firebase/') : [])];
  const build = createHash('sha1').update(full).update(shellList.join()).digest('hex').slice(0, 10);
  writeFileSync(join(root, 'app/sw.js'), read('src/sw.js').replace(/\/\*BUILD\*\/[^/]*\/\*END\*\//, build).replace(/\/\*SHELL\*\/[\s\S]*?\/\*END\*\//, JSON.stringify(shellList)));
  writeJson(join(root, 'app/manifest.webmanifest'), {
    name: TITLE, short_name: br.ar, description: DESC, lang: 'ar', dir: 'rtl', start_url: './', scope: './', display: 'standalone', orientation: 'portrait',
    background_color: '#070b14', theme_color: '#070b14',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [{ name: 'رحلاتي', url: './#ships' }, { name: 'التمويل', url: './#fin' }],
  });
  /* host configuration: security headers + caching, generated from the page so the CSP hashes always match */
  const vercel = hostingHeaders(csp, 'vercel');
  writeJson(join(root, 'vercel.json'), { $schema: 'https://openapi.vercel.sh/vercel.json', framework: null, buildCommand: null, installCommand: null, outputDirectory: 'app', cleanUrls: false, trailingSlash: false, headers: vercel });
  writeJson(join(root, 'app/vercel.json'), { $schema: 'https://openapi.vercel.sh/vercel.json', cleanUrls: false, trailingSlash: false, headers: vercel });
  const fbJson = JSON.parse(read('firebase.json'));
  fbJson.hosting.headers = hostingHeaders(csp, 'firebase');
  writeJson(join(root, 'firebase.json'), fbJson);
  writeFileSync(join(root, 'app/_headers'), hostingHeaders(csp, 'firebase').map((r) => `${r.source === '**' ? '/*' : r.source.replace('/**', '/*')}\n${r.headers.map((h) => `  ${h.key}: ${h.value}`).join('\n')}`).join('\n\n') + '\n'); /* Netlify / Cloudflare Pages format */
  writeFileSync(join(root, 'app/robots.txt'), 'User-agent: *\nDisallow: /\n');
}

const ai = process.argv.indexOf('--artifact');
if (ai > -1) {
  const target = process.argv[ai + 1];
  const GOOGLE_FONTS = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Readex+Pro:wght@300;400;500;600;700&display=swap';
  const frag = `<title>${TITLE}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${GOOGLE_FONTS}">
<style>\n${css}\n</style>
${shell}
${script(true)}
`;
  writeFileSync(target, frag);
  console.log(target, (frag.length / 1024).toFixed(0) + ' KB');
}
