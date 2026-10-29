import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surprise } from '../src/surprise.js';
import { OPTIONS, PRESETS, MULTI } from '../src/options.js';
import { availableOptions, drawableState } from '../src/raster.js';

const seeded = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

test('surprise is repeatable and always valid', () => {
  assert.deepEqual(surprise(seeded(3)), surprise(seeded(3)));
  const rng = seeded(77);
  for (let i = 0; i < 200; i++) {
    const s = surprise(rng);
    for (const key of Object.keys(OPTIONS)) assert.ok(Object.hasOwn(OPTIONS[key], s[key]), `${key}=${s[key]}`);
    assert.ok(s.stickers.length >= 3 && s.stickers.length <= MULTI.stickers.max);
  }
});

test('surprise only uses parts that exist when given the available options', () => {
  const avail = availableOptions();
  const rng = seeded(5);
  for (let i = 0; i < 200; i++) {
    const s = surprise(rng, avail);
    assert.deepEqual(drawableState(s), s, 'every choice is drawable');
  }
});

test('surprise keeps potatoes coherent: a vibe face, few accessories, no clashing colors', () => {
  const rng = seeded(11);
  const faces = new Set(Object.values(PRESETS).map((p) => `${p.patch.eyes}/${p.patch.brows}`));
  let worn = 0;
  for (let i = 0; i < 300; i++) {
    const s = surprise(rng);
    assert.ok(faces.has(`${s.eyes}/${s.brows}`), `eyes and brows come from a vibe: ${s.eyes}/${s.brows}`);
    const count = ['eyewear', 'neckwear', 'extra'].filter((k) => s[k] !== 'none').length;
    assert.ok(count <= 2, 'at most two worn accessories');
    worn += count;
    if (s.skin === 'gold') assert.notEqual(s.bg, 'gold');
    if (s.skin === 'red') assert.notEqual(s.hatColor, 'red');
    if (s.extra === 'headphones') assert.ok(['none', 'backwardCap', 'cap', 'beanie', 'headband', 'bucket', 'halo'].includes(s.hat));
  }
  assert.ok(worn > 100, 'accessories still show up regularly');
});
