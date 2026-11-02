#!/usr/bin/env node
// Automated review of a composition: readability, timing, contrast, margins, opaque scenes, placeholders, jargon, claim IDs, length.
// It catches what a script can measure. It does not replace looking at the contact sheet.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, usage, die, loadPlaywright, serve, refreshRuntime, readJSON, SKILL_DIR } from './lib/common.mjs';

usage(`
node check.mjs <composition.html> [--direction launch|explain|usecases|setup] [--format 9:16] [--json]
  Exit 0 = no errors (warnings allowed), 1 = errors.
`);
const a = parseArgs(process.argv.slice(2), { booleans: ['json'] });
const comp = a._[0] && path.resolve(a._[0]);
if (!comp || !fs.existsSync(comp)) die('give the composition path');
const dir = path.dirname(comp);
refreshRuntime(dir);
const LISTS = readJSON(path.join(SKILL_DIR, 'scripts/lib/jargon.json'));
const RANGES = { launch: [15, 25], explain: [45, 75], usecases: [30, 60], setup: [60, 120] };
const FACTOR = { launch: 1, explain: 1.5, usecases: 1.15, setup: 1.3 };

const pw = await loadPlaywright();
const server = await serve(dir);
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('flex:')) consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));
await page.goto(`${server.url}/${encodeURIComponent(path.basename(comp))}?render=1${a.format ? '&format=' + a.format : ''}`, { waitUntil: 'load' });
const started = await page.waitForFunction(() => window.flex && window.flex.ready, null, { timeout: 15000 }).then(() => true).catch(() => false);
if (!started) { await browser.close(); server.close(); die(`runtime did not start: ${consoleErrors.join('; ') || 'is flex.js included?'}`); }
await page.evaluate(() => flex.ready);
const meta = await page.evaluate(() => ({ w: flex.width, h: flex.height, duration: flex.duration, scenes: flex.scenes(), direction: document.getElementById('flex').dataset.direction }));
await page.setViewportSize({ width: meta.w, height: meta.h });
const direction = a.direction || meta.direction;

const errors = [], warns = [];
const E = (m, where = '') => errors.push(where ? `${where}: ${m}` : m), W = (m, where = '') => warns.push(where ? `${where}: ${m}` : m);

// ---- static, whole-document checks
const doc = await page.evaluate(() => {
  const root = document.getElementById('flex');
  const scenes = [...root.querySelectorAll('.scene')].map((s, i) => {
    const cs = getComputedStyle(s); const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/); const alpha = m ? (m[1].split(/[ ,/]+/).filter(Boolean)[3] ?? 1) : 1;
    return { i, id: s.id, start: +s.dataset.start, end: +s.dataset.end, opaque: Number(alpha) >= .999 || cs.backgroundImage !== 'none',
      hasTerminal: !!s.querySelector('.fx-terminal,.fx-code') };
  });
  // text without a claim id
  const unclaimed = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (el.closest('.fx-demo,.fx-terminal,.fx-code,.ic,script,style,#flex-ui,[data-claim]')) continue;
    unclaimed.push({ text: n.textContent.trim().slice(0, 60), scene: el.closest('.scene')?.dataset.start });
  }
  const brokenImgs = [...root.querySelectorAll('img')].filter(im => !im.closest('.fx-demo') && (!im.complete || im.naturalWidth === 0)).map(im => im.getAttribute('src'));
  const attrs = [...root.querySelectorAll('[src],[data-rec],[data-claim],[data-ic],[data-url]')].map(e => [e.getAttribute('src'), e.dataset.rec, e.dataset.claim, e.dataset.ic, e.dataset.url].filter(Boolean).join(' ')).join(' ');
  return { scenes, unclaimed, brokenImgs, text: root.textContent + ' ' + attrs + ' ' + document.title,
    claims: [...root.querySelectorAll('[data-claim]')].map(e => e.dataset.claim) };
});

