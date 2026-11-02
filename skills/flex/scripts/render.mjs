#!/usr/bin/env node
// Renders a flex composition to MP4 (+ poster), or a contact sheet / stills for review.
// Headless Chromium seeks every frame (deterministic), CDP captures JPEGs, FFmpeg encodes H.264 + AAC at -14 LUFS.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parseArgs, usage, die, loadPlaywright, serve, refreshRuntime, ffmpegPath } from './lib/common.mjs';
import { mix, writeWav, readWavMono } from './audio.mjs';

usage(`
node render.mjs <composition.html> [options]
  --preview            contact sheet, one frame per second → preview.png (no video)
  --stills 3.2,7.5     full-size stills at those times → still-3.2.png …
  --format 9:16        16:9 (default) | 9:16 | 1:1 | 4:5   (output gets a suffix)
  --out file.mp4       default: <dir>/<direction>.mp4
  --poster 12.5        poster time (default: data-poster, else 1s into the end card)
  --no-audio           silent video
  --narration f.wav    narration track (default: <dir>/assets/narration.wav if --narrate)
  --narrate            use <dir>/assets/narration.wav made by tts.mjs; music ducks under it
  --music f.wav        maker-supplied track instead of generated music (their responsibility)
  --pages 4            parallel capture pages
  --fps 30             override data-fps
`);

const args = parseArgs(process.argv.slice(2), { booleans: ['preview', 'no-audio', 'narrate'] });
const comp = args._[0] && path.resolve(args._[0]);
if (!comp || !fs.existsSync(comp)) die('give the composition path, e.g. node render.mjs flex-output/launch/index.html');
const dir = path.dirname(comp);
refreshRuntime(dir);

const pw = await loadPlaywright();
const server = await serve(dir);
const query = `?render=1${args.format ? `&format=${encodeURIComponent(args.format)}` : ''}`;
const url = `${server.url}/${encodeURIComponent(path.basename(comp))}${query}`;
const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--disable-lcd-text', '--font-render-hinting=none'] });

const errors = [];
async function openPage(viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('flex:')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.flex && window.flex.ready, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => window.flex && window.flex.ready);
  return page;
}

let first = await openPage({ width: 1920, height: 1080 });
const meta = await first.evaluate(() => window.flex && ({ width: flex.width, height: flex.height, duration: flex.duration, fps: flex.fps, bpm: flex.bpm, mood: flex.mood, hit: flex.hit, poster: flex.poster, format: flex.format, sfx: flex.sfx(), direction: document.getElementById('flex').dataset.direction || '' }));
if (!meta) { await browser.close(); server.close(); die(`flex runtime did not start. Errors:\n  ${errors.join('\n  ') || '(none — is flex.js included?)'}`); }
await first.close();
const fps = Number(args.fps) || meta.fps;
const viewport = { width: meta.width, height: meta.height };
const suffix = meta.format && meta.format !== '16:9' ? '-' + meta.format.replace(':', 'x') : '';
console.log(`▸ ${path.basename(comp)} — ${meta.duration}s, ${meta.width}×${meta.height} @ ${fps}fps, ${meta.mood} ${meta.bpm}bpm`);

const shot = async (page, t, type = 'png', quality) => {
  await page.evaluate(t => window.flex.seek(t), t);
  return page.screenshot({ type, quality, animations: 'allow', caret: 'initial' });
};

