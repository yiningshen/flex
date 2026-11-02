# Explain — "What is this?"

**Audience:** someone with no tech background. Think of the maker's aunt, a shop owner, a teacher. Smart, busy, never heard of the product, and doesn't know what a server, an API or a repo is.
**Length:** 45–75 s. **Default mood:** `chill` (or `playful`). **Tempo:** 80–96 bpm.
**Template:** `templates/explain.html`.

The viewer should finish able to say, in their own words, what the thing does and whether it might help them. Nothing else matters as much.

## Beat sheet (60 s)

| # | Beat | Time | On screen | Rules |
|---|---|---|---|---|
| 1 | **Everyday problem** | 0–8 s | 2 short screens describing a situation the viewer has lived. | No product yet. Concrete: "You took 300 photos on holiday. Finding one takes forever." Simple illustration/icons. |
| 2 | **The idea, in one analogy** | 8–16 s | "{Product} is like ___." + one supporting line. | One analogy only, from everyday life (`references/plain-language.md`). The analogy must be *accurate* about what the product does. |
| 3 | **How it works: 3 steps** | 16–40 s | Three numbered steps, ~8 s each. Each = short line + real product screen + icon. | Steps from the user's side ("You drop your photos in", "It sorts them by who's in them", "You search 'grandma'"), not the system's ("It indexes embeddings"). Real screens, zoomed into the part that matters. No code, no terminals. |
| 4 | **What you end up with** | 40–52 s | The real result screen, plus one line on what changed for the viewer. | The outcome in human terms. Real footage. |
| 5 | **Where to get it** | 52–60 s | Name, logo, where to find it, and honestly what it costs ("Free", "Free, runs on your computer", "$5/month"). | If setup is non-trivial, say so in plain words and point to the Setup video. |

## Pacing

- Slow. Longer holds than the minimum: aim for 1.5× the read-twice time.
- One idea per screen. ≤2 lines, ≤7 words per line, and prefer 4–5.
- Soft transitions (`fade`, `rise`), 0.5–0.8 s.
- Leave visual breathing room: the step number, the line, one screen. Not three things competing.

## Rules

- **Every technical idea gets an everyday analogy, or it doesn't appear.** If a step only makes sense with a technical word, rewrite the step from the user's side. Use the analogy library; invent new analogies with care and check them in the outsider read.
- **No code, no terminals, no file trees, no config.** If the product is a CLI, show its *results* (the file it made, the website it published) rather than the terminal, or use illustrated steps.
- Visuals: simple icons (`<i class="ic" data-ic="…">`), simple shapes, and the product's real screens. No stock-photo people, no AI-generated faces.
- The outsider read (Step 3) is required and must come back with no unexplained jargon.

## Example transformation

Technical: "Hearth is a self-hosted RSS aggregator with full-text search."
Explain script:
1. "Your favourite sites post new things every day." / "Checking them all takes ages."
2. "Hearth is like a newspaper made only of what you follow."
3. Step 1 "Tell it which sites you like." · Step 2 "It collects every new post for you." · Step 3 "Read them all in one place."
4. "One page. Everything you care about. Nothing you don't."
5. "Hearth. Free. Runs on your own computer."

(Notice: "RSS", "self-hosted", "aggregator", "full-text search" all vanished; "runs on your own computer" explains self-hosted.)

## Checklist

- [ ] Opens with a life situation, not the product
- [ ] Exactly one analogy, and it's true to what the product does
- [ ] Three steps from the user's side, each with a real screen
- [ ] Outsider read clean (`outsider.md`)
- [ ] Cost stated honestly on the last screen
- [ ] 45–75 s total