const sorted = [...doc.scenes].sort((x, y) => x.start - y.start);
if (!sorted.length) E('no .scene elements');
if (sorted.length && sorted[0].start > 0) E(`nothing on screen from 0 to ${sorted[0].start}s`);
for (let i = 0; i < sorted.length; i++) {
  const s = sorted[i], next = sorted[i + 1];
  if (!s.opaque) E('scene background is transparent — the previous scene will show through transitions (set background or --scene-bg)', `scene @${s.start}s`);
  if (!(s.end > s.start)) E('data-end must be after data-start', `scene @${s.start}s`);
  if (next && next.start > s.end + 1e-6) E(`gap ${s.end}–${next.start}s shows black`, `scene @${s.start}s`);
  if (direction === 'explain' && s.hasTerminal) E('Explain videos show no code or terminals — show the result instead', `scene @${s.start}s`);
}
// first frame is the thumbnail on most platforms: something must be visible at 0s
const firstFrame = await page.evaluate(() => {
  flex.seek(0);
  const visible = el => { for (let e = el; e && e.id !== 'flex'; e = e.parentElement) { const cs = getComputedStyle(e); if (Number(cs.opacity) < .3 || /100%/.test(cs.clipPath) || /opacity\(0/.test(cs.filter)) return false; } return true; };
  return [...document.querySelectorAll('#flex .scene.is-on [data-claim], #flex .scene.is-on img, #flex .scene.is-on .fx-demo, #flex .scene.is-on .ic')].some(visible);
});
if (!firstFrame) E('the first frame (0s) is empty — it is the thumbnail on most platforms; have the opening line visible at 0s (e.g. fx-zoom instead of an entrance)');
const [lo, hi] = RANGES[direction] || [0, 1e9];
if (meta.duration < lo || meta.duration > hi) E(`length ${meta.duration}s is outside ${direction}'s ${lo}–${hi}s`);

const PH = [/\{\{[^}]*\}\}/, /lorem ipsum/i, /\bTODO\b/, /\bTBD\b/, /PLACEHOLDER/i, /<Product>/, /\bYour Product\b/i, /\bexample\.com\b/i];
for (const re of PH) { const m = doc.text.match(re); if (m) E(`placeholder text left in: "${m[0]}"`); }
for (const u of doc.unclaimed) E(`text without data-claim: "${u.text}"`, `scene @${u.scene}s`);
for (const b of doc.brokenImgs) E(`image failed to load: ${b}`);
for (const c of consoleErrors) E(`runtime: ${c}`);

// claims vs truth.md
const truthFile = path.join(dir, 'truth.md');
const ids = new Set(), bad = new Set();
if (fs.existsSync(truthFile)) for (const line of fs.readFileSync(truthFile, 'utf8').split('\n')) {
  const m = line.match(/^\|\s*(C\d+)\s*\|/); if (!m) continue;
  const cells = line.split('|').map(c => c.trim()).filter(Boolean);
  if (cells.length < 5 || cells.slice(1, 5).some(c => !c)) { bad.add(m[1]); continue; }
  if (/❌/.test(line)) bad.add(m[1]); else ids.add(m[1]);
}
const used = [...new Set(doc.claims)].filter(c => c !== 'framing');
if (used.length && !fs.existsSync(truthFile)) E('truth.md missing — every claim needs a source');
for (const c of used) {
  if (bad.has(c)) E(`claim ${c} is unverified (❌) or has empty source cells in truth.md — remove it from the video or source it`);
  else if (!ids.has(c)) E(`data-claim="${c}" is not in truth.md`);
}

