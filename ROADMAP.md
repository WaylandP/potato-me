# Roadmap

The [live editor](https://potato-me.vercel.app/) builds and shares avatars entirely in the browser. The [changelog](CHANGELOG.md) records shipped changes, and the [visual review index](docs/README.md) records what was inspected.

## What you can use today

- Build a potato with six shapes, nine skins, outfits, props and independent hand gestures.
- Start from an inspiration look, remix it and share the result in a URL. No account is required.
- Preview the avatar crop and download a square PNG at 512 or 1024 px.
- Report a fit issue with its exact share link, and reproduce the look in the editor or the contributor fitting tool.

## Version notices

Starting in v0.8.2, the editor checks the public [version.json](version.json) when you return to a tab. If a newer version is available it offers a refresh that preserves the avatar in the URL. Older builds that polled the unavailable package manifest can be updated with a normal refresh.

## Next priorities

- [ ] Test on physical iOS/Safari and Android devices beyond the documented Chromium checks.
- [ ] Complete manual VoiceOver and NVDA reviews of selection, keyboard navigation and download feedback.
- [ ] Add undo and redo so individual edits are easier to compare and recover.
- [ ] Measure performance, accessibility and best practices with Lighthouse before setting a score claim.

## Later ideas

- More expressions, hats, gestures and seasonal art packs that meet the fitting checks.
- An opt-in community gallery based on shared avatar links. The current inspiration shelf contains built-in looks; it does not accept public posts.

The editor has no image-upload service or storage backend. Proposed items have no scheduled release dates.
