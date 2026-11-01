<h1 align="center">potato-me 🥔</h1>

<p align="center"><strong>Build a potato. Become the potato.</strong></p>

<p align="center">
  <a href="https://github.com/WaylandP/potato-me/actions/workflows/ci.yml"><img src="https://github.com/WaylandP/potato-me/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status on main"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933.svg" alt="Node.js 20 or newer for local tools">
  <img src="https://img.shields.io/badge/runtime_dependencies-0-brightgreen.svg" alt="Zero runtime dependencies">
</p>

Make a potato avatar for GitHub, Slack or anywhere that needs a profile picture. Choose a shape, an expression, accessories and a hand gesture, then download a **512 × 512 or 1024 × 1024 PNG**. The editor combines **164 transparent PNG assets** in your browser, with no account, build step or server-side rendering.

<p align="center"><img src="docs/completion-preview.png" alt="Eight avatars assembled by potato-me, showing all four body shapes, expressive faces, laptop stickers, boba, a trophy, pizza, a controller, a donut, a plant and an editable sign, with different hand gestures" width="1000"></p>

These examples come from the app's compositor. The artwork was generated with ChatGPT image generation in a consistent 3D-rendered style; the project does not include 3D models.

## Run it locally

Install **Node.js 20 or newer**, then:

```bash
git clone https://github.com/WaylandP/potato-me.git
cd potato-me
npm run dev
```

Open **<http://localhost:5173>**. There is no `npm install` step for running the app or its Node tests. The included server serves the repository as static files; any HTTP static server can do the same. Opening `index.html` directly with `file://` will not work because the app uses ES modules.

## Make it yours

| Control | Included choices |
| --- | --- |
| **Body** | 4 shapes: Classic, Lumpy, Round and Long · 9 skins, from Russet and Yukon gold to Purple, Ghost and Zombie |
| **Face** | 10 one-click vibes · 14 eyes · 7 eyebrow styles plus no brows · 12 mouths · blush or freckles · 5 facial-hair styles |
| **Hat** | 19 hats plus no hat · 12 color choices for 15 recolorable hats · up to 3 characters on caps, beanies and headbands |
| **Holding** | 14 objects plus an empty hand · sign text up to 10 characters · 26 laptop stickers, with up to 6 selected at once |
| **Free hand** | 11 poses: chill, wave, shaka, thumbs up, peace, point, rock on, OK, fist up, salute and flex |
| **Accessories** | 6 eyewear styles · 6 neckwear styles · headphones, earbuds, band-aid, earring or flower |
| **Background** | 14 colors · 12 patterns, including solid and a studio spotlight |

1. Pick a vibe or use **Surprise me**, then adjust the details in the five editor tabs.
2. Choose the laptop to add stickers, the sign to write a message, or a cap, beanie or headband to add initials. Text is uppercased and limited to the supported characters.
3. Check the circular crop guide before downloading. Exports are square PNGs; the circle helps you preview an avatar crop.
4. Copy the share link to save or share the same choices. The avatar state lives in the URL fragment, including custom text. A localhost link requires a local copy of the app; use a hosted instance for links others can open directly.

<p align="center"><img src="docs/screenshot.png" alt="The potato-me editor with a live avatar preview and Body, Face, Hat, Gear and Background tabs" width="860"></p>

## Privacy and storage

Avatar composition and PNG export happen in your browser. The app has no accounts, upload endpoint, database or bundled analytics. Share links contain your chosen options and text, so anyone with the link can recreate that potato.

The interface currently requests the Fredoka font from **Google Fonts**. Self-hosting the font is tracked in the [roadmap](ROADMAP.md); this is not a fully offline distribution.

## Included artwork and verification

All **164 planned assets** and their thumbnails are included. The final 26 additions complete the raised eyebrows, held items, free-hand poses and laptop stickers. The sign's lettering is drawn by the app, and protected prop regions preserve food, gold, wood and clay colors when the potato's skin changes.

The November 1, 2026 completion checks covered:

