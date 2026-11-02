#!/usr/bin/env bash
# CI smoke test: doctor, check, preview, 16s render with audio.
set -euo pipefail
cd "$(dirname "$0")/.."
S=skills/flex/scripts
node $S/doctor.mjs
node $S/check.mjs tests/fixture/index.html
node $S/render.mjs tests/fixture/index.html --preview
node $S/render.mjs tests/fixture/index.html --out tests/fixture/out.mp4
test -s tests/fixture/out.mp4 && test -s tests/fixture/preview.png && test -s tests/fixture/poster.png
echo "smoke ok"
