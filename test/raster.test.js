import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
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

test('all shipped source PNGs match the manifest, canvas size and RGBA format', async () => {
  const manifest = JSON.parse(await readFile(new URL('../assets/manifest.json', import.meta.url), 'utf8'));
  for (const asset of manifest.assets) {
    const png = await readFile(new URL('../' + asset.path, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG', asset.path);
    assert.equal(png.readUInt32BE(16), 1024, asset.path);
    assert.equal(png.readUInt32BE(20), 1024, asset.path);
    assert.equal(png[25], 6, `${asset.path}: RGBA required`);
    const chunks = []; let ended = false;
    for (let offset = 8; offset + 12 <= png.length;) {
      const length = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8);
      assert.ok(offset + length + 12 <= png.length, `${asset.path}: truncated ${type} chunk`);
      if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length));
      if (type === 'IEND') ended = true;
      offset += length + 12;
    }
    assert.ok(ended && chunks.length, `${asset.path}: complete PNG required`);
    assert.equal(inflateSync(Buffer.concat(chunks)).length, 1024 * (1024 * 4 + 1), `${asset.path}: complete RGBA scanlines required`);
    assert.equal(createHash('sha256').update(png).digest('hex'), asset.sha256, asset.path);
  }
});

test('a full beard falls in front of a worn scarf instead of being cut across by it', () => {
  const layers = layersFor({ ...DEFAULT_STATE, neckwear: 'scarf', facialHair: 'beard' }).map(l => l.group);
  assert.ok(layers.indexOf('neckwear') < layers.indexOf('facialHair'));
});

test('mustaches stay above the mouth even when headphones reorder the extras', () => {
  for (const facialHair of ['mustache', 'handlebar']) for (const extra of ['none', 'headphones']) {
    const order = layersFor({ ...DEFAULT_STATE, facialHair, extra }).map(l => l.group);
    assert.ok(order.indexOf('facialHair') > order.indexOf('mouth'));
    assert.ok(order.indexOf('facialHair') < order.indexOf('eyes'));
  }
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

test('completed choices remain selected and no planned parts are missing', () => {
  const s = drawableState({ ...DEFAULT_STATE, gesture: 'wave', item: 'pizza' });
  assert.equal(s.gesture, 'wave');
  assert.equal(s.item, 'pizza');
  assert.deepEqual(missingParts(), {});
});

test('a temporarily unavailable part still falls back without a broken request', () => {
  const wave = PARTS.gesture.wave;
  try {
    delete PARTS.gesture.wave;
    const s = drawableState({ ...DEFAULT_STATE, gesture: 'wave' });
    assert.notEqual(s.gesture, 'wave');
    assert.ok(PARTS.gesture[s.gesture]);
    assert.ok(missingParts().gesture.includes('wave'));
  } finally {
    PARTS.gesture.wave = wave;
  }
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
  assert.deepEqual(classic, { dx: 0, dy: 0, scale: 1, rot: 0, flip: false, spread: 0 });
  assert.equal(layerTransform('extra', 'earbuds', 'long').spread, FIT.parts['extra/earbuds'].spread + FIT.parts['extra/earbuds@long'].spread);
  assert.equal(layerTransform('hat', 'tophat', 'round').dy, FIT.shapes.round.hat.dy + FIT.parts['hat/tophat@round'].dy);
});

test('headphones go under hats that cover the head and over hats that do not', () => {
  const order = (hat) => layersFor({ ...DEFAULT_STATE, hat, extra: 'headphones' }).map((l) => l.group);
  const under = order('tophat');
  assert.ok(under.indexOf('extra') < under.indexOf('hat'));
  const over = order('backwardCap');
  assert.ok(over.indexOf('extra') > over.indexOf('hat'));
  const none = order('none');
  assert.ok(none.includes('extra') && !none.includes('hat'));
});

test('every material and fitting entry names an existing part', () => {
  for (const hat of FIT.headphonesOver) assert.ok(PARTS.hat[hat], hat);
  for (const [group, keys] of Object.entries(FIT.recolor)) for (const k of keys) assert.ok(PARTS[group][k], `${group}/${k}`);
  for (const hat of Object.keys(FIT.capText)) assert.ok(PARTS.hat[hat], hat);
  for (const key of [...Object.keys(FIT.parts), ...Object.keys(FIT.surfaceNudges.parts), ...Object.keys(FIT.surfaceRoots), ...Object.keys(FIT.skinProtect)]) {
    const [group, rest] = key.split('/');
    const [part, shape] = rest.split('@');
    assert.ok(PARTS[group]?.[part], `${key} names a missing part`);
    if (shape) assert.ok(OPTIONS.body[shape], `${key} names a missing shape`);
  }
  for (const key of Object.keys(FIT.pivots)) if (key.includes('/')) assert.ok(PARTS[key.split('/')[0]]?.[key.split('/')[1]], key);
  assert.equal(FIT.laptop.lid.length, 4);
  assert.deepEqual(cropBox('body'), [0, 0, 1024, 1024]);
  assert.equal(cropBox('eyes').length, 4);
});
