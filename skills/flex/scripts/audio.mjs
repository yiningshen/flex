#!/usr/bin/env node
// Procedural music + sound effects, pure Node, no audio files.
// Tempo-locked to the composition: a downbeat lands exactly on `hit` (the end card), where the final hit plays.
// Deterministic: same inputs → same samples.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SR = 48000;
export const MOODS = ['upbeat', 'playful', 'chill', 'cinematic', 'dark'];
export const SFX = ['click', 'type', 'pop', 'whoosh', 'swoosh', 'ding', 'chime', 'success', 'tick', 'rise', 'impact'];

/* ---------- utilities ---------- */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;

class Bus {
  constructor(n) { this.L = new Float32Array(n); this.R = new Float32Array(n); this.n = n; }
  add(i, v, pan = 0) { if (i < 0 || i >= this.n) return; const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4); this.L[i] += v * l * 1.414; this.R[i] += v * r * 1.414; }
  mixInto(dst, g = 1) { for (let i = 0; i < this.n; i++) { dst.L[i] += this.L[i] * g; dst.R[i] += this.R[i] * g; } }
}

// one-pole filters
const lp1 = (fc) => { const a = Math.exp(-TAU * fc / SR); let y = 0; return x => (y = (1 - a) * x + a * y); };
const hp1 = (fc) => { const lp = lp1(fc); return x => x - lp(x); };
// state-variable filter with per-sample cutoff
function svf() { let lo = 0, bp = 0; return (x, fc, q = .7) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR); const hi = x - lo - bp / q; bp += f * hi; lo += f * bp; return { lo, bp, hi }; }; }

