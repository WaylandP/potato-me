import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surfaceTransform, frameForPoints, fittedPoint } from '../src/surface.js';
import { layerTransform } from '../src/raster.js';
import { PARTS } from '../src/assets.js';
import { FIT } from '../src/fit-data.js';
import { DEFAULT_STATE, BODY_PROFILES, OPTIONS } from '../src/options.js';

const surface = { center: 510, eyeY: 438, shoulderY: 620, left: 210, right: 810, faceWidth: 600, featureWidth: 480, crownY: 160, row: () => [250, 770] };
const fit = (group, key, s = surface, state = DEFAULT_STATE) => surfaceTransform({ group, key, transform: layerTransform(group, key, state.body) }, null, s, state);
const point = fittedPoint;

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

test('headphones open around fitted hair without widening their ear cups', () => {
  const state = { ...DEFAULT_STATE, hair: 'curls', hat: 'none', extra: 'headphones' };
  const bare = fit('extra', 'headphones', surface, state);
  const hair = { ...surface, headTop: 90, headRow: () => [192, 828] };
  const worn = fit('extra', 'headphones', hair, state);
  const p = (t, x, y = 620) => point('extra', 'headphones', t, [x, y]);
  for (const [left, right] of [[145, 298], [726, 877]]) {
    assert.ok(Math.abs((p(bare, right)[0] - p(bare, left)[0]) - (p(worn, right)[0] - p(worn, left)[0])) < 1e-6, 'cup material must not stretch with hair volume');
  }
  assert.ok(p(worn, 300)[0] < p(bare, 300)[0], 'left pad must reach the outside of the hairstyle');
  assert.ok(p(worn, 724)[0] > p(bare, 724)[0], 'right pad must reach the outside of the hairstyle');
  assert.ok(p(worn, 512, PARTS.extra.headphones[1])[1] < hair.headTop, 'band must clear the fitted curls');
});

test('a raised bun passes in front of a scalp-seated headphone band', () => {
  const state = { ...DEFAULT_STATE, hair: 'bun', hat: 'none', extra: 'headphones' };
  const bun = { ...surface, headTop: 5, headRow: () => [220, 800] };
  const t = fit('extra', 'headphones', bun, state);
  const top = point('extra', 'headphones', t, [512, PARTS.extra.headphones[1]])[1];
  assert.ok(top > bun.headTop + 20, 'band should sit behind the bun instead of arching over its tip');
  assert.ok(top < bun.crownY, 'band should still clear the scalp');
});

test('halo clears the selected hairstyle and the fitted headphone band', () => {
  for (const [hair, headTop] of [['none', 160], ['curls', 85], ['bun', 5]]) {
    const s = { ...surface, headTop, headRow: () => [220, 800] };
    const state = { ...DEFAULT_STATE, hair, hat: 'halo', extra: 'headphones' };
    const h = fit('hat', 'halo', s, state), b = PARTS.hat.halo;
    const bottom = point('hat', 'halo', h, [(b[0] + b[2]) / 2, b[3]])[1];
    const hp = fit('extra', 'headphones', s, state);
    const bandTop = point('extra', 'headphones', hp, [512, PARTS.extra.headphones[1]])[1];
    assert.ok(bottom <= Math.min(headTop, bandTop) - 21, `${hair}: halo overlaps hair or headphones`);
  }
});

test('earbud nozzle tips enter the actual left and right side contours', () => {
  for (const sides of [[260, 800], [385, 642]]) {
    const s = { ...surface, faceWidth: sides[1] - sides[0], row: () => sides };
    const t = fit('extra', 'earbuds', s);
    const left = point('extra', 'earbuds', t, [486, 432]);
    const right = point('extra', 'earbuds', t, [538, 432]);
    left[0] -= t.spread; right[0] += t.spread;
    assert.ok(left[0] > sides[0] && left[0] < sides[0] + 15, 'left nozzle must be inserted, not floating');
    assert.ok(right[0] < sides[1] && right[0] > sides[1] - 15, 'right nozzle must be inserted, not floating');
    assert.equal(Math.round(left[1]), s.eyeY + 5);
    assert.equal(Math.round(right[1]), s.eyeY + 5);
  }
});

