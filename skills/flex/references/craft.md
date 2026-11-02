# Craft: building and reviewing a composition

## Contents
1. Composition anatomy
2. Runtime API (motion presets, demos, terminals, counters, camera)
3. Visual rules
4. Motion rules
5. Sound
6. Review checklist (use on every contact sheet)

---

## 1. Composition anatomy

```html
<link rel="stylesheet" href="flex.css">   <!-- runtime (refreshed on every render) -->
<link rel="stylesheet" href="style.css">  <!-- style preset -->
<link rel="stylesheet" href="brand.css">  <!-- product brand: wins over the preset -->
<script src="assets/rec/new-order/timeline.js"></script>   <!-- one per recording -->

<main id="flex" data-direction="explain" data-fps="30" data-bpm="84" data-mood="chill" data-hit="52" data-poster="20">
  <section class="scene" data-start="0" data-end="4.5" data-transition="fade" data-xfade=".6">
    <h1 class="t-title say fx-rise" style="--at:.4" data-claim="framing">You took 300 photos on holiday.</h1>
  </section>
  …
</main>
<script src="flex.js"></script>
```

- **Stage** `#flex`: size from `?format=` / `data-format` (16:9 1920×1080 default, 9:16, 1:1, 4:5). `--u` = 1% of the short side; size everything in `--u` or the type scale so all formats work.
- **Scenes**: absolute, opaque (`--scene-bg` to change one scene's colour), centred column by default; `.left`, `.split` (side by side; stacks in portrait). Times in seconds; scenes must tile 0→end with no gaps. The incoming scene's `data-transition` (`cut fade rise slide push zoom wipe iris`) runs over `data-xfade` seconds while the outgoing one stays underneath.
- **`data-hit`**: where the music's final hit lands (start of the end card). **`data-poster`**: poster frame time.
- **Every text element** has `data-claim` (see `truth-check.md`).
- Open `index.html` directly in a browser to scrub: Space plays, ←/→ steps a frame (Shift = 1 s), `?t=12` jumps.

## 2. Runtime API

**Type**: `.t-hero` `.t-title` `.t-big` `.t-body` (smallest readable) `.t-small` (labels only) · `.say` (balanced wrap, ~22ch; `.wide` 30ch) · `.kicker` `.chip` `.muted` `.accent` `.mono` · `.step-num` · `.card` `.row` `.col` · `.logo`.

**Icons**: `<i class="ic ic-lg" data-ic="clock"></i>` — home store phone laptop clock money lock key cloud folder file chart person people cart calendar mail check check-circle cross warning settings fridge table link download upload search list heart shield bolt terminal globe chat bell image pencil refresh play arrow box cake book wrench server question.

**Motion presets** (class + timing vars, all relative to the scene start):
`fx-rise fx-fade fx-mask fx-tilt fx-pop fx-blur fx-slide-l fx-slide-r fx-wipe fx-draw` (entrances) · `fx-drift fx-zoom` (slow continuous moves; set `--dur` to the scene length, `--zoom-to`, `--drift-from/to`).
`style="--at:.4; --dur:.8"`. Stagger children: parent `.fx-stagger` with `--step:.12`, children carry the preset.
Exit: `data-out="3.2"` fades the element out at 3.2 s into the scene (`data-out-dur`).

**Product demo** (from `record.mjs`):
```html
<div class="fx-demo fx-tilt" data-rec="new-order" data-chrome="browser" data-url="crumb.app" style="--at:.3; width:72%"></div>
```
Cursor, click ripples, typing frames and camera zooms come from the recording. `data-speed="1.25"` speeds it up, `data-from="2.4"` starts later in the recording, `data-cursor="off"`, `data-maxzoom="2"`, `data-sfx="off"` (no click/type sounds). The scene must be at least `--at` + recording duration (printed by `record.mjs`) ÷ speed.

**Terminal** (from `record-cli.mjs`): `<div class="fx-terminal" data-rec="install" data-show-waits data-rows="12" style="--at:.2"></div>` — real commands typed, real output. `data-only="2,3"` shows only those steps (clock starts at the first one). `--term-fs` sets text size; keep it ≥ `calc(var(--u)*2.4)` so commands are readable.

**Camera on anything**: `data-cam="0:1,50,50; 1.5:1.8,30,40; 4:1,50,50"` — keyframes `time:scale,centreX%,centreY%` (scene time). Use on screenshots, `fx-video`, illustrations.
**Taps** (mobile): `data-taps="1.2,40,62; 2.6,50,80"` — `time,x%,y%` ripples.
**Video**: `<video class="fx-video" src="assets/clip.mp4" style="--at:.5">` — seeked frame-accurately.
**Counter**: `<span class="fx-count" data-from="0" data-to="1200" data-suffix=" orders" style="--at:.5;--dur:1.2" data-claim="C4"></span>` (real numbers only).
**Typewriter**: `<span class="fx-type" data-cps="20" style="--at:.4">text</span>`.
**Custom**: `flex.on(t => { … })` — must be a pure function of `t` (no `Date.now()`, no random without a fixed seed, no state carried between calls).

## 3. Visual rules

- **Text carries the message** (music-only default). Large type, ≤7 words per line (prefer 4–5), ≤2 lines per text block, ~0.3 s per word with a 1.2 s minimum (slower for Explain/Setup). Body copy ≥ `.t-body`. Err larger: the video will be watched as a thumbnail on a phone.
- **One focal point per scene.** The line, then the product. Not a line, a sub-line, a chip, a logo and a screenshot all at once.
- **Real screens at a readable size.** A screenshot at 40% width is decoration; zoom into the part that matters (`zoom` step, `data-cam`) so the viewer can read the button you're talking about.
- **Brand first.** Colours, fonts and logo from `brand.json`. One accent colour. Keep the product's own UI unretouched — the frame around it is yours, the screen is theirs.
- **Contrast** ≥ 4.5:1 for body text, 3:1 for large text. Safe margin: keep text 4%+ inside the edges (6% default padding).
- **Format**: compose for 16:9 first; check 9:16 with `render.mjs --preview --format 9:16` if the maker wants vertical. Portrait needs bigger demos (`width:100%`) and fewer words per line.
- **No slop**: no purple/indigo gradients, glass cards, glowing orbs, emoji icons, stock-photo people or AI faces, fake 3D device mockups with someone else's logo.

## 4. Motion rules

- Motion explains: it points at what to look at next. Every move should answer "where do I look?".
- Entrances `fx-rise`/`fx-mask` for text, `fx-tilt`/`fx-blur` for product shots, `fx-pop` for icons/numbers. Stagger related items by 0.08–0.15 s.
- Durations: Launch 0.35–0.6 s, others 0.6–0.9 s. Ease-out for entrances (the default `--ease`).
- Camera: one zoom per idea, hold the zoom ≥1.2 s, then pull back. Never zoom while the viewer is reading a long line.
- Cursor: moves arrive just before the click (record.mjs handles this); don't let it wander. Hide it on result screens.
- Transitions: Launch `slide`/`cut` ≤0.35 s; Explain/Setup `fade`/`rise` 0.5–0.8 s; Use cases `slide` between stories.
- Nothing static for more than ~3 s: a slow `fx-zoom`/`fx-drift` on long holds keeps the frame alive.

## 5. Sound

- `data-mood` = upbeat · playful · chill · cinematic · dark; `data-bpm` tempo. Launch upbeat 110–128, Explain chill/playful 80–96, Use cases playful 96–112, Setup chill 76–90. The music is generated (original, no samples) and tempo-locked: a downbeat lands exactly on `data-hit`.
- Sound effects: `data-sfx="pop"` on any element plays at its `--at` (`click type pop whoosh swoosh ding chime success tick rise impact`). Demos add click/typing sounds automatically. Use few: one per scene at most, on the thing that matters. `data-sfx-gain`.
- Narration (optional, `--narrate`): write `narration.json`, run `tts.mjs` (local voices), retime scenes to the printed line lengths, render with `--narrate`. On-screen text still says everything; narration repeats it, never replaces it.
- Maker's own track: `render.mjs --music track.wav` (their responsibility; never a commercial song).

## 6. Review checklist

Run `check.mjs` first (it measures sizes, holds, contrast, margins, claims, jargon, placeholders). Then open `preview.png` and go through this — the things a script can't see:

**Story**
- [ ] Watching only the contact sheet, could the target viewer say what this is? (Read just the text, in order.)
- [ ] The beat sheet for the direction is all there, in order, at roughly the right times.
- [ ] The first frame is strong (it's also the thumbnail on many platforms) — no blank or half-faded frame at 0 s.

**Footage**
- [ ] Real product footage, moving (cursor, typing, zooms) — not screenshots sliding around.
- [ ] Zooms land on the thing the text talks about; the important button/number is readable.
- [ ] No secrets, personal data, real customer names, internal URLs, browser bookmarks or notifications visible. Look at every still.
- [ ] No broken states: spinners frozen mid-load, error toasts, empty lists (unless that's the point), layout jumps.

**Frame**
- [ ] Text never overlaps the product shot or another text block; nothing touches the edges.
- [ ] One focal point per frame. Not too many things at once.
- [ ] Brand colours/logo correct; the logo isn't stretched or blurry.
- [ ] Transitions: no half-transparent scenes, no flash of black, nothing showing through.
- [ ] End card holds ≥3 s with the name and how to get it.

**Truth & language**
- [ ] Every line is in `truth.md`; nothing on screen you couldn't defend to the maker's most sceptical user.
- [ ] No placeholder text, no "lorem", no `{{…}}`, no template copy.
- [ ] (non-Launch) No unexplained jargon; outsider read clean.

Fix, re-render the preview, look again. Use `--stills t` to zoom in on doubtful moments. Two full passes minimum; stop when a pass finds nothing.
