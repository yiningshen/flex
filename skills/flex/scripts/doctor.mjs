#!/usr/bin/env node
// Checks that everything /flex needs is installed. --fix installs Playwright + Chromium into the skill folder.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { SKILL_DIR, parseArgs, usage, hasFfmpeg, loadPlaywright } from './lib/common.mjs';

usage(`
node doctor.mjs [--fix]
  Checks Node >= 18, FFmpeg (system or bundled), Playwright + Chromium.
  --fix  npm-installs Playwright + a prebuilt FFmpeg into the skill folder and downloads Chromium.
`);
const args = parseArgs();
let ok = true;
const line = (good, label, hint = '') => { console.log(`${good ? '✓' : '✗'} ${label}${!good && hint ? `\n    → ${hint}` : ''}`); if (!good) ok = false; };

const major = Number(process.versions.node.split('.')[0]);
line(major >= 18, `Node ${process.versions.node}`, 'Install Node 18 or newer from nodejs.org');

let ff = hasFfmpeg();
if (!args.fix) line(!!ff, ff || 'FFmpeg', `node ${path.join(SKILL_DIR, 'scripts/doctor.mjs')} --fix (bundles a prebuilt FFmpeg), or install it system-wide`);

if (args.fix) {
  console.log('… installing Playwright into', SKILL_DIR);
  spawnSync('npm', ['install', '--no-audit', '--no-fund', '--silent'], { cwd: SKILL_DIR, stdio: 'inherit', shell: process.platform === 'win32' });
  spawnSync('npx', ['playwright', 'install', 'chromium'], { cwd: SKILL_DIR, stdio: 'inherit', shell: process.platform === 'win32' });
}
if (args.fix) { ff = hasFfmpeg(); line(!!ff, ff || 'FFmpeg', 'install FFmpeg system-wide (brew/winget/apt)'); }

const pw = await loadPlaywright({ optional: true });
if (!pw) line(false, 'Playwright', `node ${path.join(SKILL_DIR, 'scripts/doctor.mjs')} --fix`);
else {
  try {
    const b = await pw.chromium.launch();
    line(true, `Playwright Chromium ${b.version()}`);
    await b.close();
  } catch (e) { line(false, 'Playwright Chromium', `node ${path.join(SKILL_DIR, 'scripts/doctor.mjs')} --fix`); }
}

const tts = ['say', 'piper', 'espeak-ng'].filter(c => spawnSync(process.platform === 'win32' ? 'where' : 'which', [c]).status === 0);
console.log(`${tts.length ? '✓' : '·'} Local narration voices: ${tts.length ? tts.join(', ') : 'none (optional — music-only is the default)'}`);

console.log(ok ? '\nReady.' : '\nFix the ✗ items above, then run doctor again.');
process.exit(ok ? 0 : 1);
