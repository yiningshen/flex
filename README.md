# /flex

An agent skill (Claude Code, Codex, OpenCode and other Agent Skills hosts) that turns **your** product into promo videos people outside tech can actually understand.

| Direction | Answers | For | Length |
|---|---|---|---|
| `launch` | Why should I care? | People who already get it | 15–25s |
| `explain` | What is this? | No tech background | 45–75s |
| `usecases` | What can I do with it? | People wondering if it's for them | 30–60s |
| `setup` | How do I get it running? | People who'd otherwise pay someone | 60–120s |

Built from real product footage (a headless browser drives your app; cursor, clicks, typing and zooms are added), original procedural music, an outsider read by a separate agent playing a non-technical viewer, and a truth ledger tying every on-screen claim to a source.

```
/flex                                   # asks direction, product kind and style — with suggestions
/flex explain
/flex usecases --for "small bakery owners"
/flex setup
/flex all
```

Output per video in `flex-output/<direction>/`: `plan.md`, `truth.md`, `outsider.md`, `index.html` (open it to scrub), `<direction>.mp4`, `poster.png`, `share.md`.

## Install

Claude Code: `/plugin marketplace add <this repo>` then `/plugin install flex`. Others: copy or symlink `skills/flex` into your agent's skills folder (`.claude/skills`, `.agents/skills`, `.opencode/skills` links are included).

First run: `node skills/flex/scripts/doctor.mjs --fix` installs Playwright, Chromium and a prebuilt FFmpeg into the skill folder. Node 18+ required. Narration is optional and uses local voices only (macOS `say`, Piper, espeak-ng).

## Principles

No jargon without an everyday explanation · no invented numbers, testimonials or features · honest effort and costs in Setup videos · no secrets in footage · original music only · no placeholder text in a final render.

MIT licensed.
