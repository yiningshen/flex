#!/usr/bin/env node
// Scans assets (timelines, logs, transcripts, HTML, JSON, text) for keys, tokens, emails and personal data before they go in a video.
// Images can't be read here: look at stills yourself.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, usage, die } from './lib/common.mjs';
import { findSecrets } from './lib/secrets.mjs';

usage(`
node scan-secrets.mjs <file-or-dir> [...] [--allow-email @mydomain.com]
  Exit 0 = clean, 2 = findings. Images/videos are listed so you remember to check them by eye.
`);
const a = parseArgs();
if (!a._.length) die('give one or more paths');
const allowEmails = a['allow-email'] ? String(a['allow-email']).split(',') : [];
const TEXT = /\.(js|json|html?|css|md|txt|log|csv|ya?ml|env|ts|tsx|jsx|svg)$/i, MEDIA = /\.(png|jpe?g|webp|gif|mp4|mov|webm)$/i;
const hits = [], media = [];
function walk(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) { for (const f of fs.readdirSync(p)) if (f !== 'node_modules' && f !== '.build') walk(path.join(p, f)); return; }
  if (MEDIA.test(p)) { media.push(p); return; }
  if (!TEXT.test(p) || st.size > 20e6) return;
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  lines.forEach((l, i) => findSecrets(l, { allowEmails }).forEach(h => hits.push({ file: p, line: i + 1, ...h })));
}
a._.forEach(p => walk(path.resolve(p)));
for (const h of hits) console.log(`✗ ${path.relative(process.cwd(), h.file)}:${h.line}  ${h.kind}  ${h.match}`);
const frames = media.filter(m => /\/rec\//.test(m)).length;
console.log(`${hits.length ? '' : '✓ '}${hits.length} finding(s) in text. ${media.length} image/video file(s) not machine-checked${frames ? ` (${frames} recording frames — their page text was scanned at record time; see each log.json)` : ''}: review stills by eye.`);
process.exit(hits.length ? 2 : 0);
