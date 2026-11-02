#!/usr/bin/env node
// Optional narration with a LOCAL voice only (macOS `say`, Piper, or espeak-ng). Never a paid or cloud service.
// Writes assets/narration.wav at 48 kHz, each line placed at its time; render.mjs --narrate ducks the music under it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { parseArgs, usage, die, readJSON, writeJSON, ffmpegPath } from './lib/common.mjs';
import { SR, readWavMono } from './audio.mjs';

usage(`
node tts.mjs narration.json --duration 60 [--engine say|piper|espeak-ng] [--voice Samantha] [--rate 170] [--model voice.onnx] [--out assets/narration.wav]
  narration.json: [{ "at": 1.0, "text": "You took three hundred photos on holiday." }, ...]
  Prints each line's spoken length so scenes can be timed to the voice. On-screen text must still carry the whole message.
`);
const a = parseArgs();
const file = a._[0] && path.resolve(a._[0]);
if (!file) die('give narration.json');
const lines = readJSON(file);
const has = c => spawnSync(process.platform === 'win32' ? 'where' : 'which', [c]).status === 0;
const engine = a.engine || (a.model && has('piper') ? 'piper' : has('say') ? 'say' : has('piper') ? 'piper' : has('espeak-ng') ? 'espeak-ng' : null);
if (!engine) die('no local voice found. macOS has `say`; elsewhere install Piper (github.com/rhasspy/piper) or espeak-ng.');
const ff = ffmpegPath(); if (!ff) die('FFmpeg needed (doctor.mjs --fix)');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flex-tts-'));
const outFile = path.resolve(a.out || path.join(path.dirname(file), 'assets', 'narration.wav'));

const clips = [];
for (const [i, l] of lines.entries()) {
  const raw = path.join(tmp, `${i}.raw${engine === 'say' ? '.aiff' : '.wav'}`), wav = path.join(tmp, `${i}.wav`);
  let r;
  if (engine === 'say') r = spawnSync('say', [...(a.voice ? ['-v', a.voice] : []), '-r', String(a.rate || 170), '-o', raw, l.text]);
  else if (engine === 'piper') { if (!a.model) die('piper needs --model <voice.onnx>'); r = spawnSync('piper', ['--model', a.model, '--output_file', raw], { input: l.text }); }
  else r = spawnSync('espeak-ng', ['-w', raw, ...(a.voice ? ['-v', a.voice] : []), '-s', String(a.rate || 160), l.text]);
  if (r.status !== 0) die(`${engine} failed on line ${i}: ${r.stderr}`);
  const c = spawnSync(ff, ['-y', '-loglevel', 'error', '-i', raw, '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', wav]);
  if (c.status !== 0) die('ffmpeg conversion failed: ' + c.stderr);
  const pcm = readWavMono(wav);
  clips.push({ ...l, pcm, seconds: pcm.length / SR });
}
const duration = Number(a.duration) || Math.max(...clips.map(c => c.at + c.seconds)) + 1;
const n = Math.ceil(duration * SR), mixd = new Float32Array(n);
clips.forEach((c, i) => {
  const s = Math.round(c.at * SR); for (let k = 0; k < c.pcm.length && s + k < n; k++) mixd[s + k] += c.pcm[k];
  const next = clips[i + 1];
  const end = c.at + c.seconds;
  console.log(`${String(i + 1).padStart(2)}  ${c.at.toFixed(1).padStart(5)}–${end.toFixed(1).padEnd(5)}s  ${c.text}${next && end > next.at ? `   ✗ overlaps next line by ${(end - next.at).toFixed(1)}s` : ''}${end > duration ? '   ✗ runs past the end' : ''}`);
});
const buf = Buffer.alloc(44 + n * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(mixd[i] * 32767))), 44 + i * 2);
fs.mkdirSync(path.dirname(outFile), { recursive: true }); fs.writeFileSync(outFile, buf);
writeJSON(outFile.replace(/\.wav$/, '.json'), { engine, voice: a.voice || null, lines: clips.map(({ pcm, ...c }) => c) });
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`✓ ${path.relative(process.cwd(), outFile)} (${engine}) — render with: node render.mjs <comp> --narrate`);
