// Content-Security-Policy and the other security headers, derived from the built page so they never drift from it.
// The page has exactly one inline <script> (the app), an optional one (Firebase config) and one inline <style>:
// each is allowed by its SHA-256 hash, so the policy needs no 'unsafe-inline' and no nonce.
import { createHash } from 'node:crypto';

export function inlineBlocks(html) {
  return {
    scripts: [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]),
    styles: [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]),
  };
}
const hash = (t) => `'sha256-${createHash('sha256').update(t, 'utf8').digest('base64')}'`;

/* opts.firebase: the page loads the self-hosted Firebase SDK and talks to Google; opts.emulators: also allow the local emulators */
export function buildCsp(html, { firebase = false, emulators = false } = {}) {
  const { scripts, styles } = inlineBlocks(html);
  const d = {
    'default-src': ["'none'"],
    'script-src': [...scripts.map(hash)],
    'style-src': [...styles.map(hash)],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'manifest-src': ["'self'"],
    'worker-src': ["'self'"],
    'base-uri': ["'none'"],
    'form-action': ["'none'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
  };
  if (firebase) {
    /* Auth (popup, email link, phone + reCAPTCHA), Firestore (WebChannel) and Storage. Verify against your project in staging. */
    d['script-src'].push("'self'", 'https://apis.google.com', 'https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/');
    d['connect-src'].push('https://*.googleapis.com', 'https://*.firebaseio.com', 'wss://*.firebaseio.com', 'https://*.firebaseapp.com', 'https://*.firebasestorage.app');
    d['frame-src'] = ['https://*.firebaseapp.com', 'https://accounts.google.com', 'https://apis.google.com', 'https://www.google.com'];
    d['img-src'].push('https://*.googleusercontent.com');
  }
  if (emulators) d['connect-src'].push('http://127.0.0.1:*', 'ws://127.0.0.1:*');
  return Object.entries(d).map(([k, v]) => `${k} ${v.join(' ')}`).join('; ') + '; upgrade-insecure-requests';
}

const SECURITY = (csp) => [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }, /* the Google sign-in popup needs to talk back */
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' }, /* a prototype: remove this line (and the robots meta tag) when you launch publicly */
];
const NO_CACHE = [{ key: 'Cache-Control', value: 'no-cache' }];
const LONG = [{ key: 'Cache-Control', value: 'public, max-age=2592000' }];

/* the same rules in the two hosts' dialects: Vercel (path-to-regexp) and Firebase Hosting (globs) */
export function hostingHeaders(csp, dialect) {
  const v = dialect === 'vercel';
  return [
    { source: v ? '/(.*)' : '**', headers: SECURITY(csp) },
    { source: v ? '/' : '/', headers: NO_CACHE },
    { source: '/index.html', headers: NO_CACHE },
    { source: '/sw.js', headers: NO_CACHE },
    { source: '/manifest.webmanifest', headers: NO_CACHE },
    ...['fonts', 'icons', 'vendor'].map((d) => ({ source: v ? `/${d}/(.*)` : `/${d}/**`, headers: LONG })),
  ];
}
