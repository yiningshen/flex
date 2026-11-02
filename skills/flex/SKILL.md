---
name: flex
description: Turn the maker's own product into promo videos at product-demo quality, for audiences from developers to people with no tech background. Four directions: Launch (15–25s hype for technical viewers), Explain (what is this, in everyday words), Use cases (real people doing real tasks with the real product), and Setup (an honest walkthrough of getting it running, with a "what you'll need" card). Builds an HTML composition from real product footage (scripted browser recording with cursor, clicks, typing and zooms), original procedural music, and renders MP4 + poster + share copy. Use this whenever the user runs /flex, or asks for a launch video, demo video, explainer, promo, trailer, product video, walkthrough video, "how to install" video, a video for their README / Product Hunt / social, or wants non-technical people to understand or set up something they built — even if they don't say "video" until later.
---

# /flex

/flex turns a product into short promotional videos. The person running it is the **maker**. The viewer is usually *not* the maker: often someone with no tech background who has to decide, from the video alone, what this is, whether it's for them, and whether they can get it running.

Two things make a /flex video good, and every rule below serves one of them:

1. **A stranger understands it.** Repo videos lose outsiders at the first "API". Here every screen is written for the target viewer, checked by an outsider reader, and carried by on-screen text (music-only is the default, so narration can never be the thing that explains).
2. **It's true and it looks professional.** Real footage of the real product, moving the way Stripe/Linear/Apple demos move. No invented numbers, testimonials, features or steps. A pretty lie makes the "vibe coding" expectation gap worse; an honest effort card closes it.

`SKILL_DIR` below means the folder this file is in.

---

## 1. Start flow

Parse the invocation first:

| Invocation | Meaning |
|---|---|
| `/flex` | Ask the three questions below, with suggestions |
| `/flex launch` · `explain` · `usecases` · `setup` | That direction; still ask product kind + style if not obvious |
| `/flex usecases --for "small bakery owners"` | `--for` answers the audience question |
| `/flex all` | All four, one shared style, one shared brand |
| flags: `--format 9:16`/`1:1`, `--narrate`, `--style <preset>`, `--idea` (setup from verified instructions, no install run) |

