import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surfaceTransform, frameForPoints } from '../src/surface.js';
import { layerTransform } from '../src/raster.js';
import { PARTS } from '../src/assets.js';
import { FIT } from '../src/fit-data.js';
import { DEFAULT_STATE } from '../src/options.js';

const surface = { center: 510, eyeY: 438, shoulderY: 620, left: 210, right: 810, faceWidth: 600, featureWidth: 480, crownY: 160, row: () => [250, 770] };
const fit = (group, key, s = surface, state = DEFAULT_STATE) => surfaceTransform({ group, key, transform: layerTransform(group, key, state.body) }, null, s, state);
const point = (group, key, t, [x, y]) => {
  const [px, py] = FIT.pivots[`${group}/${key}`] || FIT.pivots[group];
  return [px + t.dx + (x - px) * t.scale, py + t.dy + (y - py) * t.scale * (t.aspectY || 1)];
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

test('mustaches rise above taller open mouths instead of becoming chin hair', () => {
  for (const key of ['mustache', 'handlebar']) {
    const b = PARTS.facialHair[key], c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    const closed = point('facialHair', key, fit('facialHair', key), c);
    const open = point('facialHair', key, fit('facialHair', key, surface, { ...DEFAULT_STATE, mouth: 'laugh' }), c);
    assert.ok(open[1] < closed[1]);
    assert.ok(closed[1] < surface.eyeY + 109);
  }
});

test('single-eye accessories align their lens or patch rather than their full strap or chain', () => {
  const monocle = point('eyewear', 'monocle', fit('eyewear', 'monocle'), [626, 439]);
  assert.deepEqual(monocle.map(Math.round), [596, 440]);
  const patch = point('eyewear', 'eyepatch', fit('eyewear', 'eyepatch'), [470, 425]);
  assert.deepEqual(patch.map(Math.round), [424, 440]);
  const halo = PARTS.hat.halo;
  const bottom = point('hat', 'halo', fit('hat', 'halo'), [(halo[0] + halo[2]) / 2, halo[3]]);
  assert.equal(Math.round(bottom[1]), surface.crownY - 22);
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

test('closed hats cover the top of a narrow body instead of exposing its tip', () => {
  const narrow = { ...surface, crownY: 156, row: y => [512 - (y - 120) * .6, 512 + (y - 120) * .6] };
  for (const [key, roof] of Object.entries(FIT.hatCrownY)) {
    const box = PARTS.hat[key], t = fit('hat', key, narrow, { ...DEFAULT_STATE, body: 'long' });
    const y = point('hat', key, t, [(box[0] + box[2]) / 2, roof])[1];
    assert.ok(y <= narrow.crownY - 8, `${key} leaves the body tip above its crown: ${y}`);
    assert.ok(t.scale > 0, `${key} has a positive scale`);
  }
});

test('tall-hat framing retains proportions and keeps the full original crop inside the circle', () => {
  const points = [[250, -200], [760, -150], [800, 300]];
  const frame = frameForPoints(points);
  assert.ok(frame.scale < 1);
  const originalCircle = Array.from({ length: 360 }, (_, d) => [512 + 492 * Math.cos(d * Math.PI / 180), 512 + 492 * Math.sin(d * Math.PI / 180)]);
  for (const [x, y] of [...points, ...originalCircle]) assert.ok(Math.hypot((x - 512) * frame.scale, (y - frame.centerY) * frame.scale) <= 492.00001);
  assert.deepEqual(frameForPoints([[400, 100], [620, 100]]), { scale: 1, centerY: 512 });
});
