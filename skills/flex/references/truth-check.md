# Truth check

Every on-screen claim has a source, written down before building. This is what lets the maker post the video without worrying it says something false about their own product.

## What counts as a claim

Anything a viewer could believe because they saw it: what the product does, how it does it, any number, any cost, any time estimate, platform support, a setup step, a "works with X", a proof point, the result shown in a demo. Also persona tasks in Use cases (the *task* is a claim the product can do it; the persona is fiction).

Not claims: framing lines ("Imagine a Tuesday morning."), questions ("Who is this for?"), the product name, calls to action ("Try it today"). Mark these `data-claim="framing"`.

## Ledger format (`truth.md`)

```markdown
# Truth ledger — <Product> / <direction>

| ID | On screen | Scene | Source type | Source | Checked |
|---|---|---|---|---|---|
| C1 | "Turns a folder of photos into a searchable album" | s2 | docs | README.md:12 "Index any photo folder…" | ✅ |
| C2 | "Free" | s6 | code | LICENSE (MIT); no paid tier in code or site | ✅ |
| C3 | "About 15 minutes" | effort | install-run | assets/rec/install/log.json total 11m40s, rounded up | ✅ |
| C4 | "OpenAI account, ~$1/month light use" | effort | external | openai.com/pricing (26 Oct 2026) + maker confirmed | ⚠️ maker to confirm |
| C5 | "Search 'beach' finds beach photos" | s4 | recording | assets/rec/search/ frames 3–9 | ✅ |
```

**Source types**
- `code` — file:line in the repo that implements it.
- `docs` — README/docs file:line, or a URL of the product's own docs.
- `recording` — a recording folder (and frames) where it visibly happens.
- `install-run` — the recorded install log (`record-cli.mjs` output).
- `instructions` — verified written instructions, used in `--idea` Setup mode; note what you verified against.
- `external` — a third party's page (pricing, platform requirements), with the date you read it.
- `maker` — the maker told you; quote them. Use sparingly and only for things only they can know.
- `mockup` — shown as an illustration because it couldn't be recorded; say why.

**Checked**: ✅ verified · ⚠️ needs maker confirmation (list these in your final message) · ❌ couldn't verify → **remove it from the video**.

## Rules

- Every visible text element in the composition has `data-claim="C#"` or `data-claim="framing"`. `check.mjs` fails on missing IDs or IDs not in `truth.md`.
- Numbers must be traceable exactly. Rounding is fine if it's in the honest direction (time rounds *up*, savings round *down*).
- "Fast", "easy", "simple" are claims. Back them with a recording or cut them.
- Counts that change (stars, downloads, users) need a date and should be avoided unless the maker asks.
- Before the final render, re-read the ledger against the latest composition: text drifts during review.
