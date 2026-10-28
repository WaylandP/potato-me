# Contributing to potato-me

Thanks for wanting to add to the potato. This is a small, dependency-free project, so the whole workflow is:

```bash
git clone https://github.com/WaylandP/potato-me.git
cd potato-me
npm run dev     # http://localhost:5173
npm test        # Node's built-in test runner
```

Node 20 or newer is the only requirement.

## Where things live

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

`composeSVG(state)` is a pure function: the preview, the option thumbnails, the tests and the export all use the same renderer. Keep it that way. No DOM, no globals, no randomness inside it.

## Drawing a new part

Every part is a function in `src/compose.js` that returns an SVG string. The canvas is 512 × 512 and the potato sits inside the circle GitHub crops avatars to.

1. **Register it.** Add the key and label to the right group in `OPTIONS` (`src/options.js`). Keys end up in share links, so pick a name you can live with.
2. **Draw it.** Add a `case` to the matching function: `hat()`, `eyes()`, `mouth()`, `accessory()`, `background()` or `itemAndArms()`. Position everything from the body anchors (`b.top`, `b.face`, `b.armY`, `b.half`, `b.bottom`), never from hard-coded y values, so it fits all four body shapes. Hats also need an entry in `HAT_BRIM` so the cast shadow lands under the brim.
3. **Use the helpers.** `ctx.defs.linear()` / `radial()` / `radialBox()` register gradients with the right id prefix. `union()` draws several shapes as one blob with a single outline (hands, pom-poms). `tint()` and `shade()` derive highlight and shadow tones from any color so a part works in all seven hat colors.
4. **Test it.** `npm test` renders every option and every body × hat × item × gesture combination and fails on broken markup, leaked `undefined`s or an id without the prefix.
5. **Look at it.** `npm run dev`, then check the part on all four bodies, with the avatar crop on, and at thumbnail size in the option grid. Then download a PNG and open it.

### Art style checklist

- Bold ink outline, 6–7 px at 512, `stroke-linejoin="round"`.
- One light source, top-left. Gradients run light → base → shade across the shape; highlights are soft white strokes at 30 % opacity.
- Flat, saturated fills. No filters (`feGaussianBlur` and friends render inconsistently when the SVG is rasterized for PNG export).
- A part is done when it still reads at 40 px. If it needs more than four small details, it is too busy.
- Nothing may cover the eyes or mouth except accessories that are meant to (shades, glasses). Held items stay below the mouth.
- Original art only. No logos, mascots or characters from other brands.

## Pull requests

- One part or one fix per PR.
- Include a screenshot of a visual change on every body shape. The PR template has a checklist.
- Keep README.md accurate and tick ROADMAP.md items only when the work is built and tested.
- Commit messages in plain English: what changed and why.

## Reporting bugs

Open an issue with the share link from the address bar. The link contains the exact potato, which makes rendering bugs easy to reproduce.
