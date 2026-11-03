import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIT } from '../src/fit-data.js';

// Independent source witnesses inspected on the original 1024 px artwork.
// Winding-number containment deliberately differs from the renderer's ray test.
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

function check(key, skin, material) {
  const protectedAt = point => FIT.skinProtect[`item/${key}`].some(polygon => contains(point, polygon));
  for (const point of skin) assert.equal(protectedAt(point), false, `${key}: visible skin at ${point} must follow the selected body`);
  for (const point of material) assert.equal(protectedAt(point), true, `${key}: prop material at ${point} must retain its color`);
}

test('bouquet ribbon and exposed stems remain protected around every gripping finger', () => {
  check('bouquet',
    [[151,635],[163,635],[170,631],[157,654],[170,654],[173,672],[192,623],[201,645],[211,675]],
    [[128,650],[139,630],[147,617],[158,620],[177,640],[185,656],[190,674],[198,694],[202,705],[176,712]],
  );
});

test('teacup protection follows the gold handle without covering the finger in its opening', () => {
  check('teacup',
    [[178,643],[180,650],[195,628],[203,632],[179,669],[186,685]],
    [[120,650],[125,696],[174,636],[182,634],[172,663],[181,663],[158,674]],
  );
});

test('pizza protection ends at the crust above the supporting finger and follows the thumb', () => {
  check('pizza',
    [[290,620],[299,570],[286,579],[298,591],[277,627],[260,640],[320,615]],
    [[286,550],[330,555],[280,600],[267,618],[240,630],[210,645],[100,490]],
  );
});
