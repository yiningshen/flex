#!/usr/bin/env node
// Runs real commands and records their real output + timings for a faithful recreated terminal
// (<div class="fx-terminal" data-rec="name">). Long waits are compressed in the video; real durations are kept in log.json.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { parseArgs, usage, die, readJSON, writeJSON } from './lib/common.mjs';
import { findSecrets, PATTERNS } from './lib/secrets.mjs';

usage(`
node record-cli.mjs --steps steps.json --out <dir>/assets/rec [--max-wait 2.5] [--cps 28]
  steps.json: { "name": "install", "cwd": "/tmp/flex-demo", "title": "Terminal", "prompt": "$", "env": {"FOO": "demo"},
                "steps": [ {"run": "npm install", "show": "tail:10", "timeout": 600, "allowFail": false, "display": "optional text shown instead of run"},
                           {"run": "npm start", "until": "running at", "keep": true} ] }
  display: only to hide a value or shorten a path in what's shown — never to show a command that didn't run.
  show: "all" | "tail:N" | "head:N" | "none"   (default: all if ≤ 30 lines, else tail:12)
  until: regex — for servers: stop waiting when a line matches (killed, or left running with keep:true).
  Secrets in output are redacted automatically and reported. Never point cwd at the maker's working tree.
`);
const a = parseArgs();
if (!a.steps) die('--steps is required');
const spec = readJSON(path.resolve(a.steps));
const name = spec.name || path.basename(a.steps, '.json');
const out = path.join(path.resolve(a.out || 'assets/rec'), name);
fs.mkdirSync(out, { recursive: true });
let cwd = path.resolve((spec.cwd || path.join(os.tmpdir(), 'flex-' + name)).replace(/^~/, os.homedir()));
fs.mkdirSync(cwd, { recursive: true });
const maxWait = Number(a['max-wait'] || spec.maxWait || 2.5), cps = Number(a.cps || spec.cps || 28);
const strip = s => s.replace(/\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07|\r(?!\n)/g, '');
const redact = s => { let r = s; for (const [, re] of PATTERNS.filter(([k]) => k !== 'email address')) r = r.replace(new RegExp(re.source, 'g' + re.flags.replace('g', '')), '••••••••'); return r; };
const r3 = x => Math.round(x * 1000) / 1000;
const human = s => s < 60 ? `about ${Math.max(5, Math.round(s / 5) * 5)} seconds` : s < 3600 ? `about ${Math.ceil(s / 60)} minute${Math.ceil(s / 60) > 1 ? 's' : ''}` : `about ${(s / 3600).toFixed(1)} hours`;

function run(cmd, timeout, until, keep) {
  return new Promise(resolve => {
    const marker = '__FLEX_PWD__';
    const child = spawn('bash', ['-c', `${cmd}\n__c=$?; printf '\\n${marker}%s\\n' "$(pwd)"; exit $__c`], { cwd, detached: true, env: { ...process.env, ...(spec.env || {}), FORCE_COLOR: '0', NO_COLOR: '1', CI: '1' } });
    // kill the whole process group: killing bash alone leaves npm/node children holding the pipes open
    const killAll = () => { try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); } };
    const t0 = Date.now(), lines = []; let buf = { out: '', err: '' };
    let matched = false;
    const take = (k, chunk) => { buf[k] += chunk.toString(); const parts = buf[k].split('\n'); buf[k] = parts.pop(); for (const p of parts) lines.push({ ms: Date.now() - t0, text: strip(p), err: k === 'err' });
      // long-running commands (servers): stop recording once the ready line appears
      if (until && !matched && parts.some(p => new RegExp(until, 'i').test(strip(p)))) {
        matched = true;
        if (keep) { child.stdout.destroy(); child.stderr.destroy(); child.unref(); clearTimeout(timer); resolve({ code: 0, ms: Date.now() - t0, lines, pid: child.pid }); }
        else killAll();
      } };
    child.stdout.on('data', c => take('out', c)); child.stderr.on('data', c => take('err', c));
    const timer = setTimeout(killAll, (timeout || 900) * 1000);
    child.on('close', code => {
      clearTimeout(timer);
      if (matched && keep) return;
      if (matched) code = 0;
      else if (until) lines.push({ ms: Date.now() - t0, text: `(never printed /${until}/)`, err: true });
      for (const k of ['out', 'err']) if (buf[k]) lines.push({ ms: Date.now() - t0, text: strip(buf[k]), err: k === 'err' });
      const pwdLine = lines.findIndex(l => l.text.startsWith(marker));
      if (pwdLine >= 0) { cwd = lines[pwdLine].text.slice(marker.length) || cwd; lines.splice(pwdLine, 1); }
      while (lines.length && lines[lines.length - 1].text.trim() === '') lines.pop();
      resolve({ code, ms: Date.now() - t0, lines });
    });
  });
}

