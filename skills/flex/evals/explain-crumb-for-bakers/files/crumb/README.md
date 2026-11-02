# Crumb

A local-first order board for small bakeries. Zero dependencies — a single Node server serves a vanilla JS SPA; all data lives in the browser's localStorage.

## Features

- **Add orders** — customer, item, quantity, pickup day and time.
- **Board** — three columns: *To bake*, *Ready*, *Picked up*. Click an order's button to move it along.
- **Today** — filter the board to today's pickups.
- **Bake list** — totals per item for everything still to bake, so you know how many loaves to make.
- Data never leaves the device (localStorage). No accounts, no cloud.

## Requirements

- Node.js 18 or newer
- Any modern browser

## Install & run

```bash
git clone https://github.com/crumb-demo/crumb.git
cd crumb
npm install   # nothing to install, but harmless
npm start     # serves on http://localhost:4173
```

Open http://localhost:4173. Click **Load demo orders** to try it with sample data.

## Updating

`git pull` then restart `npm start`.

## License

MIT
