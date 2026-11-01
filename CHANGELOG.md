# Changelog

Notable changes to the source. Version numbers match `package.json`; tags and downloadable release archives are listed separately on [GitHub Releases](https://github.com/WaylandP/potato-me/releases).

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