/* ---------- instruments: each writes into a bus at time t (seconds) ---------- */
const I = {
  kick(bus, t, g = 1) {
    const s = Math.round(t * SR), n = Math.round(.45 * SR); let ph = 0;
    for (let k = 0; k < n; k++) { const tt = k / SR; const f = 45 + 110 * Math.exp(-tt * 28); ph += TAU * f / SR;
      const env = Math.exp(-tt * 7.5) * (tt < .002 ? tt / .002 : 1); const click = k < 90 ? (1 - k / 90) * .35 : 0;
      bus.add(s + k, (Math.sin(ph) * env + click * Math.sin(k * .9)) * g * .95); }
  },
  snare(bus, t, g = 1, r) {
    const s = Math.round(t * SR), n = Math.round(.25 * SR), hp = hp1(1200); let ph = 0;
    for (let k = 0; k < n; k++) { const tt = k / SR; ph += TAU * 185 / SR;
      const v = hp(r() * 2 - 1) * Math.exp(-tt * 16) * .55 + Math.sin(ph) * Math.exp(-tt * 30) * .4; bus.add(s + k, v * g); }
  },
  clap(bus, t, g = 1, r) {
    const s = Math.round(t * SR), n = Math.round(.3 * SR), f = svf();
    for (let k = 0; k < n; k++) { const tt = k / SR; const burst = [0, .011, .022].reduce((a, o) => a + (tt >= o ? Math.exp(-(tt - o) * (o < .02 ? 140 : 14)) : 0), 0);
      bus.add(s + k, f(r() * 2 - 1, 1500, 1.4).bp * burst * g * .9); }
  },
  hat(bus, t, g = 1, r, open = false, pan = .25) {
    const s = Math.round(t * SR), n = Math.round((open ? .3 : .06) * SR), hp = hp1(7000), dec = open ? 9 : 60;
    for (let k = 0; k < n; k++) bus.add(s + k, hp(r() * 2 - 1) * Math.exp(-k / SR * dec) * g * .35, pan);
  },
  rim(bus, t, g = 1) {
    const s = Math.round(t * SR), n = Math.round(.05 * SR);
    for (let k = 0; k < n; k++) bus.add(s + k, Math.sin(TAU * 820 * k / SR) * Math.exp(-k / SR * 90) * g * .4, -.2);
  },
  bass(bus, t, dur, midi, g = 1, kind = 'saw') {
    const s = Math.round(t * SR), n = Math.round(dur * SR), f0 = mtof(midi), filt = svf(); let ph = 0;
    for (let k = 0; k < n; k++) { const tt = k / SR; ph = (ph + f0 / SR) % 1;
      const rel = Math.min(1, (n - k) / (SR * .03)); const env = Math.min(1, tt / .005) * rel;
      let v;
      if (kind === 'sub') v = Math.sin(TAU * ph);
      else { const saw = 2 * ph - 1; v = filt(saw, 180 + 1400 * Math.exp(-tt * 9), .9).lo * 1.3 + Math.sin(TAU * ph) * .5; }
      bus.add(s + k, v * env * g * .42); }
  },
  pad(bus, t, dur, notes, g = 1, bright = 1) {
    const s = Math.round(t * SR), n = Math.round((dur + 1.2) * SR), atk = Math.min(.8, dur * .4);
    notes.forEach((m, ni) => {
      const f0 = mtof(m), dets = [-.08, 0, .07], phs = dets.map((_, i) => (i * .31 + ni * .17) % 1), filt = [svf(), svf()], pan = (ni % 2 ? .35 : -.35);
      for (let k = 0; k < n; k++) { const tt = k / SR;
        let v = 0; for (let d = 0; d < 3; d++) { phs[d] = (phs[d] + f0 * Math.pow(2, dets[d] / 12) / SR) % 1; v += 2 * phs[d] - 1; }
        const env = Math.min(1, tt / atk) * (tt > dur ? Math.exp(-(tt - dur) * 4) : 1);
        const fc = (500 + 900 * bright) * (1 + .25 * Math.sin(TAU * .15 * tt));
        bus.add(s + k, filt[ni % 2](v / 3, fc, .7).lo * env * g * .16, pan); }
    });
  },
  pluck(bus, t, midi, g = 1, r, pan = 0, decay = .996) {
    const f0 = mtof(midi), N = Math.max(2, Math.round(SR / f0)), buf = new Float32Array(N), s = Math.round(t * SR), n = Math.round(1.1 * SR);
    for (let i = 0; i < N; i++) buf[i] = r() * 2 - 1;
    let idx = 0, prev = 0;
    for (let k = 0; k < n; k++) { const v = buf[idx]; const nv = decay * .5 * (v + prev); prev = v; buf[idx] = nv; idx = (idx + 1) % N; bus.add(s + k, v * g * .28 * Math.min(1, (n - k) / 2000), pan); }
  },
  keys(bus, t, dur, midi, g = 1, ratio = 1, index = 2.2, pan = 0) {
    const s = Math.round(t * SR), n = Math.round((dur + .6) * SR), f0 = mtof(midi); let pm = 0;
    for (let k = 0; k < n; k++) { const tt = k / SR; pm += TAU * f0 * ratio / SR; const idx = index * Math.exp(-tt * 3.5);
      const env = Math.min(1, tt / .004) * Math.exp(-tt * 2.2) * (tt > dur ? Math.exp(-(tt - dur) * 8) : 1);
      bus.add(s + k, Math.sin(TAU * f0 * tt + idx * Math.sin(pm)) * env * g * .2, pan); }
  },
  noiseSweep(bus, t, dur, g = 1, r, up = true) {
    const s = Math.round(t * SR), n = Math.round(dur * SR), f = svf();
    for (let k = 0; k < n; k++) { const p = k / n; const fc = up ? 300 + 7000 * p * p : 7000 - 6500 * p; const env = up ? p * p : (1 - p) * (1 - p);
      bus.add(s + k, f(r() * 2 - 1, fc, 2).bp * env * g * .5, Math.sin(p * 6) * .4); }
  },
  crash(bus, t, g = 1, r) {
    const s = Math.round(t * SR), n = Math.round(2.4 * SR), hp = hp1(3500);
    for (let k = 0; k < n; k++) { const v = hp(r() * 2 - 1) * Math.exp(-k / SR * 1.8) * g * .3; bus.add(s + k, v, (r() - .5) * .6); }
  },
  boom(bus, t, g = 1) {
    const s = Math.round(t * SR), n = Math.round(2 * SR); let ph = 0;
    for (let k = 0; k < n; k++) { const tt = k / SR; ph += TAU * (38 + 60 * Math.exp(-tt * 6)) / SR; bus.add(s + k, Math.sin(ph) * Math.exp(-tt * 2.2) * g * .9); }
  },
};

