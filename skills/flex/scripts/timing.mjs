#!/usr/bin/env node
// Script-first timing: minimum scene lengths from the words on screen, snapped to the music's beat.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, usage, die } from './lib/common.mjs';

usage(`
node timing.mjs plan.md [--direction explain] [--bpm 84] [--snap beat|bar|none]
  Reads the "## Script" table in plan.md (| Scene | Text | Claim |). Lines with the same Scene appear together.
  Per line: max(1.2s, 0.3s × words) × pacing (launch 1, explain 1.5, usecases 1.15, setup 1.3), + 0.6s entry per scene.
  Prints suggested data-start/data-end per scene and the total against the direction's length range.
`);
const a = parseArgs();
const file = a._[0] && path.resolve(a._[0]);
if (!file || !fs.existsSync(file)) die('give plan.md');
const md = fs.readFileSync(file, 'utf8');
const direction = a.direction || (md.match(/Direction:\s*(\w+)/i) || [])[1] || 'explain';
const FACTOR = { launch: 1, explain: 1.5, usecases: 1.15, setup: 1.3 }, RANGES = { launch: [15, 25], explain: [45, 75], usecases: [30, 60], setup: [60, 120] };
const BPM = { launch: 120, explain: 84, usecases: 104, setup: 84 };
const bpm = Number(a.bpm || (md.match(/bpm[^\d]*(\d{2,3})/i) || [])[1] || BPM[direction] || 100);
const snap = a.snap || (direction === 'launch' ? 'bar' : 'beat');
const grid = snap === 'none' ? 0 : (60 / bpm) * (snap === 'bar' ? 4 : 1);

const sec = md.split(/^##\s+Script.*$/m)[1];
if (!sec) die('no "## Script" section in plan.md');
const rows = sec.split(/^##\s/m)[0].split('\n').filter(l => /^\|/.test(l) && !/^\|\s*-/.test(l)).map(l => l.split('|').slice(1, -1).map(c => c.trim()));
const body = rows.filter(r => !/^scene$/i.test(r[0]) && r[1]);
if (!body.length) die('script table is empty');
const scenes = [];
for (const [scene, text, claim] of body) { let s = scenes.find(x => x.scene === scene); if (!s) scenes.push(s = { scene, lines: [] }); s.lines.push({ text, claim }); }
const words = s => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).length;
let t = 0; const out = [];
for (const s of scenes) {
  const raw = .6 + s.lines.reduce((acc, l) => acc + Math.max(1.2, .3 * words(l.text)) * (FACTOR[direction] || 1), 0);
  const len = grid ? Math.ceil(raw / grid - 1e-9) * grid : raw;
  out.push({ ...s, raw, start: t, end: t + len }); t += len;
}
const f = x => x.toFixed(2).replace(/\.?0+$/, '');
console.log(`${direction} · ${bpm} bpm · snap ${snap}${grid ? ` (${f(grid)}s)` : ''}\n`);
console.log('scene        min     start–end      words  text');
for (const s of out) console.log(`${s.scene.padEnd(12)} ${f(s.raw).padStart(5)}s  ${f(s.start).padStart(6)}–${f(s.end).padEnd(7)} ${String(s.lines.reduce((a, l) => a + words(l.text), 0)).padStart(5)}  ${s.lines.map(l => l.text).join(' / ').slice(0, 70)}`);
const [lo, hi] = RANGES[direction] || [0, 1e9];
console.log(`\ntotal ${f(t)}s (minimum reading time) — ${direction} range ${lo}–${hi}s`);
if (t > hi) console.log('✗ too long even at minimum holds: cut lines or scenes.');
else if (t < lo) console.log(`· under the range: ${f(lo - t)}s+ is free for footage, breathing room and the end card.`);
else console.log('✓ fits. Footage-heavy scenes (demos) usually need longer than the text minimum: use the recording durations.');
