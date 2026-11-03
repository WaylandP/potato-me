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
  for (const [key, skin, material] of [
    ['donut', [[116,582], [132,585], [181,589], [140,610]], [[155,590], [180,565], [230,600]]],
    ['controller', [[325,689], [317,689], [309,685]], [[325,678], [320,670], [200,600]]],
  ]) {
    const protectedAt = point => FIT.skinProtect[`item/${key}`].some(polygon => contains(point, polygon));
    for (const point of skin) assert.equal(protectedAt(point), false, `${key}: skin at ${point} must follow the body`);
    for (const point of material) assert.equal(protectedAt(point), true, `${key}: object material at ${point} must retain its color`);
  }
});