// ---- per-text-element checks, measured while each is on screen
const items = await page.evaluate(() => [...document.querySelectorAll('#flex [data-claim]')].map((el, k) => {
  el.dataset.chk = k;
  const sc = el.closest('.scene');
  const atOf = e => { const v = parseFloat(getComputedStyle(e).getPropertyValue('--at')); return Number.isFinite(v) ? v : 0; };
  let at = atOf(el); // children may appear later than their container
  for (const c of el.querySelectorAll('*')) at = Math.max(at, atOf(c));
  const start = sc ? +sc.dataset.start : 0, end = sc ? +sc.dataset.end : flex.duration;
  const out = el.dataset.out != null ? start + +el.dataset.out : end;
  return { k, claim: el.dataset.claim, text: el.textContent.replace(/\s+/g, ' ').trim(), sceneStart: start, appear: start + at, gone: Math.min(out, end),
    explained: !!el.closest('[data-explained]'), label: !!el.closest('.kicker,.chip,.k') };
}));

const words = s => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).length;
const jargonRe = LISTS.jargon.map(j => [j, new RegExp(`(^|[^\\p{L}])${j.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}])`, 'iu')]);
const hypeRe = LISTS.hype.map(j => [j, new RegExp(`(^|[^\\p{L}])${j}(?=$|[^\\p{L}])`, 'iu')]);
const factor = FACTOR[direction] || 1;

