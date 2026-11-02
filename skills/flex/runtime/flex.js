/* flex runtime — deterministic, seekable compositions.
 * Every visual is a pure function of time t: CSS/Web Animations are paused and seeked,
 * and every runtime effect (transitions, counters, typing, demos, terminals) is computed from t.
 * Refreshed next to every composition on render — edit the skill copy, not the output copy. */
(() => {
  const root = document.getElementById('flex');
  if (!root) { console.error('flex: no #flex element'); return; }
  const params = new URLSearchParams(location.search);
  const RENDER = params.has('render');
  if (RENDER) document.documentElement.classList.add('render');

  const FORMATS = { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1080, 1080], '4:5': [1080, 1350] };
  const format = params.get('format') || root.dataset.format || '16:9';
  const [W, H] = FORMATS[format] || [Number(root.dataset.width) || 1920, Number(root.dataset.height) || 1080];
  root.dataset.format = format;
  root.style.width = W + 'px';
  root.style.height = H + 'px';
  root.style.setProperty('--u', (Math.min(W, H) / 100) + 'px');
  document.documentElement.dataset.format = format;

  const fps = Number(root.dataset.fps) || 30;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = {
    inOut: p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    out: p => 1 - Math.pow(1 - p, 3),
    linear: p => p,
  };
  const cssNum = (el, name, fallback) => {
    const v = parseFloat(getComputedStyle(el).getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };

  /* ---------- icons ---------- */
  const ICONS = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    store: '<path d="M4 4h16l1 5H3z"/><path d="M5 9v11h14V9"/><path d="M10 20v-5h4v5"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="1"/><path d="M2 19h20"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v.01M18 15v.01"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    cloud: '<path d="M7 18a5 5 0 0 1-.5-9.97A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',
    folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    file: '<path d="M6 2h8l5 5v15H6z"/><path d="M14 2v5h5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a5 5 0 0 1 5 5"/>',
    cart: '<path d="M3 4h2l2.5 11h11L21 7H6.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    cross: '<path d="M6 6l12 12M18 6L6 18"/>',
    warning: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    fridge: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M6 9h12M9 5v2M9 12v3"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6v.01M4 12v.01M4 18v.01"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    terminal: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 9l3 3-3 3M12 15h6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 16l-5-5-9 8"/>',
    pencil: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    cake: '<path d="M4 21h16v-8H4z"/><path d="M4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 4 0"/><path d="M12 13V9M12 6v.01"/>',
    book: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
    wrench: '<path d="M15 3a5 5 0 0 0-4.6 7L3 17.4V21h3.6l7.4-7.4A5 5 0 1 0 15 3z"/>',
    server: '<rect x="3" y="3" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="7" rx="1.5"/><path d="M7 6.5v.01M7 17.5v.01"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>',
  };
  root.querySelectorAll('.ic[data-ic]').forEach(el => {
    const body = ICONS[el.dataset.ic];
    if (!body) { console.warn('flex: unknown icon', el.dataset.ic); return; }
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${el.dataset.stroke || 1.8}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  });

  /* ---------- scenes ---------- */
  const scenes = [...root.querySelectorAll('.scene')].map((el, i) => ({
    el, i,
    start: Number(el.dataset.start),
    end: Number(el.dataset.end),
    transition: el.dataset.transition || (i === 0 ? 'cut' : 'fade'),
    xfade: el.dataset.xfade != null ? Number(el.dataset.xfade) : (el.dataset.transition === 'cut' ? 0 : .5),
  })).sort((a, b) => a.start - b.start);
  scenes.forEach((s, i) => {
    s.el.style.zIndex = String(i + 1);
    const next = scenes[i + 1];
    s.visibleEnd = next && next.start <= s.end + 1e-6 ? Math.max(s.end, next.start + next.xfade) : s.end;
    if (!Number.isFinite(s.start) || !Number.isFinite(s.end)) console.error('flex: scene without data-start/data-end', s.el);
  });
  const duration = Number(root.dataset.duration) || Math.max(0, ...scenes.map(s => s.end));
  const sceneOf = el => { const s = el.closest('.scene'); return s ? scenes.find(x => x.el === s) : null; };
  const sceneCache = new WeakMap();
  const sceneFor = el => { if (!sceneCache.has(el)) sceneCache.set(el, sceneOf(el)); return sceneCache.get(el); };

  function applyTransition(s, t) {
    const st = s.el.style;
    st.opacity = ''; st.transform = ''; st.clipPath = '';
    const p = s.xfade > 0 ? clamp((t - s.start) / s.xfade) : 1;
    if (p < 1) {
      const e = ease.inOut(p);
      switch (s.transition) {
        case 'fade': st.opacity = e; break;
        case 'rise': st.opacity = e; st.transform = `translateY(${(1 - e) * 6}%)`; break;
        case 'slide': st.transform = `translateX(${(1 - e) * 100}%)`; break;
        case 'push': st.transform = `translateY(${(1 - e) * 100}%)`; break;
        case 'zoom': st.opacity = e; st.transform = `scale(${1.08 - .08 * e})`; break;
        case 'wipe': st.clipPath = `inset(0 ${(1 - e) * 100}% 0 0)`; break;
        case 'iris': st.clipPath = `circle(${e * 75}% at 50% 50%)`; break;
      }
    }
    // outgoing side of slide/push transitions
    const next = scenes[s.i + 1];
    if (next && t >= next.start && t < next.start + next.xfade && (next.transition === 'slide' || next.transition === 'push')) {
      const e = ease.inOut(clamp((t - next.start) / next.xfade));
      st.transform = next.transition === 'slide' ? `translateX(${-e * 30}%)` : `translateY(${-e * 30}%)`;
    }
  }

  /* ---------- staggers ---------- */
  root.querySelectorAll('.fx-stagger').forEach(g => [...g.children].forEach((c, i) => c.style.setProperty('--i', i)));

  /* ---------- counters & typewriters ---------- */
  const counters = [...root.querySelectorAll('.fx-count')];
  const typers = [...root.querySelectorAll('.fx-type')].map(el => ({ el, text: el.textContent }));
  const outs = [...root.querySelectorAll('[data-out]')];

  /* ---------- camera keyframes on any element: data-cam="t:scale,cx%,cy%; ..." ---------- */
  const cams = [...root.querySelectorAll('[data-cam]')].map(el => ({
    el,
    keys: el.dataset.cam.split(';').map(k => k.trim()).filter(Boolean).map(k => {
      const [t, rest] = k.split(':'); const [s, x, y] = rest.split(',').map(Number);
      return { t: Number(t), s, x: x ?? 50, y: y ?? 50 };
    }).sort((a, b) => a.t - b.t),
  }));
  cams.forEach(c => { c.el.style.transformOrigin = '0 0'; });
  function camTransform(s, cx, cy) { // cx, cy in % of the element
    const tx = -(cx - 50 / s); const ty = -(cy - 50 / s);
    const ctx = clamp(tx, -(100 - 100 / s), 0); const cty = clamp(ty, -(100 - 100 / s), 0);
    return `scale(${s}) translate(${ctx}%, ${cty}%)`;
  }
  function interpKeys(keys, lt) {
    if (!keys.length) return { s: 1, x: 50, y: 50 };
    if (lt <= keys[0].t) return keys[0];
    for (let i = 1; i < keys.length; i++) {
      if (lt < keys[i].t) {
        const a = keys[i - 1], b = keys[i], e = ease.inOut((lt - a.t) / (b.t - a.t));
        return { s: a.s + (b.s - a.s) * e, x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
      }
    }
    return keys[keys.length - 1];
  }

  /* ---------- taps: data-taps="t,x%,y%; ..." ---------- */
  const taps = [...root.querySelectorAll('[data-taps]')].map(el => {
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const list = el.dataset.taps.split(';').map(x => x.trim()).filter(Boolean).map(x => { const [t, px, py] = x.split(',').map(Number); return { t, px, py }; });
    const dots = list.map(tp => { const d = document.createElement('div'); d.className = 'fx-ripple'; d.style.left = tp.px + '%'; d.style.top = tp.py + '%'; el.appendChild(d); return d; });
    return { el, list, dots };
  });
  function ripple(dot, dt) {
    if (dt < 0 || dt > .5) { dot.style.opacity = 0; return; }
    const p = dt / .5;
    dot.style.opacity = (1 - p) * .9;
    dot.style.transform = `scale(${.3 + 1.3 * ease.out(p)})`;
  }

  /* ---------- product demos (recorded with scripts/record.mjs) ---------- */
  const CURSOR_SVG = '<svg viewBox="0 0 24 24"><path d="M3 2l17 10.5-7.6 1.6L9 21.5z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const REC = window.FLEX_REC || {};
  const demos = [...root.querySelectorAll('.fx-demo[data-rec]')].map(el => {
    const rec = REC[el.dataset.rec];
    if (!rec) { console.error('flex: missing recording', el.dataset.rec, '— add its timeline.js <script> before flex.js'); return null; }
    const [vw, vh] = rec.viewport;
    if (el.dataset.chrome === 'browser') {
      el.classList.add('fx-window');
      const bar = document.createElement('div'); bar.className = 'bar';
      bar.innerHTML = `<i></i><i></i><i></i><div class="url"></div>`;
      bar.querySelector('.url').textContent = el.dataset.url || rec.host || '';
      el.appendChild(bar);
    }
    const screen = document.createElement('div'); screen.className = 'screen'; screen.style.aspectRatio = `${vw} / ${vh}`;
    const cam = document.createElement('div'); cam.className = 'cam';
    const imgs = rec.frames.map(f => { const im = new Image(); im.src = rec.base + f; im.decoding = 'sync'; cam.appendChild(im); return im; });
    const cursor = document.createElement('div'); cursor.className = 'fx-cursor'; cursor.innerHTML = CURSOR_SVG;
    const rip = document.createElement('div'); rip.className = 'fx-ripple';
    cam.append(rip, cursor); screen.appendChild(cam); el.appendChild(screen);
    if (el.dataset.cursor === 'off') cursor.style.display = 'none';

    const ev = rec.events;
    const frames = ev.filter(e => e.frame != null);
    const moves = ev.filter(e => e.cursor);
    const clicks = ev.filter(e => e.click);
    const zooms = ev.filter(e => 'zoom' in e);
    const maxZoom = Number(el.dataset.maxzoom) || 2.4;
    const zoomState = z => {
      if (!z) return { s: 1, x: vw / 2, y: vh / 2 };
      const s = z.scale || clamp(Math.min(vw / z.w, vh / z.h) * .8, 1, maxZoom);
      return { s, x: z.x + z.w / 2, y: z.y + z.h / 2 };
    };
    const zoomStates = zooms.map(z => ({ t: z.t, dur: z.dur ?? .9, to: zoomState(z.zoom) }));
    return { el, rec, vw, vh, imgs, cursor, rip, cam, frames, moves, clicks, zoomStates,
      speed: Number(el.dataset.speed) || 1, from: Number(el.dataset.from) || 0,
      start0: rec.cursorStart || [vw * .62, vh * .78] };
  }).filter(Boolean);

  function renderDemo(d, lt) {
    const at = cssNum(d.el, '--at', 0);
    const dt = Math.max(0, (lt - at)) * d.speed + d.from;
    // frame
    let fi = 0, fe = null, prev = 0;
    for (const f of d.frames) { if (f.t <= dt) { prev = fi; fi = f.frame; fe = f; } else break; }
    d.imgs.forEach((im, i) => { im.style.opacity = i === fi ? 1 : 0; im.style.zIndex = i === fi ? 2 : 1; });
    if (fe && fe.fade && dt - fe.t < .25 && prev !== fi) { d.imgs[prev].style.opacity = 1; d.imgs[fi].style.opacity = (dt - fe.t) / .25; }
    // cursor
    let pos = d.start0, from = d.start0;
    for (const m of d.moves) {
      if (m.t > dt) break;
      const p = ease.inOut(clamp((dt - m.t) / (m.dur || .6)));
      pos = [from[0] + (m.cursor[0] - from[0]) * p, from[1] + (m.cursor[1] - from[1]) * p];
      from = m.cursor;
    }
    let press = 1, rdt = -1;
    for (const c of d.clicks) { if (c.t <= dt) rdt = dt - c.t; }
    if (rdt >= 0 && rdt < .22) press = 1 - .15 * Math.sin(Math.PI * rdt / .22);
    d.cursor.style.left = (pos[0] / d.vw * 100) + '%';
    d.cursor.style.top = (pos[1] / d.vh * 100) + '%';
    d.cursor.style.transform = `scale(${press})`;
    const lastClick = [...d.clicks].reverse().find(c => c.t <= dt);
    if (lastClick) { d.rip.style.left = (lastClick.at[0] / d.vw * 100) + '%'; d.rip.style.top = (lastClick.at[1] / d.vh * 100) + '%'; }
    ripple(d.rip, rdt);
    // camera
    let cs = { s: 1, x: d.vw / 2, y: d.vh / 2 }, cfrom = cs;
    for (const z of d.zoomStates) {
      if (z.t > dt) break;
      const p = ease.inOut(clamp((dt - z.t) / z.dur));
      cs = { s: cfrom.s + (z.to.s - cfrom.s) * p, x: cfrom.x + (z.to.x - cfrom.x) * p, y: cfrom.y + (z.to.y - cfrom.y) * p };
      cfrom = z.to;
    }
    d.cam.style.transform = camTransform(cs.s, cs.x / d.vw * 100, cs.y / d.vh * 100);
  }

  /* ---------- terminals (recorded with scripts/record-cli.mjs) ---------- */
  const TERM = window.FLEX_TERM || {};
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const terms = [...root.querySelectorAll('.fx-terminal[data-rec]')].map(el => {
    const rec = TERM[el.dataset.rec];
    if (!rec) { console.error('flex: missing terminal recording', el.dataset.rec); return null; }
    el.innerHTML = `<div class="bar"><i></i><i></i><i></i><span></span></div><pre></pre>`;
    el.querySelector('.bar span').textContent = el.dataset.title || rec.title || 'Terminal';
    const only = el.dataset.only ? el.dataset.only.split(',').map(Number) : null;
    // with data-only, start the clock at the first shown step instead of the recording's start
    const firstShown = only ? rec.items.find(i => only.includes(i.step)) : null;
    return { el, rec, pre: el.querySelector('pre'), rows: Number(el.dataset.rows) || 14, showWaits: el.hasAttribute('data-show-waits'),
      speed: Number(el.dataset.speed) || 1, only, offset: firstShown ? Math.max(0, firstShown.t - .6) : 0 };
  }).filter(Boolean);
  function renderTerm(d, lt) {
    const at = cssNum(d.el, '--at', 0);
    const dt = Math.max(0, lt - at) * d.speed + d.offset;
    const prompt = d.rec.prompt || '$';
    const lines = []; let typing = false, last = null;
    for (const it of d.rec.items) {
      if (d.only && !d.only.includes(it.step)) continue;
      if (it.t > dt) break;
      last = it;
      if (it.type === 'done') continue;
      if (it.type === 'cmd') {
        const n = Math.floor(clamp((dt - it.t) / it.typeDur) * it.text.length);
        typing = n < it.text.length;
        lines.push(`<span class="p">${esc(prompt)}</span> <span class="c">${esc(it.text.slice(0, n))}</span>`);
      } else if (it.type === 'wait') {
        if (d.showWaits) lines.push(`<span class="wait">${esc(it.label)}</span>`);
      } else {
        lines.push(`<span class="${it.cls || ''}">${esc(it.text)}</span>`);
      }
    }
    const caretOn = typing || Math.floor(dt * 2) % 2 === 0;
    // a fresh prompt before anything happens and after each step finishes
    if (!last || last.type === 'done') lines.push(`<span class="p">${esc(prompt)}</span> `);
    const shown = lines.slice(-d.rows);
    shown[shown.length - 1] += caretOn ? '<span class="caret"></span>' : '';
    d.pre.innerHTML = shown.join('\n');
    d.pre.style.minHeight = `calc(${d.rows} * 1.45em + var(--u) * 4.8)`;
  }

  /* ---------- videos ---------- */
  const videos = [...root.querySelectorAll('video.fx-video')];
  videos.forEach(v => { v.muted = true; v.preload = 'auto'; v.pause(); });

  /* ---------- seek ---------- */
  const hooks = [];
  let current = 0;
  function seekSync(t) {
    current = t = clamp(t, 0, duration);
    for (const s of scenes) {
      const on = t >= s.start && t < s.visibleEnd || (t >= duration - 1e-6 && s.end >= duration - 1e-6);
      s.el.classList.toggle('is-on', on);
      if (on) applyTransition(s, t);
    }
    for (const a of root.getAnimations({ subtree: true })) {
      if (a.playState !== 'paused') a.pause();
      const target = a.effect && a.effect.target;
      const s = target ? sceneFor(target) : null;
      a.currentTime = Math.max(0, t - (s ? s.start : 0)) * 1000;
    }
    const local = el => { const s = sceneFor(el); return t - (s ? s.start : 0); };
    for (const el of counters) {
      const lt = local(el), at = cssNum(el, '--at', 0), dur = cssNum(el, '--dur', 1.2);
      const from = Number(el.dataset.from || 0), to = Number(el.dataset.to), dec = Number(el.dataset.decimals || 0);
      const v = from + (to - from) * ease.out(clamp((lt - at) / dur));
      el.textContent = (el.dataset.prefix || '') + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (el.dataset.suffix || '');
    }
    for (const { el, text } of typers) {
      const lt = local(el), at = cssNum(el, '--at', 0), cps = Number(el.dataset.cps || 22);
      el.textContent = text.slice(0, Math.floor(clamp((lt - at) * cps, 0, text.length)));
    }
    for (const el of outs) {
      const lt = local(el), o = Number(el.dataset.out), d = Number(el.dataset.outDur || .35);
      const v = 1 - clamp((lt - o) / d);
      el.style.filter = v < 1 ? `opacity(${v})` : '';
    }
    for (const c of cams) { const k = interpKeys(c.keys, local(c.el)); c.el.style.transform = camTransform(k.s, k.x, k.y); }
    for (const tp of taps) tp.list.forEach((x, i) => ripple(tp.dots[i], local(tp.el) - x.t));
    for (const d of demos) renderDemo(d, local(d.el));
    for (const d of terms) renderTerm(d, local(d.el));
    for (const fn of hooks) fn(t);
  }
  async function seek(t) {
    seekSync(t);
    const waits = videos.map(v => {
      const want = Math.max(0, (t - (sceneFor(v)?.start || 0)) - cssNum(v, '--at', 0));
      if (Math.abs(v.currentTime - want) < 1 / (fps * 4)) return null;
      return new Promise(r => { v.addEventListener('seeked', r, { once: true }); v.currentTime = Math.min(want, (v.duration || want) - .001); });
    }).filter(Boolean);
    if (waits.length) await Promise.all(waits);
  }

  /* ---------- sound effects (collected by render.mjs) ---------- */
  function sfx() {
    const out = [];
    root.querySelectorAll('[data-sfx]').forEach(el => {
      const s = sceneFor(el); const at = cssNum(el, '--at', 0) + (el.dataset.sfxAt ? Number(el.dataset.sfxAt) : 0);
      out.push({ t: (s ? s.start : 0) + at, name: el.dataset.sfx, gain: Number(el.dataset.sfxGain || 1) });
    });
    for (const d of demos) {
      if (d.el.dataset.sfx === 'off') continue;
      const s = sceneFor(d.el), at = cssNum(d.el, '--at', 0), base = (s ? s.start : 0) + at, end = s ? s.end : duration;
      for (const c of d.clicks) { const tt = base + (c.t - d.from) / d.speed; if (tt >= base && tt < end) out.push({ t: tt, name: 'click', gain: .8 }); }
      for (const k of d.rec.events.filter(e => e.key)) { const tt = base + (k.t - d.from) / d.speed; if (tt >= base && tt < end) out.push({ t: tt, name: 'type', gain: .35 }); }
    }
    for (const d of terms) {
      const s = sceneFor(d.el), at = cssNum(d.el, '--at', 0), base = (s ? s.start : 0) + at, end = s ? s.end : duration;
      for (const it of d.rec.items) if (it.type === 'cmd' && (!d.only || d.only.includes(it.step))) {
        for (let k = 0; k < it.text.length; k += 2) { const tt = base + (it.t - d.offset + it.typeDur * k / it.text.length) / d.speed; if (tt >= base && tt < end) out.push({ t: tt, name: 'type', gain: .25 }); }
      }
    }
    return out.sort((a, b) => a.t - b.t);
  }

  /* ---------- readiness ---------- */
  const imgReady = [...root.querySelectorAll('img')].map(im => im.decode ? im.decode().catch(() => {}) : Promise.resolve());
  const vidReady = videos.map(v => v.readyState >= 2 ? null : new Promise(r => { v.addEventListener('loadeddata', r, { once: true }); v.addEventListener('error', r, { once: true }); }));
  const ready = Promise.all([document.fonts ? document.fonts.ready : null, ...imgReady, ...vidReady]).then(() => seek(0));

  window.flex = {
    width: W, height: H, fps, duration, format,
    bpm: Number(root.dataset.bpm) || 100, mood: root.dataset.mood || 'chill',
    hit: root.dataset.hit != null ? Number(root.dataset.hit) : (scenes.length ? scenes[scenes.length - 1].start : duration),
    poster: root.dataset.poster != null ? Number(root.dataset.poster) : null,
    seek, ready, sfx,
    on(fn) { hooks.push(fn); },
    scenes: () => scenes.map(s => ({ start: s.start, end: s.end, transition: s.transition, id: s.el.id || null })),
    get time() { return current; },
  };

  /* ---------- browser preview: fit + scrub bar ---------- */
  if (!RENDER) {
    const fit = () => {
      const k = Math.min(innerWidth / W, (innerHeight - 48) / H);
      root.style.transform = `scale(${k})`;
      root.style.left = ((innerWidth - W * k) / 2) + 'px';
      root.style.top = Math.max(0, (innerHeight - 48 - H * k) / 2) + 'px';
    };
    addEventListener('resize', fit); fit();
    const ui = document.createElement('div'); ui.id = 'flex-ui';
    ui.innerHTML = `<button>Play</button><input type="range" min="0" max="${duration}" step="${1 / fps}" value="0"><span class="t"></span>`;
    document.body.appendChild(ui);
    const [btn, range, label] = ui.children;
    let playing = false, t0 = 0, p0 = 0;
    const show = t => { range.value = t; label.textContent = `${t.toFixed(2)} / ${duration.toFixed(1)}s`; };
    const tick = now => { if (!playing) return; const t = p0 + (now - t0) / 1000; if (t >= duration) { playing = false; btn.textContent = 'Play'; seek(duration); show(duration); return; } seek(t); show(t); requestAnimationFrame(tick); };
    const toggle = () => { playing = !playing; btn.textContent = playing ? 'Pause' : 'Play'; if (playing) { p0 = current >= duration ? 0 : current; t0 = performance.now(); requestAnimationFrame(tick); } };
    btn.onclick = toggle;
    range.oninput = () => { playing = false; btn.textContent = 'Play'; seek(Number(range.value)); show(Number(range.value)); };
    addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { const t = clamp(current + (e.code === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 1 : 1 / fps), 0, duration); seek(t); show(t); }
    });
    const start = Number(params.get('t')) || 0;
    ready.then(() => { seek(start); show(start); });
  }
})();
