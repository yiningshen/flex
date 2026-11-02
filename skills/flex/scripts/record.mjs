#!/usr/bin/env node
// Drives the real web app in a headless browser and records frames + a timeline.
// The runtime (<div class="fx-demo" data-rec="name">) turns the timeline into cursor moves, clicks, typing and camera zooms.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseArgs, usage, die, loadPlaywright, readJSON, writeJSON } from './lib/common.mjs';
import { findSecrets } from './lib/secrets.mjs';

usage(`
node record.mjs --steps steps.json --out <dir>/assets/rec [--mask "#email,.key"] [--storage state.json] [--scale 2] [--headed]
  steps.json: { "name": "new-order", "viewport": [1440, 900], "mobile": false, "steps": [ {"do": "goto", "url": "..."}, ... ] }
  verbs: goto click type press hover scroll select wait hold zoom unzoom frames eval   (see references/product-kinds.md)
  Writes <out>/<name>/: 0001.jpg…, timeline.js, log.json. Add the printed <script> tag to the composition.
`);
const a = parseArgs(process.argv.slice(2), { booleans: ['headed'] });
if (!a.steps) die('--steps is required');
const spec = readJSON(path.resolve(a.steps));
const name = spec.name || path.basename(a.steps, '.json');
const outRoot = path.resolve(a.out || 'assets/rec');
const out = path.join(outRoot, name);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const [vw, vh] = spec.viewport || (spec.mobile ? [390, 844] : [1440, 900]);
const masks = [...(a.mask ? String(a.mask).split(',') : []), ...(spec.mask || [])].map(s => s.trim()).filter(Boolean);

const pw = await loadPlaywright();
const browser = await pw.chromium.launch({ headless: !a.headed });
const context = await browser.newContext({
  viewport: { width: vw, height: vh }, deviceScaleFactor: Number(a.scale || spec.scale || 2),
  isMobile: !!spec.mobile, hasTouch: !!spec.mobile, colorScheme: spec.colorScheme || 'light', reducedMotion: 'no-preference',
  storageState: a.storage ? path.resolve(a.storage) : undefined,
});
const page = await context.newPage();

const events = [], frames = [], findings = [], log = [];
let t = 0, cursor = [vw * .62, vh * .78], lastHash = null, host = '';
const r3 = x => Math.round(x * 1000) / 1000;

async function frame({ fade = false } = {}) {
  const buf = await page.screenshot({ type: 'jpeg', quality: 88, mask: masks.map(m => page.locator(m)), maskColor: '#d9dce1', animations: 'disabled', caret: 'hide' });
  const hash = crypto.createHash('sha1').update(buf).digest('hex');
  if (hash !== lastHash) {
    const file = String(frames.length + 1).padStart(4, '0') + '.jpg';
    fs.writeFileSync(path.join(out, file), buf);
    frames.push(file); lastHash = hash;
    events.push({ t: r3(t), frame: frames.length - 1, ...(fade ? { fade: true } : {}) });
    const text = await page.evaluate(() => document.body ? document.body.innerText + '\n' + [...document.querySelectorAll('input,textarea')].map(i => i.type === 'password' ? '' : i.value).join('\n') : '').catch(() => '');
    for (const h of findSecrets(text)) findings.push({ frame: file, ...h });
  }
}
function target(step) {
  if (step.selector) return page.locator(step.selector).first();
  if (step.text) return page.getByText(step.text, { exact: !!step.exact }).first();
  if (step.role) return page.getByRole(step.role, { name: step.name }).first();
  if (step.label) return page.getByLabel(step.label).first();
  throw new Error(`step needs selector, text, role or label: ${JSON.stringify(step)}`);
}
async function boxOf(step) {
  const loc = target(step);
  await loc.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
  const b = await loc.boundingBox({ timeout: 8000 });
  if (!b) throw new Error(`not visible: ${JSON.stringify(step)}`);
  return { loc, b };
}
function moveTo(x, y, dur) {
  const dist = Math.hypot(x - cursor[0], y - cursor[1]);
  const d = dur ?? Math.min(.85, Math.max(.4, dist / 1400));
  events.push({ t: r3(t), cursor: [Math.round(x), Math.round(y)], dur: r3(d) });
  cursor = [x, y]; t += d;
}
async function settle(ms = 250) { await page.waitForLoadState('domcontentloaded').catch(() => {}); await page.waitForTimeout(ms); }