for (const it of items) {
  if (!it.text) continue;
  const where = `"${it.text.slice(0, 40)}${it.text.length > 40 ? '…' : ''}" @${it.appear.toFixed(1)}s`;
  const n = words(it.text), hold = it.gone - it.appear, need = Math.max(1.2, .3 * n);
  if (hold < need) E(`on screen ${hold.toFixed(1)}s, needs ≥ ${need.toFixed(1)}s for ${n} words (read-twice rule)`, where);
  else if (hold < need * factor) W(`on screen ${hold.toFixed(1)}s; ${direction} pacing wants ~${(need * factor).toFixed(1)}s`, where);
  if (direction !== 'launch' && !it.explained) for (const [j, re] of jargonRe) if (re.test(it.text)) E(`jargon "${j}" — replace it or explain it on screen (then mark data-explained)`, where);
  for (const [j, re] of hypeRe) if (re.test(it.text)) W(`hype word "${j}" — show it instead`, where);

  // measure at the moment it's fully in (appear + 1.2s, clamped inside its visible window)
  const t = Math.min(it.gone - .05, it.appear + 1.2);
  if (t < 0) continue;
  const m = await page.evaluate(({ k, t }) => {
    flex.seek(t);
    const el = document.querySelector(`[data-chk="${k}"]`), root = document.getElementById('flex');
    const R = root.getBoundingClientRect(), r = el.getBoundingClientRect(), k2 = R.width / root.offsetWidth;
    // lines and words per line from word rects
    const lines = new Map();
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = tw.nextNode());) {
      if (n.parentElement.closest('.ic')) continue;
      const re = /\S+/g; let m;
      while ((m = re.exec(n.textContent))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length); const b = rg.getClientRects()[0]; if (!b) continue;
        const key = Math.round((b.top + b.bottom) / 2 / 8); lines.set(key, (lines.get(key) || 0) + (/[\p{L}\p{N}]/u.test(m[0]) ? 1 : 0)); }
    }
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize), weight = Number(cs.fontWeight) || 400;
    // computed colours arrive as rgb(), color(srgb …) (from color-mix) or oklch()/oklab()
    const parse = c => {
      let mm = c.match(/rgba?\(([^)]+)\)/);
      if (mm) { const p = mm[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { c: p.slice(0, 3), a: p[3] ?? 1 }; }
      mm = c.match(/color\(srgb ([^)]+)\)/);
      if (mm) { const p = mm[1].split(/[ /]+/).filter(Boolean).map(Number); return { c: p.slice(0, 3).map(v => v * 255), a: p[3] ?? 1 }; }
      mm = c.match(/okl(ch|ab)\(([^)]+)\)/);
      if (mm) {
        const p = mm[2].split(/[ /]+/).filter(Boolean).map(v => v.endsWith('%') ? parseFloat(v) / 100 : Number(v));
        let [L, A, B] = p; if (mm[1] === 'ch') { const h = B * Math.PI / 180; [A, B] = [A * Math.cos(h), A * Math.sin(h)]; }
        const l = (L + .3963377774 * A + .2158037573 * B) ** 3, m2 = (L - .1055613458 * A - .0638541728 * B) ** 3, s2 = (L - .0894841775 * A - 1.291485548 * B) ** 3;
        const lin = [4.0767416621 * l - 3.3077115913 * m2 + .2309699292 * s2, -1.2684380046 * l + 2.6097574011 * m2 - .3413193965 * s2, -.0041960863 * l - .7034186147 * m2 + 1.707614701 * s2];
        return { c: lin.map(v => 255 * Math.max(0, Math.min(1, v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055))), a: p[3] ?? 1 };
      }
      return null;
    };
    let bg = null, e = el;
    while (e && e !== document.documentElement) { const b = parse(getComputedStyle(e).backgroundColor); if (b && b.a > .9) { bg = b.c; break; } if (getComputedStyle(e).backgroundImage !== 'none') break; e = e.parentElement; }
    const fg = parse(cs.color);
    const vis = getComputedStyle(el.closest('.scene') || el).visibility;
    return { lines: [...lines.values()].filter(v => v > 0), fs: fs * k2, weight, fg: fg && fg.c, bg, op: Number(cs.opacity),
      rect: { l: (r.left - R.left) / k2, t: (r.top - R.top) / k2, r: (r.right - R.left) / k2, b: (r.bottom - R.top) / k2 }, vis,
      clipped: el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 4 && cs.overflow !== 'visible' };
  }, { k: it.k, t });
  const short = Math.min(meta.w, meta.h), scale = short / 1080;
  const maxWords = Math.max(...m.lines, 0);
  if (!it.label) {
    if (m.lines.length > 2) E(`${m.lines.length} lines — keep to ≤ 2`, where);
    if (maxWords > 8) E(`${maxWords} words on one line — keep to ≤ 7`, where); else if (maxWords === 8) W('8 words on one line — aim for ≤ 7', where);
  }
  const px = m.fs / scale, minPx = it.label ? 28 : 36;
  if (px < minPx) E(`text is ${px.toFixed(0)}px at 1080p — min ${minPx}px (thumbnails make it smaller still)`, where);
  if (m.fg && m.bg) {
    const L = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
    const [a1, b1] = [L(m.fg), L(m.bg)].sort((x, y) => y - x), ratio = (a1 + .05) / (b1 + .05);
    const large = px >= 40 || (px >= 32 && m.weight >= 700);
    if (ratio < (large ? 3 : 4.5)) E(`contrast ${ratio.toFixed(1)}:1 is too low (need ${large ? 3 : 4.5}:1)`, where);
  }
  const inset = .04 * short;
  if (m.rect.l < inset - 1 || m.rect.t < inset - 1 || m.rect.r > meta.w - inset + 1 || m.rect.b > meta.h - inset + 1) E('text is outside the safe margin (4% of the short side)', where);
  if (m.clipped) W('text may be clipped by its box', where);
}

await browser.close(); server.close();
if (a.json) console.log(JSON.stringify({ direction, duration: meta.duration, errors, warnings: warns }, null, 2));
else {
  console.log(`check: ${path.relative(process.cwd(), comp)} — ${direction}, ${meta.duration}s, ${items.length} text elements`);
  errors.forEach(e => console.log('  ✗ ' + e));
  warns.forEach(w => console.log('  ! ' + w));
  console.log(errors.length ? `${errors.length} error(s), ${warns.length} warning(s). Fix the errors, then look at the contact sheet.` : `✓ no errors (${warns.length} warning(s)). Now look at the contact sheet: node render.mjs ${path.relative(process.cwd(), comp)} --preview`);
}
process.exit(errors.length ? 1 : 0);