/* ---------- moods ---------- */
const MOOD = {
  upbeat:   { key: 53, prog: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], drums: 'four', bass: 'eighths', top: 'arp16', pad: .7, duck: .6, keys: false, riser: true },
  playful:  { key: 60, prog: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], drums: 'bounce', bass: 'bounce', top: 'melody', pad: .35, duck: .35, keys: 'marimba', riser: false },
  chill:    { key: 50, prog: [[0, 4, 7, 11], [9, 12, 16, 19], [2, 5, 9, 12], [7, 12, 14, 17]], drums: 'soft', bass: 'whole', top: 'none', pad: .8, duck: .2, keys: 'ep', riser: false },
  cinematic:{ key: 45, prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], drums: 'big', bass: 'pulse', top: 'arp8', pad: 1, duck: .3, keys: false, riser: true },
  dark:     { key: 40, prog: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 2, 5]], drums: 'four', bass: 'sixteenths', top: 'none', pad: .6, duck: .5, keys: false, riser: true },
};

export function renderMusic({ duration, bpm = 100, mood = 'chill', hit = null, seed = 7, energy = 1 }) {
  const M = MOOD[mood] || MOOD.chill;
  const n = Math.ceil((duration + .05) * SR);
  const drums = new Bus(n), bass = new Bus(n), music = new Bus(n), send = new Bus(n), fx = new Bus(n);
  const r = rng(seed), beat = 60 / bpm;
  hit = hit == null ? Math.max(0, duration - 3) : hit;
  const hitBeat = Math.max(0, Math.round(hit / beat));
  const t0 = hit - hitBeat * beat;                 // phase so beat k lands at t0 + k*beat, and hitBeat lands on `hit`
  const totalBeats = Math.ceil((duration - t0) / beat);
  const kicks = [];
  const T = k => t0 + k * beat;
  const introBeats = duration < 22 ? 2 : 4;

  for (let k = 0; k < Math.min(hitBeat, totalBeats); k++) {
    const t = T(k); if (t < -beat) continue;
    const bar = Math.floor(k / 4), pos = k % 4, chord = M.prog[bar % M.prog.length].map(x => x + M.key);
    const intro = k < introBeats, preHit = k >= hitBeat - 4;
    const rootBass = M.key - 24 + ((M.prog[bar % M.prog.length][0] % 12) + 12) % 12;

    // chords
    if (pos === 0) {
      I.pad(music, Math.max(0, t), beat * 4, chord, M.pad * energy, mood === 'cinematic' ? .6 : 1);
      I.pad(send, Math.max(0, t), beat * 4, chord, M.pad * .6, .8);
      if (M.keys === 'ep') chord.forEach((m, i) => I.keys(music, t + i * .012, beat * 3, m, .9, 1, 1.8, i % 2 ? .3 : -.3));
    }
    if (M.keys === 'ep' && pos === 2 && !intro) chord.slice(1).forEach((m, i) => I.keys(music, t + beat * .5 + i * .01, beat, m, .5, 1, 1.4));
    if (M.keys === 'marimba' && !intro) [0, 1.5, 2.5].forEach(o => { if (pos === Math.floor(o)) I.keys(music, t + (o % 1) * beat, beat * .5, chord[(pos + bar) % chord.length] + 12, .7, 3.5, 2.5, .2); });

    // bass
    if (!intro) {
      if (M.bass === 'eighths') [0, .5].forEach(o => I.bass(bass, t + o * beat, beat * .45, rootBass, .9));
      else if (M.bass === 'sixteenths') [0, .25, .5, .75].forEach(o => I.bass(bass, t + o * beat, beat * .22, rootBass, .8));
      else if (M.bass === 'bounce') { if (pos === 0 || pos === 2) I.bass(bass, t, beat * .4, rootBass, .9); if (pos === 1) I.bass(bass, t + .5 * beat, beat * .3, rootBass + 12, .6); }
      else if (M.bass === 'pulse') [0, .5].forEach(o => I.bass(bass, t + o * beat, beat * .4, rootBass, .7));
      else if (M.bass === 'whole' && pos === 0) I.bass(bass, t, beat * 3.8, rootBass, .8, 'sub');
    }

    // top line
    if (M.top === 'arp16' && !intro) [0, .25, .5, .75].forEach((o, i) => { const tones = [...chord, ...chord.map(x => x + 12)]; I.pluck(send, t + o * beat, tones[(pos * 4 + i) % tones.length] + 12, .7, r, (i % 2 ? .4 : -.4)); });
    if (M.top === 'arp8') [0, .5].forEach((o, i) => { const tones = [...chord, chord[0] + 12]; I.pluck(send, t + o * beat, tones[(pos * 2 + i) % tones.length] + 12, .55, r, (i % 2 ? .3 : -.3), .998); });
    if (M.top === 'melody' && !intro) {
      const mr = rng(1000 + (bar % 4) * 31 + seed), scale = [0, 2, 4, 7, 9];
      [0, .5].forEach(o => { if (mr() < .62) { const deg = scale[Math.floor(mr() * 5)]; I.pluck(send, t + o * beat, M.key + 12 + deg + (mr() < .3 ? 12 : 0), .8, r, .1, .993); } });
    }

    // drums
    const d = M.drums, g = energy;
    if (d === 'four' && !intro) { I.kick(drums, t, g); kicks.push(t); if (pos === 1 || pos === 3) I.clap(drums, t, .7 * g, r);
      [0, .5].forEach(o => I.hat(drums, t + o * beat, (o ? .9 : .5) * g, r)); if (pos === 3 && bar % 2) I.hat(drums, t + .75 * beat, .6 * g, r, true); }
    if (d === 'bounce' && !intro) { if (pos === 0 || pos === 2) { I.kick(drums, t, .85 * g); kicks.push(t); } if (pos === 2) I.kick(drums, t + .75 * beat, .5 * g);
      if (pos === 1 || pos === 3) I.clap(drums, t, .6 * g, r); [0, .5].forEach(o => I.hat(drums, t + o * beat, .55 * g, r, false, -.2)); }
    if (d === 'soft' && !intro) { if (pos === 0) { I.kick(drums, t, .6 * g); kicks.push(t); } if (pos === 2) I.kick(drums, t + .5 * beat, .45 * g);
      if (pos === 1 || pos === 3) I.rim(drums, t, .7 * g); [0, .5].forEach(o => I.hat(drums, t + o * beat + (o ? beat * .04 : 0), .3 * g, r)); }
    if (d === 'big') { if (pos === 0 && bar % 2 === 0) { I.kick(drums, t, 1 * g); I.boom(drums, t, .35 * g); kicks.push(t); } if (!intro && pos === 2) I.snare(drums, t, .45 * g, r); }

    // riser into the hit
    if (M.riser && k === hitBeat - 4 && hitBeat >= 4) I.noiseSweep(fx, t, beat * 4, .7, r, true);
    if (preHit && d !== 'big' && pos === 3 && k === hitBeat - 1) I.snare(drums, t + .5 * beat, .5, r);
  }

  // final hit: impact + tonic chord, then a ringing tail
  if (hit < duration) {
    const tonic = M.prog[0].map(x => x + M.key);
    I.kick(drums, hit, 1.1); I.boom(drums, hit, .6); I.crash(fx, hit, .9, r);
    I.pad(music, hit, Math.max(.5, duration - hit - .6), [...tonic, tonic[0] + 12], M.pad + .2, 1.2);
    I.pad(send, hit, Math.max(.5, duration - hit - .6), tonic, .8, 1);
    tonic.forEach((m, i) => I.pluck(send, hit + i * .03, m + 12, .8, r, (i - 1) * .4, .999));
    I.bass(bass, hit, Math.min(2.5, duration - hit), M.key - 24, .9, 'sub');
    kicks.push(hit);
  }

  // sidechain pump on everything but drums
  const pump = new Float32Array(n).fill(1);
  if (M.duck > 0) for (const kt of kicks) { const s = Math.round(kt * SR); for (let k = 0; k < SR * .35 && s + k < n; k++) { if (s + k < 0) continue; const tt = k / SR; const v = 1 - M.duck * (tt < .005 ? tt / .005 : Math.exp(-(tt - .005) * 11)); pump[s + k] = Math.min(pump[s + k], v); } }

  // effects on the send bus: ping-pong delay (dotted eighth) + reverb
  const out = new Bus(n);
  const dl = Math.round(beat * .75 * SR), fb = .32;
  const dL = new Float32Array(n), dR = new Float32Array(n);
  for (let i = 0; i < n; i++) { const inL = send.L[i], inR = send.R[i];
    dL[i] = inL + (i >= dl ? dR[i - dl] * fb : 0); dR[i] = inR + (i >= dl ? dL[i - dl] * fb : 0); }
  const wet = reverb(addBuses([music, send, fx], [.25, .6, .4], n), mood === 'cinematic' ? .9 : .78);
  for (let i = 0; i < n; i++) {
    const p = pump[i];
    out.L[i] = drums.L[i] * .9 + bass.L[i] * .85 * p + (music.L[i] + send.L[i] * .7 + (dL[i] - send.L[i]) * .45) * p + fx.L[i] * .7 + wet.L[i] * .35 * p;
    out.R[i] = drums.R[i] * .9 + bass.R[i] * .85 * p + (music.R[i] + send.R[i] * .7 + (dR[i] - send.R[i]) * .45) * p + fx.R[i] * .7 + wet.R[i] * .35 * p;
  }
  // fades
  const fi = Math.round(.03 * SR), fo = Math.round(.8 * SR);
  for (let i = 0; i < fi && i < n; i++) { out.L[i] *= i / fi; out.R[i] *= i / fi; }
  for (let i = 0; i < fo && i < n; i++) { const j = n - 1 - i, g = i / fo; out.L[j] *= g; out.R[j] *= g; }
  return out;
}