Before asking, spend a minute looking at the project (README, manifest, entry points, git log) so the questions come with real suggestions. Then ask, in one message (use the host's question tool if it has one):

1. **Direction(s)** — suggest based on the project. A CLI library with a technical README → Launch. A consumer web app → Explain + Use cases. Something people struggle to install → Setup.
2. **Product kind** — web app · command-line tool · desktop app · mobile app · other. The maker states it; you suggest. It decides how footage is captured (`references/product-kinds.md`).
3. **Style** — a preset from `references/styles.md` (suggest one that fits the product's existing look) or their own words ("like Apple's ads", "playful and hand-drawn").

And the one product question every run needs: **"Who do you wish was using this?"** Their answer becomes the audience for Explain and the personas for Use cases. Don't replace it with a generic persona.

If the maker says "just pick", pick, say what you picked in one line, and go.

Check the machine once per session: `node SKILL_DIR/scripts/doctor.mjs` (`--fix` installs Playwright + Chromium into the skill folder; FFmpeg must be on PATH).

---

## 2. Pipeline (per video)

Each video lives in `flex-output/<direction>/` in the maker's project:

```
flex-output/explain/
  plan.md          script + beat sheet + decisions
  truth.md         claim → source ledger
  outsider.md      outsider-read findings and fixes
  index.html       the composition (open in a browser to scrub)
  flex.js flex.css runtime (refreshed on every render)
  assets/          screenshots, recordings, brand.json, logo
  explain.mp4      the video
  poster.png
  share.md
```

Scaffold with `node SKILL_DIR/scripts/new.mjs <direction> --dir flex-output/<direction> --name "<Product>" [--brand assets/brand.json] [--style <preset>] [--format 16:9]`.

### Step 1 — Understand
Read README, manifest, docs, entry points, recent git history, and **look at the real product** (run it if you can). For web apps run `scripts/capture.mjs <url> --out <dir>/assets` to get desktop/mobile screenshots and `brand.json` (colors, fonts, logo, headline). Write down what the product *actually does*, each with where you saw it — this list is the raw material for `truth.md`.

### Step 2 — Script first
Read the direction file (`directions/<direction>.md`) and write `plan.md`: the words on every screen, in order, then the beat sheet (scene, seconds, text, visual, source). Words come before visuals because the text has to carry the whole message; visuals are cut to the text, then snapped to the music beat. Run `node SKILL_DIR/scripts/timing.mjs plan.md` to get minimum hold times from the words (≈0.3s/word, 1.2s min, read-twice rule) and check the total fits the direction's length.

For Explain, Use cases and Setup, also read `references/plain-language.md` while writing — it has the jargon rules and the analogy library.

### Step 3 — Outsider read (Explain, Use cases, Setup; optional for Launch)
Spawn a **separate** subagent with only the on-screen script (no repo access, no plan notes) and the instructions in `references/outsider-read.md`. It plays a viewer with no tech background and flags every word, step or idea it wouldn't understand. Fix each flag (explain with an analogy, show it, or cut it), record findings and fixes in `outsider.md`, and re-run until it comes back clean. Doing this before building is the point: rewording a script is cheap, rebuilding scenes is not. If the host has no subagents, do the read yourself in a fresh pass following the same file, and say so in `outsider.md`.

### Step 4 — Truth check
Fill `truth.md` per `references/truth-check.md`: every on-screen claim, capability, number and setup step gets an ID and a source (file:line, doc URL, command log, recording, or the maker's own statement). Anything without a source is cut or reworded. In the composition, each text element carries `data-claim="C3"` (or `data-claim="framing"` for lines that claim nothing, like "Imagine a Tuesday morning."). `check.mjs` fails on missing or unknown IDs.

### Step 5 — Build
Record real footage first (`references/product-kinds.md`): `scripts/record.mjs` for web apps (headless browser does the clicks and typing; you get frames + a timeline that the runtime turns into cursor, clicks, typing and camera zooms), `scripts/record-cli.mjs` for terminals (real commands, real output, real timings). Scan everything you'll show: `node SKILL_DIR/scripts/scan-secrets.mjs <dir>/assets` — and look at the stills yourself, because the scanner can't read pixels.

Then edit `index.html` from the template. Read `references/craft.md` for the runtime API, motion presets and the visual rules. Use the product's brand (`brand.json`) over the style preset's colors when they conflict.

### Step 6 — Review (mandatory, at least twice)
```
node SKILL_DIR/scripts/check.mjs <dir>/index.html --direction <d>
node SKILL_DIR/scripts/render.mjs <dir>/index.html --preview
```
`check.mjs` measures what a script can: words per line, lines on screen, hold times, contrast, safe margins, opaque scenes, placeholder text, jargon, claim IDs, total length. `--preview` writes `preview.png`, a one-frame-per-second contact sheet. **Open it and look**, using the checklist at the end of `references/craft.md`. Fix, re-run both, look again. Use `--stills 3.2,7.5` for close-ups of anything doubtful. The first pass always finds something; that's why this step exists.

### Step 7 — Render
```
node SKILL_DIR/scripts/render.mjs <dir>/index.html            # mp4 + poster.png
node SKILL_DIR/scripts/render.mjs <dir>/index.html --format 9:16
```
Music is generated from the composition's mood and tempo (`data-mood`, `data-bpm`), sound effects from `data-sfx`. With `--narrate`, first run `scripts/tts.mjs` (local voices only, never a paid service); the renderer ducks the music under the voice. On-screen text stays complete either way.

### Step 8 — Share copy
Write `share.md` per `references/share-copy.md`, for that direction's audience.

Finish by telling the maker, in plain words: where the files are, what's in each video, anything you couldn't verify or record (and how it's marked), and anything they should check (e.g. "the price on the effort card came from your pricing page on 26 Oct").

---

## 3. Multi-video runs (`/flex all` or several directions)

Do Step 1 once and share it. Pick one style and one brand file and use them for every video so the set looks like a family. Write all scripts, then run one outsider read per script (they can run in parallel), then build. Order of building: Launch (shortest, sets the look) → Explain → Use cases → Setup. Reuse recordings across videos when they show the same flow.

---

## 4. Principles

These aren't preferences; a video that breaks one is not finished.

- **No jargon on screen without an everyday explanation** (Explain, Use cases, Setup). If a word needs explaining and you can't explain it in the time available, it doesn't appear. Launch may use the technical audience's language.
- **No invented facts.** No made-up numbers, user counts, testimonials, quotes, customer logos, benchmarks or features. "Imagine…" scenarios are fine; the capability inside them must be real.
- **Honest effort.** Setup videos say what it really takes: accounts, money (including monthly costs), time, and upkeep. If you don't know a cost, say "check current price" rather than guess.
- **No secrets in footage.** Keys, tokens, passwords, emails, personal data, internal URLs. Use seed/demo data, mask fields (`record.mjs --mask`), and scan before use.
- **No third-party IP.** No copyrighted music, characters, logos or trademarks beyond the product's own. The music engine makes original music; a maker-supplied track is the maker's call.
- **No placeholder text in a final render.** `check.mjs` catches `{{…}}`, lorem ipsum, TODO and template copy.
- **Real footage over mockups.** Mockups are allowed only for things that can't be recorded (a mobile app with no simulator, a paid third-party signup) and are marked as such in `truth.md`.

## 5. Reference map

| Read | When |
|---|---|
| `directions/launch.md` · `explain.md` · `usecases.md` · `setup.md` | Step 2, for the chosen direction |
| `references/plain-language.md` | Writing any non-Launch script |
| `references/outsider-read.md` | Give to the outsider subagent in Step 3 |
| `references/truth-check.md` | Step 4 |
| `references/product-kinds.md` | Before recording (Step 5) |
| `references/craft.md` | Building and reviewing (Steps 5–6) |
| `references/styles.md` | Choosing or describing a style |
| `references/share-copy.md` | Step 8 |

## 6. Scripts

All are Node ESM; run with `node SKILL_DIR/scripts/<name>.mjs --help` for options.

| Script | Does |
|---|---|
| `doctor.mjs [--fix]` | Checks Node ≥18, FFmpeg, Playwright/Chromium |
| `new.mjs <direction>` | Scaffolds a composition + plan/truth/share files |
| `capture.mjs <url>` | Screenshots + `brand.json` from a running app |
| `record.mjs <url> --steps steps.json` | Drives the real app; writes frames + timeline for `<div class="fx-demo">` |
| `record-cli.mjs --steps steps.json` | Runs real commands; writes a transcript for `<div class="fx-terminal">` |
| `timing.mjs plan.md` | Minimum hold per beat from the words; snaps to bpm |
| `check.mjs index.html` | Automated review (readability, claims, jargon, placeholders) |
| `scan-secrets.mjs <path>` | Finds keys, tokens, emails in assets and transcripts |
| `render.mjs index.html` | MP4 + poster; `--preview`, `--stills`, `--format`, `--no-audio` |
| `audio.mjs` | Music + SFX engine (render calls it; usable alone) |
| `tts.mjs narration.json` | Optional local narration (macOS `say`, Piper or espeak-ng) |
