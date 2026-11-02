# Plain language

For Explain, Use cases and Setup. The viewer has no tech background, and there's no narrator to rescue a confusing word: the screen is all they get.

## The rules

1. **Say what it does for the person, not what it is inside.** "It keeps your notes in sync on your phone and laptop", not "real-time CRDT sync".
2. **A technical word appears only if the viewer will need it later** (they'll see it on a button, in an error, in the Setup steps). Then it gets an everyday explanation the first time, on the same screen or the one before. Otherwise, replace it.
3. **One analogy per idea, and keep it true.** An analogy that implies something false ("it's like a safe" for something that isn't secure) is a lie.
4. **Short words, short lines.** ≤7 words per line, prefer 4–5. Active voice. "You", not "users".
5. **Numbers only when real**, and in human units: "about 15 minutes", "$5 a month", not "~900 s", "0.005/1k tokens".
6. **No hype words.** seamless, powerful, robust, leverage, revolutionary, effortless, cutting-edge, next-gen, supercharge. They mean nothing to an outsider and sound like an ad.

`scripts/check.mjs` flags words from `scripts/lib/jargon.json` in visible text unless the element is marked `data-explained` (meaning: this word is explained on this or the previous screen — and `outsider.md` agrees).

## Replace, don't explain, when you can

| Instead of | Say |
|---|---|
| app / web app / platform | "a website", "an app on your phone" — whichever it really is |
| deploy / host | "put it online", "make it live on the internet" |
| self-hosted / local-first | "runs on your own computer" |
| open source | "free, and anyone can see how it's made" |
| sign up / authenticate / log in via OAuth | "make an account", "sign in with Google" |
| dashboard | "a page that shows everything at a glance" |
| sync | "stays the same on all your devices" |
| upload | "add your files" |
| integrate with X | "works with X" |
| notification / webhook | "it tells you when…" |
| install dependencies | "download the parts it needs" |
| run the server | "start it up" |
| repo / repository | "the project's page on GitHub" (only in Setup, when they must visit it) |
| CLI / command-line tool | "a tool you use by typing instructions" |
| AI model / LLM | "the AI" |
| prompt | "what you ask it" |
| query | "a question", "a search" |
| config | "settings" |
| bug | "a mistake in the app" |
| scalable | (cut it) |

## Analogy library

Use when a concept must appear. Each line: concept ≈ analogy — what the analogy gets right. Check fit: if the product's version differs from the analogy in a way the viewer would care about, pick another or add a qualifier.

**Storage and data**
- **Cache** ≈ keeping milk in your fridge instead of going to the shop each time — fast because it's close, but it can go stale.
- **Database** ≈ a filing cabinet the app can search in a blink.
- **Schema** ≈ the labelled columns of a spreadsheet — every row must fit them.
- **Backup** ≈ a photocopy kept in another building.
- **Cloud storage** ≈ a storage unit you rent across town; you can get to it from anywhere, someone else looks after the building.
- **Index / search index** ≈ the index at the back of a book.
- **Sync** ≈ a shared shopping list that updates on everyone's phone.
- **Version history / git** ≈ "track changes", but for a whole project, with every past version kept.

**The internet**
- **Server** ≈ a computer that's always on, waiting to answer requests — like a shop that never closes.
- **Hosting** ≈ renting a shop front on a busy street so people can find you.
- **Domain** ≈ the street address of a website.
- **Browser** ≈ the window you use to visit websites (Chrome, Safari).
- **Localhost** ≈ a shop that's only open inside your own house — only you can visit.
- **API** ≈ a waiter: you ask for something from the menu, the kitchen makes it, the waiter brings it back. You never go in the kitchen.
- **Webhook** ≈ a doorbell — instead of checking the door every minute, you're told when someone arrives.
- **Bandwidth** ≈ the width of a road; wider means more traffic at once.
- **Latency** ≈ the delay on a long-distance phone call.

**Security and accounts**
- **API key** ≈ a password for an app. Keep it private.
- **Token** ≈ a wristband at a festival — proves you've already been let in.
- **Encryption** ≈ a letter written in a code only the recipient can read.
- **Two-factor** ≈ needing your key *and* a code texted to your phone.
- **Permissions** ≈ which rooms a house key opens.

**Building software**
- **Code** ≈ a recipe the computer follows exactly.
- **Open source** ≈ a recipe anyone can read, use and improve.
- **Install** ≈ moving into a new flat: bring the furniture (the parts it needs), plug things in, then you can live there.
- **Dependencies** ≈ the ingredients a recipe needs from the shop.
- **Terminal** ≈ texting your computer instructions instead of clicking.
- **Environment variables / .env** ≈ a sticky note of private settings the app reads when it starts.
- **Update / upgrade** ≈ your phone's app updates — new fixes, same app.
- **Bug** ≈ a typo in the recipe.
- **Framework** ≈ a flat-pack kit: the frame comes ready, you add the parts that make it yours.
- **Open-source license** ≈ the rules on the recipe card about how you may share it.

**AI**
- **AI model** ≈ a very well-read assistant that has studied lots of text, but can still get things wrong.
- **Prompt** ≈ the instructions you give that assistant.
- **Training** ≈ how the assistant learned — by reading a huge library.
- **Tokens (AI billing)** ≈ paying per word, like an old telegram.
- **Embedding / vector search** ≈ organising a library by what books are *about*, not their titles — so "puppy" finds "dog".
- **Agent** ≈ an assistant that can do tasks step by step, not just answer.

**Running things**
- **Background process / daemon** ≈ the fridge: it just keeps running, you don't think about it.
- **Container / Docker** ≈ a shipping container: everything the app needs, packed so it works the same anywhere.
- **Cron / scheduled job** ≈ an alarm clock for the computer.
- **Logs** ≈ a ship's logbook — a running diary of what happened.
- **Port** ≈ a numbered door on your computer; each app listens at its own door.

When you invent a new analogy, keep it physical and domestic (kitchens, shops, post, houses, keys), and run it past the outsider read.
