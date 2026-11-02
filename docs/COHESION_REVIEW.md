# Character cohesion review — v0.6.0

Review date: 2026-11-02. This record replaces the visual-quality conclusions in earlier audits. Successful rendering and large test counts did not detect mismatched arm materials, inconsistent hand scale or defects baked into individual images. Those are separate review tasks.

## What changed

| Finding | Repair |
| --- | --- |
| Arms could retain gold patches or use different apparent skin colors | Sample a shared shadow, midtone and highlight palette from the selected body. Recolor the complete skin of standalone gestures, including dark pores and cool highlights; preserve separately masked prop materials. |
| Hand size depended on the prop bounds and available crop space | Calibrate a palm span for each item and gesture, scale it relative to shoulder width, and frame the assembled character together. Pad limb canvases before compositing so wide props are not clipped early. |
| Low shoulder attachments and an overlong hip arm | Raise the shoulder anchors, regenerate the hip pose, and fit the hand against the torso with a contact shadow. Preserve the shaka's foreground fingers. |
| Some closed mouths left gray or gold rims | Treat their creases and edges as potato material. Replace the frown and wavy mouth sources; fade the surrounding facial skin edges. Recolor the gold rim of dot eyes on cool skins. |
| Square glasses showed folded temples through the lenses | Replace the image with a front-facing frame and clear lens interiors. |
| Party hat showed a hollow underside while worn | Replace it with a seated cone and a narrow front rim. |
| Feminine styling was hard to discover | Add the requested Male/Female starting-look switch, a detailed side ponytail, a rose smile and a rebuilt hip pose. Update the gallery to include several feminine looks. |

The switch remembers each look's styling during the current session and preserves body, skin, held object, stickers, text and background. Reset returns to the selected starter; Surprise me retains the selection. All parts are available in both modes. A share link saves the current appearance and selection, not both session histories.

The seven generation instructions are in [cohesion-prompts.json](cohesion-prompts.json); source checksums and normalized bounds are in [the manifest](../assets/manifest.json). The catalog contains **224** source PNGs, including **54** body/skin images, **7** hairstyles and **13** mouths.

## Checks and their limits

The machine-readable [review evidence](cohesion-evidence.json) records scopes and source digests. Counts below are not a claim that every possible complete outfit has been visually approved.

| Check | Scope | Result |
| --- | --- | --- |
| Node suite | 51 tests: PNG integrity, inventory, state, fitting geometry, randomization and legacy SVG behavior | Passed |
| Structural inventory | 9,234 distinct cases: all 54 bodies/skins, plus each of 170 non-body images on all 54 contexts | No image-load, share-round-trip or measured crop failures |
| Final targeted rerun | 540 cases: dot eyes, seven closed mouths, square glasses and party hat × all 54 contexts | No measured failures after the final repairs |
| Ponytail interactions | 438 combinations covering hats, extras, jewelry/neckwear and hair colors across six bodies | No measured crop or render failures |
| Pairwise outfits | 458 outfits covering all 19,102 pairs of values across 20 single-select factors | No measured crop or render failures; all nine overview sheets inspected |
| Real editor controls | 14 browser check groups, including the switch, keyboard use, sharing/reloading, both download sizes, mobile layouts and retry | Passed; no browser errors |

Inventory checks ran at 256 px. They count foreground pixels with alpha above 180 outside a 127 px radius and report a finding when more than eight are outside; they also verify state round trips. This detects gross cropping and loading failures. It cannot judge natural hand anatomy, attachment quality, texture continuity or artistic appeal. The initial inventory preceded the final facial-mask and four source-image repairs; the targeted rerun covers those affected parts. Pairwise coverage covers pairs, not every three-way or higher-order interaction, text value or sticker subset.

## Visual inspection

Inspection used the actual PNG renderer, including 1024 px exports displayed in larger review sheets. The review covered all 33 item/gesture layers individually; male and feminine examples in all nine skins; waves and ponytail on all six bodies; the eight neckwear choices; and 99 individual face, headwear and accessory examples. Twenty-four additional full-size cases checked the replacement frown, wavy mouth, square glasses and party hat on each body. The nine ponytail interaction sheets were inspected for fit, overlap and cropping. The public [gallery](completion-preview.png), [banner](hero.png) and [editor screenshot](screenshot.png) are regenerated app output.

The final isolated correction narrowed the ponytail's satin-tie mask and normalized its coordinates for thumbnails. Four colors were rechecked at 176 and 1024 px to confirm that the red tie remained while nearby brown hair recolored properly. The earlier interaction runs precede this small material-mask correction.

These inspections led to the repairs above. They are representative visual review, not a certification of every pixel in the structural inventory. Long hair intentionally hides some earrings and skin-mounted accessories. Extreme body shapes still stylize the fitted artwork. The compositor uses baked 2D shading and contact-shadow approximations; it does not simulate a continuous 3D surface, cloth draping or light transport.

The material approach is informed by the distinction between surface reflectance and illumination described in [Physically Based Rendering: Textures and Materials](https://www.pbr-book.org/4ed/Textures_and_Materials). Matching sampled colors and preserving local shading improves consistency, but cannot recover missing 3D geometry from a cutout.

## Reproduce

Run `npm test` without installing dependencies. For the optional Chromium/Sharp checks, follow the [README setup](../README.md#artwork-and-development-tools), then run:

```bash
npm run audit:cohesion -- /tmp/potato-inventory
npm run audit:cohesion -- /tmp/potato-repairs eyes/dots mouth/smirk mouth/smile mouth/frown mouth/flat mouth/wavy mouth/kiss mouth/whistle eyewear/square hat/party
npm run audit -- /tmp/potato-ponytail hair hair/ponytail
npm run audit -- /tmp/potato-pairwise pairwise
npm run audit:ui -- /tmp/potato-ui
npm run hero
```

Keep the generated sheets available during review. A clean report is a reason to inspect the rendered results, not to label them perfect.
