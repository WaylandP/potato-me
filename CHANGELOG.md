# Changelog

Notable changes to the source. Version numbers match `package.json`; tags and downloadable release archives are listed separately on [GitHub Releases](https://github.com/WaylandP/potato-me/releases).

## 0.7.0 — 2026-11-02

- Split customization into nine sections: Body, Face, Hair, Headwear, Accessories, Props, Gestures, Stickers and Background. Add a laptop action in Stickers and vertical keyboard navigation in the section grid.
- Add six palette-responsive illustrated scenes and twelve colors (26 colors and 18 scenes/patterns total).
- Fit hats from measured wearing openings and hairstyle contours; limit crown height independently from the band/brim. Keep narrow-body tips covered and wrap headband ends around the wearer.
- Fit hair openings at the temples, preserve side volume, bound lengths and use continuous inverse sampling to prevent join seams and stepped strands.
- Scale earrings, earbuds and hair ornaments with body width; attach clips to the hair. Cast contact shadows onto the actual preceding layers.
- Replace the chef hat, crown and Viking helmet's empty underside views with detailed front-view artwork. Keep the 224-image inventory and all existing share keys.
- Refresh documentation and app-rendered examples. See [WEARABLE_REVIEW.md](docs/WEARABLE_REVIEW.md) for review scope.

## 0.6.1 — 2026-11-02

- Rename Long to Petite and the former broad Petite to Wide, retaining historical share keys.
- Make Petite smaller as a complete character, including hands and accessories; cap its camera framing against the same Classic outfit.
- Fit hair crowns separately from lower lengths, preserve bun volume, and remove horizontal resampling seams.
- Seat open headwear on Wide, narrow its forehead band, raise its flower crown and shorten its lanyard with a proportionate badge.
- Refine face and prop skin masks; keep eye interiors, teeth, tongues, drinks and controller materials separate from potato skin.
- Route the eye-patch strap above the uncovered eye. Add hair automatically for hair clips.
- Add measured body/prop proportion checks and update the review record and renderer-generated documentation.
- Tuck the raised bun under closed hats; retain its volume with open headwear.

## 0.6.0 — 2026-11-02

- Add a Male/Female starting-look switch with keyboard support, remembered session styling and share-link state. Keep all controls available in both modes; preserve body, skin, props, text, stickers and background when switching.
- Match both arms to robust shadow/midtone/highlight samples from the selected body, including cool shadows and pale highlights. Preserve held-object materials with masks.
- Calibrate palm spans and shoulder anchors; frame the entire character instead of shrinking each arm to fit the crop independently. Pad limb layers before framing to avoid early clipping.
- Replace the hip arm with a shorter, textured pose and place its hand against the torso. Preserve shaka fingers where they cross the body.
- Add a detailed side ponytail with a fitted face opening and protected satin tie, plus a rose-tinted smile. The catalog now contains 224 source images.
- Replace the low-resolution frown and wavy mouth, the square glasses with visible folded temples, and the party hat with its exposed underside. Recolor closed-mouth edges and dot-eye rims with the selected potato skin.
- Use HI THERE! for the default sign. Update the documentation and distinguish rendering checks from visual approval; see [COHESION_REVIEW.md](docs/COHESION_REVIEW.md).

## 0.5.0 — 2026-11-02

### More ways to make it yours

- Add Pear and Petite bodies in all nine skins, bringing the catalog to six shapes and 54 body/skin combinations.
- Add six detailed hairstyles with six hair colors; three lash expressions, soft-arch brows and a lighter smile; four additional face presets.
- Add a bow, flower crown, straw sunhat, cat-eye glasses, three earring pairs, pearl necklace, heart pendant, leaf barrette and satin bow clip. Every style is available to every body.
- Add bouquet, leather handbag, floral teacup and artist palette props, plus finger heart, open palm and hand-on-hip gestures.
- Add twelve stickers: sunflower, butterfly, rainbow, moon, books, music, paw, strawberry, bee, teapot, camera and yarn. There are now 38 designs, with up to six on a laptop.

### Fit and clarity

- Fit hair around the face opening and crown; let hats occlude it naturally and frame both hair and hats within the avatar crop. Keep earrings and skin-mounted extras beneath long hair.
- Keep hats seated on the crown and clear of the eyes, including Petite and narrow bodies with hair. Preserve prop materials while matching hand skin; place the hip pose against the body.
- Reveal neckwear and small extras in their option thumbnails; center accessory crops around the face instead of leaving them at the bottom edge.
- Rename the Hat tab to Style, explain “LGTM” as “Looks good to me,” and replace developer-specific vibe labels while retaining their share keys.
- Preserve hairstyles and accessories when choosing a face vibe. Expand Surprise me and regenerate the public gallery with a broader range of styles and interests.

### Verification

- Add complete PNG chunk/decompression checks, deterministic pairwise outfit generation with an independent coverage verifier, and hairstyle interaction audits.
- Expand the existing inventory and interaction matrices to all six shapes; extend browser checks to new controls, sharing and downloads.
- See [EVERYDAY_AUDIT.md](docs/EVERYDAY_AUDIT.md) for the actual checks, repairs and limitations. The inventory is 222 source images: 58 additions and one replacement smile. Existing share keys remain supported.

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
