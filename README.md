<p align="center"><img src="docs/hero.png" alt="Five potato avatars: a round potato in a red beanie holding coffee, a long purple potato in a wizard hat waving, the classic potato in a backward cap with a sticker-covered laptop, a lumpy golden potato wearing a crown and shades holding a SHIP IT sign, and a sweet potato in a party hat throwing a shaka" width="860"></p>

<h1 align="center">potato-me 🥔</h1>

<p align="center"><strong>Build a potato. Become the potato.</strong></p>

<p align="center">
  <a href="https://github.com/WaylandP/potato-me/actions/workflows/ci.yml"><img src="https://github.com/WaylandP/potato-me/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/dependencies-none-brightgreen.svg" alt="No dependencies">
</p>

A tiny web app for making a potato avatar for GitHub, Slack, Google or anywhere else that wants a square profile picture. Pick a shape, a face, a hat and some gear, then download a 512 × 512 PNG.

- **No build step, no dependencies.** Plain HTML, CSS and JavaScript modules. Clone it and open it.
- **Private by design.** Everything runs in your browser. Nothing is uploaded, no accounts, no tracking.
- **Shareable.** Every potato lives in the URL, so a link *is* the potato.
- **Crop-aware.** The preview shows the circle most sites crop avatars to, so nothing important gets cut off.
- **Hand-drawn SVG.** Every part is drawn in code with soft shading and bold outlines, and it reads at 40 px as well as at 512.

<p align="center"><img src="docs/screenshot.png" alt="The potato-me editor: a live preview with the avatar crop circle on the left, and Body, Face, Hat, Gear and Background tabs on the right where every option is drawn as a mini potato" width="860"></p>

## What you can change

| Tab | Options |
| --- | --- |
| **Body** | 4 shapes (Classic, Lumpy, Round, Long) · 6 skins (Russet, Yukon gold, Red, Purple, Sweet, Ghost) |
| **Face** | 6 eyes (Smug, Dots, Happy, Wide, Wink, Sleepy) · 5 mouths (Smirk, Grin, Laugh, Flat, Oh) · blush |
| **Hat** | Backward cap, beanie, wizard, crown, hard hat, party hat, beret, or none · 7 colors |
| **Gear** | Hold a sticker-covered laptop, a coffee, or a sign with your own text; or keep a hand free to wave or throw a shaka · shades, glasses, mustache, bow tie |
| **Background** | 8 colors · solid, dots, rays, grid, confetti |

That's about 97 million combinations before you even type on the sign. **Surprise me** picks one for you.

## Run it locally

Node 20 or newer is the only requirement.

```bash
git clone https://github.com/WaylandP/potato-me.git
cd potato-me
npm run dev
```

Then open <http://localhost:5173>. `npm run dev` starts a tiny dependency-free static server (`scripts/serve.mjs`); any other static server works too (`npx serve`, VS Code Live Server, `python3 -m http.server`). Opening `index.html` straight from disk won't work because browsers block ES modules on `file://`.

```bash
npm test        # Node's built-in test runner, no installs
npm run hero    # rebuild the README banner from the renderer
```

## Deploy

It's a static site, so any static host works with no build command and `.` as the output directory.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/WaylandP/potato-me)

- **Vercel:** import the repo, leave the framework preset on **Other**, no build command, output directory `.`.
- **Netlify / Cloudflare Pages:** same settings: no build command, publish directory `.`.
- **GitHub Pages:** Settings → Pages → deploy from branch `main`, folder `/ (root)`.

## How it works

```
index.html          page shell
src/options.js      every choice the editor offers, plus the defaults
src/state.js        validate state, encode/decode the URL hash, randomize
src/compose.js      state → SVG string (pure; runs in Node for tests)
src/main.js         the editor UI
src/export.js       SVG → PNG download (browser only)
scripts/serve.mjs   dev server
scripts/hero.mjs    builds docs/hero.svg (and hero.png when Playwright is installed)
test/               node:test suites
```

`composeSVG(state)` is a pure function, so the preview, the option thumbnails, the tests and the export all use the same renderer. The art is hand-written SVG on a 512 × 512 canvas: one light source top-left, gradients inside bold ink outlines, a cast shadow under every hat, and no filters, so the PNG export looks exactly like the preview in every browser.

## Adding a new part

1. Add the option to `OPTIONS` in `src/options.js`.
2. Draw it in the matching function in `src/compose.js` (`hat()`, `eyes()`, `mouth()`, `accessory()`, …). Position it from the body's anchors (`b.top`, `b.face`, `b.armY`, `b.half`, `b.bottom`) so it fits every shape, and use `ctx.defs` for gradients so ids stay unique.
3. Run `npm test`. The suite renders every option and every body × hat × item × gesture combination and fails on broken markup or an id without the prefix.
4. Check it in the browser on all four bodies, inside the crop circle, and in the thumbnail grid.

[CONTRIBUTING.md](CONTRIBUTING.md) has the full guide and the art style checklist. [ROADMAP.md](ROADMAP.md) lists what's next, and [CLAUDE.md](CLAUDE.md) covers working on this repo with Claude Code.

## License

[MIT](LICENSE). Make all the potatoes.
