# Working on potato-me

A static, zero-dependency potato avatar builder. Read README.md for the layout of the code, CONTRIBUTING.md for the part-drawing guide, and ROADMAP.md for what's next.

## Ground rules

- **No dependencies and no build step** unless the owner asks for one. Plain ES modules, plain CSS. If a feature truly needs a library, propose it first. (Playwright is an optional, uncommitted dev tool for `npm run hero`; it is not a dependency.)
- **`composeSVG` stays pure.** No DOM, no globals, no randomness inside it. Anything browser-only goes in `src/main.js` or `src/export.js`.
- **Every part must fit every body.** Position new art from the body anchors (`b.top`, `b.face`, `b.armY`, `b.half`, `b.bottom`), never hard-coded y values. New hats need a `HAT_BRIM` entry so the cast shadow lands under the brim.
- **Keep the default potato's face visible.** Held items sit below the mouth.
- **Unique SVG ids.** Register every gradient, pattern and clip path through `ctx.defs` (`linear`, `radial`, `radialBox`, `add`) so it carries the `idPrefix`. The editor renders dozens of SVGs on one page, and the tests fail on an unprefixed id.
- **Option keys are a public API.** They live in share links. Add keys freely; never rename or remove one without a migration in `state.js`.

## Art style

- Sticker-style indie cartoon: bold ink outlines (6–7 px at 512, round joins), soft gradients inside them, one light source top-left.
- Use `tint()` / `shade()` to derive highlight and shadow tones from any color, so a part works in all seven hat colors. Highlights are white strokes at about 30 % opacity.
- Blobs that must read as one shape (hands, pom-poms) go through `union()`: outline pass underneath, fill pass on top.
- **No SVG filters.** `feGaussianBlur` and friends rasterize inconsistently in PNG export. Fake softness with radial gradients (see `groundShadow`, `cheeks`).
- Playful, slightly irreverent tech humor is welcome. Generic clip-art is not.
- No clutter: if a part needs more than ~4 small details, it's too busy for a 40 px avatar.
- All art is original. Never copy logos, mascots or characters from other brands.
- Check every new part in the preview **and** inside the avatar crop circle, on all four bodies, at full size and at thumbnail size.

## UI standards

- Looks good, works on a 390 px wide phone, works with a keyboard.
- Text contrast 4.5:1 or better in both light and dark mode; touch targets 44 px or larger.
- Keep the established look (teal ground, tomato accent, Fredoka headings). Don't restyle the app as a side effect of another change.

## Before you say it's done

1. `npm test` passes.
2. `npm run dev`, then check the change in the browser at desktop and phone widths, light and dark.
3. Download a PNG and open it.
4. If a hero potato changed, `npm run hero` and commit `docs/hero.png`.
5. Update ROADMAP.md: check items off only when they're built and tested. Never check off unfinished work.
6. Keep README.md accurate: option counts, file map, commands.

## Workflow

- Small PRs, one feature each, with a short description and a before/after screenshot for any visual change.
- Commit messages in plain English: what changed and why.