function addBuses(buses, gains, n) { const b = new Bus(n); buses.forEach((x, j) => x.mixInto(b, gains[j])); return b; }

// Schroeder/Freeverb-style reverb
function reverb(inp, room = .8) {
  const n = inp.n, out = new Bus(n);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356], aps = [556, 441, 341];
  for (const [src, dst, spread] of [[inp.L, out.L, 0], [inp.R, out.R, 23]]) {
    const acc = new Float32Array(n);
    for (const c of combs) { const len = Math.round((c + spread) * SR / 44100), buf = new Float32Array(len); let idx = 0, f = 0;
      for (let i = 0; i < n; i++) { const y = buf[idx]; f = y * .75 + f * .25; buf[idx] = src[i] + f * room * .98; idx = (idx + 1) % len; acc[i] += y; } }
    for (const a of aps) { const len = Math.round((a + spread) * SR / 44100), buf = new Float32Array(len); let idx = 0;
      for (let i = 0; i < n; i++) { const b = buf[idx]; const y = -acc[i] + b; buf[idx] = acc[i] + b * .5; idx = (idx + 1) % len; acc[i] = y; } }
    for (let i = 0; i < n; i++) dst[i] = acc[i] * .12;
  }
  return out;
}

/* ---------- sound effects ---------- */
export function renderSfx(list, duration, seed = 3) {
  const n = Math.ceil((duration + .05) * SR), bus = new Bus(n), r = rng(seed);
  for (const { t, name, gain = 1 } of list) {
    const g = gain, s = Math.round(t * SR);
    switch (name) {
      case 'click': for (let k = 0; k < SR * .03; k++) bus.add(s + k, (r() * 2 - 1) * Math.exp(-k / SR * 260) * .5 * g + Math.sin(TAU * 2400 * k / SR) * Math.exp(-k / SR * 400) * .25 * g); break;
      case 'type': { const f = 1800 + r() * 900; for (let k = 0; k < SR * .02; k++) bus.add(s + k, ((r() * 2 - 1) * .4 + Math.sin(TAU * f * k / SR) * .3) * Math.exp(-k / SR * 380) * g * .5, (r() - .5) * .4); break; }
      case 'tick': for (let k = 0; k < SR * .015; k++) bus.add(s + k, Math.sin(TAU * 3200 * k / SR) * Math.exp(-k / SR * 500) * .35 * g); break;
      case 'pop': { let ph = 0; for (let k = 0; k < SR * .12; k++) { const tt = k / SR; ph += TAU * (400 + 900 * Math.exp(-tt * 40)) / SR; bus.add(s + k, Math.sin(ph) * Math.exp(-tt * 30) * .5 * g); } break; }
      case 'whoosh': I.noiseSweep(bus, t, .45, .9 * g, r, true); I.noiseSweep(bus, t + .45, .25, .5 * g, r, false); break;
      case 'swoosh': I.noiseSweep(bus, t, .25, .8 * g, r, false); break;
      case 'ding': I.keys(bus, t, .6, 88, 1.4 * g, 3.5, 1.2); break;
      case 'chime': [84, 88, 91].forEach((m, i) => I.keys(bus, t + i * .06, .5, m, 1 * g, 2, 1.1, (i - 1) * .3)); break;
      case 'success': I.keys(bus, t, .25, 79, 1.2 * g, 1, 1.5); I.keys(bus, t + .12, .5, 86, 1.2 * g, 1, 1.5); break;
      case 'rise': I.noiseSweep(bus, t, 1, .8 * g, r, true); break;
      case 'impact': I.boom(bus, t, .8 * g); I.crash(bus, t, .5 * g, r); break;
      default: console.warn('audio: unknown sfx', name, '— known:', SFX.join(', '));
    }
  }
  return bus;
}