test('glasses reach the temples while retaining their front lens geometry', () => {
  for (const key of ['shades', 'aviators', 'round', 'square', 'catEye']) {
    const narrow = fit('eyewear', key, { ...surface, row: () => [330, 690] });
    const wide = fit('eyewear', key, { ...surface, row: () => [200, 820] });
    assert.equal(wide.scale, narrow.scale, `${key}: head width must not enlarge the lenses`);
    assert.equal(wide.dx, narrow.dx);
    assert.equal(wide.dy, narrow.dy);
    assert.equal(wide.temples.length, 2);
    const ends = wide.temples.map(arm => point('eyewear', key, wide, arm.end));
    assert.deepEqual(ends.map(([x]) => Math.round(x)), [196, 824]);
    assert.ok(ends.every(([, y]) => Math.abs(y - (surface.eyeY - 32)) < 1e-6));
  }
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

test('wide hats leave the eye line clear on a short body, with or without hair', () => {
  const petite = { ...surface, crownY: 300, eyeY: 475, row: () => [220, 804] };
  for (const hair of ['none', 'curls']) for (const key of ['chef', 'cap', 'sunhat', 'tophat', 'beanie']) {
    const b = PARTS.hat[key];
    const t = fit('hat', key, petite, { ...DEFAULT_STATE, body: 'petite', hair });
    const bottom = point('hat', key, t, [(b[0] + b[2]) / 2, b[3]])[1];
    assert.ok(bottom < petite.eyeY - 25, `${key}/${hair} obscures the eye opening`);
  }
});

test('wide brims follow the actual forehead row without enlarging the crown or hiding the eyes', () => {
  // Round with braids: the hair flares outward below the crown. Measuring one
  // row and placing the opening much higher previously produced a floating brim.
  const headRow = y => {
    const half = 190 + (y - 140) * 1.1;
    return [510 - half, 510 + half];
  };
  const worn = { ...surface, crownY: 160, headTop: 90, headRow };
  for (const key of ['sunhat', 'cowboy']) {
    const b = PARTS.hat[key], opening = FIT.hatOpenings[key];
    const t = fit('hat', key, worn, { ...DEFAULT_STATE, body: 'round', hair: 'braids', hat: key });
    const at = (x,y) => point('hat',key,t,[x,y]);
    const left = at(opening.x - opening.width/2, opening.y);
    const right = at(opening.x + opening.width/2, opening.y);
    const [headLeft, headRight] = headRow(left[1]);
    assert.ok(left[0] <= headLeft && left[0] >= headLeft - 12);
    assert.ok(right[0] >= headRight && right[0] <= headRight + 12);
    assert.ok(left[1] > worn.crownY + 40, key + ' must sit around the forehead');
    const ratio = (at(b[2],opening.y)[0] - at(b[0],opening.y)[0]) / (right[0]-left[0]);
    assert.ok(ratio > 1.30 && ratio < 1.55, key + ' needs a visible, proportionate brim');
    assert.ok(at(opening.x,b[3])[1] <= worn.eyeY - 88, key + ' must clear the brows');
  }
});

test('Petite is the narrow profile at a smaller uniform size; the broad profile is Wide', () => {
  assert.equal(OPTIONS.body.long, 'Petite');
  assert.equal(OPTIONS.body.petite, 'Wide');
  assert.ok(BODY_PROFILES.long.size < BODY_PROFILES.classic.size);
  assert.equal(BODY_PROFILES.petite.size, BODY_PROFILES.classic.size);
});

test('hair openings touch the temples without covering the eye envelope on narrow and broad bodies', () => {
  for (const faceWidth of [268, 450, 600]) for (const key of Object.keys(FIT.hairOpenings)) {
    const s = { ...surface, faceWidth, featureWidth: Math.max(350, Math.min(480, faceWidth)), crownY: faceWidth > 500 ? 284 : 160 };
    const t = fit('hair', key, s, { ...DEFAULT_STATE, hair: key, hat: 'none', eyes: 'almond' });
    const opening = FIT.hairOpenings[key];
    const left = point('hair', key, t, [opening.left, opening.y]), right = point('hair', key, t, [opening.right, opening.y]);
    assert.ok(left[0] > s.center - faceWidth / 2 && right[0] < s.center + faceWidth / 2, `${key} floats outside the temples`);
    assert.ok(right[0] - left[0] >= s.featureWidth * .64, `${key} covers the eye corners`);
    const tips = point('hair', key, t, [opening.left, PARTS.hair[key][3]])[1];
    assert.ok(tips <= s.shoulderY + 86, `${key} falls into the feet`);
  }
});

test('a bun keeps its raised crown with open headwear and tucks under closed hats', () => {
  const box = PARTS.hair.bun;
  const top = hat => {
    const t = fit('hair', 'bun', surface, { ...DEFAULT_STATE, hair: 'bun', hat });
    return point('hair', 'bun', t, [(box[0] + box[2]) / 2, box[1] ])[1];
  };
  for (const hat of ['headband', 'bow', 'flowerCrown', 'halo', 'horns', 'crown']) assert.equal(top(hat), top('none'));
  for (const hat of ['backwardCap', 'cap', 'beanie', 'bucket', 'cowboy', 'hardhat', 'sunhat']) assert.ok(top(hat) > top('none') + 75, `${hat} leaves the bun raised around its dome`);
});


test('Wide headband leaves the scalp visible and its front edge above the brows', () => {
  const wide = { ...surface, crownY: 300, eyeY: 475, row: () => [220, 804] };
  const t = fit('hat', 'headband', wide, { ...DEFAULT_STATE, body: 'petite' });
  const b = PARTS.hat.headband;
  assert.ok(point('hat', 'headband', t, [512, b[1]])[1] > wide.crownY);
  assert.ok(point('hat', 'headband', t, [512, 535])[1] < wide.eyeY - 70);
});

test('pom-poms stay round when a hat crown is shortened for a broad body', () => {
  const wide = { ...surface, crownY: 300, eyeY: 475, row: () => [220, 804] };
  for (const [key, join] of [['beanie',110], ['party',80]]) {
    const t = fit('hat', key, wide, { ...DEFAULT_STATE, body:'petite' });
    const top = PARTS.hat[key][1];
    const a = point('hat',key,t,[512,top]), b = point('hat',key,t,[512,join]);
    assert.ok(Math.abs((b[1]-a[1])-(join-top)*t.scale)<.001);
  }
});
