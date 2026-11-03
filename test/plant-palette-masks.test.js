import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIT } from '../src/fit-data.js';

// Independent source-art witnesses, measured on the original 1024 px PNGs.
// Winding-number containment differs from the renderer's ray-crossing helper.
function contains([x, y], polygon) {
  let winding = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const cross = (b[0] - a[0]) * (y - a[1]) - (x - a[0]) * (b[1] - a[1]);
    if (a[1] <= y && b[1] > y && cross > 0) winding++;
    if (a[1] > y && b[1] <= y && cross < 0) winding--;
  }
  return winding !== 0;
}

test('plant protection follows the clay pot without preserving russet fingertip caps', () => {
  const protectedAt = point => FIT.skinProtect['item/plant'].some(polygon => contains(point, polygon));
  for (const point of [[285,643], [109,705], [147,707], [189,716], [230,745], [95,690], [100,690]]) {
    assert.equal(protectedAt(point), false, `plant grip skin at ${point} must follow the selected body`);
  }
  for (const point of [[180,500], [170,586], [286,611], [140,650], [250,710], [230,728], [110,690]]) {
    assert.equal(protectedAt(point), true, `plant or clay material at ${point} must retain its color`);
  }
});

test('palette protection separates finger caps from wood, paint and the crossing brush', () => {
  const protectedAt = point => FIT.skinProtect['item/palette'].some(polygon => contains(point, polygon));
  for (const point of [[201,638], [220,649], [145,681], [164,678], [182,684], [130,688], [153,684], [173,684]]) {
    assert.equal(protectedAt(point), false, `palette grip skin at ${point} must follow the selected body`);
  }
  for (const point of [[120,600], [150,655], [169,670], [202,671], [220,665], [216,630]]) {
    assert.equal(protectedAt(point), true, `palette or brush material at ${point} must retain its color`);
  }
});
