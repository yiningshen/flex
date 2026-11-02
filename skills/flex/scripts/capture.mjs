#!/usr/bin/env node
// Screenshots a running web app at desktop + mobile sizes and extracts its brand (colors, fonts, logo, headline) into brand.json.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, usage, die, loadPlaywright, writeJSON } from './lib/common.mjs';
import { findSecrets } from './lib/secrets.mjs';

usage(`
node capture.mjs <url> --out <dir>/assets [--storage state.json] [--full]
  Writes desktop.png (1440×900 @2x), mobile.png (390×844 @3x), logo.*, brand.json.
  Check brand.json by eye: extraction is a best guess; the maker's real brand wins.
`);
const a = parseArgs(process.argv.slice(2), { booleans: ['full'] });
const url = a._[0]; if (!url) die('give a URL, e.g. http://localhost:3000');
const out = path.resolve(a.out || 'assets'); fs.mkdirSync(out, { recursive: true });
const pw = await loadPlaywright();
const browser = await pw.chromium.launch();
const storageState = a.storage ? path.resolve(a.storage) : undefined;

const desk = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, storageState });
await desk.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await desk.waitForTimeout(500);
await desk.screenshot({ path: path.join(out, 'desktop.png'), fullPage: !!a.full });

const brand = await desk.evaluate(() => {
  const css = (el, p) => el ? getComputedStyle(el).getPropertyValue(p) : '';
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, al = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return al < .5 ? null : [r, g, b]; };
  const hex = c => c && '#' + c.map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const sat = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
  // background: the page's own background, else the first opaque one behind the centre
  let bg = parse(css(document.body, 'background-color')) || parse(css(document.documentElement, 'background-color'));
  for (let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2); el && !bg; el = el.parentElement) bg = parse(css(el, 'background-color'));
  bg = bg || [255, 255, 255];
  const ink = parse(css(document.querySelector('h1,h2,p,body'), 'color')) || [17, 17, 17];
  // accent: most common saturated color on buttons/links
  const counts = {};
  for (const e of document.querySelectorAll('button, a, [role=button], .btn, [class*=button], [class*=primary]')) {
    const r = e.getBoundingClientRect(); if (r.width < 20 || r.height < 12 || r.top > innerHeight * 2) continue;
    for (const p of ['background-color', 'color', 'border-color']) { const c = parse(css(e, p)); if (c && sat(c) > .35) { const h = hex(c); counts[h] = (counts[h] || 0) + r.width * r.height * (p === 'background-color' ? 3 : 1); } }
  }
  const accent = Object.entries(counts).sort((x, y) => y[1] - x[1])[0]?.[0] || null;
  const accentRgb = accent ? accent.match(/\w\w/g).map(h => parseInt(h, 16)) : null;
  const fam = s => s.split(',')[0].trim();
  const h1 = document.querySelector('h1');
  // logo candidates
  const imgs = [...document.querySelectorAll('header img, nav img, a[href="/"] img, img[alt*=logo i], img[class*=logo i], img[src*=logo i]')];
  const svg = document.querySelector('header svg, nav svg, a[href="/"] svg, [class*=logo i] svg, svg[class*=logo i]');
  const icon = document.querySelector('link[rel~="icon"][sizes], link[rel="apple-touch-icon"], link[rel~="icon"]');
  return {
    name: (document.querySelector('meta[property="og:site_name"]')?.content || document.title.split(/[|–—-]/)[0] || '').trim(),
    title: document.title,
    headline: h1 ? h1.innerText.trim() : '',
    description: document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content || '',
    colors: { bg: hex(bg), ink: hex(ink), accent, accentInk: accentRgb ? (lum(accentRgb) > .45 ? '#111111' : '#ffffff') : null, dark: lum(bg) < .2 },
    fonts: { body: fam(css(document.body, 'font-family')), display: fam(css(h1 || document.body, 'font-family')) },
    fontFaces: [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].filter(r => r.type === 5).map(r => r.cssText); } catch { return []; } }).slice(0, 8),
    logoSrc: imgs[0]?.currentSrc || null, logoSvg: !imgs[0] && svg ? svg.outerHTML : null, iconSrc: icon?.href || null,
    ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
    text: document.body.innerText.slice(0, 20000),
  };
});

let logo = null;
if (brand.logoSvg) { fs.writeFileSync(path.join(out, 'logo.svg'), brand.logoSvg.includes('xmlns') ? brand.logoSvg : brand.logoSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')); logo = 'logo.svg'; }
for (const src of [brand.logoSrc, brand.iconSrc]) {
  if (logo || !src) continue;
  try { const r = await desk.request.get(src); if (r.ok()) { const ext = (r.headers()['content-type'] || '').includes('svg') ? '.svg' : (path.extname(new URL(src).pathname) || '.png'); fs.writeFileSync(path.join(out, 'logo' + ext), await r.body()); logo = 'logo' + ext; } } catch {}
}

const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, storageState });
await mob.goto(url, { waitUntil: 'networkidle', timeout: 30000 }); await mob.waitForTimeout(400);
await mob.screenshot({ path: path.join(out, 'mobile.png') });
await browser.close();

const findings = findSecrets(brand.text);
const { text, logoSvg, ...keep } = brand;
const result = { ...keep, url, capturedAt: new Date().toISOString(), logo, screenshots: ['desktop.png', 'mobile.png'], fontFaces: keep.fontFaces.map(f => f.replace(/url\((['"]?)\//g, `url($1${new URL(url).origin}/`)) };
writeJSON(path.join(out, 'brand.json'), result);
console.log(`✓ ${path.relative(process.cwd(), out)}/brand.json — name "${result.name}", bg ${result.colors.bg}, ink ${result.colors.ink}, accent ${result.colors.accent || '(none found)'}, font ${result.fonts.display}${logo ? ', logo ' + logo : ', no logo found'}`);
console.log('  desktop.png, mobile.png — look at them before using; brand extraction is a best guess.');
if (findings.length) { console.warn(`⚠ possible secrets/personal data on the page: ${findings.map(f => f.kind + ' ' + f.match).join(', ')}`); process.exitCode = 2; }
