// Builds the single-file app. Usage: node scripts/build.mjs [--artifact <out.html>]
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const css = read('src/styles.css');
const shell = read('src/shell.html');
const js = readdirSync(join(root, 'src/js')).filter((f) => f.endsWith('.js')).sort().map((f) => `/* ${f} */\n` + read('src/js/' + f)).join('\n');
const FONTS = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Readex+Pro:wght@300;400;500;600;700&display=swap';
const TITLE = 'سَنَد · مسار الاستيراد';
const script = (embed) => `<script>\n(function(){\n'use strict';\n${embed ? 'window.__SANAD_EMBED__=true;\n' : ''}${js}\n})();\n</script>`;

const full = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${TITLE}</title>
<meta name="description" content="تطبيق مرافق للمستورد الليبي: رحلة واحدة من الاعتماد إلى الإفراج الجمركي عبر FCMS وACI وPTS.">
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
${script(false)}
</body>
</html>
`;
mkdirSync(join(root, 'app'), { recursive: true });
writeFileSync(join(root, 'app/index.html'), full);
console.log('app/index.html', (full.length / 1024).toFixed(0) + ' KB');

const ai = process.argv.indexOf('--artifact');
if (ai > -1) {
  const out = process.argv[ai + 1];
  const frag = `<title>${TITLE}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>\n${css}\n</style>
${shell}
${script(true)}
`;
  writeFileSync(out, frag);
  console.log(out, (frag.length / 1024).toFixed(0) + ' KB');
}
