# Contributing to potato-me

Use **Node.js 20+**. Run `npm run dev` to start [localhost:5173](http://localhost:5173/) and `npm test` to run the Node test suite. Neither operation needs `npm install`. Serve the app over HTTP so the browser can load its ES modules.

## Where to make a change

| Area | Files |
| --- | --- |
| Editor controls, preview and download | [index.html](index.html), [src/main.js](src/main.js), [src/styles.css](src/styles.css) |
| Choices, presets and share links | [src/options.js](src/options.js), [src/state.js](src/state.js), [src/inspiration.js](src/inspiration.js) |
| Layer composition and fit | [src/raster.js](src/raster.js), [src/surface.js](src/surface.js), [src/wrap.js](src/wrap.js), [src/fit-data.js](src/fit-data.js) |
| Fitting tool | [fit.html](fit.html), [src/fit.js](src/fit.js) |
| Original art, checksums and generated files | [assets/parts/](assets/parts/), [assets/manifest.json](assets/manifest.json), [assets/thumbs/](assets/thumbs/), [src/assets.js](src/assets.js) |
| Tests, browser checks and image tools | [test/](test/), [scripts/](scripts/), [artwork and review index](docs/README.md) |

**Share links are a public format.** Keep option keys stable and add a migration when replacing a key. `BODY_PROFILES` maps the historical key `long` to **Petite**, and `petite` to **Wide**. Both starter looks can use every part. The URL fragment includes any custom text, so double-check it before posting a bug report.

## Change or add artwork

1. **Register the choice.** Add new keys to the appropriate group in `OPTIONS`. Check for an existing source part before commissioning another image; placement problems often need a fit adjustment.
2. **Generate a single part.** Follow the [prompt guide](docs/IMAGE_PROMPTS.md). Use the same front-facing camera and upper-left light as the base potato. Require a transparent background, no cast shadow and no unrelated body, text or logos. Held objects include the viewer’s left arm; gestures include the viewer’s right arm. Keep the laptop lid and sign blank for rendered stickers and lettering.
3. **Normalize and index.** Position the part on the shared 1024 × 1024 RGBA canvas. Save `assets/parts/<group>/<key>.png` and update its manifest entry, including its source checksum and `placedBox`. Run `npm run assets -- hat/backwardCap` for a changed thumbnail (or `npm run assets` for the complete set). The command always rebuilds the static index; do not edit thumbnails or `src/assets.js` by hand.
4. **Fit to the character.** Open [the fitting tool](http://localhost:5173/fit.html) with the local server running. Check Classic, Lumpy, Round, Petite, Pear and Wide. Use the keyboard nudges and copy the resulting `surfaceNudges` into `src/fit-data.js`. Use an actual shoulder landmark in `FIT.surfaceRoots` for unusual arms and `FIT.palmWidth` to calibrate the gripping hand. `FIT.skinFront` preserves fingers that overlap the body.
5. **Protect materials.** Only listed red-master parts belong in `FIT.recolor`; preserve mixed trim and other materials. `FIT.skinProtect` polygons follow an object’s source pixels so the prop keeps its material while the fingers change skin. Examine enlarged Blue or Purple examples: check eyelids, lips, the edges of the object, and the skin between fingers. Keep hair ties, eye interiors, teeth and tongues intact.
6. **Show the fit.** Include actual editor renders of the affected bodies and skin colors. Look at the native resolution, option thumbnail and avatar crop. Check how fingers support a prop or the angle at which headwear meets hair. Geometry and export checks cannot answer those questions on their own.

### Headwear, hair and neckwear

- Measure the wearing opening separately from the outer bounds. `FIT.hatOpenings` and `FIT.hairOpenings` describe the source landmarks. Brims, pom-poms and ponytails are outside the wearing surface. Check eye clearance, temple contact and crown height, including on short or narrow shapes.
- `FIT.wrap` and `src/wrap.js` separate the rear and front surfaces. Seat a rear brim behind the head and the rear headphone band behind hair, keeping the same transform on both pieces. Preserve front cuffs, hat decorations and ear cups. Keep earrings under long hair.
- Hair uses continuous inverse mapping with premultiplied bilinear sampling. Use `fittedPoint()` for the same geometry in framing and tests; separate per-row shifts introduce seams. Include hair in shadow receivers.
- Wrap neckwear around the upper torso, with sides turning behind the body. Keep the collar, knot and tails proportionate. For two-sided items like earbuds, use `spread` when the two pieces should move apart without growing.

## Run the relevant checks

The optional render tools use Playwright with Chromium; some audit tools also use Sharp. Install these locally without changing the project’s dependency files:

```sh
npm install --no-save --package-lock=false playwright sharp
npx playwright install chromium
```

| Change | Useful commands |
| --- | --- |
| Any source change | `npm test` |
| A particular outfit or the UI | `npm run shot -- /tmp/potato.png '#hat=wizard&skin=blue'`; add `--page` for the whole editor |
| Thumbnails or public previews | `npm run assets -- hat/backwardCap`; `npm run hero` |
| Bodies or character framing | `npm run audit:shapes -- /tmp/potato-shapes`; `npm run audit:color-framing -- /tmp/potato-colors` |
| Hair, headwear or stacked accessories | `npm run audit:wrap -- /tmp/potato-wrap`; `npm run audit:attachments -- /tmp/potato-attachments interactions` |
| Hand artwork or prop materials | `npm run audit:grips -- /tmp/potato-grips all`; `npm run audit:attachments -- /tmp/potato-materials materials` |
| Broad changes to the renderer | `npm run audit -- /tmp/potato-audit inventory`; `npm run audit:cohesion -- /tmp/potato-cohesion` |
| Controls, downloads or share links | `npm run audit:ui -- /tmp/potato-ui` |

The [attachment](scripts/audit-attachments.mjs) and [grip](scripts/audit-grips.mjs) audits accept `--plan` to list their cases. `AUDIT_GROUPS`, `AUDIT_MATCH` and `AUDIT_LIMIT` select a narrower run; report those filters when quoting results. Their saved reports distinguish source files, thumbnail sources, output sizes and cases. For color changes, register recolored canvases with `registerFramingSource` so lighting and recoloring do not change the camera.

## Pull requests and issues

Report a rendering issue with its share link, screenshot, browser and device. Use the [issue templates](https://github.com/WaylandP/potato-me/issues/new/choose).

Keep a pull request focused. Explain what looked or behaved incorrectly and include a before/after example when the difference is visible. Check the affected controls at desktop and phone widths, in both themes and with the keyboard. Refresh the public images with `npm run hero` when a renderer or artwork change affects them. Update the changelog for shipped behavior and the roadmap only when a planned item has been built, tested and verified. Follow the [PR checklist](.github/PULL_REQUEST_TEMPLATE.md).