- **32 passing Node tests**, including asset inventory, fitting data, URL state and missing-part fallback.
- **312 rendered and exported combinations**: 26 new options × 4 body shapes × 3 skins.
- Desktop (1280 px) and phone (390 px), in light and dark mode, including keyboard selection, text editing and downloads.
- A largest measured 512 px export of **441,284 bytes**, below 1 MB for the tested combinations. File size varies with the avatar.

See the [completion record](docs/ASSET_COMPLETION.md) for scope and limitations. These are local validation results; the [roadmap](ROADMAP.md) tracks deployment verification separately.

## Development

```bash
npm test          # Node's built-in test runner; no install required
npm run dev       # Static server on port 5173
```

Image maintenance and screenshot tools use **Playwright with Chromium**. Install them locally without changing the project's dependency files:

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium

npm run assets    # Rebuild 256 px thumbnails and src/assets.js from the manifest
npm run hero      # Rebuild docs/hero.png and docs/og.png from the app
npm run shot -- preview.png '#item=sign&sign=SHIP%20IT&gesture=thumbsUp'
```

Playwright is an optional development tool, not an application dependency. Commit generated thumbnails and the asset index when adding or replacing artwork.

### Repository map

| Path | Purpose |
| --- | --- |
| [index.html](index.html) / [src/main.js](src/main.js) | Editor page and UI behavior |
| [fit.html](fit.html) | Preview and adjust part placement on each body shape |
| [assets/parts/](assets/parts/) | 164 transparent, 1024 × 1024 PNG assets |
| [assets/thumbs/](assets/thumbs/) | Generated 256 × 256 thumbnails |
| [assets/manifest.json](assets/manifest.json) / [src/assets.js](src/assets.js) | Asset inventory and generated runtime index |
| [src/fit-data.js](src/fit-data.js) | Placement transforms, color masks, protected regions and text placement |
| [src/raster.js](src/raster.js) | Canvas composition, recoloring, stickers, lettering and PNG export |
| [src/options.js](src/options.js) / [src/state.js](src/state.js) | Choices, presets, validation, URL encoding and legacy links |
| [src/parts/](src/parts/) / [src/compose.js](src/compose.js) | SVG backgrounds, fallback stickers and the legacy pure SVG compositor |
| [scripts/](scripts/) / [test/](test/) | Local tools and Node tests |

### Adding or fitting a part

Use the [art prompts](docs/IMAGE_PROMPTS.md) and [contributor guide](CONTRIBUTING.md). Save each part as a 1024 × 1024 transparent PNG on the shared canvas, register its stable option key and manifest entry, then run `npm run assets`. Fit it with `fit.html` and `src/fit-data.js`, and check all four shapes and at least three skins before committing.

The renderer stacks layers in manifest order and applies per-shape transforms. Color masks change supported materials without shifting the entire image; `FIT.skinProtect` preserves held objects while their hands follow the skin color. Stickers are projected onto the laptop lid, and initials and sign text are drawn at render time. The [exact completion prompts](docs/ASSET_COMPLETION_PROMPTS.json) document the newest artwork.

Keep option keys compatible with existing share links. Do not hand-edit generated thumbnails or `src/assets.js`. [CLAUDE.md](CLAUDE.md) contains additional repository guidance for coding assistants.

## Hosting

Serve the repository root on a static host over HTTP or HTTPS. There is **no build command**, and the output/publish directory is **`.`**. Include `assets/` and `src/` (including `src/styles.css`) alongside `index.html`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/WaylandP/potato-me)

A verified public deployment URL has not yet been recorded here. Deployment and live-site checks remain on the [roadmap](ROADMAP.md).

## Contributing and license

Bug reports are easier to reproduce with the avatar's share link. Open an [issue](https://github.com/WaylandP/potato-me/issues) or follow [CONTRIBUTING.md](CONTRIBUTING.md) for artwork and code changes.

[MIT](LICENSE). The included AI-generated artwork is distributed under the same project license. Make all the potatoes.