const started = Date.now();
for (const [i, step] of spec.steps.entries()) {
  const s0 = Date.now();
  try {
    switch (step.do) {
      case 'goto':
        await page.goto(step.url, { waitUntil: step.waitUntil || 'networkidle', timeout: 30000 });
        if (!host) host = new URL(page.url()).host;
        await settle(step.settle ?? 300); await frame({ fade: frames.length > 0 }); break;
      case 'hold': t += Number(step.s ?? 1); break;
      case 'click': {
        const { loc, b } = await boxOf(step);
        const x = b.x + b.width * (step.dx ?? .5), y = b.y + b.height * (step.dy ?? .5);
        moveTo(x, y, step.move);
        events.push({ t: r3(t), click: true, at: [Math.round(x), Math.round(y)] });
        const before = page.url();
        await loc.click({ timeout: 8000 });
        await settle(step.settle ?? 350);
        t += .12; await frame({ fade: page.url() !== before }); t += step.after ?? .45; break;
      }
      case 'type': {
        const { loc, b } = await boxOf(step);
        const x = b.x + Math.min(b.width * .5, 60), y = b.y + b.height / 2;
        moveTo(x, y, step.move);
        events.push({ t: r3(t), click: true, at: [Math.round(x), Math.round(y)] });
        await loc.click({ timeout: 8000 }); if (step.clear) await loc.fill('');
        t += .2; await frame();
        const text = String(step.text), chunk = step.chunk || 2, cps = step.cps || 16;
        for (let k = 0; k < text.length; k += chunk) {
          const part = text.slice(k, k + chunk);
          await page.keyboard.type(part);
          events.push({ t: r3(t), key: true });
          await frame(); t += part.length / cps;
        }
        if (step.enter) { await page.keyboard.press('Enter'); await settle(step.settle ?? 400); t += .15; await frame({ fade: true }); }
        t += step.after ?? .4; break;
      }
      case 'press': await page.keyboard.press(step.key); await settle(step.settle ?? 300); events.push({ t: r3(t), key: true }); await frame(); t += step.after ?? .4; break;
      case 'hover': { const { loc, b } = await boxOf(step); moveTo(b.x + b.width / 2, b.y + b.height / 2, step.move); await loc.hover(); await settle(200); await frame(); t += step.after ?? .3; break; }
      case 'select': { const { loc, b } = await boxOf(step); moveTo(b.x + b.width / 2, b.y + b.height / 2, step.move); events.push({ t: r3(t), click: true, at: [Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2)] }); await loc.selectOption(step.value); await settle(200); t += .12; await frame(); t += step.after ?? .4; break; }
      case 'scroll': {
        const total = step.selector ? await target(step).evaluate(el => el.getBoundingClientRect().top - 80) : Number(step.y ?? vh * .8);
        const n = step.steps || 8;
        for (let k = 0; k < n; k++) { await page.mouse.wheel(0, total / n); await page.waitForTimeout(60); await frame(); t += (step.dur ?? .8) / n; }
        t += step.after ?? .3; break;
      }
      case 'wait':
        if (step.for) await page.locator(step.for).first().waitFor({ state: step.state || 'visible', timeout: step.timeout || 20000 });
        else await page.waitForTimeout(Number(step.ms ?? 500));
        await settle(150); await frame(); break;
      case 'zoom': {
        const { b } = await boxOf(step); const pad = step.pad ?? 24;
        events.push({ t: r3(t), zoom: { x: Math.round(b.x - pad), y: Math.round(b.y - pad), w: Math.round(b.width + pad * 2), h: Math.round(b.height + pad * 2), ...(step.scale ? { scale: step.scale } : {}) }, dur: step.dur ?? .9 });
        t += step.after ?? .5; break;
      }
      case 'unzoom': events.push({ t: r3(t), zoom: null, dur: step.dur ?? .9 }); t += step.after ?? .5; break;
      case 'frames': for (let k = 0; k < (step.n || 10); k++) { await page.waitForTimeout(step.every || 100); await frame(); t += (step.every || 100) / 1000; } break;
      case 'eval': await page.evaluate(step.js); if (step.frame) { await settle(200); await frame(); } break;
      default: throw new Error(`unknown step "${step.do}"`);
    }
    log.push({ i, do: step.do, ok: true, ms: Date.now() - s0, t: r3(t) });
  } catch (e) {
    log.push({ i, do: step.do, ok: false, error: String(e.message || e) });
    await page.screenshot({ path: path.join(out, `error-step-${i}.png`) }).catch(() => {});
    await browser.close();
    writeJSON(path.join(out, 'log.json'), { name, steps: log, findings });
    die(`step ${i} (${step.do}) failed: ${e.message}\n  screenshot: ${path.join(out, `error-step-${i}.png`)}`);
  }
}
t += .3;
await browser.close();

const rel = (() => { const s = out.split(path.sep).join('/'); const k = s.lastIndexOf('/assets/'); return k >= 0 ? s.slice(k + 1) + '/' : path.relative(process.cwd(), out).split(path.sep).join('/') + '/'; })();
const rec = { name, viewport: [vw, vh], host, base: a.base || rel, duration: r3(t), cursorStart: [Math.round(vw * .62), Math.round(vh * .78)], frames, events };
fs.writeFileSync(path.join(out, 'timeline.js'), `window.FLEX_REC = window.FLEX_REC || {};\nwindow.FLEX_REC[${JSON.stringify(name)}] = ${JSON.stringify(rec)};\n`);
writeJSON(path.join(out, 'log.json'), { name, recordedAt: new Date().toISOString(), realMs: Date.now() - started, videoSeconds: rec.duration, host, steps: log, findings });

console.log(`✓ ${name}: ${frames.length} frames, ${rec.duration}s of footage → ${path.relative(process.cwd(), out)}`);
console.log(`  add to <head>:  <script src="${rec.base}timeline.js"></script>`);
console.log(`  place with:     <div class="fx-demo" data-rec="${name}" data-chrome="browser" style="--at:.3"></div>   (scene needs ≥ ${Math.ceil(rec.duration + .5)}s)`);
if (findings.length) { console.warn(`⚠ possible secrets/personal data on screen (${findings.length}):`); for (const f of findings.slice(0, 12)) console.warn(`  ${f.frame}: ${f.kind} ${f.match}`); console.warn('  → use demo data or --mask, then re-record.'); process.exitCode = 2; }
