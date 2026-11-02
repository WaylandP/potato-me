import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTS } from '../src/assets.js';
import { FIT } from '../src/fit-data.js';
import { DEFAULT_STATE, OPTIONS } from '../src/options.js';
import { layerTransform, layersFor } from '../src/raster.js';
import { drawTransformed, fittedPoint, surfaceTransform } from '../src/surface.js';
import { splitWearable, wrapSpec } from '../src/wrap.js';

test('rear wearable pieces name real parts and an actual receiving layer', () => {
  for (const [name, spec] of Object.entries(FIT.wrap)) {
    const [group, key] = name.split('/');
    assert.ok(PARTS[group]?.[key], `${name}: missing original artwork`);
    assert.ok(['body', 'hair'].includes(spec.behind), `${name}: unsupported receiving layer`);
    assert.ok(typeof spec.path === 'string' && spec.path.startsWith('M'), `${name}: measured source path required`);
  }
  assert.equal(wrapSpec('extra', 'earbuds', DEFAULT_STATE).behind, 'body', 'insert tips must be behind the potato');
});

test('headphone rear-band splitting follows the selected hat layer order', () => {
  for (const hat of Object.keys(OPTIONS.hat)) {
    const state = { ...DEFAULT_STATE, hat, hair: 'bun', extra: 'headphones' };
    const order = layersFor(state).map(l => l.group);
    const spec = wrapSpec('extra', 'headphones', state);
    const outsideClosedHat = !['none', 'headband', 'halo'].includes(hat) && order.indexOf('extra') > order.indexOf('hat');
    if (outsideClosedHat) assert.equal(spec, null, `${hat}: the cap must not hide an overlying headphone band`);
    else assert.equal(spec?.behind, 'hair', `${hat}: the bun must be able to emerge in front of the band`);
  }
});

test('front-only decorative artwork stays intact without allocating split images', () => {
  const img = { width: 1024, height: 1024 };
  // These calls deliberately run without a DOM: unwrapped artwork must pass
  // through unchanged, including the Santa cuff and the complete bow.
  for (const [group, key] of [['hat', 'santa'], ['hat', 'bow'], ['hat', 'halo'], ['extra', 'barrette'], ['eyewear', 'monocle']]) {
    assert.equal(wrapSpec(group, key, DEFAULT_STATE), null);
    assert.deepEqual(splitWearable(img, group, key, DEFAULT_STATE), { front: img });
  }
});

// Record transformed image rectangles without providing a fake rasterizer.
// This checks that the renderer and its framing geometry agree; browser proof
// images remain responsible for alpha-mask and artistic-quality verification.
class ImagePlacementContext {
  matrix = [1, 0, 0, 1, 0, 0];
  stack = [];
  draws = [];
  paths = [];
  save() { this.stack.push([...this.matrix]); }
  restore() { this.matrix = this.stack.pop(); }
  translate(x, y) {
    const m = this.matrix;
    m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y;
  }
  scale(x, y) {
    const m = this.matrix;
    m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y;
  }
  rotate(angle) {
    const [a, b, c, d, e, f] = this.matrix, cos = Math.cos(angle), sin = Math.sin(angle);
    this.matrix = [a * cos + c * sin, b * cos + d * sin, c * cos - a * sin, d * cos - b * sin, e, f];
  }
  drawImage(img, ...args) {
    const [sx, sy, sw, sh, dx, dy, dw, dh] = args.length === 8 ? args : [0, 0, img.width, img.height, ...args];
    this.draws.push({ source: [sx, sy, sw, sh], target: [dx, dy, dw, dh], matrix: [...this.matrix] });
  }
  beginPath() { this.path = []; }
  moveTo(x, y) { this.path.push([x,y]); }
  lineTo(x, y) { this.path.push([x,y]); }
  quadraticCurveTo(cx, cy, x, y) {
    const [sx, sy] = this.path.at(-1);
    for (let i=1;i<=64;i++) {
      const u=i/64, v=1-u;
      this.path.push([v*v*sx+2*v*u*cx+u*u*x, v*v*sy+2*v*u*cy+u*u*y]);
    }
  }
  closePath() {}
  clip() { this.paths.push([...this.path]); }
}

