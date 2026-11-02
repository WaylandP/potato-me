# Changelog

Notable changes to the source. Version numbers match `package.json`; tags and downloadable release archives are listed separately on [GitHub Releases](https://github.com/WaylandP/potato-me/releases).

## 0.4.0 — 2026-11-02

### Artwork and fitting

- Rebuild all six neckwear pieces around the broad potato torso, including a knitted scarf with fitted ends, formal collars and a smaller lanyard badge.
- Replace the backward cap with detailed twill/topographic stitching; rebuild smug, angry, worried and flat brows, both resting-hand layers, and sparse transparent stubble.
- Improve skin-edge blending, blush transparency, laptop support and shaka proportions. Preserve the wrench's red paint and whistle's music notes.
- Fit closed hat crowns over the body tip and reframe the whole character for tall hats; float the halo above the crown.
- Align the monocle lens and eyepatch to their eyes, stretch only eyepatch straps, move flowers below hat brims, and place mustaches above each mouth.

### Editor and maintenance

- Bundle Fredoka locally under its SIL Open Font License; wait for the font before drawing custom lettering.
- Add image-loading feedback and retry, clear the completed loading overlay immediately, and preserve the avatar when using the keyboard skip link.
- Reveal face parts in option thumbnails, clarify the shared fabric/mug color control, preserve selection focus, and describe the preview for assistive technology.
- Bound image/composition caches, prevent constant-RNG randomization loops, guard fitting-tool numeric input, repair its mobile control layout, and handle malformed development-server URLs.
- Add full inventory/interaction audit modes and a real-control UI audit; regenerate documentation artwork from the renderer.

See [PUBLIC_AUDIT.md](docs/PUBLIC_AUDIT.md) for exact visual coverage, test results, repaired findings and remaining limits. All public option keys remain supported. The inventory remains 164 source images; replacement artwork is not counted as additional options.

## 0.3.1 — 2026-11-01

### Character fitting

- Fit arms, faces, hats and worn accessories to the selected body's silhouette and landmarks.
- Conceal arm roots inside the body; keep hands and held objects together and fit oversized poses within the avatar crop.
- Match exposed skin and facial edges to the body while preserving eye interiors, teeth and prop materials.
- Correct the holding direction of the coffee and book layers, face proportions, beard alignment and eyewear sizing.
- Replace headband and headphone artwork; flex headphone bands without distorting ear cups.
- Add manual surface-fit corrections and a reproducible inventory audit.

### Repository and documentation

- Refresh the README around the live editor, actual app previews, current features, setup and known limits.
- Separate shipped functionality, next priorities and later ideas in the roadmap.
- Correct package and page descriptions to describe browser-based PNG composition and both download sizes.
- Update contribution guidance and issue links to match the current project.

### Verification and limits

The fitting update passed 37 Node tests and a 548-case browser inventory audit, with targeted face/eyewear reruns and visual review. See the [fitting record](docs/CHARACTER_FITTING.md) and its [machine-readable report](docs/character-fit-verification.json) for evidence and scope.

Large accessory combinations can still overlap. Google Fonts is still an external request, and a full screen-reader and Lighthouse review is pending. This is a 2D image compositor, not a 3D rig.

## Earlier development milestones

These entries summarize the history before the changelog was introduced. They do not imply previously published release tags.

- **v0.3:** rendered PNG asset pipeline, Canvas compositor, fitting tools, expression presets, custom text and sticker controls; inventory completed at 164 images and deployed to Vercel. See the [asset-completion record](docs/ASSET_COMPLETION.md).
- **v0.2:** shaded SVG artwork, additional parts, development server and contributor documentation.
- **v0.1:** initial SVG avatar editor, exports, share links, themes and tests.
