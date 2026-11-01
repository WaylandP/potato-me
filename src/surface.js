// Fit and light the modular artwork against the actual selected body surface.
// Pixel analysis stays in the browser; no external service or generated avatar is used.
import { PARTS, CANVAS } from './assets.js';
import { FIT } from './fit-data.js';

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
  const shoulderY = { classic: 638, lumpy: 648, round: 620, long: 640 }[shape];
  const [left, right] = row(shoulderY);
  const eyeY = { classic: 432, lumpy: 439, round: 438, long: 433 }[shape];
  const [faceLeft, faceRight] = row(eyeY);
  const center = (faceLeft + faceRight) / 2;
  const materialSamples = [];
  for (let y = Math.round(eyeY / 4); y < Math.round((shoulderY - 30) / 4); y += 2) for (let x = Math.round((center - (faceRight - faceLeft) * .22) / 4); x < Math.round((center + (faceRight - faceLeft) * .22) / 4); x += 2) {
    const i = (y * SIZE + x) * 4;
    if (original.data[i + 3] > 245) materialSamples.push([original.data[i], original.data[i + 1], original.data[i + 2]]);
  }
  materialSamples.sort((a, b) => lum(...a) - lum(...b));
  const material = materialSamples[Math.floor(materialSamples.length * .48)] || [180, 125, 70];
  const surface = { ...original, soft: soft.data, row, eyeY, shoulderY, left, right, faceWidth: faceRight - faceLeft, featureWidth: clamp(faceRight - faceLeft, 350, 480), center, material, crownY };
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
  const { data } = pixels(img), count = SIZE * SIZE;
  const candidate = new Uint8Array(count), mask = new Uint8Array(count), dist = new Float32Array(count);
  const queue = new Int32Array(count); let head = 0, tail = 0;
  const protectedRegions = FIT.skinProtect?.[`${group}/${key}`] || [];
  const box = PARTS[group][key];
  const eyeBoxes = [];
  if (group === 'eyes') for (const side of [0, 1]) {
    let x0 = 256, y0 = 256, x1 = 0, y1 = 0;
    for (let y = 0; y < SIZE; y++) for (let x = side * 128; x < (side + 1) * 128; x++) if (data[(y * SIZE + x) * 4 + 3] > 150) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    eyeBoxes.push([x0, y0, x1, y1]);
  }
  const enclosedFeature = (x, y) => {
    if (group === 'mouth' && ['grin', 'laugh', 'grit', 'tongue', 'oh', 'whistle'].includes(key)) {
      const nx = (x * 4 - box[0]) / (box[2] - box[0]), ny = (y * 4 - box[1]) / (box[3] - box[1]);
      // Keep the opening, not the surrounding potato lip.
      const inset = key === 'grin' ? [.41, .44, .25] : [.40, .48, .30];
      return ((nx - .5) / inset[0]) ** 2 + ((ny - inset[1]) / inset[2]) ** 2 < 1;
    }
    if (group === 'eyes') {
      if (['happy', 'squint', 'dead'].includes(key) || (key === 'wink' && x >= 128)) return false;
      const b = eyeBoxes[x < 128 ? 0 : 1];
      const nx = (x - b[0]) / (b[2] - b[0]), ny = (y - b[1]) / (b[3] - b[1]);
      const opening = { smug: [.68, .22], sleepy: [.76, .12], angry: [.62, .23], side: [.62, .30], wink: [.62, .27] }[key] || [.5, .39];
      return ((nx - .5) / .40) ** 2 + ((ny - opening[0]) / opening[1]) ** 2 < 1;
    }
    return false;
  };
  for (let p = 0; p < count; p++) {
    const i = p * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    const x = p % SIZE, y = (p / SIZE) | 0;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    candidate[p] = data[i + 3] > 12 && r > g * 1.035 && g > b * 1.07 && r - b > 40 && max > 58 && (max - min) / max > .28 && !protectedRegions.some(poly => polygonContains(x * 4, y * 4, poly)) && !enclosedFeature(x, y) && !(group === 'facialHair' && max < 145) ? 1 : 0;
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
  for (let y = 1; y < SIZE; y++) for (let x = 1; x < SIZE; x++) { const p = y * SIZE + x; dist[p] = Math.min(dist[p], dist[p - 1] + 1, dist[p - SIZE] + 1); }
  for (let y = SIZE - 2; y >= 0; y--) for (let x = SIZE - 2; x >= 0; x--) { const p = y * SIZE + x; dist[p] = Math.min(dist[p], dist[p + 1] + 1, dist[p + SIZE] + 1); }
  const samples = [];
  for (let p = 0; p < count; p++) if (mask[p]) samples.push(lum(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]));
  samples.sort((a, b) => a - b);
  const base = samples[Math.floor(samples.length * .65)] || 150;
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
    const i = p * 4; id.data[i] = 255; id.data[i + 1] = Math.round(255 * smooth(dist[p] / 2.5)); id.data[i + 2] = 0;
    id.data[i + 3] = mask[p] ? 255 : 0;
  }
  ctx.putImageData(id, 0, 0);
  const value = { mask: c, base, root, dist, data, skin: mask };
  skins.set(img, value); return value;
}
function projected(point, t, pivot) {
  const a = t.rot * Math.PI / 180, x = point[0] - pivot[0], y = point[1] - pivot[1];
  return [pivot[0] + t.dx + (x * Math.cos(a) - y * Math.sin(a)) * t.scale * (t.flip ? -1 : 1), pivot[1] + t.dy + (x * Math.sin(a) + y * Math.cos(a)) * t.scale];
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
    const x = group === 'item' ? surface.left + 30 : surface.right - 30;
    move(root, [x, surface.shoulderY]);
    t.root = [x, surface.shoulderY];
    // Keep the hand/prop inside an avatar crop without moving its shoulder.
    const alpha = skinAnalysis(img, group, key).data;
    for (let attempt = 0; attempt < 18; attempt++) {
      let outside = false;
      for (let p = 0; p < SIZE * SIZE; p += 2) if (alpha[p * 4 + 3] > 48) {
        const at = projected([(p % SIZE) * 4, ((p / SIZE) | 0) * 4], t, pivot);
        if (Math.hypot(at[0] - 512, at[1] - 512) > 492) { outside = true; break; }
      }
      if (!outside) break;
      t.scale *= .95;
      move(root, t.root);
    }
  } else if (group === 'eyes') {
    const ratio = { smug: .64, dots: .46, happy: .57, wide: .57, wink: .59, sleepy: .61, angry: .60, surprised: .57, side: .61, squint: .58, rolling: .58, heart: .55, stars: .55, dead: .54 }[key];
    t.scale = surface.featureWidth * ratio / width;
    move(center, [surface.center, surface.eyeY]);
  } else if (group === 'brows') {
    t.scale = surface.featureWidth * .63 / width;
    move(center, [surface.center, surface.eyeY - (['wide', 'surprised', 'stars', 'heart', 'rolling'].includes(state.eyes) ? 76 : 56)]);
  } else if (group === 'mouth') {
    const ratio = { smirk: .48, grin: .49, laugh: .46, smile: .45, flat: .35, frown: .39, oh: .20, tongue: .44, grit: .42, whistle: .23, kiss: .23, wavy: .40 }[key];
    t.scale = surface.featureWidth * ratio / width;
    move(center, [surface.center, surface.eyeY + 109]);
  } else if (group === 'cheeks') {
    t.scale = surface.featureWidth * .72 / width;
    move(center, [surface.center, surface.eyeY + 62]);
  } else if (group === 'facialHair') {
    t.scale = surface.featureWidth * ({ mustache: .6, handlebar: .7, goatee: .32, beard: .75, stubble: .73 }[key]) / width;
    if (key === 'beard') move([512, 590], [surface.center, surface.eyeY + 109]);
    else move([center[0], box[1]], [surface.center, surface.eyeY + (key === 'goatee' ? 122 : 66)]);
  } else if (group === 'eyewear') {
    const ratios = { shades: .77, aviators: .81, round: .75, square: .76, monocle: .33, eyepatch: .78 };
    t.scale = surface.featureWidth * ratios[key] / width;
    move(center, [surface.center + (key === 'monocle' ? surface.featureWidth * .18 : 0), surface.eyeY + 2]);
  } else if (group === 'hat') {
    const fitting = {
      backwardCap: [270, .92], cap: [270, 1.10], beanie: [300, 1.02], headband: [307, 1.08], bucket: [290, 1.18], cowboy: [265, 1.50], tophat: [272, 1.27], fedora: [270, 1.35], wizard: [268, 1.23], crown: [268, .95], hardhat: [285, 1.14], chef: [285, 1.05], viking: [285, 1.62], party: [260, .76], beret: [287, 1.18], propeller: [285, 1.02], halo: [192, .95], horns: [265, 1.18], santa: [285, 1.10],
    }[key];
    const seat = fitting[0] + (key === 'halo' ? 0 : key === 'headband' ? 14 : 48), sides = surface.row(seat), targetWidth = (sides[1] - sides[0]) * fitting[1];
    t.scale = targetWidth / width;
    const baseY = key === 'headband' ? center[1] : box[3] - height * (['cowboy', 'fedora', 'tophat', 'wizard'].includes(key) ? .10 : .05);
    move([center[0], baseY], [surface.center, seat]);
    const top = projected([center[0], box[1]], t, pivot)[1];
    if (top < 35) { const factor = (seat - 35) / (seat - top); t.scale *= factor; move([center[0], baseY], [surface.center, seat]); }
  } else if (group === 'neckwear') {
    const sides = surface.row(658), w = sides[1] - sides[0];
    const ratios = { bowtie: .40, tie: .29, scarf: .68, chain: .62, lanyard: .52, bandana: .65 };
    const maxHeight = { bowtie: 94, tie: 180, scarf: 238, chain: 185, lanyard: 218, bandana: 188 }[key];
    t.scale = Math.min(w * ratios[key] / width, maxHeight / height);
    move([center[0], box[1]], [surface.center, surface.eyeY + 139]);
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
  } else if (group === 'extra' && key === 'flower') {
    t.scale = .82;
    move(center, [surface.row(325)[0] + 8, 325]);
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
export function drawTransformed(ctx, img, group, key, t) {
  const pivot = FIT.pivots[`${group}/${key}`] || FIT.pivots[group] || [512, 512];
  const draw = (side = 0) => {
    ctx.save(); ctx.translate(pivot[0] + t.dx + side * t.spread, pivot[1] + t.dy);
    ctx.scale(t.scale * (t.flip ? -1 : 1), t.scale); ctx.rotate(t.rot * Math.PI / 180); ctx.translate(-pivot[0], -pivot[1]);
    if (side) { ctx.beginPath(); ctx.rect(side < 0 ? -CANVAS : pivot[0], -CANVAS, CANVAS + (side < 0 ? pivot[0] : CANVAS), CANVAS * 3); ctx.clip(); }
    if (t.warp) {
      // Flex only the headband; the cups keep their proportions.
      const mapY = y => y + t.warp.topOffset * clamp((t.warp.join - y) / (t.warp.join - t.warp.sourceTop));
      const nativeScale = (img.naturalWidth || img.width) / CANVAS;
      for (let y = 0; y < CANVAS; y += 4) {
        const y0 = mapY(y), y1 = mapY(y + 4);
        ctx.drawImage(img, 0, y * nativeScale, CANVAS * nativeScale, 4 * nativeScale, 0, y0, CANVAS, y1 - y0 + .15);
      }
    } else ctx.drawImage(img, 0, 0, CANVAS, CANVAS);
    ctx.restore();
  };
  if (t.spread) { draw(-1); draw(1); } else draw();
}
export function integratedLayer(img, group, key, t, surface, size) {
  const c = canvas(size), ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.scale(size / CANVAS, size / CANVAS); drawTransformed(ctx, img, group, key, t);
  const limb = group === 'item' || group === 'gesture', face = group === 'eyes' || group === 'mouth' || group === 'cheeks' || (group === 'brows' && ['angry', 'worried', 'flat'].includes(key)) || (group === 'facialHair' && ['stubble', 'beard'].includes(key));
  if (!limb && !face) return c;
  const analysis = skinAnalysis(img, group, key);
  const mask = canvas(size), mctx = mask.getContext('2d', { willReadFrequently: true });
  mctx.scale(size / CANVAS, size / CANVAS); drawTransformed(mctx, analysis.mask, group, key, t);
  const weights = mctx.getImageData(0, 0, size, size).data;
  const id = ctx.getImageData(0, 0, size, size), data = id.data;
  const sample = (x, y, raw = false) => {
    const sx = clamp(Math.round(x / 4), 0, 255), sy = clamp(Math.round(y / 4), 0, 255), p = (sy * 256 + sx) * 4;
    const b = raw ? surface.data : surface.soft; return [b[p], b[p + 1], b[p + 2], b[p + 3] / 255];
  };
  const shoulder = limb ? sample(t.root[0] + (group === 'item' ? 115 : -115), t.root[1] - 40) : null;
  const front = limb ? [...surface.material, 1] : null;
  const target = limb ? shoulder.map((v, i) => v * .40 + front[i] * .60) : null;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4; if (!data[i + 3]) continue;
    const wx = x * CANVAS / size, wy = y * CANVAS / size, w = weights[i + 3] / 255;
    if (w > .01) {
      const color = target || sample(wx, wy);
      const relative = Math.pow(lum(data[i], data[i + 1], data[i + 2]) / analysis.base, face ? .85 : .9);
      for (let channel = 0; channel < 3; channel++) {
        const value = Math.min(255, color[channel] * relative);
        data[i + channel] = data[i + channel] * (1 - w) + value * w;
      }
      if (face) {
        // Translucent skin rims reveal the body's own pores and shading.
        data[i + 3] *= 1 - .72 * w * (1 - weights[i + 1] / 255);
      }
    }
    if (limb) {
      const distance = Math.hypot(wx - t.root[0], wy - t.root[1]);
      const underBody = sample(wx, wy, true)[3] * smooth((128 - distance) / 62);
      data[i + 3] *= 1 - underBody;
    }
  }
  ctx.putImageData(id, 0, 0); return c;
}
export function contactShadow(layer, body, group, size) {
  const settings = { eyes: [4, 0, .13], mouth: [3, 1, .10], hat: [9, 7, .25], eyewear: [4, 3, .17], neckwear: [8, 5, .20], extra: [6, 3, .18], facialHair: [3, 2, .12], brows: [2, 1, .10] }[group];
  if (!settings) return null;
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.filter = `blur(${settings[0] * size / CANVAS}px)`;
  ctx.drawImage(layer, 0, settings[1] * size / CANVAS);
  ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = `rgba(27, 15, 8, ${settings[2]})`; ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(body, 0, 0, size, size); return c;
}