const surface = { center: 510, eyeY: 438, shoulderY: 620, left: 210, right: 810, faceWidth: 600, featureWidth: 480, crownY: 160, headTop: 84, row: () => [250, 770], headRow: () => [192, 828] };
const transformFor = (group, key, state) => surfaceTransform({ group, key, transform: layerTransform(group, key, state.body) }, null, surface, state);
function renderedPoint(draws, sourcePoint) {
  const [x, y] = sourcePoint;
  const draw = draws.find(({ source: [sx, sy, sw, sh] }) => x >= sx && x <= sx + sw && y >= sy && y <= sy + sh);
  assert.ok(draw, `no image rectangle contains source point ${sourcePoint}`);
  const { source: [sx, sy, sw, sh], target: [dx, dy, dw, dh], matrix: [a, b, c, d, e, f] } = draw;
  const px = dx + (x - sx) * dw / sw, py = dy + (y - sy) * dh / sh;
  return [a * px + c * py + e, b * px + d * py + f];
}

test('headphone source pieces retain their fitted registration at full and thumbnail resolutions', () => {
  const state = { ...DEFAULT_STATE, hair: 'curls', extra: 'headphones', hat: 'none' };
  const transform = transformFor('extra', 'headphones', state);
  // The two ear cups and two band points exercise both dimensions of the fit.
  // A renderer that applies fitX but silently omits warp fails the band checks.
  const probes = [[218, 600], [802, 602], [511, 190], [410, 360]];
  for (const size of [1024, 256]) {
    const ctx = new ImagePlacementContext();
    drawTransformed(ctx, { width: size, height: size }, 'extra', 'headphones', transform);
    for (const sourcePoint of probes) {
      const actual = renderedPoint(ctx.draws, sourcePoint.map(v => v * size / 1024));
      const expected = fittedPoint('extra', 'headphones', transform, sourcePoint);
      assert.ok(actual.every((v, i) => Math.abs(v - expected[i]) < 1e-6), `${size}px source ${sourcePoint}: rendering differs from framing geometry`);
    }
    assert.equal(ctx.stack.length, 0, 'drawing must restore the parent canvas transform');
  }
});

test('the rear glasses pass draws only hinge material and leaves the lenses for the front pass', () => {
  for (const key of ['shades', 'aviators', 'round', 'square', 'catEye']) for (const size of [1024, 256]) {
    const t = transformFor('eyewear', key, DEFAULT_STATE), img = { width: size, height: size };
    const arms = new ImagePlacementContext(), front = new ImagePlacementContext();
    drawTransformed(arms, img, 'eyewear', key, { ...t, templesOnly: true });
    drawTransformed(front, img, 'eyewear', key, { ...t, temples: undefined });
    assert.equal(arms.draws.length, 2, `${key}: both temple arms must be drawn`);
    assert.ok(arms.draws.every(d => d.source[2] <= 12 * size / 1024 && d.source[3] <= 12 * size / 1024), `${key}: the rear pass must not redraw the front frames or lenses`);
    assert.equal(front.draws.length, 1, `${key}: draw the front frame exactly once`);
    assert.deepEqual(front.draws[0].source, [0, 0, size, size]);
    assert.equal(arms.stack.length, 0);
    assert.equal(front.stack.length, 0);
  }
});

test('headband rear trimming preserves the curved front fabric at both lateral turns', () => {
  const state = { ...DEFAULT_STATE, hair:'curls', hat:'headband' };
  const ctx = new ImagePlacementContext();
  drawTransformed(ctx, {width:1024,height:1024}, 'hat', 'headband', transformFor('hat','headband',state));
  const path = ctx.paths[0];
  assert.ok(path, 'headband needs its measured front/rear boundary');
  const inside = ([x,y]) => {
    let crossed = false;
    for (let i=0,j=path.length-1;i<path.length;j=i++) {
      const [ax,ay]=path[i], [bx,by]=path[j];
      if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) crossed=!crossed;
    }
    return crossed;
  };
  // Source-art points on the lower front knit: an inverted arch used to
  // remove both lateral samples and leave a chopped strip in the preview.
  for (const point of [[200,560],[512,533],[824,560]]) assert.ok(inside(point), `front knit removed at ${point}`);
  assert.ok(!inside([80,650]), 'the hanging rear return should remain behind the wearer');
});
