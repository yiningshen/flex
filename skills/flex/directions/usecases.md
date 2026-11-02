# Use cases — "What can I do with it?"

**Audience:** people wondering whether it's for them. They half-understand what it is; they need to see someone like themselves using it.
**Length:** 30–60 s. **Default mood:** `playful` or `upbeat` at a moderate tempo. **Tempo:** 96–112 bpm.
**Template:** `templates/usecases.html`.

## Where the personas come from

From the maker's answer to **"Who do you wish was using this?"** (or `--for "..."`). Turn that answer into 2–3 specific people with a specific task. "A busy professional" is not a persona. "Ana runs a two-person bakery and takes orders by Instagram DM" is.

Personas are fictional and framed as such ("Imagine…", "Say you're…"). Don't give them a photo or a fake quote. A first name and a one-line situation are enough; an icon or simple illustration can stand in for them.

**Every capability shown in a story must be something the product actually does**, recorded from the real product. If the persona's task needs a feature the product doesn't have, change the task, not the product. Note each in `truth.md`.

## Beat sheet (45 s, 3 stories)

| # | Beat | Time | On screen | Rules |
|---|---|---|---|---|
| 0 | **Framing** | 0–3 s | "Who is {Product} for?" or "Three ways people use {Product}." | Short. |
| 1–3 | **Story** ×3 | ~13 s each | **Who** (2 s): "Imagine Ana. She runs a small bakery." → **Before** (3 s): the task as it is now, one line. → **With {Product}** (6 s): real footage of *her* task being done, cursor + zoom on the key moment, one label. → **After** (2 s): the result, one line. | Different task in each story; ideally different kind of person. Use the persona's words for the task ("take orders", not "manage form submissions"). |
| 4 | **End card** | last 3–4 s | Name, where to get it, optionally "Which one are you?" | |

For 30 s use 2 stories; for 60 s, 3 stories with longer footage.

## Recording the footage

Each story gets its own recording (`record.mjs` with a steps file per story), using **demo data that fits the persona** — Ana's product list should be cakes. Seed it into the real app (a local dev instance with fake data is ideal). Never use the maker's real customer data. Mask anything personal.

Zoom into the moment that answers "so what?": the order appearing, the chart filling in, the email being sent.

## Pacing

- Each story should feel like its own little film: who → problem → product → result.
- Separate stories with a clear transition (`slide` or a colour wipe) and a change of accent colour or persona icon.
- Jargon rules from `references/plain-language.md` apply.

## Checklist

- [ ] Personas trace to the maker's answer (quote it in `plan.md`)
- [ ] Each story shows real recorded footage with cursor and zoom, not static screenshots
- [ ] Every capability shown is in `truth.md` with a source
- [ ] Persona data is fake and fitting; no personal data visible
- [ ] Outsider read clean
- [ ] 30–60 s