try {
  if (args.preview || args.stills) {
    const page = await openPage(viewport);
    if (args.stills) {
      for (const t of String(args.stills).split(',').map(Number)) {
        const f = path.join(dir, `still-${t}${suffix}.png`);
        fs.writeFileSync(f, await shot(page, t));
        console.log('✓', path.relative(process.cwd(), f));
      }
    }
    if (args.preview) {
      const times = [];
      for (let t = 0; t < meta.duration; t += 1) times.push(Number(t.toFixed(2)));
      times.push(Math.max(0, meta.duration - .05));
      const thumbs = [];
      for (const t of times) thumbs.push({ t, src: 'data:image/jpeg;base64,' + (await shot(page, t, 'jpeg', 80)).toString('base64') });
      const cols = meta.width >= meta.height ? 5 : 8, tw = meta.width >= meta.height ? 480 : 270;
      const html = `<body style="margin:0;background:#1b1b1d;font:600 15px system-ui;color:#ddd"><div style="display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:10px;padding:12px">${thumbs.map(x => `<div><img src="${x.src}" style="width:${tw}px;display:block;border-radius:4px"><div style="padding:4px 2px">${x.t.toFixed(1)}s</div></div>`).join('')}</div></body>`;
      const sheet = await browser.newPage({ viewport: { width: cols * (tw + 10) + 14, height: 400 } });
      await sheet.setContent(html, { waitUntil: 'load' });
      const f = path.join(dir, `preview${suffix}.png`);
      await sheet.screenshot({ path: f, fullPage: true });
      console.log('✓', path.relative(process.cwd(), f), `(${thumbs.length} frames) — open it and review against the checklist in references/craft.md`);
    }
  } else {
    const ff = ffmpegPath();
    if (!ff) die('FFmpeg not found. Run doctor.mjs --fix');
    const build = path.join(dir, 'assets', '.build'); fs.mkdirSync(build, { recursive: true });
    const silent = path.join(build, `video${suffix}.mp4`);
    const total = Math.ceil(meta.duration * fps);
    const nPages = Math.max(1, Math.min(Number(args.pages) || 4, total));
    const pages = await Promise.all(Array.from({ length: nPages }, () => openPage(viewport)));
    const cdps = await Promise.all(pages.map(p => p.context().newCDPSession(p)));

    const enc = spawn(ff, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => enc.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exited ' + c))));

    const ready = new Map(); let next = 0; const t0 = Date.now();
    const write = buf => new Promise(r => enc.stdin.write(buf) ? r() : enc.stdin.once('drain', r));
    async function flush() {
      while (ready.has(next)) { const b = ready.get(next); ready.delete(next); await write(b); next++;
        if (next % fps === 0 || next === total) process.stdout.write(`\r  frames ${next}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
    }
    let flushing = Promise.resolve();
    await Promise.all(pages.map(async (page, k) => {
      for (let i = k; i < total; i += nPages) {
        await page.evaluate(t => window.flex.seek(t), i / fps);
        const { data } = await cdps[k].send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
        ready.set(i, Buffer.from(data, 'base64'));
        // keep at most ~3 seconds of frames in memory
        while (ready.size > fps * 3 && !ready.has(next)) await new Promise(r => setTimeout(r, 5));
        flushing = flushing.then(flush);
      }
    }));
    await flushing; await flush();
    enc.stdin.end(); await done; process.stdout.write('\n');

    const out = path.resolve(args.out || path.join(dir, `${meta.direction || path.basename(dir)}${suffix}.mp4`));
    if (args['no-audio']) fs.copyFileSync(silent, out);
    else {
      let audio;
      if (args.music) audio = path.resolve(args.music);
      else {
        const narrFile = args.narration ? path.resolve(args.narration) : (args.narrate ? path.join(dir, 'assets', 'narration.wav') : null);
        if (narrFile && !fs.existsSync(narrFile)) die(`narration not found: ${narrFile} — run tts.mjs first`);
        const bus = mix({ duration: meta.duration, bpm: meta.bpm, mood: meta.mood, hit: meta.hit, sfx: meta.sfx, narration: narrFile ? readWavMono(narrFile) : null });
        audio = path.join(build, 'audio.wav'); writeWav(audio, bus);
      }
      await new Promise((res, rej) => spawn(ff, ['-y', '-loglevel', 'error', '-i', silent, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
        '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-t', String(meta.duration), out], { stdio: 'inherit' })
        .on('close', c => c === 0 ? res() : rej(new Error('ffmpeg mux failed'))));
    }
    const posterT = args.poster != null ? Number(args.poster) : meta.poster != null ? meta.poster : Math.min(meta.duration - .05, meta.hit + 1);
    fs.writeFileSync(path.join(dir, `poster${suffix}.png`), await shot(pages[0], posterT));
    await Promise.all(pages.map(p => p.close()));
    console.log(`✓ ${path.relative(process.cwd(), out)}  (${((Date.now() - t0) / 1000).toFixed(0)}s)\n✓ ${path.relative(process.cwd(), path.join(dir, `poster${suffix}.png`))} at ${posterT}s`);
  }
} finally {
  if (errors.length) console.warn(`⚠ page reported:\n  ${[...new Set(errors)].join('\n  ')}`);
  await browser.close(); server.close();
}
