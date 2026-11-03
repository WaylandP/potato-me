# Artwork and visual reviews

For the editor, start at the [project README](../README.md). For adding or fitting a part, use the [contributor guide](../CONTRIBUTING.md).

## Working files

| Looking for | Files |
| --- | --- |
| How the art was made | [Original prompt guide](IMAGE_PROMPTS.md), [completion prompts](ASSET_COMPLETION_PROMPTS.json), [v0.4 replacements](PUBLIC_AUDIT_PROMPTS.json), [everyday parts](expansion-prompts.json), [cohesion revisions](cohesion-prompts.json), [Lumpy and attachment revisions](attachment-image-prompts.json), [hand revisions](grip-image-prompts.json) |
| Source inventory and placement | [Asset manifest](../assets/manifest.json), [source parts](../assets/parts/), [placement and material rules](../src/fit-data.js) |
| README scenes | [Six editable scene descriptions](scenes-spec.json) and the [rendered gallery](scene-examples.jpg); regenerate the public visuals with `npm run hero` |
| Hand and prop review (v0.8.1) | [Hand-by-hand findings](GRIP_REVIEW.md), [visual decisions](grip-evidence.json), [render results](grip-render-evidence.json), [before and after](grip-comparison.jpg), [production verification](grip-production.json), [production screenshot](production-v081.jpg) |

A review documents the revision and combinations it actually inspected. A successful render or passing geometry test does not establish that the layers look right in every outfit.

## Earlier reviews

These links open the repository **at the last verified v0.8.1 revision**, at [commit `03a220a`](https://github.com/WaylandP/potato-me/tree/03a220abe33a12552ff05bf6a2f9abae09f073d4). That snapshot includes the original reports, linked evidence, images and their context. Historical contact sheets describe their own release rather than the current renderer.

| Version | Review |
| --- | --- |
| v0.8.0 | [Attachments, Lumpy and the editor controls](https://github.com/WaylandP/potato-me/blob/03a220abe33a12552ff05bf6a2f9abae09f073d4/docs/ATTACHMENT_REVIEW.md) |
| v0.7.1 | [Front/rear headgear and hair overlap](https://github.com/WaylandP/potato-me/blob/03a220abe33a12552ff05bf6a2f9abae09f073d4/docs/WRAP_REVIEW.md) |
| v0.7.0 | [Wearable openings and hair fitting](https://github.com/WaylandP/potato-me/blob/03a220abe33a12552ff05bf6a2f9abae09f073d4/docs/WEARABLE_REVIEW.md) |
| v0.6.1 | [Body proportions and shape names](https://github.com/WaylandP/potato-me/blob/03a220abe33a12552ff05bf6a2f9abae09f073d4/docs/SHAPE_REVIEW.md) |
| v0.6.0 | [Arm material and character cohesion](https://github.com/WaylandP/potato-me/blob/03a220abe33a12552ff05bf6a2f9abae09f073d4/docs/COHESION_REVIEW.md) |
| v0.5.0 | [Everyday options and interaction coverage](https://github.com/WaylandP/potato-me/blob/03a220abe33a12552ff05bf6a2f9abae09f073d4/docs/EVERYDAY_AUDIT.md) |
| v0.4.0 | [Neckwear, hands and fitting audit](https://github.com/WaylandP/potato-me/blob/03a220abe33a12552ff05bf6a2f9abae09f073d4/docs/PUBLIC_AUDIT.md) |
| v0.3.1 | [Character fitting](https://github.com/WaylandP/potato-me/blob/03a220abe33a12552ff05bf6a2f9abae09f073d4/docs/CHARACTER_FITTING.md) |
| v0.3 | [Original inventory completion](https://github.com/WaylandP/potato-me/blob/03a220abe33a12552ff05bf6a2f9abae09f073d4/docs/ASSET_COMPLETION.md) and [import preview sheets](https://github.com/WaylandP/potato-me/tree/03a220abe33a12552ff05bf6a2f9abae09f073d4/assets/previews) |

See the [changelog](../CHANGELOG.md) for the release sequence.
