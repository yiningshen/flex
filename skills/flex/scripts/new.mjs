#!/usr/bin/env node
// Scaffolds a flex video folder: composition from the direction template, runtime, style, brand, and plan/truth/share files.
import fs from 'node:fs';
import path from 'node:path';
import { SKILL_DIR, parseArgs, usage, die, refreshRuntime, readJSON } from './lib/common.mjs';

usage(`
node new.mjs <launch|explain|usecases|setup> [--dir flex-output/<direction>] [--name "Product"]
             [--brand assets/brand.json] [--style crisp|paper|studio|bright|sketch|path.css] [--format 16:9] [--force]
`);
const a = parseArgs();
const direction = a._[0];
const DIRS = ['launch', 'explain', 'usecases', 'setup'];
if (!DIRS.includes(direction)) die(`direction must be one of ${DIRS.join(', ')}`);
const dir = path.resolve(a.dir || path.join('flex-output', direction));
const comp = path.join(dir, 'index.html');
if (fs.existsSync(comp) && !a.force) die(`${path.relative(process.cwd(), comp)} exists — pass --force to overwrite the composition`);
fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });

let html = fs.readFileSync(path.join(SKILL_DIR, 'templates', `${direction}.html`), 'utf8');
if (a.name) html = html.replaceAll('{{PRODUCT}}', a.name);
if (a.format) html = html.replace('<main id="flex"', `<main id="flex" data-format="${a.format}"`);

// style preset
const style = a.style || ({ launch: 'crisp', explain: 'paper', usecases: 'bright', setup: 'paper' })[direction];
const stylePath = fs.existsSync(path.resolve(String(style))) ? path.resolve(String(style)) : path.join(SKILL_DIR, 'runtime', 'styles', `${style}.css`);
if (!fs.existsSync(stylePath)) die(`unknown style ${style}`);
fs.copyFileSync(stylePath, path.join(dir, 'style.css'));

// brand overrides the preset
let brandCss = '/* brand overrides — generated from brand.json by new.mjs; edit freely */\n';
if (a.brand) {
  const b = readJSON(path.resolve(a.brand));
  const vars = [];
  if (b.colors?.bg) vars.push(`--bg: ${b.colors.bg};`);
  if (b.colors?.ink) vars.push(`--ink: ${b.colors.ink};`);
  if (b.colors?.accent) vars.push(`--accent: ${b.colors.accent};`);
  if (b.colors?.accentInk) vars.push(`--accent-ink: ${b.colors.accentInk};`);
  // derive the supporting colours from the brand so preset leftovers (a dark card on a light brand) can't clash
  vars.push(`--muted: ${b.colors?.muted || 'color-mix(in srgb, var(--ink) 62%, var(--bg))'};`);
  vars.push(`--card: ${b.colors?.card || (b.colors?.dark ? 'color-mix(in srgb, var(--bg) 88%, white)' : 'color-mix(in srgb, var(--bg) 35%, white)')};`);
  vars.push('--line: color-mix(in srgb, var(--ink) 13%, transparent);');
  if (b.fonts?.body) vars.push(`--font: ${b.fonts.body}, var(--font-fallback, ui-sans-serif, system-ui, sans-serif);`);
  if (b.fonts?.display) vars.push(`--font-display: ${b.fonts.display}, ui-sans-serif, system-ui, sans-serif;`);
  brandCss += `:root {\n  ${vars.join('\n  ')}\n}\n`;
  if (b.fontFaces?.length) brandCss += b.fontFaces.join('\n') + '\n';
  if (b.logo) {
    const src = path.resolve(path.dirname(path.resolve(a.brand)), b.logo);
    if (fs.existsSync(src)) {
      const dst = path.join(dir, 'assets', 'logo' + path.extname(src));
      if (path.resolve(src) !== path.resolve(dst)) fs.copyFileSync(src, dst);
      html = html.replaceAll('{{LOGO}}', 'assets/' + path.basename(dst));
    }
  }
  if (!a.name && b.name) html = html.replaceAll('{{PRODUCT}}', b.name);
}
fs.writeFileSync(path.join(dir, 'brand.css'), brandCss);
fs.writeFileSync(comp, html);
refreshRuntime(dir);
if (direction === 'setup' && !fs.existsSync(path.join(dir, 'assets', 'effort.json')))
  fs.copyFileSync(path.join(SKILL_DIR, 'templates', 'effort.example.json'), path.join(dir, 'assets', 'effort.json'));

const write = (f, s) => { const p = path.join(dir, f); if (!fs.existsSync(p)) fs.writeFileSync(p, s); };
const product = a.name || '<Product>';
write('plan.md', `# ${product} — ${direction} video

## Decisions
- Direction: ${direction} (see directions/${direction}.md)
- Audience / "Who do you wish was using this?": <maker's answer, quoted>
- Product kind: <web app | CLI | desktop | mobile | other>
- Style: ${style}; brand: ${a.brand || 'none yet'}
- Format: ${a.format || '16:9'}; mood/bpm: <from template, adjust>
- Narration: off (music only)

## Script (every word on screen, in order)
| Scene | Text | Claim |
|---|---|---|
| s1 | ... | framing |

## Beat sheet
| Scene | Start–end | Text | Visual | Source |
|---|---|---|---|---|

## Footage
| Recording | Steps file | Shows | Secrets scan |
|---|---|---|---|

## Open questions for the maker
-
`);
write('truth.md', `# Truth ledger — ${product} / ${direction}

| ID | On screen | Scene | Source type | Source | Checked |
|---|---|---|---|---|---|
| C1 | | | | | |
`);
write('outsider.md', `# Outsider read — ${product} / ${direction}\n\n## Round 1\nViewer: \n\n| Flag | Kind | Fix |\n|---|---|---|\n\nIn their words: \n`);
write('share.md', `# Share copy — ${product} / ${direction}\n\n(see references/share-copy.md)\n`);

console.log(`✓ ${path.relative(process.cwd(), dir)}/
  index.html   ← edit: replace every {{…}} (check.mjs fails on leftovers)
  plan.md · truth.md · outsider.md · share.md
  style.css (${style}) · brand.css · flex.js · flex.css
Open index.html in a browser to scrub (space = play, ←/→ = frame).`);
