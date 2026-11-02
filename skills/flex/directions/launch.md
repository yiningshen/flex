# Launch — "Why should I care?"

**Audience:** people who already get it — developers, early adopters, the technical crowd on X, Hacker News, Product Hunt, a README header.
**Length:** 15–25 s. **Default mood:** `upbeat` (or `cinematic` for something serious, `dark` for security/infra tools). **Tempo:** 110–128 bpm.
**Template:** `templates/launch.html`.

The viewer has two seconds of patience and knows the vocabulary. The job is to make them want to try it, fast, without lying.

## Beat sheet (20 s at 120 bpm: one bar = 2 s)

| # | Beat | Time | On screen | Rules |
|---|---|---|---|---|
| 1 | **Hook** | 0–2 s | One line, ≤5 words. The pain or the promise. | Must land before 2 s. Big type. No logo yet. |
| 2 | **What it is** | 2–5 s | Name + one-line definition. | "X is a ___ that ___." Real definition, from the README. |
| 3 | **It working** | 5–14 s | 2–3 shots of the real product doing its main thing. | Recorded footage (`fx-demo` / `fx-terminal`), cursor and zoom. Cut on bar lines. One short label per shot. |
| 4 | **Proof** | 14–17 s | One true, checkable fact. | From the repo: "0 dependencies" (package.json), "1 command" (README), a benchmark *in the repo*, real star count *as of today*. Never invent one. If there's no good proof, show the strongest feature again instead. |
| 5 | **End card** | 17–20+ s | Logo, name, how to get it (`npx thing`, URL). | Hold ≥3 s. Music's final hit lands here (`data-hit`). |

Stretch to 25 s by giving beat 3 a third shot; shrink to 15 s by dropping beat 4.

## Pacing

- Cuts on the beat. Use `timing.mjs --bpm` to snap scene boundaries to bars.
- Short hard cuts (`data-transition="cut"` or `slide`, ≤0.35 s) — this is the only direction where fast is right.
- Text can be denser for this audience, but still ≤7 words per line and the read-twice hold rule.
- Technical terms are fine here (it's for people who know them). Hype words aren't: "revolutionary", "game-changing", "blazing fast" without a number. Show it instead.

## Good hooks (patterns, not copy)

- The pain in their words: "Your tests take 9 minutes." (only if the product's docs make that claim)
- The before/after in one breath: "From README to running. One command."
- The surprising thing it does: "Your database, as a spreadsheet."

## Checklist

- [ ] Hook readable by 2 s
- [ ] Real footage in beat 3, not screenshots sliding around
- [ ] The proof point is in `truth.md` with a source, and is current
- [ ] End card shows exactly how to get it (command or URL that works)
- [ ] 15–25 s total
