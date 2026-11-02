// Shared helpers for flex scripts: args, Playwright loading, static server, ffmpeg.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { spawnSync } from 'node:child_process';

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function parseArgs(argv = process.argv.slice(2), { booleans = [] } = {}) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out[k] = v;
      else if (booleans.includes(k) || i + 1 >= argv.length || argv[i + 1].startsWith('--')) out[k] = true;
      else out[k] = argv[++i];
    } else out._.push(a);
  }
  return out;
}

export function usage(text) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log(text.trim()); process.exit(0); }
}

export function die(msg) { console.error(`✗ ${msg}`); process.exit(1); }

/** Load Playwright from the skill folder first, then the current project, then global. */
export async function loadPlaywright({ optional = false } = {}) {
  const tries = [path.join(SKILL_DIR, 'package.json'), path.join(process.cwd(), 'package.json')];
  for (const base of tries) {
    try {
      const req = createRequire(base);
      const m = await import(pathToFileURL(req.resolve('playwright')).href);
      return m.chromium ? m : m.default;
    } catch {}
  }
  try { const m = await import('playwright'); return m.chromium ? m : m.default; } catch {}
  if (optional) return null;
  die('Playwright not found. Run: node ' + path.join(SKILL_DIR, 'scripts/doctor.mjs') + ' --fix');
}

/** FFmpeg on PATH, else the prebuilt binary from ffmpeg-static in the skill folder. */
export function ffmpegPath() {
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg';
  try {
    const p = createRequire(path.join(SKILL_DIR, 'package.json'))('ffmpeg-static');
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return null;
}

export function hasFfmpeg() {
  const bin = ffmpegPath();
  if (!bin) return null;
  const r = spawnSync(bin, ['-version'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split('\n')[0] + (bin === 'ffmpeg' ? '' : ' (bundled)') : null;
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.wav': 'audio/wav' };

/** Serve a directory on 127.0.0.1 with range support (needed for video seeking). */
export function serve(dir) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = path.join(dir, rel);
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
      const size = fs.statSync(file).size;
      const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
      const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
      if (range) {
        const start = range[1] ? Number(range[1]) : 0, end = range[2] ? Number(range[2]) : size - 1;
        res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
        fs.createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
        fs.createReadStream(file).pipe(res);
      }
    });
    server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }));
  });
}

/** Copy the runtime next to a composition so it never runs a stale copy. */
export function refreshRuntime(compDir) {
  for (const f of ['flex.js', 'flex.css']) fs.copyFileSync(path.join(SKILL_DIR, 'runtime', f), path.join(compDir, f));
}

export function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
export function writeJSON(p, v) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2)); }
