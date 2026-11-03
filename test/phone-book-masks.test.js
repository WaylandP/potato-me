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

// Independent landmarks read from each current 1024 px source PNG. Book
// coordinates follow the replacement palm-under-spine artwork, including all
// four supporting fingertips; phone retains its original source witnesses.
for (const [key, skin, object] of [
  ['phone', [[184,620], [180,650], [250,696], [278,586]], [[260,670], [180,540], [186,592], [280,650]]],
  ['book', [[100,676], [126,688], [151,709], [179,734], [226,747], [370,650]], [[120,540], [278,541], [215,650], [197,711]]],
]) test(`${key} grip skin follows the body while its object material stays protected`, () => {
  const protectedAt = point => FIT.skinProtect[`item/${key}`].some(polygon => contains(point, polygon));
  for (const point of skin) assert.equal(protectedAt(point), false, `skin at ${point} must follow the selected body`);
  for (const point of object) assert.equal(protectedAt(point), true, `object material at ${point} must retain its original color`);
});
