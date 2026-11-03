import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIT } from '../src/fit-data.js';

function contains(point, polygon) {
  let winding = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const cross = (b[0] - a[0]) * (point[1] - a[1]) - (point[0] - a[0]) * (b[1] - a[1]);
    if (a[1] <= point[1] && b[1] > point[1] && cross > 0) winding++;
    if (a[1] > point[1] && b[1] <= point[1] && cross < 0) winding--;
  }
  return winding !== 0;
}

test('laptop material protection preserves hardware without protecting exposed grip skin', () => {
  const protectedAt = point => FIT.skinProtect['item/laptop'].some(polygon => contains(point, polygon));
  // Landmarks inspected on the original 1024 px PNG, not inferred from its
  // bounding box. The old envelope covered every one of these skin points.
  for (const [name, point] of [
    ['shoulder behind the keyboard', [280, 644]],
    ['palm below the keyboard', [280, 666]],
    ['left supporting fingertip', [105, 652]],
    ['middle supporting fingertip', [130, 658]],
    ['left fingertip side', [114, 656]],
    ['middle fingertip side', [142, 662]],
    ['right supporting fingertip', [150, 665]],
    ['palm below the lid', [210, 675]],
  ]) assert.equal(protectedAt(point), false, `${name} must follow the selected body skin`);
  for (const [name, point] of [
    ['lid', [100, 610]],
    ['keyboard', [250, 648]],
    ['keyboard rim', [275, 653]],
    ['side bezel', [290, 656]],
    ['lower lid', [200, 665]],
  ]) assert.equal(protectedAt(point), true, `${name} must retain its original metal color`);
});

test('duck protection follows the object around the supporting fingers and thumb', () => {
  const protectedAt = point => FIT.skinProtect['item/duck'].some(polygon => contains(point, polygon));
  // The former diagonal cut through the breast recolored yellow rubber as
  // potato skin, while its opposite edge left the thumb tip russet.
  for (const point of [[190,654], [200,670], [150,630], [120,612], [260,620]]) {
    assert.equal(protectedAt(point), true, `duck material at ${point} must remain yellow`);
  }
  for (const point of [[280,610], [285,620], [125,630], [155,650], [99,620]]) {
    assert.equal(protectedAt(point), false, `gripping skin at ${point} must follow the body`);
  }
});

test('donut and controller masks leave the visible hand edges tintable', () => {
  // Donut witnesses follow the replacement opposed grip, including the index
  // pad inside the hole, front thumb, support fingers and their contact edges.
  for (const [key, skin, material] of [
    ['donut', [[220,575], [210,590], [176,539], [174,531], [175,552], [120,640], [160,650]], [[229,441], [123,482], [179,629], [144,523], [209,523], [176,557], [198,585], [222,563]]],
    ['controller', [[325,689], [317,689], [309,685]], [[325,678], [320,670], [200,600]]],
  ]) {
    const protectedAt = point => FIT.skinProtect[`item/${key}`].some(polygon => contains(point, polygon));
    for (const point of skin) assert.equal(protectedAt(point), false, `${key}: skin at ${point} must follow the body`);
    for (const point of material) assert.equal(protectedAt(point), true, `${key}: object material at ${point} must retain its color`);
  }
});


test('coffee ceramic handle stays separate from gripping fingers', () => {
  const protectedAt = point => FIT.skinProtect['item/coffee'].some(polygon => contains(point, polygon));
  // Observed source PNG witnesses on both exposed handle arcs and adjoining
  // fingers. The old cup rectangle omitted every ceramic handle witness.
  for (const point of [[211,625], [203,629], [197,631], [209,633], [207,693], [209,697], [215,699], [197,695]]) {
    assert.equal(protectedAt(point), true, `ceramic handle at ${point} must follow the mug color`);
  }
  for (const point of [[205,615], [199,645], [201,663], [201,685], [199,689], [199,635]]) {
    assert.equal(protectedAt(point), false, `finger at ${point} must follow the body skin`);
  }
});


test('sign wood and trophy gold end at the observed gripping skin', () => {
  // Current1024 source witnesses at the two native-review defects: the pole
  // above the fist and the small index fingertip above the trophy support.
  for (const [key, skin, material] of [
    ['sign', [[190,636], [200,636], [173,637]], [[190,630], [190,633], [204,630], [190,775]]],
    ['trophy', [[150,593], [155,594], [150,595], [150,610]], [[173,588], [180,440], [162,587]]],
  ]) {
    const protectedAt = point => FIT.skinProtect[`item/${key}`].some(polygon => contains(point, polygon));
    for (const point of skin) assert.equal(protectedAt(point), false, `${key}: skin at ${point} must follow the body`);
    for (const point of material) assert.equal(protectedAt(point), true, `${key}: object at ${point} must retain its material`);
  }
});
