# Outsider read

Run this as a **separate agent** that sees only the on-screen script. It must not see the repo, the README, the plan notes or this skill's other files — the whole point is that it knows nothing the viewer wouldn't.

## What to give the subagent

1. The prompt below, verbatim.
2. The target viewer, from the maker's answer ("a small bakery owner who's never used anything but Instagram").
3. The script: each screen's text in order, with a one-line description of what's shown (`[screen: the app's order list, zoomed on a new order]`). Don't add explanations the viewer wouldn't see.

## Prompt for the subagent

> You are watching a short video with the sound off. You are: {TARGET VIEWER}. You have no technical background: you use a phone and a laptop for everyday things, and you've never written code, used a terminal, or set up software beyond app stores.
>
> Below is everything that appears on screen, in order. Read it as that person would, once, at normal speed.
>
> Report, as a list:
> 1. **Words I don't know** — every word or phrase you wouldn't understand or would only half-understand. Quote it and say what you'd guess it means.
> 2. **Steps I couldn't follow** — anything where you wouldn't know what to do, or where you'd be nervous doing it.
> 3. **Ideas that didn't land** — places where you understood the words but not the point, or the connection to the screen before.
> 4. **Questions I'd still have** — what you'd want to ask before trying it (cost? time? is it safe? is it for me?).
> 5. **In my own words** — one or two sentences: what is this, and is it for me?
>
> Be strict. Flag anything you're unsure about. Don't be polite about it; a flag costs nothing, a confused viewer costs a lot. Don't suggest how to fix things; just say what you didn't get.
>
> {SCRIPT}

## What to do with the result

Write `outsider.md`:

```
## Round 1
Viewer: ...
| Flag | Kind | Fix |
|---|---|---|
| "localhost" (S5) | word | replaced: "running on your own computer" |
| Step 3 — didn't know where to paste | step | added zoom on the box + "paste it here" |
In their words: "..."
## Round 2
(no flags)
```

Fix every flag: replace the word, add an analogy (`plain-language.md`), show the thing, or cut it. If a flag is wrong (the viewer misread something that's clear on screen), note why you're keeping it. Then **run a fresh subagent** on the revised script — not the same one, which now knows the answers. Done when a round comes back with no words/steps flags and their "in my own words" matches what the product does.

If the "in my own words" answer is wrong, that's the most important finding: the whole script is misleading, not just one word.

For Launch videos the read is optional; if done, the viewer is "a developer who hasn't heard of this project".
