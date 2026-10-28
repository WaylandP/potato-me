# Working on potato-me

A static, zero-dependency potato avatar builder. Read README.md for the layout of the code and ROADMAP.md for what's next.

## Ground rules

- **No dependencies and no build step** unless the owner asks for one. Plain ES modules, plain CSS. If a feature truly needs a library, propose it first.
- **`composeSVG` stays pure.** No DOM, no globals, no randomness inside it. Anything browser-only goes in `src/main.js` or `src/export.js`.
- **Every part must fit every body.** Position new art from the body anchors (`b.top`, `b.face`, `b.armY`, `b.half`, `b.bottom`), never hard-coded y values.
- **Keep the default potato's face visible.** Held items sit below the mouth.
- **Unique SVG ids.** Anything with an `id` (clip paths, patterns) must use the `idPrefix`, because the editor renders dozens of SVGs on one page.

## Art style

- Crisp, hand-drawn indie cartoon: bold dark outlines (~6–7 px at 512), flat fills, one soft shade and one highlight per shape.
- Playful, slightly irreverent tech humor is welcome. Generic clip-art is not.
- No clutter: if a part needs more than ~4 small details, it's too busy for a 40 px avatar.
- All art is original. Never copy logos, mascots or characters from other brands.
- Check every new part in the preview **and** inside the avatar crop circle, at full size and at thumbnail size.

## UI standards

- Looks good, works on a 390 px wide phone, works with a keyboard.
- Text contrast 4.5:1 or better in both light and dark mode; touch targets 44 px or larger.
- Keep the established look (teal ground, tomato accent, Fredoka headings). Don't restyle the app as a side effect of another change.

## Before you say it's done

1. `npm test` passes.
2. `npm run dev`, then check the change in the browser at desktop and phone widths, light and dark.
3. Download a PNG and open it.
4. Update ROADMAP.md: check items off only when they're built and tested. Never check off unfinished work.
5. Keep README.md accurate.

## Workflow

- Small PRs, one feature each, with a short description and a before/after screenshot for any visual change.
- Commit messages in plain English: what changed and why.
