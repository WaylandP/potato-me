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
    // Fit the face opening, not just the outside of a wig. The crown follows
    // the body's actual top; length is bounded independently of body width.
    const referenceY = box[1] + height * (['pixie', 'bun'].includes(key) ? .78 : .52);
    const openingCenter = key === 'ponytail' ? 465 : center[0];
    const openingWidth = key === 'ponytail' ? width * .80 : width;
    t.scale = Math.min(1.6, Math.max(surface.faceWidth, surface.featureWidth) * 1.35 / openingWidth);
    const raisedBun = key === 'bun' && ['none', 'headband', 'bow', 'flowerCrown', 'halo', 'horns', 'crown'].includes(state.hat);
    // A raised bun can pass through open headwear. Under a closed hat its
    // crown is tucked down, so it cannot protrude around the hat's dome.
    const targetTop = surface.crownY - (raisedBun ? 170 : 32);
    const fittedAspect = (surface.eyeY - targetTop) / ((referenceY - box[1]) * t.scale);
    // Compress the crown to fit a short forehead, not the entire hairstyle.
    // Side locks and the ponytail retain their length and strand proportions.
    t.aspectY = Math.max(.85, fittedAspect);
    if (fittedAspect < .85) t.warp = { sourceTop: box[1], join: referenceY, topOffset: referenceY - box[1] - (surface.eyeY - targetTop) / (t.scale * t.aspectY) };
    move([openingCenter, referenceY], [surface.center, surface.eyeY]);
    // The hat's own alpha occludes hair. A horizontal clipping line would
    // visibly cut side locks, and would incorrectly erase hair above a band.
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
    t.scale = desiredHeight / height;
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
    move([center[0], box[3] - height * .18], [surface.center - surface.faceWidth * .22, surface.crownY + 35]);
  } else if (group === 'hat' && key === 'flowerCrown') {
    const seat = Math.min(surface.crownY + 95, surface.eyeY - 165), sides = surface.row(seat + 16);
    t.scale = (sides[1] - sides[0] + 34) / width;
    move(center, [surface.center, seat]);
  } else if (group === 'hat' && key === 'halo') {
    t.scale = surface.featureWidth * .42 / width;
    move([center[0], box[3]], [surface.center, surface.crownY - (state.hair !== 'none' ? 54 : 22)]);
  } else if (group === 'hat') {
    const fitting = {
      backwardCap: [290, 1.12], cap: [270, 1.10], beanie: [300, 1.02], headband: [307, 1.08], bucket: [290, 1.18], cowboy: [265, 1.50], tophat: [272, 1.27], fedora: [270, 1.35], wizard: [268, 1.23], crown: [268, .95], hardhat: [285, 1.14], chef: [285, 1.55], viking: [285, 1.62], party: [260, .76], beret: [287, 1.18], propeller: [285, 1.02], halo: [192, .95], horns: [265, 1.18], santa: [285, 1.10], sunhat: [275, 1.65],
    }[key];
    let seat = fitting[0] + (key === 'halo' ? 0 : key === 'headband' ? 14 : 48);
    // Keep the brim above the eye opening on short, wide bodies too. The
    // source's lower edge extends below this anchor, especially on tall hats.
    seat = Math.min(surface.eyeY - 100, seat + Math.max(0, surface.crownY - 180));
    if (key === 'headband') seat = surface.eyeY - 110;
    const baseY = key === 'headband' ? center[1] : box[3] - height * (['cowboy', 'fedora', 'tophat', 'wizard', 'sunhat'].includes(key) ? .10 : .05);
    // A narrow, tall potato needs its hat higher than a round one. Fit the
    // crown over the actual top of the body, then match the brim to that row.
    // Uniform scaling preserves the material and shape of every hat.
    for (let attempt = 0; attempt < 100; attempt++) {
      const sides = surface.row(seat);
      const headWidth = Math.max(sides[1] - sides[0], state.hair !== 'none' ? surface.featureWidth * .8 : 0);
      t.scale = headWidth * fitting[1] / width;
      if (key === 'headband') t.aspectY = Math.min(1, Math.max(75, (surface.eyeY - surface.crownY) * .52) / (height * t.scale));
      const openingY = { backwardCap: 160, viking: 220 }[key];
      if (openingY !== undefined) {
        // Open headwear must reveal potato, not background, through its gap.
        // Fit its crown height within the actual forehead depth on Wide.
        const crownClearance = surface.crownY + 24 + (state.hair !== 'none' ? 12 : 0);
        const offset = Math.max(0, baseY - (seat - crownClearance) / t.scale - openingY);
        if (offset) t.crownWarp = { top: box[1], join: openingY, end: baseY, offset };
      }
      move([center[0], baseY], [surface.center, seat]);
      const roof = FIT.hatCrownY[key];
      if (roof === undefined || projected([center[0], roof], t, pivot)[1] <= surface.crownY - 10) break;
      seat -= 2;
    }
    if (state.hair !== 'none' && key !== 'headband') t.dy -= 12;
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
    let top = surface.crownY - 24;
    if (FIT.headphonesOver.includes(state.hat) && PARTS.hat[state.hat] && state.hat !== 'halo') {
      const hat = { group: 'hat', key: state.hat, transform: { dx: 0, dy: 0, scale: 1, rot: 0, spread: 0, flip: false } };
      const ht = surfaceTransform(hat, null, surface, state), hb = PARTS.hat[state.hat];
      top = Math.min(top, projected([(hb[0] + hb[2]) / 2, hb[1]], ht, FIT.pivots.hat)[1] - 12);
    }
    const sourceTop = projected([center[0], box[1]], t, pivot)[1];
    t.warp = { sourceTop: box[1], join: box[1] + height * .54, topOffset: (top - sourceTop) / t.scale };
  } else if (group === 'extra' && key === 'earbuds') {
    t.scale = .92;
    t.spread = (surface.faceWidth / 2 + 1) - width * .33 * t.scale;
    move(center, [surface.center, surface.eyeY + 5]);
  } else if (group === 'extra' && key === 'earring') {
    t.scale = .92;
    const sides = surface.row(surface.eyeY + 70);
    move([box[0], box[1] + 6], [sides[1] - 3, surface.eyeY + 70]);
  } else if (group === 'extra' && key === 'bandaid') {
    t.scale = Math.min(1.25, surface.faceWidth * .15 / width);
    move(center, [surface.center + surface.faceWidth * .29, surface.eyeY + 66]);
  } else if (group === 'extra' && ['flower', 'barrette', 'scrunchie'].includes(key)) {
    t.scale = .82;
    const seat = surface.eyeY - 48;
    move(center, [surface.row(seat)[0] + 8, seat]);
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
const silhouettes = new WeakMap();
function framingPoints(img, group, key, transform) {
  if (!silhouettes.has(img)) {
    const { data } = pixels(img, 128), points = [];
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) if (data[(y * 128 + x) * 4 + 3] > 48) points.push([x * 8, y * 8]);
    silhouettes.set(img, points);
  }
  return silhouettes.get(img).map(([x, y]) => projected([transform.lowerScale && y >= transform.warp.join ? 512 + (x - 512) * transform.lowerScale : x, transform.warp ? mappedWarpY(y, transform) : transform.crownWarp ? crownY(y, transform.crownWarp) : y], transform, FIT.pivots[`${group}/${key}`] || FIT.pivots[group]));
}
const warpedY = (y, warp) => y + warp.topOffset * clamp((warp.join - y) / (warp.join - warp.sourceTop));
const mappedWarpY = (y, t) => t.lowerScale && y >= t.warp.join ? t.warp.join + (y - t.warp.join) * t.lowerScale : warpedY(y, t.warp);
const crownY = (y, warp) => y + warp.offset * clamp(y < warp.join ? (y - warp.top) / (warp.join - warp.top) : (warp.end - y) / (warp.end - warp.join));
export function headFrame(parts) { return frameForPoints(parts.flatMap(({ img, group, key, transform }) => framingPoints(img, group, key, transform))); }
export function hatFrame(img, key, transform) { return headFrame([{ img, group: 'hat', key, transform }]); }
export function drawTransformed(ctx, img, group, key, t) {
  const pivot = FIT.pivots[`${group}/${key}`] || FIT.pivots[group] || [512, 512];
  const draw = (side = 0) => {
    ctx.save();
    if (t.clipAbove !== undefined) { ctx.beginPath(); ctx.rect(-1024, t.clipAbove, 3072, 3072); ctx.clip(); }
    ctx.translate(pivot[0] + t.dx + side * t.spread, pivot[1] + t.dy);
    ctx.scale(t.scale * (t.flip ? -1 : 1), t.scale * (t.aspectY || 1)); ctx.rotate(t.rot * Math.PI / 180); ctx.translate(-pivot[0], -pivot[1]);
    if (side) { ctx.beginPath(); ctx.rect(side < 0 ? -CANVAS : pivot[0], -CANVAS, CANVAS + (side < 0 ? pivot[0] : CANVAS), CANVAS * 3); ctx.clip(); }
    if (t.strapX) {
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
export function contactShadow(layer, body, group, size) {
  const settings = { handOnHip: [5, 3, .18], jewelry: [3, 2, .17], hair: [7, 4, .23], eyes: [4, 0, .13], mouth: [3, 1, .10], hat: [9, 7, .25], eyewear: [4, 3, .17], neckwear: [8, 5, .20], extra: [6, 3, .18], facialHair: [3, 2, .12], brows: [2, 1, .10] }[group];
  if (!settings) return null;
  if (shadows.has(layer)) return shadows.get(layer);
  const c = canvas(layer.width), ctx = c.getContext('2d', { willReadFrequently: true });
  c.worldBox = layer.worldBox || [0, 0, CANVAS, CANVAS];
  ctx.filter = `blur(${settings[0] * size / CANVAS}px)`;
  ctx.drawImage(layer, 0, settings[1] * size / CANVAS);
  ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = `rgba(27, 15, 8, ${settings[2]})`; ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(body, -c.worldBox[0] * size / CANVAS, -c.worldBox[1] * size / CANVAS, size, size);
  shadows.set(layer, c); return c;
}
