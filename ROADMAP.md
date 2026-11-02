# Roadmap

This file separates shipped functionality from proposed work. The [changelog](CHANGELOG.md) records changes; the [live editor](https://potato-me.vercel.app/) runs from `main`. Future items have no committed delivery dates.

## Shipped

- [x] Browser editor with live preview, light/dark mode, PNG downloads at 512 and 1024 px, and share links with legacy-key migration.
- [x] Complete 224-image inventory: all 54 body/skin combinations, faces, hats, held objects, gestures, accessories and stickers.
- [x] Fourteen expression presets, coordinated randomization, editable sign/cap text, laptop stickers and supported material recoloring.
- [x] Canvas composition with body-silhouette fitting, concealed arm roots, skin matching, protected prop materials and contact shadows.
- [x] Replacement headband and headphone artwork, with fitted headphone bands and consistently sized ear cups.
- [x] Fitting page, generated thumbnails, actual-app documentation images and a reproducible inventory audit.
- [x] Rebuilt torso-wrapping neckwear, detailed cap/brows/resting hands/stubble, full-character hat framing and face-accessory placement.
- [x] Local Fredoka font, image-loading recovery, clearer thumbnails and bounded renderer caches.
- [x] Expanded visual matrices and repeatable UI/download/share checks; see the [public audit](docs/PUBLIC_AUDIT.md).
- [x] Static Vercel deployment, dependency-free local server, Node test suite and GitHub Actions CI.

- [x] Two additional body shapes; seven hairstyles and six colors; feminine styling, jewelry, everyday props and twelve additional stickers, available to every shape.
- [x] Hairstyle interaction matrices and independently verified pairwise option coverage; see the [v0.5 audit](docs/EVERYDAY_AUDIT.md).
- [x] Male/Female starters with remembered session styling, shared material palettes for both arms, proportion calibration, a rebuilt hip pose, side ponytail and rose smile. See the [v0.6 review](docs/COHESION_REVIEW.md).

The earlier asset-completion and character-fitting work was verified on November 1, 2026. The [public audit](docs/PUBLIC_AUDIT.md) supersedes those visual checks for v0.4.0. Read the [completion record](docs/ASSET_COMPLETION.md) and [fitting record](docs/CHARACTER_FITTING.md) for the scope of those checks. Individual-asset coverage does not mean every possible outfit combination has been reviewed.
## Next priorities

- [ ] **Broader device coverage:** verify the current rendering on physical iOS/Safari and Android devices, beyond the recorded Chromium checks.

- [ ] **Undo / redo:** make it easy to compare edits and recover earlier choices.
- [ ] **Accessibility:** complete manual VoiceOver and NVDA reviews, including keyboard interaction, selected states and download feedback.
- [ ] **Performance:** run and record a Lighthouse audit; target 95+ for performance, accessibility and best practices. These scores have not been established.

## Later ideas

- [ ] More expressions, gestures, hats and props that meet the existing fitting and visual checks.
- [ ] Optional seasonal artwork packs.
- [ ] An opt-in community gallery based on shared avatar links.

## Earlier milestones

The v0.1 prototype used a layered SVG renderer. The v0.2 milestone added shaded vector artwork and contributor tools. The v0.3 work introduced rendered PNG parts and the Canvas compositor; v0.3.1 introduced silhouette fitting; v0.4.0 rebuilds unsuitable artwork and expands interaction coverage; v0.5.0 broadens body shapes, personal styling and everyday interests; v0.6.0 corrects limb fitting/materials and adds Male/Female starters. These version names describe development milestones, not a claim that historical GitHub releases were published.

## Outside the current scope

Accounts, image uploads, a storage backend and editable 3D models. Avatars remain local to the browser, with URL links for saving and sharing.
