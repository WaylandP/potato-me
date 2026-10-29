# Working on potato-me

A static, zero-dependency potato avatar builder that composites rendered PNG parts on a canvas. Read README.md for the layout of the code, CONTRIBUTING.md for the part guide, and ROADMAP.md for what's next.

## Ground rules

- **No dependencies and no build step** unless the owner asks for one. Plain ES modules, plain CSS. Playwright is an optional, uncommitted dev tool for `npm run assets`, `npm run hero` and `npm run shot`; it is not a dependency.
- **The art is the asset pack.** Potatoes are stacked from `assets/parts/<group>/<key>.png` (1024 px, transparent, already positioned on the shared canvas). Never hand-edit `src/assets.js` or `assets/thumbs/`; change `assets/manifest.json` and run `npm run assets`.
- **Fit, don't redraw.** A part that sits wrong on a body shape gets a transform in `src/fit-data.js` (use `fit.html`), not a new image. Classic is the baseline the parts were fitted on.
- **Recolor by mask only.** Parts listed in `FIT.recolor` were rendered in the red master (`#C8372D`); `src/raster.js` recolors just the red pixels so trim, bands, metal and jewels keep their colors. Never hue-shift a whole image. Arms are tinted to the skin the same way; list any held item whose object would be caught by the skin mask in `FIT.noSkinTint`.
- **Missing parts are hidden, never broken.** The renderer and the editor only offer choices whose image exists (`availableOptions()`), list the rest as "not drawn yet", and `drawableState()` swaps a missing choice for a drawable one. `noImageRequired` in the manifest names the "none" choices.
- **Option keys are a public API.** They live in share links. Add keys freely; never rename or remove one without a `LEGACY` entry in `src/options.js`.
- **`composeSVG` stays pure** (no DOM, no randomness). It still draws the backgrounds and the fallback stickers, and the tests render it in Node.
- **Original art only.** No logos, mascots or characters from other brands, in prompts or in stickers.

## Checks before you say it's done

1. `npm test` passes (it also checks the asset index against the manifest and that every fit entry names a real part).
2. `npm run dev`, then look at the change in the browser at desktop and phone widths, light and dark; or `npm run shot out.png '#hash'` / `--page` for screenshots.
3. For anything visual, check all four body shapes and at least three skins, inside the avatar crop circle and in the thumbnail grid. `npm run shot grid.png spec.json --cell 256 --cols 4` renders a review sheet.
4. Download a 512 px PNG and confirm it stays under 1 MB.
5. If a hero potato changed, `npm run hero` and commit `docs/hero.png` and `docs/og.png`.
6. Update ROADMAP.md: check items off only when they're built and tested. Keep README.md accurate: option counts, file map, commands, the "not drawn yet" list.

## UI standards

- Looks good, works on a 390 px wide phone, works with a keyboard.
- Text contrast 4.5:1 or better in both light and dark mode; touch targets 44 px or larger.
- No flashing: the preview keeps the last frame until the next one is fully loaded, and thumbnails fill in lazily.
- Keep the established look (teal ground, tomato accent, Fredoka headings). Don't restyle the app as a side effect of another change.

## Workflow

- Small PRs, one feature each, with a short description and a before/after screenshot for any visual change.
- Commit messages in plain English: what changed and why.
