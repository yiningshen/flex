# Setup — "How do I get it running?"

**Audience:** someone who'd otherwise pay a person to install it for them. They can follow instructions; what stops them is fear — of breaking something, of hidden costs, of not knowing if it worked.
**Length:** 60–120 s. **Default mood:** `chill`, low and steady. **Tempo:** 76–90 bpm.
**Template:** `templates/setup.html`.

The barrier is **confidence, not information**. The README already has the steps. This video adds what the README leaves out: how long it takes, what it costs, what each scary thing is, and what "it worked" looks like.

## Accuracy

- **Default: record a real install.** Follow the product's own instructions on this machine, from a clean state (fresh folder, fresh clone), with `record-cli.mjs` for terminal steps and `record.mjs` for browser steps. The recording is the source for every step, every timing, and the effort card.
- **`--idea` mode:** when the maker only wants to show the idea, steps may be shown from *verified* instructions (README/docs you've read and that match the code) instead of a recording. Mark each such step `source: instructions` in `truth.md` and show a small "steps from the docs" note on screen.
- Steps you can't do yourself (signing up for a third-party account, entering payment details, anything needing the maker's credentials) are shown from the provider's public instructions and marked as such. Never create accounts or enter credentials while recording.
- If the install fails, stop and tell the maker. A setup video for steps that don't work is worse than none.

## The effort card (on by default)

The first screen. Everything on it comes from the install run or the docs, and is in `truth.md`.

| Row | What to show | Where it comes from |
|---|---|---|
| **You'll need** | Devices/OS ("A Mac or Windows computer", "Works on any phone browser") | README, `engines`, the install run |
| **Accounts** | Every account they must create ("A free GitHub account", "An OpenAI account") | Install run, env vars the app requires (`.env.example`) |
| **Costs** | Up front and monthly, honestly. "Free" only if it's really free. Paid APIs: "about $X/month for light use — check current price" with the source. | Pricing pages, the maker |
| **Time** | Measured from the recording, rounded up ("About 15 minutes"), plus waiting time if any | `record-cli.mjs` timings |
| **Upkeep** | What maintenance looks like ("Update once a month with one command", "Your computer must stay on for it to work") | Docs, how it runs |

Fill `assets/effort.json` as you go (see `templates/effort.example.json`), then copy into the card. Unknown values say "Ask the maker" in the plan, and are resolved before rendering — never guessed.

## Beat sheet (90 s, 4 steps)

| # | Beat | Time | On screen | Rules |
|---|---|---|---|---|
| 1 | **Effort card** | 0–10 s | "What you'll need" — the five rows. | Hold long enough to read every row (timing.mjs). |
| 2 | **Finish line first** | 10–15 s | "When you're done, you'll see this:" + the real success screen. | Seeing the goal first lowers fear. |
| 3–N | **Steps** | ~15 s each | Step number + plain title ("Step 2 · Download it"), the real recording, one **scary-moment** note where needed, then a **checkpoint**: "You should now see…" + a zoom on that exact thing. | One action per step. Explain unfamiliar windows the first time they appear (see below). Long waits shown honestly ("This part takes about 2 minutes. That's normal."). |
| N+1 | **Finish line** | 8 s | The success screen again, now reached. "That's it. It's running." | Real recording of the final state. |
| N+2 | **If something goes wrong / upkeep** | 6 s | The one most likely problem and its fix (from docs/issues), and the upkeep line. | Only real, documented fixes. |
| N+3 | **End card** | 4 s | Name, where the written instructions live. | |

More than 6 steps → group them ("Step 2 · Download it" can contain clone + install) or make it two videos.

## Scary moments (explain the first time each appears)

| Moment | Plain explanation (adapt) |
|---|---|
| Terminal window | "This window is a terminal. You type instructions; the computer does them. You can't break anything by typing here." |
| Wall of text scrolling by | "Lots of text will scroll past. That's normal — it's just reporting what it's doing." |
| Warnings in yellow | "Yellow warnings are normal here. You only need to worry about red errors." (only if true for this install) |
| Password prompt that shows nothing | "When you type your password, nothing appears. That's on purpose — keep typing and press Enter." |
| API key | "A key is like a password for an app. Keep it private; don't share it or show it on screen." |
| `.env` file | "This is a settings file. You'll paste your key into it, once." |
| Browser "not secure" / localhost | "'localhost' means the app is running on your own computer, only you can see it." |
| Admin/permission prompt | Say exactly what it's asking and why — and only if the docs require it. |

## Pacing

- Calm and steady; soft transitions.
- Commands on screen are big enough to read and copy (show each typed command alone on a line, hold ≥2 s).
- Real time is compressed in the video, but the effort card and the wait notes tell the truth about real time.

## Checklist

- [ ] Effort card first, every row sourced, costs include monthly
- [ ] Steps recorded from a real install (or `--idea` with "steps from the docs" note)
- [ ] Every unfamiliar window explained the first time
- [ ] Every step ends with a checkpoint the viewer can compare against
- [ ] A clear finish line, shown at the start and the end
- [ ] No secrets visible (keys masked, scan run)
- [ ] 60–120 s
