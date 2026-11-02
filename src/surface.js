// Fit and light the modular artwork against the actual selected body surface.
// Pixel analysis stays in the browser; no external service or generated avatar is used.
import { PARTS, CANVAS } from './assets.js';
import { FIT } from './fit-data.js';
import { LruCache } from './cache.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
const lum = (r, g, b) => .2126 * r + .7152 * g + .0722 * b;
const SIZE = 256;
const planes = new WeakMap();
function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
function pixels(img, size = SIZE) {
  const c = canvas(size), ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, size, size);
  return { canvas: c, data: ctx.getImageData(0, 0, size, size).data };
}
export function bodySurface(img, shape) {
  if (planes.has(img)) return planes.get(img);
  const original = pixels(img);
  const tiny = canvas(48), t = tiny.getContext('2d'); t.drawImage(img, 0, 0, 48, 48);
  const soft = pixels(tiny);
  const row = y => {
    const yy = Math.round(y / 4); let left = 128, right = 128;
    for (let x = 30; x < 226; x++) if (original.data[(yy * SIZE + x) * 4 + 3] > 240) { left = x; break; }
    for (let x = 225; x >= 30; x--) if (original.data[(yy * SIZE + x) * 4 + 3] > 240) { right = x; break; }
    return [left * 4, right * 4];
  };
  let crownY = 154;
  for (let y = 12; y < 80; y++) if (original.data[(y * SIZE + 128) * 4 + 3] > 245) { crownY = y * 4; break; }
  const shoulderY = { classic: 608, lumpy: 618, round: 590, long: 610, pear: 608, petite: 610 }[shape];
  const [left, right] = row(shoulderY);
  const eyeY = { classic: 432, lumpy: 439, round: 438, long: 433, pear: 430, petite: 475 }[shape];
  const [faceLeft, faceRight] = row(eyeY);
  const center = (faceLeft + faceRight) / 2;
  const materialSamples = [];
  for (let y = Math.round(eyeY / 4); y < Math.round((shoulderY + 105) / 4); y += 2) for (let x = Math.round((center - (right - left) * .39) / 4); x < Math.round((center + (right - left) * .39) / 4); x += 2) {
    const i = (y * SIZE + x) * 4;
    if (original.data[i + 3] > 245) materialSamples.push([original.data[i], original.data[i + 1], original.data[i + 2]]);
  }
  materialSamples.sort((a, b) => lum(...a) - lum(...b));
  const average = rows => rows.length ? [0, 1, 2].map(c => rows.reduce((n, rgb) => n + rgb[c], 0) / rows.length) : [180, 125, 70];
  // Robust material samples, not one arbitrary freckle or shiny pixel. The
  // same material palette is used for both arms; baked shading stays local.
  const quantile = q => {
    const at = Math.floor(materialSamples.length * q), spread = Math.max(4, Math.floor(materialSamples.length * .05));
    return average(materialSamples.slice(Math.max(0, at - spread), at + spread));
  };
  const material = quantile(.55);
  const palette = [quantile(.10), material, quantile(.90)];
  const surface = { ...original, soft: soft.data, row, eyeY, shoulderY, left, right, faceWidth: faceRight - faceLeft, featureWidth: clamp(faceRight - faceLeft, 350, 480), center, material, palette, crownY };
  planes.set(img, surface); return surface;
}
// The wearer includes the selected hairstyle. This object belongs to one
// render, so concurrent option thumbnails never overwrite one another's fit.
const wornSurfaces = new WeakMap();
export function withHairSurface(surface, img, key, transform) {
  const layer = integratedLayer(img, 'hair', key, transform, surface, 256);
  if (wornSurfaces.has(layer)) return wornSurfaces.get(layer);
  const data = layer.getContext('2d').getImageData(0, 0, 256, 256).data;
  let hairTop = CANVAS;
  for (let y = 0; y < 256; y++) {
    let solid = 0;
    for (let x = 0; x < 256; x++) if (data[(y * 256 + x) * 4 + 3] > 160) solid++;
    if (solid >= 3) { hairTop = y * 4; break; }
  }
  const hairRow = y => {
    const yy = clamp(Math.round(y / 4), 0, 255); let left = 256, right = -1;
    for (let x = 0; x < 256; x++) if (data[(yy * 256 + x) * 4 + 3] > 160) { left = Math.min(left, x); right = x; }
    return right < left ? surface.row(y) : [left * 4, right * 4];
  };
  const headRow = y => { const b = surface.row(y), h = hairRow(y); return [Math.min(b[0], h[0]), Math.max(b[1], h[1])]; };
  const worn = { ...surface, hairRow, headRow, hairTop, headTop: Math.min(surface.crownY, hairTop) };
  wornSurfaces.set(layer, worn); return worn;
}
function polygonContains(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
const skins = new WeakMap();
function skinAnalysis(img, group, key) {
  if (skins.has(img)) return skins.get(img);
  const SIZE = ['eyes', 'mouth'].includes(group) ? 512 : 256, unit = CANVAS / SIZE;
  const { data } = pixels(img, SIZE), count = SIZE * SIZE;
  const candidate = new Uint8Array(count), mask = new Uint8Array(count), dist = new Float32Array(count);
  const queue = new Int32Array(count); let head = 0, tail = 0;
  const protectedRegions = FIT.skinProtect?.[`${group}/${key}`] || [];
  const box = PARTS[group][key];
  const eyeBoxes = [];
  if (group === 'eyes') for (const side of [0, 1]) {
    let x0 = SIZE, y0 = SIZE, x1 = 0, y1 = 0;
    for (let y = 0; y < SIZE; y++) for (let x = side * (SIZE / 2); x < (side + 1) * (SIZE / 2); x++) if (data[(y * SIZE + x) * 4 + 3] > 150) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    eyeBoxes.push([x0, y0, x1, y1]);
  }
  const eyeInterior = new Uint8Array(count);
  if (group === 'eyes') {
    // Start inside lit sclera, then include its warm cream shadows. Connected
    // growth keeps disconnected pale potato highlights outside this mask.
    for (const b of eyeBoxes) for (let y = b[1] + 1; y < b[3]; y++) for (let x = b[0] + 1; x < b[2]; x++) {
      const p = y * SIZE + x, i = p * 4, r = data[i], g = data[i + 1], blue = data[i + 2];
      if (data[i + 3] > 220 && Math.min(r, g, blue) > 160 && Math.max(r, g, blue) - Math.min(r, g, blue) < 34 && Math.abs(r - g) < 18) { eyeInterior[p] = 1; queue[tail++] = p; }
    }
    while (head < tail) {
      const p = queue[head++];
      for (const q of [p - 1, p + 1, p - SIZE, p + SIZE]) {
        if (q < 0 || q >= count || eyeInterior[q]) continue;
        const i = q * 4, r = data[i], g = data[i + 1], b = data[i + 2];
        if (data[i + 3] > 80 && r > 55 && b > r * .52 && g > r * .62) { eyeInterior[q] = 1; queue[tail++] = q; }
      }
    }
    head = tail = 0;
  }
  const enclosedFeature = (x, y) => {
    if (group === 'eyes') {
      if (['dots', 'happy', 'squint', 'dead', 'joyLashes'].includes(key) || (['wink', 'lashWink'].includes(key) && x >= SIZE / 2)) return false;
      if (eyeInterior[y * SIZE + x]) return true;
      return (FIT.eyeIrises?.[key] || []).some(iris => {
        const sx = x * unit, sy = y * unit, clip = iris.visibleClip;
        return ((sx - iris.cx) / iris.rx) ** 2 + ((sy - iris.cy) / iris.ry) ** 2 <= 1 && (!clip || sy >= clip.minYAtCenter + clip.slope * (sx - iris.cx));
      });
    }
    return false;
  };
  for (let p = 0; p < count; p++) {
    const i = p * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    const x = p % SIZE, y = (p / SIZE) | 0;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const facial = ['eyes', 'mouth', 'cheeks', 'facialHair'].includes(group);
    const warm = facial ? r > g * .98 && g > b * 1.03 && r - b > 12 && max > 38 : r >= g * .97 && g >= b * .98 && r - b > 5 && max > 20;
    candidate[p] = data[i + 3] > 12 && warm && !protectedRegions.some(poly => polygonContains(x * unit, y * unit, poly)) && !enclosedFeature(x, y) && !(group === 'facialHair' && max < 145) ? 1 : 0;
    dist[p] = data[i + 3] < 20 ? 0 : 100;
  }
  // Only potato-colored regions connected to an exterior edge are skin. This
  // leaves brown irises and mouth interiors enclosed by their features intact.
  for (let y = 1; y < SIZE - 1; y++) for (let x = 1; x < SIZE - 1; x++) {
    const p = y * SIZE + x;
    if (candidate[p] && [p - 1, p + 1, p - SIZE, p + SIZE].some(q => data[q * 4 + 3] < 100)) { mask[p] = 1; queue[tail++] = p; }
  }
  while (head < tail) {
    const p = queue[head++];
    for (const q of [p - 1, p + 1, p - SIZE, p + SIZE]) if (q >= 0 && q < count && candidate[q] && !mask[q]) { mask[q] = 1; queue[tail++] = q; }
  }
  // Gestures contain nothing except potato skin. Mask their complete alpha,
  // including cool shadows, pale highlights and dark pores. On mixed layers,
  // fill only tiny enclosed pigment gaps; prop masks remain authoritative.
  if (group === 'mouth' && ['smirk', 'smile', 'frown', 'flat', 'wavy', 'kiss', 'whistle'].includes(key)) {
    // Closed lips are entirely potato material, including neutral crease
    // shadows. A warm-color test alone leaves gray/green rims on other skins.
    for (let p = 0; p < count; p++) mask[p] = data[p * 4 + 3] > 0 && !protectedRegions.some(poly => polygonContains((p % SIZE) * unit, Math.floor(p / SIZE) * unit, poly)) ? 1 : 0;
  } else if (group === 'gesture' || (group === 'item' && key === 'none')) {
    for (let p = 0; p < count; p++) mask[p] = data[p * 4 + 3] > 0 ? 1 : 0;
  } else if (group === 'item') {
    const filled = mask.slice();
    for (let y = 2; y < SIZE - 2; y++) for (let x = 2; x < SIZE - 2; x++) {
      const p = y * SIZE + x;
      if (mask[p] || data[p * 4 + 3] < 20 || protectedRegions.some(poly => polygonContains(x * unit, y * unit, poly))) continue;
      let near = 0;
      for (const [dx, dy] of [[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[1,1],[-1,1],[1,-1]]) near += mask[p + dy * SIZE + dx];
      if (near >= 6) filled[p] = 1;
    }
    mask.set(filled);
  }
  for (let y = 1; y < SIZE; y++) for (let x = 1; x < SIZE; x++) { const p = y * SIZE + x; dist[p] = Math.min(dist[p], dist[p - 1] + 1, dist[p - SIZE] + 1); }
  for (let y = SIZE - 2; y >= 0; y--) for (let x = SIZE - 2; x >= 0; x--) { const p = y * SIZE + x; dist[p] = Math.min(dist[p], dist[p + 1] + 1, dist[p + SIZE] + 1); }
  const samples = [];
  for (let p = 0; p < count; p++) if (mask[p]) samples.push(lum(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]));
  samples.sort((a, b) => a - b);
  const base = samples[Math.floor(samples.length * .55)] || 150;
  const levels = [.10, .55, .90].map(q => samples[Math.floor(samples.length * q)] || base);
  const limb = group === 'item' || group === 'gesture';
  let edge = group === 'item' ? 0 : SIZE - 1;
  if (limb) for (let p = 0; p < count; p++) if (mask[p] && data[p * 4 + 3] > 200) {
    const x = p % SIZE, y = (p / SIZE) | 0;
    if (y < 125 || y > 209) continue;
    if (group === 'item') edge = Math.max(edge, x); else edge = Math.min(edge, x);
  }
  let totalY = 0, n = 0;
  if (limb) for (let p = 0; p < count; p++) if (mask[p] && Math.abs(p % SIZE - edge) <= 3 && ((p / SIZE) | 0) >= 125 && ((p / SIZE) | 0) <= 209) { totalY += ((p / SIZE) | 0); n++; }
  const root = [edge * 4, (n ? totalY / n : 160) * 4];
  const c = canvas(SIZE), ctx = c.getContext('2d'), id = ctx.createImageData(SIZE, SIZE);
  for (let p = 0; p < count; p++) {
    const i = p * 4; id.data[i] = 255; id.data[i + 1] = Math.round(255 * smooth(dist[p] * unit / 10)); id.data[i + 2] = (FIT.skinFront?.[`${group}/${key}`] || []).some(poly => polygonContains((p % SIZE) * unit, Math.floor(p / SIZE) * unit, poly)) ? 255 : 0;
    id.data[i + 3] = mask[p] ? 255 : 0;
  }
  ctx.putImageData(id, 0, 0);
  const value = { mask: c, base, levels, root, dist, data, skin: mask };
  skins.set(img, value); return value;
}
function projected(point, t, pivot) {
  const a = t.rot * Math.PI / 180, x = point[0] - pivot[0], y = point[1] - pivot[1];
  return [pivot[0] + t.dx + (x * Math.cos(a) - y * Math.sin(a)) * t.scale * (t.flip ? -1 : 1), pivot[1] + t.dy + (x * Math.sin(a) + y * Math.cos(a)) * t.scale * (t.aspectY || 1)];
}
// Sample the existing hinge material for the arms. The lenses and the front
// frame remain an unwarped image; only these short strips reach the temples.
const eyewearHinges = {
  shades: [[359, 400, 6, 9], [659, 400, 6, 9]],
  aviators: [[380, 421, 8, 10], [636, 421, 8, 10]],
  round: [[389, 422, 9, 10], [626, 422, 9, 10]],
  square: [[350, 395, 7, 10], [669, 395, 7, 10]],
  catEye: [[353, 391, 7, 10], [665, 391, 7, 10]],
};
export function surfaceTransform(layer, img, surface, state) {
  const { group, key } = layer, t = { ...layer.transform };
  const pivot = FIT.pivots[`${group}/${key}`] || FIT.pivots[group] || [512, 512];
  const box = PARTS[group][key], width = box[2] - box[0], height = box[3] - box[1];
  const move = (source, target) => { const p = projected(source, t, pivot); t.dx += target[0] - p[0]; t.dy += target[1] - p[1]; };
  const center = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
  if (group === 'item' || group === 'gesture') {
    const specificRoot = FIT.surfaceRoots?.[`${group}/${key}`];
    const root = specificRoot?.point || skinAnalysis(img, group, key).root;
    if (specificRoot?.flip) t.flip = !t.flip;
    // The laptop sits partly in front of the torso, as an object held in a
    // bent arm would. Its supporting hand must not be shrunk into a thumbnail.
    const palmWidth = FIT.palmWidth[group][key];
    const handSize = clamp((surface.right - surface.left) * .23, 85, 120);
    t.scale = handSize / palmWidth * (specificRoot?.foreshorten || 1);
    const inset = specificRoot?.inset ?? (key === 'laptop' ? 125 : 65);
    if (specificRoot?.rot) t.rot = specificRoot.rot;
    const x = group === 'item' ? surface.left + inset : surface.right - inset;
    const y = surface.shoulderY + (specificRoot?.dy || 0);
    move(root, [x, y]);
    t.root = [x, y];
    // Crop fitting happens to the WHOLE character. Never shrink one hand
    // independently just because its prop reaches farther from the body.
  } else if (group === 'hair') {
    const opening = FIT.hairOpenings[key];
    const cx = (opening.left + opening.right) / 2;
    const short = ['pixie', 'bun'].includes(key);
    const eyeRatio = { dots: .46, happy: .57, wide: .57, wink: .59, sleepy: .61, angry: .60, surprised: .57, side: .61, squint: .58, rolling: .58, heart: .55, stars: .55, dead: .54, joyLashes: .62 }[state.eyes] || .64;
    const gap = Math.min(surface.faceWidth * .94, Math.max(surface.featureWidth * eyeRatio + 24, surface.faceWidth * (short ? .84 : .68)));
    const volume = clamp(surface.faceWidth * .11, key === 'curls' ? 75 : short ? 36 : 55, 78);
    const shell = opening.shell || [box[0], box[2]];
    // Fit the inner temples and the outer volume independently. Enlarging a
    // curly wig uniformly to open its face also doubles its side volume.
    const left = surface.faceWidth / 2 + volume, right = opening.shell ? surface.faceWidth * .48 + volume * .35 : left;
    t.fitX = [[shell[0], cx - left], [opening.left, cx - gap / 2], [opening.right, cx + gap / 2], [shell[1], cx + right]];
    t.fitCrown = { top: box[1], eye: opening.y, left: shell[0], right: shell[1], toLeft: cx - left, toRight: cx + right };
    if (opening.shell) t.fitX.push([box[2], cx + right + clamp(surface.faceWidth * .18, 70, 115)]);
    const raisedBun = key === 'bun' && ['none', 'headband', 'bow', 'flowerCrown', 'halo', 'horns', 'crown'].includes(state.hat);
    const crownVolume = raisedBun ? 155 : clamp(surface.faceWidth * .13, 40, 75);
    const length = Math.min(opening.length * clamp(surface.faceWidth / 450, .78, 1.12), surface.shoulderY + 85 - surface.eyeY);
    t.fitY = [[box[1], opening.y + surface.crownY - crownVolume - surface.eyeY], [opening.y, opening.y], [box[3], opening.y + length]];
    t.scale = 1;
    move([cx, opening.y], [surface.center, surface.eyeY]);
  } else if (group === 'eyes') {
    const ratio = { smug: .64, dots: .46, happy: .57, wide: .57, wink: .59, sleepy: .61, angry: .60, surprised: .57, side: .61, squint: .58, rolling: .58, heart: .55, stars: .55, dead: .54, almond: .64, lashWink: .64, joyLashes: .62 }[key];
    t.scale = surface.featureWidth * ratio / width;
    move(center, [surface.center, surface.eyeY]);
  } else if (group === 'brows') {
    t.scale = surface.featureWidth * .63 / width;
    const lift = key === 'raised' ? 21 : key === 'worried' ? 8 : 0;
    move(center, [surface.center, surface.eyeY - (['wide', 'surprised', 'stars', 'heart', 'rolling'].includes(state.eyes) ? 76 : 56) - lift]);
  } else if (group === 'mouth') {
    const ratio = { smirk: .48, grin: .49, laugh: .46, smile: .45, roseSmile: .33, flat: .35, frown: .39, oh: .20, tongue: .44, grit: .42, whistle: .23, kiss: .23, wavy: .40 }[key];
    // Musical notes sit beside the whistling lips; they are not part of the
    // mouth's anatomical width or center.
    t.scale = surface.featureWidth * ratio / (key === 'whistle' ? 108 : width);
    move(key === 'whistle' ? [538, 562.5] : center, [surface.center, surface.eyeY + 109]);
  } else if (group === 'cheeks') {
    t.scale = surface.featureWidth * .72 / width;
    move(center, [surface.center, surface.eyeY + 62]);
  } else if (group === 'facialHair') {
    t.scale = surface.featureWidth * ({ mustache: .6, handlebar: .7, goatee: .32, beard: .75, stubble: .73 }[key]) / width;
    if (key === 'mustache' || key === 'handlebar') {
      const mouthBox = PARTS.mouth[state.mouth];
      const mt = surfaceTransform({ group: 'mouth', key: state.mouth, transform: { dx: 0, dy: 0, scale: 1, rot: 0, spread: 0, flip: false } }, null, surface, state);
      const mouthHeight = (mouthBox[3] - mouthBox[1]) * mt.scale;
      t.aspectY = .72;
      move(center, [surface.center, surface.eyeY + 109 - Math.max(38, mouthHeight * .42)]);
    } else if (key === 'beard') move([512, 590], [surface.center, surface.eyeY + 109]);
    else move([center[0], box[1]], [surface.center, surface.eyeY + (key === 'goatee' ? 122 : 66)]);
  } else if (group === 'eyewear') {
    const ratios = { shades: .77, aviators: .81, round: .75, square: .76, monocle: .33, eyepatch: .78, catEye: .81 };
    t.scale = surface.featureWidth * ratios[key] / width;
    move(key === 'monocle' ? [626, 439] : center, [surface.center + (key === 'monocle' ? surface.featureWidth * .18 : 0), surface.eyeY + 2]);
    if (eyewearHinges[key]) {
      const seat = surface.eyeY - 32, sides = surface.row(seat);
      t.temples = eyewearHinges[key].map((source, i) => {
        const hinge = [source[0] + source[2] / 2, source[1] + source[3] / 2];
        const x = sides[i] + (i ? 4 : -4);
        const end = [pivot[0] + (x - pivot[0] - t.dx) / t.scale, pivot[1] + (seat - pivot[1] - t.dy) / t.scale];
        return { side: i ? 1 : -1, source, hinge, end };
      });
    }
    if (key === 'eyepatch') {
      t.scale = surface.featureWidth * .31 / 128;
      move([470, 425], [surface.center - surface.featureWidth * .18, surface.eyeY + 2]);
      const sides = surface.row(surface.eyeY - 20);
      const sourceX = x => pivot[0] + (x - pivot[0] - t.dx) / t.scale;
      // Extend only the straps to the head edges. The leather patch keeps its
      // shape and stays centered over the eye on both wide and narrow bodies.
      t.strapX = [sourceX(sides[0] - 3), sourceX(surface.row(surface.eyeY - 96)[1] - 4)];
      // The uncovered eye needs a clear opening. Route the far strap upward
      // from the patch, then around the temple, keeping the leather texture.
      t.strapLift = 76 / t.scale;
      t.strapRiseEnd = sourceX(surface.center + surface.featureWidth * .16);
    }
  } else if (group === 'jewelry') {
    const desiredHeight = { hoops: 76, pearlDrops: 63, starStuds: 32 }[key];
    t.scale = desiredHeight * clamp(surface.faceWidth / 450, .66, 1.28) / height;
    const sides = surface.row(surface.eyeY + 50);
    const alpha = pixels(img).data;
    const centers = [0, 1].map(side => {
      let lo = 256, hi = 0;
      for (let y = 0; y < 256; y++) for (let x = side * 128; x < (side + 1) * 128; x++) if (alpha[(y * 256 + x) * 4 + 3] > 100) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
      return (lo + hi) * 2;
    });
    t.spread = ((sides[1] - sides[0] - 10) - (centers[1] - centers[0]) * t.scale) / 2;
    move([(centers[0] + centers[1]) / 2, box[1] + height * .06], [surface.center, surface.eyeY + 50]);
  } else if (group === 'hat' && key === 'bow') {
    t.scale = surface.featureWidth * .48 / width;
    move([center[0], box[3] - height * .18], [surface.center - surface.faceWidth * .22, surface.crownY + (surface.hairRow ? 10 : 35)]);
  } else if (group === 'hat' && key === 'flowerCrown') {
    const seat = Math.min(surface.crownY + 95, surface.eyeY - 165), sides = (surface.headRow || surface.row)(seat + 16);
    t.scale = (sides[1] - sides[0] + 34) / width;
    move(center, [surface.center, seat]);
  } else if (group === 'hat' && key === 'halo') {
    t.scale = surface.featureWidth * .42 / width;
    let top = surface.headTop ?? surface.crownY;
    if (state.extra === 'headphones') {
      const headphones = { group: 'extra', key: 'headphones', transform: { dx: 0, dy: 0, scale: 1, rot: 0, spread: 0, flip: false } };
      const ht = surfaceTransform(headphones, null, surface, state), hb = PARTS.extra.headphones;
      top = Math.min(top, fittedPoint('extra', 'headphones', ht, [(hb[0] + hb[2]) / 2, hb[1]])[1]);
    }
    move([center[0], box[3]], [surface.center, top - 22]);
  } else if (group === 'hat') {
    const fit = FIT.hatOpenings[key];
    const forehead = surface.eyeY - surface.crownY;
    const headRow = surface.headRow || surface.row;
    let seat = surface.crownY + forehead * fit.depth;
    const sides = headRow(seat);
    t.scale = (sides[1] - sides[0] + surface.faceWidth * .025) / fit.width;
    // A shallow, broad forehead needs a broad, shallow crown. Keep the band
    // and brim at their fitted width while shaping the fabric above them.
    // Moving a uniformly tiny hat onto the apex would merely perch it there.
    const maxHeight = (880 - surface.crownY) * ({ chef:.54, cap:.43, backwardCap:.43, beanie:.44, bucket:.40, sunhat:.38, wizard:.68, tophat:.55 }[key] || .48);
    const crownHeight = Math.min((fit.y - box[1]) * t.scale, maxHeight);
    const bandJoin = Math.max(box[1] + 10, fit.y - 36);
    const bandHeight = Math.min(36 * t.scale, crownHeight * .25);
    t.fitY = [[box[1], fit.y - crownHeight / t.scale], [bandJoin, fit.y - bandHeight / t.scale], [fit.y, fit.y], [CANVAS, CANVAS]];
    seat = Math.min(seat, surface.eyeY - 90 - (box[3] - fit.y) * t.scale);
    const ornamentJoin = { beanie: 110, party: 80 }[key];
    if (ornamentJoin) {
      const joinedY = mapAxis(ornamentJoin, t.fitY);
      t.fitY = [[box[1], joinedY - (ornamentJoin - box[1])], [ornamentJoin, joinedY], ...t.fitY.filter(([y]) => y > ornamentJoin)];
    }
    if (key === 'headband') {
      delete t.fitY;
      t.frontBandCurve = true;
      t.aspectY = Math.min(1, clamp(forehead * .38, 65, 105) / (205 * t.scale));
      seat = surface.eyeY - 100;
    }
    move([fit.x, fit.y], [surface.center, seat]);
    const roof = FIT.hatCrownY[key];
    if (roof !== undefined) {
      const roofY = fittedPoint(group, key, t, [fit.x, roof])[1];
      t.dy -= Math.max(0, roofY - (surface.crownY - 12));
    }
  } else if (group === 'neckwear') {
    // A potato has no neck: the cloth wraps the upper torso. The visible
    // front band reaches both silhouette edges; its tails hang below it.
    const seat = surface.eyeY + (key === 'bandana' ? 124 : ['pearls', 'pendant'].includes(key) ? 145 : 110);
    const sides = surface.row(seat + 28);
    // The bandana knot and scarf tails extend beyond the body-wrap anchors.
    const span = key === 'bandana' ? [.02, .88] : key === 'scarf' ? [.02, .95] : [0, 1];
    const bandWidth = width * (span[1] - span[0]);
    const bandCenter = box[0] + width * (span[0] + span[1]) / 2;
    t.scale = (sides[1] - sides[0] + 12) / bandWidth;
    const maxHeight = { bowtie: 155, tie: 270, scarf: 280, chain: 220, lanyard: state.body === 'petite' ? 200 : 280, bandana: 225, pearls: 125, pendant: 140 }[key];
    if (key === 'lanyard') {
      const join = state.body === 'petite' ? 560 : box[1] + height * .64;
      if (state.body === 'petite') t.lowerScale = .65;
      const shorten = Math.max(0, join - box[1] + (box[3] - join) * (t.lowerScale || 1) - maxHeight / t.scale);
      t.warp = { sourceTop: box[1], join, topOffset: shorten };
      move([bandCenter, box[1] + shorten], [surface.center, seat]);
    } else {
      t.aspectY = Math.min(1, maxHeight / (height * t.scale));
      move([bandCenter, box[1]], [surface.center, seat]);
    }
  } else if (group === 'extra' && key === 'headphones') {
    t.scale = (surface.faceWidth + 65) / width;
    move([center[0], box[3] - height * .20], [surface.center, surface.eyeY + 4]);
    // Place the inner pads against the worn head, not inside a bare-body
    // bounding box. Move the rigid cups sideways and flex only the band.
    const earY = surface.eyeY + 4, bare = surface.row(earY);
    const worn = (surface.headRow || surface.row)(earY);
    const bulge = clamp(surface.faceWidth * .16, 40, 78);
    const sides = [Math.max(worn[0], bare[0] - bulge), Math.min(worn[1], bare[1] + bulge)];
    const overlap = clamp(surface.faceWidth * .08, 18, 36);
    const sourceX = x => pivot[0] + (x - pivot[0] - t.dx) / t.scale;
    const left = sourceX(sides[0] + overlap) - 300, right = sourceX(sides[1] - overlap) - 724;
    t.fitX = [[0, left], [300, 300 + left], [724, 724 + right], [CANVAS, CANVAS + right]];
    const hairTop = surface.headTop ?? surface.crownY;
    // A bun rises in front of the band. Lifting the whole arc over its tip
    // makes the headphones hover above the scalp instead of wearing them.
    const bandCrown = state.hair === 'bun' ? Math.max(hairTop, surface.crownY - clamp(surface.faceWidth * .13, 40, 75)) : hairTop;
    let top = bandCrown - 24;
    if (FIT.headphonesOver.includes(state.hat) && PARTS.hat[state.hat] && state.hat !== 'halo') {
      const hat = { group: 'hat', key: state.hat, transform: { dx: 0, dy: 0, scale: 1, rot: 0, spread: 0, flip: false } };
      const ht = surfaceTransform(hat, null, surface, state), hb = PARTS.hat[state.hat];
      top = Math.min(top, fittedPoint('hat', state.hat, ht, [(hb[0] + hb[2]) / 2, hb[1]])[1] - 12);
    }
    const sourceTop = projected([center[0], box[1]], t, pivot)[1];
    t.warp = { sourceTop: box[1], join: box[1] + height * .54, topOffset: (top - sourceTop) / t.scale };
  } else if (group === 'extra' && key === 'earbuds') {
    t.scale = .92 * clamp(surface.faceWidth / 450, .66, 1.28);
    // The silicone tips face inward at x=486/538. Seat them slightly into
    // the actual side contour; centering the whole buds on the contour made
    // them float beside the potato and left the tips visibly unattached.
    const seat = surface.eyeY + 5, sides = surface.row(seat);
    const inset = 9 * t.scale;
    t.spread = (sides[1] - sides[0] - 2 * inset - 52 * t.scale) / 2;
    move([512, 432], [(sides[0] + sides[1]) / 2, seat]);
  } else if (group === 'extra' && key === 'earring') {
    t.scale = .92 * clamp(surface.faceWidth / 450, .66, 1.28);
    const sides = surface.row(surface.eyeY + 70);
    move([box[0], box[1] + 6], [sides[1] - 3, surface.eyeY + 70]);
  } else if (group === 'extra' && key === 'bandaid') {
    t.scale = Math.min(1.25, surface.faceWidth * .15 / width);
    move(center, [surface.center + surface.faceWidth * .29, surface.eyeY + 66]);
  } else if (group === 'extra' && ['flower', 'barrette', 'scrunchie'].includes(key)) {
    t.scale = .82 * clamp(surface.faceWidth / 450, .66, 1.28);
    const seat = surface.eyeY - 48;
    const edge = surface.hairRow ? surface.hairRow(seat)[0] : surface.row(seat)[0];
    move(center, [edge + width * t.scale * .45, seat]);
  }
  // Manual corrections are applied after anatomy fitting, around the attachment
  // or feature center, so fit.html controls remain effective.
  for (const nudge of [FIT.surfaceNudges.shapes[state.body]?.[group], FIT.surfaceNudges.parts[`${group}/${key}`], FIT.surfaceNudges.parts[`${group}/${key}@${state.body}`]]) {
    if (!nudge) continue;
    const anchor = (group === 'item' || group === 'gesture') ? (FIT.surfaceRoots?.[`${group}/${key}`]?.point || skinAnalysis(img, group, key).root) : center;
    const at = projected(anchor, t, pivot);
    t.scale *= nudge.scale ?? 1; t.rot += nudge.rot || 0;
    if (nudge.flip) t.flip = !t.flip;
    move(anchor, [at[0] + (nudge.dx || 0), at[1] + (nudge.dy || 0)]);
    if (t.root) t.root = [at[0] + (nudge.dx || 0), at[1] + (nudge.dy || 0)];
  }
  return t;
}

// Frame a tall hat and the entire character together. Shrinking only the hat
// makes its brim narrower than the head and exposes potato skin above it.
export function frameForPoints(points) {
  const top = Math.min(20, ...points.map(p => p[1]));
  const centerY = (top + 1004) / 2;
  let radius = 492 + Math.abs(centerY - 512); // all existing body/limb crop points
  for (const [x, y] of points) radius = Math.max(radius, Math.hypot(x - 512, y - centerY));
  return { scale: Math.min(1, 492 / radius), centerY };
}
export function fittedPoint(group, key, t, [x, y]) {
  const xx = t.fitX ? mappedX(x, y, t) : t.lowerScale && y >= t.warp.join ? 512 + (x - 512) * t.lowerScale : x;
  const yy = t.fitY ? mapAxis(y, t.fitY) : t.warp ? mappedWarpY(y, t) : t.crownWarp ? crownY(y, t.crownWarp) : y;
  return projected([xx, yy], t, FIT.pivots[`${group}/${key}`] || FIT.pivots[group] || [512, 512]);
}
const silhouettes = new WeakMap();
function framingPoints(img, group, key, transform) {
  if (!silhouettes.has(img)) {
    const { data } = pixels(img, 128), points = [];
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) if (data[(y * 128 + x) * 4 + 3] > 48) points.push([x * 8, y * 8]);
    silhouettes.set(img, points);
  }
  return silhouettes.get(img).map(p => fittedPoint(group, key, transform, p));
}
function mapAxis(value, knots) {
  let i = 0;
  while (i < knots.length - 2 && value > knots[i + 1][0]) i++;
  const [a, b] = [knots[i], knots[i + 1]];
  return a[1] + (value - a[0]) / (b[0] - a[0]) * (b[1] - a[1]);
}
function mappedX(x, y, t) {
  const fitted = mapAxis(x, t.fitX), c = t.fitCrown;
  if (!c) return fitted;
  const crown = c.toLeft + (x - c.left) / (c.right - c.left) * (c.toRight - c.toLeft);
  // Opening correction belongs at the temples. Applying it to every row
  // creates vertical walls through the upper crown of a narrow hairstyle.
  const blend = smooth((y - c.top - (c.eye - c.top) * .15) / ((c.eye - c.top) * .85));
  return crown * (1 - blend) + fitted * blend;
}
const warpedY = (y, warp) => y + warp.topOffset * clamp((warp.join - y) / (warp.join - warp.sourceTop));
const mappedWarpY = (y, t) => t.lowerScale && y >= t.warp.join ? t.warp.join + (y - t.warp.join) * t.lowerScale : warpedY(y, t.warp);
const crownY = (y, warp) => y + warp.offset * clamp(y < warp.join ? (y - warp.top) / (warp.join - warp.top) : (warp.end - y) / (warp.end - warp.join));
export function headFrame(parts) { return frameForPoints(parts.flatMap(({ img, group, key, transform }) => framingPoints(img, group, key, transform))); }
export function hatFrame(img, key, transform) { return headFrame([{ img, group: 'hat', key, transform }]); }
const hairMeshes = new LruCache(16 * 1024 * 1024);
const sourcePixels = new WeakMap();
function hairMesh(img, key, t) {
  const cacheKey = `${idFor(img)}|${JSON.stringify([t.fitX, t.fitY, t.fitCrown])}`;
  if (hairMeshes.has(cacheKey)) return hairMeshes.get(cacheKey);
  const unit = (img.naturalWidth || img.width) / CANVAS;
  let source = sourcePixels.get(img);
  if (!source) { source = pixels(img, Math.round(CANVAS * unit)); sourcePixels.set(img, source); }
  const box = PARTS.hair[key];
  const y0 = Math.floor(mapAxis(box[1], t.fitY)) - 2, y1 = Math.ceil(mapAxis(box[3], t.fitY)) + 2;
  const xx = [box[1], t.fitCrown.eye, box[3]].flatMap(y => [mappedX(box[0], y, t), mappedX(box[2], y, t)]);
  const x0 = Math.floor(Math.min(...xx)) - 2, x1 = Math.ceil(Math.max(...xx)) + 2;
  const c = document.createElement('canvas'); c.width = Math.ceil((x1-x0)*unit); c.height = Math.ceil((y1-y0)*unit);
  c.worldBox = [x0, y0, c.width/unit, c.height/unit];
  const ctx = c.getContext('2d'), output = ctx.createImageData(c.width, c.height), input = source.data;
  const sourceSize = Math.round(CANVAS*unit), inverseY = t.fitY.map(([a,b]) => [b,a]);
  // Inverse-map every output pixel into the original image. One continuous
  // bilinear sample avoids seams at mesh joins and stair-steps in fine strands.
  for (let y = 0; y < c.height; y++) {
    const sy = mapAxis(y0 + (y+.5)/unit, inverseY), py = sy*unit-.5, iy = Math.floor(py), fy = py-iy;
    if (iy < 0 || iy >= sourceSize-1) continue;
    const knots = t.fitX.map(([x]) => [mappedX(x,sy,t), x]);
    let segment = 0;
    for (let x = 0; x < c.width; x++) {
      const target = x0+(x+.5)/unit;
      while (segment < knots.length-2 && target > knots[segment+1][0]) segment++;
      const a=knots[segment], b=knots[segment+1];
      const px=(a[1]+(target-a[0])/(b[0]-a[0])*(b[1]-a[1]))*unit-.5, ix=Math.floor(px), fx=px-ix;
      if (ix < 0 || ix >= sourceSize-1) continue;
      const offsets=[(iy*sourceSize+ix)*4,(iy*sourceSize+ix+1)*4,((iy+1)*sourceSize+ix)*4,((iy+1)*sourceSize+ix+1)*4];
      const weights=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];
      let alpha=0,r=0,g=0,bv=0;
      for(let j=0;j<4;j++){const i=offsets[j],w=weights[j]*input[i+3];alpha+=w;r+=input[i]*w;g+=input[i+1]*w;bv+=input[i+2]*w;}
      const i=(y*c.width+x)*4;
      if(alpha){output.data[i]=r/alpha;output.data[i+1]=g/alpha;output.data[i+2]=bv/alpha;output.data[i+3]=alpha;}
    }
  }
  ctx.putImageData(output,0,0); hairMeshes.set(cacheKey,c,c.width*c.height*4); return c;
}
export function drawTransformed(ctx, img, group, key, t) {
  const pivot = FIT.pivots[`${group}/${key}`] || FIT.pivots[group] || [512, 512];
  const draw = (side = 0) => {
    ctx.save();
    if (t.clipAbove !== undefined) { ctx.beginPath(); ctx.rect(-1024, t.clipAbove, 3072, 3072); ctx.clip(); }
    ctx.translate(pivot[0] + t.dx + side * t.spread, pivot[1] + t.dy);
    ctx.scale(t.scale * (t.flip ? -1 : 1), t.scale * (t.aspectY || 1)); ctx.rotate(t.rot * Math.PI / 180); ctx.translate(-pivot[0], -pivot[1]);
    if (t.temples) {
      const unit = (img.naturalWidth || img.width) / CANVAS;
      for (const { source, hinge, end, side: templeSide } of t.temples) {
        const dx = hinge[0] - end[0], dy = hinge[1] - end[1];
        // On narrow heads a hinge can already meet the side. Do not fold an
        // unnecessary arm back through the lens.
        if ((end[0] - hinge[0]) * templeSide <= 0) continue;
        ctx.save(); ctx.translate(end[0], end[1]); ctx.rotate(Math.atan2(dy, dx));
        ctx.drawImage(img, ...source.map(v => v * unit), 0, -source[3] / 2, Math.hypot(dx, dy) + 2, source[3]);
        ctx.restore();
      }
    }
    if (t.templesOnly) { ctx.restore(); return; }
    if (t.frontBandCurve) {
      ctx.beginPath(); ctx.moveTo(-1024,-1024); ctx.lineTo(2048,-1024); ctx.lineTo(1024,640);
      ctx.quadraticCurveTo(512,432,0,640); ctx.closePath(); ctx.clip();
    }
    if (side) { ctx.beginPath(); ctx.rect(side < 0 ? -CANVAS : pivot[0], -CANVAS, CANVAS + (side < 0 ? pivot[0] : CANVAS), CANVAS * 3); ctx.clip(); }
    if (t.fitCrown) {
      const fitted = hairMesh(img, key, t); ctx.drawImage(fitted, ...fitted.worldBox);
    } else if (t.fitX || t.fitY) {
      const unit = (img.naturalWidth || img.width) / CANVAS;
      const xs = [...new Set([0, ...(t.fitX || []).map(k => k[0]), CANVAS])].sort((a,b) => a-b);
      const ys = [...new Set([0, ...(t.fitY || []).map(k => k[0]), ...(t.warp ? [t.warp.sourceTop, t.warp.join] : []), CANVAS])].sort((a,b) => a-b);
      const mx = (x,y) => t.fitX ? mappedX(x, y, t) : x, my = y => t.fitY ? mapAxis(y, t.fitY) : t.warp ? mappedWarpY(y, t) : y;
      for (let x = 0; x < xs.length - 1; x++) for (let y = 0; y < ys.length - 1; y++) {
        ctx.drawImage(img, xs[x]*unit, ys[y]*unit, (xs[x+1]-xs[x])*unit, (ys[y+1]-ys[y])*unit, mx(xs[x], (ys[y]+ys[y+1])/2), my(ys[y]), mx(xs[x+1], (ys[y]+ys[y+1])/2)-mx(xs[x], (ys[y]+ys[y+1])/2), my(ys[y+1])-my(ys[y]));
      }
    } else if (t.strapX) {
      const n = (img.naturalWidth || img.width) / CANVAS;
      const [left, right] = t.strapX;
      ctx.drawImage(img, 384 * n, 0, 22 * n, CANVAS * n, left, 0, 406 - left, CANVAS);
      ctx.drawImage(img, 406 * n, 0, 128 * n, CANVAS * n, 406, 0, 128, CANVAS);
      for (let x = 534; x < 640; x += .5) {
        const x0 = 534 + (x - 534) / 106 * (right - 534);
        const x1 = 534 + (x + .5 - 534) / 106 * (right - 534);
        const y0 = -t.strapLift * smooth((x0 - 534) / Math.max(1, t.strapRiseEnd - 534));
        const y1 = -t.strapLift * smooth((x1 - 534) / Math.max(1, t.strapRiseEnd - 534));
        ctx.save(); ctx.translate(x0, y0); ctx.transform(1, (y1 - y0) / (x1 - x0), 0, 1, 0, 0);
        ctx.drawImage(img, x * n, 0, .5 * n, CANVAS * n, 0, 0, x1 - x0 + .15, CANVAS); ctx.restore();
      }
    } else if (t.warp || t.crownWarp) {
      // Flex the fitted crown/band; everything below the join keeps its shape.
      const mapY = y => t.warp ? mappedWarpY(y, t) : crownY(y, t.crownWarp);
      const nativeScale = (img.naturalWidth || img.width) / CANVAS;
      // Each interval is linear: resample it once. Hundreds of overlapping
      // four-pixel strips leave visible horizontal alpha bands in the hair.
      const edges = t.warp ? [0, t.warp.sourceTop, t.warp.join, CANVAS] : [0, t.crownWarp.top, t.crownWarp.join, t.crownWarp.end, CANVAS];
      for (let i = 0; i < edges.length - 1; i++) {
        const y = edges[i], end = edges[i + 1], y0 = mapY(y), y1 = mapY(end);
        const sx = t.lowerScale && y >= t.warp.join ? t.lowerScale : 1;
        if (end > y) ctx.drawImage(img, 0, y * nativeScale, CANVAS * nativeScale, (end - y) * nativeScale, 512 * (1 - sx), y0, CANVAS * sx, y1 - y0);
      }
    } else ctx.drawImage(img, 0, 0, CANVAS, CANVAS);
    ctx.restore();
  };
  if (t.spread) { draw(-1); draw(1); } else draw();
}
const integrated = new LruCache(12 * 1024 * 1024);
const objectIds = new WeakMap(); let nextId = 0;
const idFor = object => { if (!objectIds.has(object)) objectIds.set(object, ++nextId); return objectIds.get(object); };
export function integratedLayer(img, group, key, t, surface, size) {
  const cacheKey = `${idFor(img)}|${idFor(surface)}|${group}/${key}|${size}|${JSON.stringify(t)}`;
  if (integrated.has(cacheKey)) return integrated.get(cacheKey);
  const result = integrate(img, group, key, t, surface, size);
  integrated.set(cacheKey, result, result.width * result.height);
  return result;
}
function integrate(img, group, key, t, surface, size) {
  const limb = group === 'item' || group === 'gesture';
  const padding = limb ? 512 : 0, dimension = limb ? size * 2 : size;
  const c = canvas(dimension), ctx = c.getContext('2d', { willReadFrequently: true });
  c.worldBox = [-padding, -padding, CANVAS + padding * 2, CANVAS + padding * 2];
  ctx.scale(size / CANVAS, size / CANVAS); ctx.translate(padding, padding);
  drawTransformed(ctx, img, group, key, t);
  if ((group === 'cheeks' && key === 'on') || (group === 'facialHair' && key === 'stubble')) {
    // Blush and fine stubble reveal the body's own texture through them.
    ctx.globalCompositeOperation = 'destination-in'; ctx.globalAlpha = key === 'on' ? .32 : .58;
    ctx.fillRect(0, 0, CANVAS, CANVAS); return c;
  }
  const face = group === 'eyes' || (group === 'mouth' && key !== 'roseSmile') || group === 'cheeks' || (group === 'facialHair' && ['stubble', 'beard'].includes(key));
  if (!limb && !face) return c;
  const analysis = skinAnalysis(img, group, key);
  const mask = canvas(dimension), mctx = mask.getContext('2d', { willReadFrequently: true });
  mctx.scale(size / CANVAS, size / CANVAS); mctx.translate(padding, padding); drawTransformed(mctx, analysis.mask, group, key, t);
  const weights = mctx.getImageData(0, 0, dimension, dimension).data;
  const id = ctx.getImageData(0, 0, dimension, dimension), data = id.data;
  const sample = (x, y, raw = false) => {
    const sx = clamp(Math.round(x / 4), 0, 255), sy = clamp(Math.round(y / 4), 0, 255), p = (sy * 256 + sx) * 4;
    const b = raw ? surface.data : surface.soft; return [b[p], b[p + 1], b[p + 2], b[p + 3] / 255];
  };
  const paletteColor = value => {
    const [lo, mid, hi] = analysis.levels;
    const p = surface.palette;
    if (value < lo) return p[0].map(v => v * Math.pow(value / Math.max(1, lo), .9));
    if (value > hi) return p[2].map(v => v + (255 - v) * (value - hi) / Math.max(1, 255 - hi) * .8);
    const first = value < mid, k = first ? (value - lo) / Math.max(1, mid - lo) : (value - mid) / Math.max(1, hi - mid);
    const a = first ? p[0] : p[1], b = first ? p[1] : p[2];
    return a.map((v, c) => v + (b[c] - v) * k);
  };
  for (let y = 0; y < dimension; y++) for (let x = 0; x < dimension; x++) {
    const i = (y * dimension + x) * 4; if (!data[i + 3]) continue;
    const wx = x * CANVAS / size - padding, wy = y * CANVAS / size - padding, w = weights[i + 3] / 255;
    if (w > .01) {
      const valueLum = lum(data[i], data[i + 1], data[i + 2]);
      const color = limb ? paletteColor(valueLum) : sample(wx, wy);
      const relative = limb ? 1 : Math.pow(valueLum / analysis.base, .85);
      for (let channel = 0; channel < 3; channel++) {
        const value = Math.min(255, color[channel] * relative);
        data[i + channel] = data[i + channel] * (1 - w) + value * w;
      }
      if (face) {
        // Translucent skin rims reveal the body's own pores and shading.
        const rimFade = group === 'mouth' ? .20 : .38;
        data[i + 3] *= 1 - w * (rimFade + (1 - rimFade) * (1 - weights[i + 1] / 255));
      }
    }
    if (limb && w > .01) {
      const distance = Math.hypot(wx - t.root[0], wy - t.root[1]);
      // Occlude only exposed potato skin at the attachment. A laptop lid,
      // drink or other protected prop can overlap the torso without holes.
      const underBody = w * (1 - weights[i + 2] / 255) * sample(wx, wy, true)[3] * smooth((104 - distance) / 50);
      data[i + 3] *= 1 - underBody;
    }
  }
  ctx.putImageData(id, 0, 0); return c;
}
const shadows = new WeakMap();
export function contactShadow(layer, receiver, group, size) {
  const settings = { handOnHip: [5, 3, .18], jewelry: [3, 2, .17], hair: [7, 4, .23], eyes: [4, 0, .13], mouth: [3, 1, .10], hat: [7, 5, .30], eyewear: [4, 3, .17], neckwear: [8, 5, .20], extra: [5, 3, .22], facialHair: [3, 2, .12], brows: [2, 1, .10] }[group];
  if (!settings) return null;
  // Cache the caster, never the receiver: the same hat can sit on a bare
  // head, curls or a bob. Reusing a body-clipped shadow erases that contact.
  let caster = shadows.get(layer);
  if (!caster) {
    caster = canvas(layer.width);
    const ctx = caster.getContext('2d');
    ctx.filter = `blur(${settings[0] * size / CANVAS}px)`;
    ctx.drawImage(layer, 0, settings[1] * size / CANVAS);
    ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = `rgba(27, 15, 8, ${settings[2]})`; ctx.fillRect(0, 0, caster.width, caster.height);
    shadows.set(layer, caster);
  }
  const c = canvas(layer.width), ctx = c.getContext('2d');
  c.worldBox = layer.worldBox || [0, 0, CANVAS, CANVAS];
  ctx.drawImage(caster, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(receiver, -c.worldBox[0] * size / CANVAS, -c.worldBox[1] * size / CANVAS, size, size);
  return c;
}