/* ---------- narration ducking ---------- */
export function duck(music, voice, depthDb = -12) {
  // voice: Float32Array mono at SR. Envelope follower → gain on music.
  const n = music.n, g = Math.pow(10, depthDb / 20); let env = 0;
  const atk = Math.exp(-1 / (SR * .03)), rel = Math.exp(-1 / (SR * .35));
  const look = Math.round(SR * .08);
  for (let i = 0; i < n; i++) {
    const v = Math.abs(voice[i + look] || 0); env = v > env ? atk * env + (1 - atk) * v : rel * env + (1 - rel) * v;
    const amt = Math.min(1, env * 12), gain = 1 - (1 - g) * amt;
    music.L[i] *= gain; music.R[i] *= gain;
  }
  return music;
}

/* ---------- WAV I/O ---------- */
export function writeWav(file, bus, { peak = .89 } = {}) {
  const n = bus.n; let max = 1e-9;
  for (let i = 0; i < n; i++) { max = Math.max(max, Math.abs(bus.L[i]), Math.abs(bus.R[i])); }
  const k = max > peak ? peak / max : 1;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  const sat = x => Math.tanh(x * 1.1) / Math.tanh(1.1);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(sat(bus.L[i] * k) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(sat(bus.R[i] * k) * 32767), 46 + i * 4); }
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf);
}

