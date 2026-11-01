import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surfaceTransform } from '../src/surface.js';
import { layerTransform } from '../src/raster.js';
import { PARTS } from '../src/assets.js';
import { FIT } from '../src/fit-data.js';
import { DEFAULT_STATE } from '../src/options.js';

const surface = { center: 510, eyeY: 438, shoulderY: 620, left: 210, right: 810, faceWidth: 600, featureWidth: 480, crownY: 160, row: () => [250, 770] };
const fit = (group, key, s = surface, state = DEFAULT_STATE) => surfaceTransform({ group, key, transform: layerTransform(group, key, state.body) }, null, s, state);
const point = (group, key, t, [x, y]) => {
  const [px, py] = FIT.pivots[`${group}/${key}`] || FIT.pivots[group];
  return [px + t.dx + (x - px) * t.scale, py + t.dy + (y - py) * t.scale];
};

test('facial features follow the selected body landmarks, rather than their source position', () => {
  for (const [group, key, targetY] of [['eyes', 'wide', 438], ['mouth', 'grin', 547]]) {
    const box = PARTS[group][key];
    const fitted = point(group, key, fit(group, key), [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2]);
    assert.ok(Math.abs(fitted[0] - surface.center) < 1e-6);
    assert.ok(Math.abs(fitted[1] - targetY) < 1e-6);
  }
});

test('beard opening is aligned with the selected mouth, including narrow bodies', () => {
  for (const width of [350, 480]) {
    const opening = point('facialHair', 'beard', fit('facialHair', 'beard', { ...surface, featureWidth: width }), [512, 590]);
    assert.deepEqual(opening.map(Math.round), [510, 547]);
  }
});

test('manual fitting still moves and scales the final automatic fit', () => {
  const key = 'mouth/grin', box = PARTS.mouth.grin;
  const center = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
  const original = fit('mouth', 'grin');
  try {
    FIT.surfaceNudges.parts[key] = { dx: 12, dy: -8, scale: 1.1 };
    const edited = fit('mouth', 'grin');
    assert.equal(edited.scale, original.scale * 1.1);
    assert.deepEqual(point('mouth', 'grin', edited, center).map(Math.round), [522, 539]);
  } finally { delete FIT.surfaceNudges.parts[key]; }
});

test('headphones flex their band to the crown without resizing the ear cups', () => {
  const high = fit('extra', 'headphones', { ...surface, crownY: 120 }, { ...DEFAULT_STATE, hat: 'none' });
  const low = fit('extra', 'headphones', { ...surface, crownY: 220 }, { ...DEFAULT_STATE, hat: 'none' });
  assert.equal(high.scale, low.scale);
  assert.equal(high.dx, low.dx);
  assert.equal(high.dy, low.dy);
  assert.ok(high.warp.topOffset < low.warp.topOffset);
});


test('a low forehead band never pulls headphones down below the crown', () => {
  const bare = fit('extra', 'headphones', surface, { ...DEFAULT_STATE, hat: 'none' });
  const band = fit('extra', 'headphones', surface, { ...DEFAULT_STATE, hat: 'headband' });
  assert.ok(band.warp.topOffset <= bare.warp.topOffset);
});
