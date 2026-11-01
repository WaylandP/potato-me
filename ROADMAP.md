# Roadmap

Check a box only when the work is built, tested and visible on the deployed site.

## Phase 1: MVP (v0.1)

- [x] Layered SVG renderer, editor, PNG export, share links, light and dark mode, tests

## Phase 2: Sticker-style art and polish (v0.2)

- [x] Shaded SVG potato, cast shadows under hats, mitten hands, redrawn gear, new parts
- [x] Dependency-free dev server, hero script, CONTRIBUTING.md, issue and PR templates

## Phase 3: Rendered parts (v0.3)

- [x] Prompt pack for generating every part as a positioned 1024 px transparent PNG
- [x] 138 rendered parts: 36 bodies, 14 eyes, 6 brows, 12 mouths, cheeks, facial hair, 19 hats, eyewear, neckwear, extras, 4 held items, shaka, 22 stickers
- [x] Canvas compositor with hue-mask recoloring, skin tinting, sticker projection and cap initials
- [x] Per-shape fitting data and `fit.html`
- [x] Missing parts hidden and listed; old share links migrated
- [x] Thumbnails, screenshot tool, hero and link-preview card from the real app
- [x] Generate the 26 remaining parts: **generated, integrated and verified in production on 2026-11-01.** Raised brows, 11 held items (boba, phone, controller, sign, pizza, donut, duck, mic, trophy, plant, nothing), 10 free-hand poses, 4 stickers (404, skull, mountains, LGTM). See the [completion record](docs/ASSET_COMPLETION.md).
- [x] Sign text in the raster compositor — **implemented and verified in production on 2026-11-01.** Text box in `FIT.sign`.
- [x] Skin masks for eyelids and lips so the smug eyes match exotic skins
- [x] Coherent "Surprise me": a vibe for the face, matching colors, at most two worn accessories
- [x] Headphones, earbuds, earring and flower fitted to every body shape
- [x] Deploy to Vercel and add the live URL to the README — [potato-me.vercel.app](https://potato-me.vercel.app/), verified on 2026-11-01
- [ ] Self-host the Fredoka font
- [ ] Undo / redo
- [ ] Accessibility pass with a screen reader (VoiceOver + NVDA)
- [ ] Lighthouse pass: performance, accessibility, best practices all 95+

The [character-fitting repair](docs/CHARACTER_FITTING.md) documents the collection-wide visual corrections, their review coverage, and the updated fitting workflow.

## Phase 4: More potato

- [ ] More hats, items and expressions from the same prompt pack
- [ ] Seasonal packs (Halloween, holidays) behind a toggle
- [ ] Gallery of community potatoes (opt-in, links only, no uploads)

## Not planned

- Accounts, uploads or server-side storage. The URL is the save file.