export function readWavMono(file) {
  const b = fs.readFileSync(file); let off = 12, fmt = null, data = null;
  while (off < b.length - 8) { const id = b.toString('ascii', off, off + 4), sz = b.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(off + 10), sr: b.readUInt32LE(off + 12), bits: b.readUInt16LE(off + 22), tag: b.readUInt16LE(off + 8) };
    if (id === 'data') data = b.subarray(off + 8, off + 8 + sz);
    off += 8 + sz + (sz % 2); }
  if (!fmt || !data || fmt.bits !== 16) throw new Error(`${file}: need 16-bit PCM WAV`);
  const frames = data.length / (2 * fmt.ch), out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) { let v = 0; for (let c = 0; c < fmt.ch; c++) v += data.readInt16LE((i * fmt.ch + c) * 2); out[i] = v / fmt.ch / 32768; }
  if (fmt.sr === SR) return out;
  const ratio = fmt.sr / SR, res = new Float32Array(Math.floor(frames / ratio));
  for (let i = 0; i < res.length; i++) { const x = i * ratio, j = Math.floor(x), f = x - j; res[i] = out[j] * (1 - f) + (out[j + 1] || 0) * f; }
  return res;
}

/** Full mix for a composition: music + sfx (+ ducked narration). */
export function mix({ duration, bpm, mood, hit, sfx = [], narration = null, musicGain = 1, seed }) {
  const music = renderMusic({ duration, bpm, mood, hit, seed });
  if (narration) duck(music, narration);
  const fx = renderSfx(sfx, duration);
  const out = new Bus(music.n);
  music.mixInto(out, .8 * musicGain); fx.mixInto(out, .6);
  if (narration) for (let i = 0; i < out.n; i++) { const v = (narration[i] || 0) * 1.1; out.L[i] += v; out.R[i] += v; }
  return out;
}

/* ---------- CLI ---------- */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { parseArgs, usage } = await import('./lib/common.mjs');
  usage(`
node audio.mjs --duration 20 --bpm 120 --mood upbeat [--hit 17] [--sfx sfx.json] [--narration voice.wav] --out music.wav
  Moods: ${MOODS.join(', ')}
  SFX:   ${SFX.join(', ')}   (sfx.json: [{"t": 1.2, "name": "pop", "gain": 1}])
  Usually called by render.mjs, which reads mood/bpm/hit/sfx from the composition.
`);
  const a = parseArgs();
  const duration = Number(a.duration || 20);
  const bus = mix({ duration, bpm: Number(a.bpm || 110), mood: a.mood || 'upbeat', hit: a.hit != null ? Number(a.hit) : null,
    sfx: a.sfx ? JSON.parse(fs.readFileSync(a.sfx, 'utf8')) : [], narration: a.narration ? readWavMono(a.narration) : null });
  writeWav(a.out || 'music.wav', bus);
  console.log('✓ wrote', a.out || 'music.wav', `${duration}s`);
}