const items = [], log = [], findings = [];
let t = .6; const started = Date.now();
for (const [i, step] of spec.steps.entries()) {
  const shown = step.display || step.run;
  const typeDur = Math.min(2.6, Math.max(.5, shown.length / cps));
  items.push({ t: r3(t), type: 'cmd', text: shown, typeDur: r3(typeDur), step: i });
  t += typeDur + .25;
  process.stdout.write(`▸ ${step.run}\n`);
  const res = await run(step.run, step.timeout || (step.until ? 120 : undefined), step.until, step.keep);
  if (res.pid) console.log(`  left running (pid ${res.pid}) — stop it when done: kill ${res.pid}`);
  const real = res.ms / 1000;
  for (const l of res.lines) for (const h of findSecrets(l.text)) findings.push({ step: i, ...h });
  let lines = res.lines.map(l => ({ ...l, text: redact(l.text) }));
  const show = step.show || (lines.length > 30 ? 'tail:12' : 'all');
  let omitted = 0;
  if (show === 'none') { omitted = lines.length; lines = []; }
  else if (show.startsWith('tail:')) { const n = Number(show.slice(5)); omitted = Math.max(0, lines.length - n); lines = lines.slice(-n); }
  else if (show.startsWith('head:')) { const n = Number(show.slice(5)); omitted = Math.max(0, lines.length - n); lines = lines.slice(0, n); }
  const span = Math.min(real, maxWait);
  if (real > maxWait + 1) items.push({ t: r3(t), type: 'wait', label: `⏱ This step took ${human(real)}`, real: r3(real), step: i });
  if (omitted && show.startsWith('tail:')) items.push({ t: r3(t + .05), type: 'out', text: `… ${omitted} more lines`, cls: 'd', step: i });
  const last = lines.length ? Math.max(1, lines[lines.length - 1].ms) : 1;
  lines.forEach((l, k) => {
    const rel = real > maxWait ? (k + 1) / lines.length * span : Math.min(span, l.ms / 1000);
    const cls = /\b(error|ERR!|fatal|failed)\b/i.test(l.text) ? 'e' : /\bwarn(ing)?\b/i.test(l.text) ? 'w' : l.err ? 'd' : '';
    items.push({ t: r3(t + Math.max(.05, rel)), type: 'out', text: l.text, cls, step: i });
  });
  if (omitted && show.startsWith('head:')) items.push({ t: r3(t + span + .05), type: 'out', text: `… ${omitted} more lines`, cls: 'd', step: i });
  t += Math.max(.35, span) + .15;
  items.push({ t: r3(t), type: 'done', step: i });
  t += .6;
  log.push({ i, run: step.run, exit: res.code, ...(res.pid ? { pid: res.pid } : {}), realSeconds: r3(real), lines: res.lines.length, cwd });
  console.log(`  exit ${res.code} · ${real.toFixed(1)}s real · ${res.lines.length} lines`);
  if (res.code !== 0 && !step.allowFail) {
    writeJSON(path.join(out, 'log.json'), { name, steps: log, findings, failed: i, output: res.lines.slice(-40).map(l => l.text) });
    die(`step ${i} failed (exit ${res.code}). Last output:\n${res.lines.slice(-15).map(l => '    ' + l.text).join('\n')}\nA setup video must not show failing steps — fix the install or tell the maker.`);
  }
}
const totalReal = (Date.now() - started) / 1000;
const rec = { name, title: spec.title || 'Terminal', prompt: spec.prompt || '$', duration: r3(t), items };
fs.writeFileSync(path.join(out, 'timeline.js'), `window.FLEX_TERM = window.FLEX_TERM || {};\nwindow.FLEX_TERM[${JSON.stringify(name)}] = ${JSON.stringify(rec)};\n`);
writeJSON(path.join(out, 'log.json'), { name, recordedAt: new Date().toISOString(), platform: `${os.type()} ${os.release()} ${os.arch()}`, node: process.version, totalRealSeconds: r3(totalReal), totalHuman: human(totalReal), videoSeconds: rec.duration, steps: log, findings });

const s = out.split(path.sep).join('/'), k = s.lastIndexOf('/assets/'), base = k >= 0 ? s.slice(k + 1) + '/' : path.relative(process.cwd(), out) + '/';
console.log(`✓ ${name}: ${spec.steps.length} commands, ${totalReal.toFixed(1)}s real (${human(totalReal)}) → ${rec.duration}s on screen`);
console.log(`  add to <head>:  <script src="${base}timeline.js"></script>`);
console.log(`  place with:     <div class="fx-terminal" data-rec="${name}" data-show-waits style="--at:.2"></div>   (scene needs ≥ ${Math.ceil(rec.duration + .5)}s; data-only="0,1" shows only those steps)`);
if (findings.length) { console.warn(`⚠ secrets/personal data found in output and redacted (${findings.length}):`); findings.slice(0, 10).forEach(f => console.warn(`  step ${f.step}: ${f.kind} ${f.match}`)); }
