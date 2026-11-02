# Capturing footage, by product kind

The maker states the kind; this decides how you get real footage. Prefer recording the real thing over anything else. Use demo/seed data, never real user data.

## Web app (best supported)

1. Get it running locally (README dev command) or use the maker's staging/preview URL. Prefer a local instance with seed data.
2. `node SKILL_DIR/scripts/capture.mjs <url> --out <dir>/assets` → `desktop.png`, `mobile.png`, `brand.json`.
3. Write a steps file per shot and record:

```json
{
  "name": "new-order",
  "viewport": [1440, 900],
  "steps": [
    {"do": "goto", "url": "http://localhost:3000/orders"},
    {"do": "hold", "s": 0.8},
    {"do": "click", "selector": "button:has-text('New order')"},
    {"do": "type", "selector": "#customer", "text": "Lena — 2 sourdough"},
    {"do": "zoom", "selector": "#order-form", "scale": 1.6},
    {"do": "click", "text": "Save"},
    {"do": "wait", "for": ".toast"},
    {"do": "hold", "s": 1.2},
    {"do": "unzoom"}
  ]
}
```

```
node SKILL_DIR/scripts/record.mjs --steps steps/new-order.json --out <dir>/assets/rec [--mask "#email,.api-key"]
```

Step verbs: `goto`, `click` (selector or text), `type` (selector, text; real keystrokes, a frame every few characters), `press` (key), `hover`, `scroll` (y or selector), `select` (selector, value), `wait` (ms or `for` selector — not shown in the video), `hold` (s — shown, nothing happens), `zoom` (selector, scale — camera move), `unzoom`, `frames` (n, every ms — for capturing an in-app animation), `eval` (js — only for seeding demo state, never to fake UI).

Output: `assets/rec/<name>/` with frames (`0001.jpg`…), `timeline.js` and `log.json`. Add the printed `<script src=…/timeline.js>` tag to the composition head and place it with `<div class="fx-demo" data-rec="<name>">`. The runtime adds the animated cursor, click ripples, typing frames and camera moves. Every page's text is scanned for secrets during recording; `--mask` blurs elements before each frame.

Auth: if the shot needs a signed-in state, use a local dev instance with a seeded demo user (credentials from the project's seed/fixture files), or ask the maker for a saved storage state (`--storage state.json`). Never type the maker's real password.

## Command-line tool

Real commands, real output, in a faithful recreated terminal (crisp text that reads at any size, unlike a screen recording).

```json
{
  "name": "quickstart",
  "cwd": "/tmp/flex-demo",
  "title": "Terminal",
  "steps": [
    {"run": "npx create-thing my-site"},
    {"run": "cd my-site"},
    {"run": "npm run build", "show": "tail:12"}
  ]
}
```

```
node SKILL_DIR/scripts/record-cli.mjs --steps steps/quickstart.json --out <dir>/assets/rec
```

It runs each command for real in a shell, records stdout/stderr with real timings, scans for secrets, and writes `timeline.js` for `<div class="fx-terminal" data-rec="quickstart">`. Long waits are compressed in the timeline but the real duration is kept (`log.json`) and can be shown as a "this took about 2 minutes" note (`data-show-waits`). `show: "tail:12"` keeps only the last lines of very long output; `show: "none"` hides output; `env` sets variables (use fake values). `display` changes what's shown for a step, only to hide a value or shorten a long path — never to show a command other than the one that ran. `until` + `keep` handle servers (`{"run": "npm start", "until": "running at", "keep": true}` leaves it running for the browser steps; kill the printed pid after).

Run in a scratch folder, never in the maker's working tree, and never run anything destructive or anything that publishes. For Explain videos, don't show the terminal at all: show what the tool *produced* (record the resulting website/file in a browser).

## Desktop app

- If it's Electron or has a web UI, record that UI with `record.mjs` (point it at the dev server or the `file://` build).
- Otherwise use OS screen capture of the real app, made by the maker or with their go-ahead (`screencapture -v` on macOS, or the maker's own recording). Put the video in `assets/` and use `<video class="fx-video" src=… style="--at:.5">` — the runtime seeks it frame-accurately. Add camera moves with `data-cam` keyframes on a wrapper.
- Real screenshots + `data-cam` camera moves are the fallback; say in `plan.md` that the footage is static.

## Mobile app

- React Native / Expo web, Flutter web, PWAs: record the web build at a phone viewport (`"viewport": [390, 844], "mobile": true`) and frame it with `<div class="fx-phone">`.
- Native: the maker's simulator/device recording (`xcrun simctl io booted recordVideo`, Android `adb shell screenrecord`), used as `fx-video` inside `fx-phone`. Tap points: add `data-taps="t,x,y;…"` for touch ripples.

## Other (APIs, libraries, bots, hardware)

Show the result a person sees: the chat where the bot answers, the email that arrives, the dashboard that updates, the printed label. Record that surface. If nothing is visible, illustrate with icons and mark `mockup` in `truth.md`. A library's Launch video can show code in an editor-like card (`.fx-code`) — real code from the repo's examples, never in Explain.
