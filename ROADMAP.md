# Roadmap

Check a box only when the work is built, tested and visible on the deployed site.

## Phase 1: MVP (v0.1)

- [x] Layered SVG renderer: 4 bodies, 5 skins, 6 eyes, 5 mouths, blush
- [x] Hats (5 + none) with 7 colors
- [x] Gear: laptop with stickers, coffee, custom-text sign, wave and shaka poses
- [x] Accessories: shades, mustache, bow tie
- [x] Backgrounds: 8 colors × 4 patterns
- [x] Live option thumbnails rendered from the real renderer
- [x] Avatar crop preview
- [x] 512 × 512 PNG and SVG download
- [x] Share links (state in the URL hash) and "Surprise me"
- [x] Light and dark mode, keyboard-friendly tabs, reduced-motion support
- [x] Test suite covering every option and every body × hat × item × gesture combo
- [ ] Deploy to Vercel and add the live URL to the README
- [x] Generate `docs/hero.png` (README banner) from the renderer

## Phase 2: Polish

- [ ] Refine the shaka hand so it reads at thumbnail size
- [ ] Self-host the Fredoka font (no third-party request)
- [ ] Open Graph image so shared links preview the actual potato
- [ ] Undo / redo
- [ ] 1024 px export option
- [ ] Accessibility pass with a screen reader (VoiceOver + NVDA)
- [ ] Lighthouse pass: performance, accessibility, best practices all 95+

## Phase 3: More potato

- [ ] More hats: beret, headband, party hat, viking helmet
- [ ] More held items: wrench, rubber duck, pizza slice, "it works on my machine" mug
- [ ] Laptop sticker picker (choose 2–4 from a sticker set)
- [ ] Expressions as presets (Smug, Panicked on-call, Friday deploy)
- [ ] Seasonal packs (Halloween, holidays) behind a toggle

## Phase 4: Community

- [ ] CONTRIBUTING.md with a "draw a new part" guide and an art style checklist
- [ ] Gallery of community potatoes (opt-in, links only, no uploads)
- [ ] GitHub Action / CLI: `npx potato-me --hat wizard --out avatar.png`

## Not planned

- Accounts, uploads or server-side storage. The URL is the save file.
