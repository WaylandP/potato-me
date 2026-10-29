import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PARTS, LAYER_ORDER, NO_IMAGE } from '../src/assets.js';
import { availableOptions, missingParts, drawableState, layerTransform, layersFor, cropBox } from '../src/raster.js';
import { OPTIONS, SKINS, MULTI, DEFAULT_STATE, PRESETS } from '../src/options.js';
import { FIT } from '../src/fit-data.js';

test('the asset index matches assets/manifest.json', async () => {
  const manifest = JSON.parse(await readFile(new URL('../assets/manifest.json', import.meta.url), 'utf8'));
  const indexed = Object.values(PARTS).reduce((n, g) => n + Object.keys(g).length, 0);
  assert.equal(indexed, manifest.assets.length, 'run npm run assets after changing the manifest');
  for (const a of manifest.assets) assert.deepEqual(PARTS[a.group][a.key], a.placedBox, a.path);
  assert.deepEqual(LAYER_ORDER, manifest.layerOrder);
});

test('every indexed part is a real option key, and every option is either drawn, a none choice, or listed as missing', () => {
  for (const [group, keys] of Object.entries(PARTS)) {
    if (group === 'body') {
      for (const k of Object.keys(keys)) {
        const [shape, skin] = k.split('-');
        assert.ok(OPTIONS.body[shape] && SKINS[skin], k);
      }
      continue;
    }
    const options = group === 'stickers' ? MULTI.stickers.options : OPTIONS[group];
    for (const k of Object.keys(keys)) assert.ok(options[k], `${group}/${k} is not an option`);
  }
  const avail = availableOptions();
  const missing = missingParts();
  for (const [group, options] of Object.entries(OPTIONS)) {
    if (['bg', 'pattern', 'hatColor', 'body', 'skin'].includes(group)) continue;
    for (const k of Object.keys(options)) {
      const drawn = k in avail[group];
      const none = NO_IMAGE[group]?.includes(k);
      assert.ok(drawn || missing[group]?.includes(k), `${group}/${k} is neither drawn nor listed as missing`);
      if (none) assert.ok(drawn, `${group}/${k} needs no image and must stay available`);
    }
  }
});

test('the default potato and every preset draw entirely from existing images', () => {
  assert.deepEqual(drawableState(DEFAULT_STATE), { ...DEFAULT_STATE });
  for (const [name, preset] of Object.entries(PRESETS)) {
    const s = drawableState({ ...DEFAULT_STATE, ...preset.patch });
    for (const [k, v] of Object.entries(preset.patch)) {
      if (k in availableOptions() && v in availableOptions()[k]) assert.equal(s[k], v, `${name}.${k}`);
    }
  }
});

test('choices without an image fall back to a drawable one', () => {
  const s = drawableState({ ...DEFAULT_STATE, gesture: 'wave', item: 'pizza' });
  assert.equal(s.gesture, 'shaka');
  assert.equal(s.item, 'laptop');
  assert.ok(missingParts().gesture.includes('wave'));
  assert.ok(missingParts().stickers.includes('lgtm'));
});

test('layers come out in manifest order with per-shape transforms applied', () => {
  const layers = layersFor({ ...DEFAULT_STATE, body: 'long', hat: 'wizard', neckwear: 'none' });
  assert.deepEqual(
    layers.map((l) => l.group),
    ['body', 'mouth', 'eyes', 'brows', 'hat', 'item', 'gesture'],
  );
  assert.equal(layers[0].key, 'long-russet');
  const hat = layers.find((l) => l.group === 'hat');
  assert.equal(hat.transform.scale, FIT.shapes.long.hat.scale);
  const classic = layerTransform('hat', 'wizard', 'classic');
  assert.deepEqual(classic, { dx: 0, dy: 0, scale: 1, rot: 0, flip: false });
  assert.equal(layerTransform('hat', 'tophat', 'round').dy, FIT.shapes.round.hat.dy + FIT.parts['hat/tophat@round'].dy);
});

test('every recolor and skin-tint entry names an existing part', () => {
  for (const [group, keys] of Object.entries(FIT.recolor)) for (const k of keys) assert.ok(PARTS[group][k], `${group}/${k}`);
  for (const hat of Object.keys(FIT.capText)) assert.ok(PARTS.hat[hat], hat);
  assert.equal(FIT.laptop.lid.length, 4);
  assert.deepEqual(cropBox('body'), [0, 0, 1024, 1024]);
  assert.equal(cropBox('eyes').length, 4);
});
