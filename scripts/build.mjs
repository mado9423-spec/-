// Builds the single-file app into app/.
//   node scripts/build.mjs [--out <file>] [--artifact <file>] [--emulators]
//   BRAND=marfa|sanad|darb                        default brand (the name is not final; users can also preview in Settings)
//   firebase.config.json                  optional web-app config; when present the Firebase compat SDK is added (cloud mode)
//   --emulators                           demo project + local emulators (for tests); never use for a release
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };
const flag = (name) => process.argv.includes(name);

const SDK_VERSION = process.env.FIREBASE_SDK_VERSION || '12.5.0';
const SDK = ['app', 'auth', 'firestore', 'storage'].map((m) => `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-${m}-compat.js`);

/* brand table comes from the source of truth in src/js/02-brand.js */
const brandSrc = read('src/js/02-brand.js');
const BRANDS = new Function(`let localStorage; ${brandSrc.replace(/\bdocument\.title[^;]*;/g, '')}\nreturn BRANDS;`)();
const BRAND = process.env.BRAND || 'marfa';
if (!BRANDS[BRAND]) { console.error(`Unknown BRAND "${BRAND}". Use one of: ${Object.keys(BRANDS).join(', ')}`); process.exit(1); }
const br = BRANDS[BRAND];

const css = read('src/styles.css');
const shell = read('src/shell.html');
const js = readdirSync(join(root, 'src/js')).filter((f) => f.endsWith('.js')).sort()
  .map((f) => `/* ${f} */\n` + read('src/js/' + f)).join('\n')
  .replace(/\/\*BRAND_DEFAULT\*\/'[a-z]+'\/\*END\*\//, `/*BRAND_DEFAULT*/'${BRAND}'/*END*/`);

let firebase = null;
if (flag('--emulators')) {
  firebase = { config: { apiKey: 'demo-key', authDomain: 'demo-darb.firebaseapp.com', projectId: 'demo-darb', storageBucket: 'demo-darb.appspot.com', appId: '1:0:web:demo' }, emulators: { auth: 'http://127.0.0.1:9099', firestore: ['127.0.0.1', 8080], storage: ['127.0.0.1', 9199] } };
} else if (existsSync(join(root, 'firebase.config.json'))) {
  firebase = { config: JSON.parse(read('firebase.config.json')) };
}

const FONTS = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Readex+Pro:wght@300;400;500;600;700&display=swap';
const TITLE = `${br.ar} · ${br.tag.ar}`;
const DESC = 'تطبيق مرافق للمستورد في ليبيا: خطوة واضحة تلو الأخرى من الاعتماد إلى الإفراج الجمركي عبر FCMS وACI وPTS. بالعربية والإنجليزية.';
const script = (embed) => `<script>\n(function(){\n'use strict';\n${embed ? 'window.__SANAD_EMBED__=true;\n' : ''}${js}\n})();\n</script>`;
const fbTags = firebase ? SDK.map((s) => `<script src="${s}"></script>`).join('\n') + `\n<script>window.FIREBASE_CONFIG=${JSON.stringify(firebase)};</script>` : '';

const full = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<meta name="theme-color" content="#070b14">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>\n${css}\n</style>
</head>
<body>
${shell}
${fbTags}
${script(false)}
</body>
</html>
`;

const out = arg('--out') || join(root, 'app/index.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, full);
console.log(out.replace(root + '/', ''), (full.length / 1024).toFixed(0) + ' KB', `· brand=${BRAND}`, firebase ? (firebase.emulators ? '· firebase=emulators' : '· firebase=cloud') : '· firebase=off');

if (!arg('--out')) {
  const build = createHash('sha1').update(full).digest('hex').slice(0, 10);
  writeFileSync(join(root, 'app/sw.js'), read('src/sw.js').replace(/\/\*BUILD\*\/[^/]*\/\*END\*\//, build));
  writeFileSync(join(root, 'app/manifest.webmanifest'), JSON.stringify({
    name: TITLE, short_name: br.ar, description: DESC, lang: 'ar', dir: 'rtl', start_url: './', scope: './', display: 'standalone', orientation: 'portrait',
    background_color: '#070b14', theme_color: '#070b14',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [{ name: 'رحلاتي', url: './#ships' }, { name: 'التمويل', url: './#fin' }],
  }, null, 2) + '\n');
}

const ai = process.argv.indexOf('--artifact');
if (ai > -1) {
  const target = process.argv[ai + 1];
  const frag = `<title>${TITLE}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>\n${css}\n</style>
${shell}
${script(true)}
`;
  writeFileSync(target, frag);
  console.log(target, (frag.length / 1024).toFixed(0) + ' KB');
}
