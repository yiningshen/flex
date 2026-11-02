# Styles

A style sets typography, surfaces, motion feel and default music mood. It sits *under* the product's brand: `brand.json` colors and fonts override the preset's. Each preset is a CSS file in `runtime/styles/`; `new.mjs --style <name>` links it as `style.css`.

Pick the preset closest to how the product already looks. If the maker describes their own style, translate it into the same knobs (below) and write a custom `style.css` — start from the nearest preset.

| Preset | Feel | Type | Surfaces | Motion | Mood |
|---|---|---|---|---|---|
| `crisp` | Precise, dark, software-native (dev tools, infra) | Tight sans, large, weight contrast | Near-black, hairline borders, one accent | Quick, short distances, `ease-out` | upbeat / dark |
| `paper` | Warm, calm, editorial (notes, writing, personal tools) | Serif headlines, sans body | Off-white paper, soft shadows | Slow fades and rises | chill |
| `studio` | Big-type product reveal | Huge sans, very few words | Pure white or pure black, product floating | Slow push-ins, long holds | cinematic |
| `bright` | Friendly, colourful, consumer | Rounded sans | Solid brand-colour fields, big rounded cards | Bouncy pops, slides | playful / upbeat |
| `sketch` | Playful, hand-made | Marker-ish headlines (system fallback), sans body | Paper with wobbly outlines | Wiggles, draw-ons | playful |

Knobs for a free-form style ("like Apple's ads"):
- **Type**: family, weight contrast, size scale (`--fs-hero` … `--fs-small`), letter-spacing.
- **Colour**: `--bg`, `--ink`, `--muted`, `--accent`, `--card`, `--line`.
- **Surface**: radius `--r`, shadow `--shadow`, border treatment.
- **Motion**: `--ease`, default `--dur`, which presets to favour (`fx-rise` vs `fx-pop`), transition type.
- **Music**: `data-mood` + `data-bpm`.

Don't name or imitate another company's trademarks in the video ("like Apple's ads" → big type, white space, slow reveals; never their logo, fonts they license, or product shots).

Avoid the generic AI look: purple/indigo gradients, glassmorphism, glowing blobs, emoji icons, everything centered in identical cards. One accent colour, real screens, confident type.
