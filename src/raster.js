// Canvas compositor for the rendered PNG parts (assets/parts). Browser only.
//
// Every part image is a 1024x1024 transparent PNG already placed on a shared
// canvas. surface.js seats them on the selected body's silhouette, harmonizes
// exposed skin, and adds contact shading. Garments keep their material masks;
// stickers and lettering follow the final fitted prop transform.

import { PARTS, NO_IMAGE, LAYER_ORDER, CANVAS } from './assets.js';
import { FIT } from './fit-data.js';
import { SKINS, HAT_COLORS, HAIR_COLORS, BG_COLORS, OPTIONS, BODY_PROFILES, MULTI } from './options.js';
import { normalizeState } from './state.js';
import { Defs } from './draw.js';
import { background } from './parts/background.js';
import { stickerSVG } from './parts/stickers.js';
import { bodySurface, withHairSurface, surfaceTransform, integratedLayer, contactShadow, drawTransformed, headFrame } from './surface.js';
import { LruCache } from './cache.js';
import { splitWearable } from './wrap.js';

const RED = '#C8372D';

// ------------------------------------------------------------ availability

/** True when this choice can be drawn: its image exists, or it is a "none" choice that needs no image. */
export function hasPart(group, key) {
  if (group === 'body') return false; // bodies are keyed shape-skin, see hasBody
  if (NO_IMAGE[group]?.includes(key)) return true;
  return Boolean(PARTS[group]?.[key]);
}

export const hasBody = (shape, skin) => Boolean(PARTS.body?.[`${shape}-${skin}`]);
export const hasSticker = (key) => Boolean(PARTS.stickers?.[key]);

/** Option keys the renderer can actually draw, per group, in option order. */
export function availableOptions() {
  const out = {};
  for (const [group, options] of Object.entries(OPTIONS)) {
    if (group === 'body') out.body = Object.fromEntries(Object.entries(options).filter(([shape]) => Object.keys(SKINS).some((s) => hasBody(shape, s))));
    else if (group === 'skin') out.skin = Object.fromEntries(Object.entries(options).filter(([skin]) => Object.keys(OPTIONS.body).some((b) => hasBody(b, skin))));
    else if (['character', 'bg', 'pattern', 'hatColor', 'hairColor'].includes(group)) out[group] = options;
    else out[group] = Object.fromEntries(Object.entries(options).filter(([key]) => hasPart(group, key)));
  }
  return out;
}

/** The parts the manifest planned but that have no image yet, per group. */
export function missingParts() {
  const avail = availableOptions();
  const out = {};
  for (const [group, options] of Object.entries(OPTIONS)) {
    if (['character', 'bg', 'pattern', 'hatColor', 'hairColor', 'body', 'skin'].includes(group)) continue;
    const missing = Object.keys(options).filter((k) => !(k in avail[group]));
    if (missing.length) out[group] = missing;
  }
  const stickers = Object.keys(MULTI.stickers.options).filter((k) => !hasSticker(k));
  if (stickers.length) out.stickers = stickers;
  return out;
}

/** Swap any choice that has no image for the first one that does, so every state draws something. */
export function drawableState(rawState) {
  const s = normalizeState(rawState);
  // Hair clips need hair to attach to. This also repairs older shared links.
  if (s.hair === 'none' && ['barrette', 'scrunchie'].includes(s.extra)) s.hair = 'bob';
  const avail = availableOptions();
  for (const group of Object.keys(avail)) {
    if (group === 'body' || group === 'skin') continue;
    if (!(s[group] in avail[group])) s[group] = Object.keys(avail[group])[0] ?? s[group];
  }
  if (!hasBody(s.body, s.skin)) {
    const skin = Object.keys(SKINS).find((k) => hasBody(s.body, k));
    if (skin) s.skin = skin;
  }
  return s;
}

// ------------------------------------------------------------- image cache

const images = new LruCache(12 * 1024 * 1024);

/** Load (and decode) an image once. Rejects on a missing file so callers can report it. */
export function loadImage(src) {
  if (!images.has(src)) {
    images.set(
      src,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => {
          images.delete(src);
          reject(new Error(`Could not load ${src}`));
        };
        img.src = src;
      }),
      src.includes('/thumbs/') ? 256 * 256 : src.startsWith('data:') ? 512 * 512 : 1024 * 1024,
    );
  }
  return images.get(src);
}

export const partSrc = (group, key, thumbs = false) => `assets/${thumbs ? 'thumbs' : 'parts'}/${group}/${key}.png`;

// ------------------------------------------------------------- color math

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => clamp01(v) * clamp01(v) * (3 - 2 * clamp01(v));
const hueDist = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/**
 * Recolor pixels that match a source color family to a target color while
 * keeping their shading. `win` describes the source family (hue center, hue
 * width, saturation and lightness ranges); `base` is the source family's base
 * color so shading is measured relative to it.
 */
function remap(data, win, base, target) {
  const [, s0, l0] = rgbToHsl(...hexToRgb(base));
  const [ht, st, lt] = rgbToHsl(...hexToRgb(target));
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const wh = 1 - smooth((hueDist(h, win.hue) - win.hueWidth) / 10 + 1);
    const ws = smooth((s - win.sMin) / 0.12);
    const wl = smooth((l - win.lMin) / 0.06) * (1 - smooth((l - win.lMax) / 0.06));
    const w = wh * ws * wl;
    if (w <= 0.003) continue;
    const f = l / l0;
    const nl = f <= 1 ? lt * f : lt + (1 - lt) * ((f - 1) / (1 / l0 - 1));
    const ns = clamp01(st * Math.min(1, s / s0)); // never more saturated than the target itself
    const [r, g, b] = hslToRgb(ht, ns, clamp01(nl));
    data[i] = data[i] + (r - data[i]) * w;
    data[i + 1] = data[i + 1] + (g - data[i + 1]) * w;
    data[i + 2] = data[i + 2] + (b - data[i + 2]) * w;
  }
}

const RED_WINDOW = { hue: 2, hueWidth: 16, sMin: 0.42, lMin: 0.07, lMax: 0.86 };
const processed = new LruCache(6 * 1024 * 1024);

/** Garment recoloring only; skin is harmonized against the actual body later. */
async function processedPart(group, key, src, { hatColor, hairColor }) {
  const wantsRecolor = FIT.recolor[group]?.includes(key) && hatColor && hatColor !== RED;
  const wantsHair = group === 'hair' && hairColor !== '#704328';
  const img = await loadImage(src);
  if (!wantsRecolor && !wantsHair) return img;
  const cacheKey = `${src}|${hatColor}|${hairColor}`;
  if (processed.has(cacheKey)) {
    return processed.get(cacheKey);
  }
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height);
  if (wantsRecolor) remap(id.data, group === 'hat' ? { ...RED_WINDOW, sMin: .30, lMin: .015 } : RED_WINDOW, RED, hatColor);
  if (wantsHair) {
    // Preserve strand contrast and alpha, protecting the ponytail's satin tie,
    // while using an independent material color for the whole hairstyle.
    const target = hexToRgb(hairColor);
    for (let i = 0; i < id.data.length; i += 4) if (id.data[i + 3]) {
      const x = (i / 4 % c.width) * CANVAS / c.width, y = Math.floor(i / 4 / c.width) * CANVAS / c.height;
      const r = id.data[i], g = id.data[i + 1], b = id.data[i + 2];
      if (key === 'ponytail' && x > 640 && x < 725 && y > 385 && y < 465 && r > g * 1.8 && r - g > 3 * (g - b)) continue;
      const light = (.2126 * id.data[i] + .7152 * id.data[i + 1] + .0722 * id.data[i + 2]) / 75;
      for (let c = 0; c < 3; c++) id.data[i + c] = Math.min(255, target[c] * Math.pow(light, .9));
    }
  }
  ctx.putImageData(id, 0, 0);
  processed.set(cacheKey, c, c.width * c.height);
  return c;
}

// --------------------------------------------------------------- transforms

/** Combined nudge/scale/rotation for a layer on this body shape. */
export function layerTransform(group, key, shape) {
  const t = { dx: 0, dy: 0, scale: 1, rot: 0, flip: false, spread: 0 };
  for (const o of [FIT.shapes[shape]?.[group], FIT.parts[`${group}/${key}`], FIT.parts[`${group}/${key}@${shape}`]]) {
    if (!o) continue;
    t.dx += o.dx || 0;
    t.dy += o.dy || 0;
    t.scale *= o.scale ?? 1;
    t.rot += o.rot || 0;
    t.spread += o.spread || 0;
    if (o.flip) t.flip = !t.flip;
  }
  return t;
}

const pivotFor = (group, key) => FIT.pivots[`${group}/${key}`] || FIT.pivots[group] || [CANVAS / 2, CANVAS / 2];

function applyTransform(ctx, group, t, key) {
  const [px, py] = pivotFor(group, key);
  ctx.translate(px + t.dx, py + t.dy);
  ctx.scale(t.scale * (t.flip ? -1 : 1), t.scale);
  ctx.rotate((t.rot * Math.PI) / 180);
  ctx.translate(-px, -py);
}

/** Draw a layer image with its transform; a `spread` draws the two halves pushed apart. */
function drawLayer(ctx, img, group, key, t) {
  if (!t.spread) {
    ctx.save();
    applyTransform(ctx, group, t, key);
    ctx.drawImage(img, 0, 0, CANVAS, CANVAS);
    ctx.restore();
    return;
  }
  const [px] = pivotFor(group, key);
  for (const side of [-1, 1]) {
    ctx.save();
    applyTransform(ctx, group, { ...t, dx: t.dx + side * t.spread }, key);
    ctx.beginPath();
    ctx.rect(side < 0 ? -CANVAS : px, -CANVAS, CANVAS + (side < 0 ? px : CANVAS), CANVAS * 3);
    ctx.clip();
    ctx.drawImage(img, 0, 0, CANVAS, CANVAS);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- layers

/** The image layers a state needs, in drawing order. */
export function layersFor(rawState) {
  const s = drawableState(rawState);
  // Extras draw under the hat by default; headphones go over caps and beanies, band across the hat.
  let order = LAYER_ORDER;
  if (['mustache', 'handlebar'].includes(s.facialHair)) {
    order = order.filter(g => g !== 'facialHair');
    order.splice(order.indexOf('mouth') + 1, 0, 'facialHair');
  }
  if (s.extra === 'headphones' && FIT.headphonesOver.includes(s.hat)) {
    order = order.filter((g) => g !== 'extra');
    order.splice(order.indexOf('hat') + 1, 0, 'extra');
  }
  if (s.hair !== 'none' && ['earbuds', 'earring', 'bandaid'].includes(s.extra)) {
    order = order.filter(g => g !== 'extra');
    order.splice(order.indexOf('hair'), 0, 'extra');
  }
  const layers = [];
  for (const group of order) {
    const key = group === 'body' ? `${s.body}-${s.skin}` : s[group];
    if (group !== 'body' && !PARTS[group]?.[key]) continue; // "none" choices and missing images draw nothing
    layers.push({ group, key, transform: layerTransform(group, key, s.body) });
  }
  return layers;
}

const bgImages = new LruCache(12);

/** The SVG background drawn by the vector renderer, rasterized once per color/pattern. */
function backgroundImage(bg, pattern) {
  const k = `${bg}|${pattern}`;
  if (!bgImages.has(k)) {
    const defs = new Defs('bg');
    const body = background({ defs }, BG_COLORS[bg].value, pattern);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs>${defs.items.join('')}</defs>${body}</svg>`;
    bgImages.set(k, loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)));
  }
  return bgImages.get(k);
}

const stickerFallbacks = new Map();
function fallbackSticker(key) {
  if (!stickerFallbacks.has(key)) stickerFallbacks.set(key, loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(stickerSVG(key, 256))));
  return stickerFallbacks.get(key);
}

/** Slot rectangles (unit lid space) for n stickers. */
function stickerSlots(n) {
  const grid = n <= 1 ? [1, 1] : n === 2 ? [2, 1] : n <= 4 ? [2, 2] : [3, 2];
  const [cols, rows] = grid;
  const m = 0.07;
  const w = (1 - 2 * m) / cols;
  const h = (1 - 2 * m) / rows;
  const slots = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    // Center the last row when it is not full.
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const offset = ((cols - inRow) * w) / 2;
    slots.push([m + offset + c * w, m + r * h, w, h]);
  }
  return slots;
}

async function drawStickers(ctx, s, thumbs, transform) {
  const keys = s.stickers.slice(0, MULTI.stickers.max);
  if (!keys.length) return;
  const [tl, tr, , bl] = FIT.laptop.lid;
  const ax = tr[0] - tl[0];
  const ay = tr[1] - tl[1];
  const bx = bl[0] - tl[0];
  const by = bl[1] - tl[1];
  ctx.save();
  applyTransform(ctx, 'item', transform || layerTransform('item', 'laptop', s.body), 'laptop');
  ctx.transform(ax, ay, bx, by, tl[0], tl[1]); // unit square -> lid quad
  const slots = stickerSlots(keys.length);
  const lidW = Math.hypot(ax, ay);
  const lidH = Math.hypot(bx, by);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    let img;
    let box;
    if (hasSticker(key)) {
      img = await loadImage(partSrc('stickers', key, thumbs));
      box = PARTS.stickers[key];
    } else {
      img = await fallbackSticker(key);
      box = null;
    }
    const [sx, sy, sw, sh] = slots[i];
    const pad = 0.1;
    const cx = sx + sw / 2;
    const cy = sy + sh / 2;
    const fitW = sw * (1 - pad);
    const fitH = sh * (1 - pad);
    const rot = ((((i * 7) % 5) - 2) * 6 * Math.PI) / 180; // -12..12 degrees, deterministic
    ctx.save();
    ctx.translate(cx, cy);
    // Undo the lid's anisotropic scale so stickers are drawn square, then re-apply rotation.
    ctx.scale(1 / lidW, 1 / lidH);
    ctx.rotate(rot);
    const slotPx = Math.min(fitW * lidW, fitH * lidH);
    if (box) {
      const [x0, y0, x1, y1] = box;
      const bw = x1 - x0;
      const bh = y1 - y0;
      const k = slotPx / Math.max(bw, bh);
      const scale = img.naturalWidth / CANVAS; // thumbs are smaller than the canvas
      ctx.drawImage(img, x0 * scale, y0 * scale, bw * scale, bh * scale, (-bw * k) / 2, (-bh * k) / 2, bw * k, bh * k);
    } else {
      ctx.drawImage(img, -slotPx / 2, -slotPx / 2, slotPx, slotPx);
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawCapText(output, s, transform) {
  const spec = FIT.capText[s.hat];
  if (!spec || !s.capText) return;
  const lettering = document.createElement('canvas'); lettering.width = lettering.height = CANVAS;
  const ctx = lettering.getContext('2d');
  ctx.save();
  ctx.translate(spec.x, spec.y);
  ctx.rotate((spec.rot * Math.PI) / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = spec.h;
  const font = (px) => `900 ${px}px Fredoka, "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  ctx.font = font(size);
  const width = ctx.measureText(s.capText).width;
  if (width > spec.w) {
    size = (size * spec.w) / width;
    ctx.font = font(size);
  }
  // Embroidery: a dark stitch shadow, then the thread color with a slight satin highlight.
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = 'rgba(40, 10, 6, 0.55)';
  ctx.strokeText(s.capText, 0, size * 0.06);
  ctx.fillStyle = spec.color;
  ctx.fillText(s.capText, 0, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillText(s.capText, 0, -size * 0.04);
  ctx.restore();
  drawTransformed(output, lettering, 'hat', s.hat, transform || layerTransform('hat', s.hat, s.body));
}

function drawSignText(ctx, s, transform) {
  const spec = FIT.sign;
  if (!spec || !s.sign) return;
  ctx.save();
  applyTransform(ctx, 'item', transform || layerTransform('item', 'sign', s.body), 'sign');
  ctx.beginPath();
  ctx.rect(spec.x, spec.y, spec.w, spec.h);
  ctx.clip();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = spec.color;
  let size = spec.fontSize;
  const font = (px) => `900 ${px}px Fredoka, "Arial Black", Arial, sans-serif`;
  ctx.font = font(size);
  const width = ctx.measureText(s.sign).width;
  if (width > spec.w) {
    size *= spec.w / width;
    ctx.font = font(size);
  }
  ctx.fillText(s.sign, spec.x + spec.w / 2, spec.y + spec.h / 2);
  ctx.restore();
}

// ---------------------------------------------------------------- render

let letteringFont;
function readyLettering() {
  // Direct share links can render before CSS font loading finishes. Keep the
  // preview and downloaded lettering identical; fall back if the font fails.
  return letteringFont ||= document.fonts?.load('700 32px Fredoka').catch(() => []) || Promise.resolve();
}

/**
 * Draw a potato onto a canvas.
 * @param {object} rawState
 * @param {{size?: number, canvas?: HTMLCanvasElement, crop?: number[], thumbs?: boolean, background?: boolean}} [opts]
 *   size: output pixel size (square). crop: [x, y, w, h] region of the 1024 canvas to show.
 *   thumbs: use the 256 px thumbnails instead of full-size parts (for option grids).
 * @returns {Promise<HTMLCanvasElement>}
 */
const capApertures = new WeakMap();
function apertureBacking(cap, receiver, transform, surface, size) {
  let mask = capApertures.get(cap);
  if (!mask) {
    mask = document.createElement('canvas'); mask.width = mask.height = CANVAS;
    const ctx = mask.getContext('2d'); ctx.beginPath(); ctx.ellipse(447,211,91,57,0,0,Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(cap,0,0,CANVAS,CANVAS);
    capApertures.set(cap,mask);
  }
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d', {willReadFrequently:true}); ctx.scale(size/CANVAS,size/CANVAS);
  drawTransformed(ctx,mask,'hat','backwardCap',transform); ctx.resetTransform();
  const output = ctx.getImageData(0,0,size,size), source = receiver.getContext('2d').getImageData(0,0,size,size).data;
  const cx=surface.center*size/CANVAS, cy=surface.eyeY*size/CANVAS;
  // Continue the actual material at the aperture edge. Reflecting inward
  // samples preserves its color/texture boundary, including hair; an unrelated
  // scalp patch produces an obvious seam or a skin crescent above the hair.
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const i=(y*size+x)*4, alpha=output.data[i+3]*(1-source[i+3]/255);
    if(alpha<.5){output.data[i+3]=0;continue;}
    const length=Math.hypot(cx-x,cy-y), dx=(cx-x)/length, dy=(cy-y)/length;
    let distance=0, at=i;
    while(distance<length) {
      const sx=Math.max(0,Math.min(size-1,Math.round(x+dx*distance))),sy=Math.max(0,Math.min(size-1,Math.round(y+dy*distance)));
      at=(sy*size+sx)*4;if(source[at+3]>245)break;distance++;
    }
    const reach=Math.min(length,distance*1.8+1), sx=Math.max(0,Math.min(size-1,Math.round(x+dx*reach))),sy=Math.max(0,Math.min(size-1,Math.round(y+dy*reach)));
    const inside=(sy*size+sx)*4;if(source[inside+3]>245)at=inside;
    output.data[i]=source[at];output.data[i+1]=source[at+1];output.data[i+2]=source[at+2];output.data[i+3]=alpha;
  }
  ctx.putImageData(output,0,0);return c;
}

function fittedLayers(layers, imgs, body, state) {
  let surface = bodySurface(body, state.body);
  const hairIndex = layers.findIndex(l => l.group === 'hair');
  const hairTransform = hairIndex < 0 ? null : surfaceTransform(layers[hairIndex], imgs[hairIndex], surface, state);
  if (hairTransform) surface = withHairSurface(surface, imgs[hairIndex], state.hair, hairTransform);
  return { surface, transforms: layers.map((l, i) => i === hairIndex ? hairTransform : l.group === 'body' ? l.transform : surfaceTransform(l, imgs[i], surface, state)) };
}

export async function renderPotato(rawState, opts = {}) {
  const s = drawableState(rawState);
  const size = opts.size || 1024;
  const crop = opts.crop || [0, 0, CANVAS, CANVAS];
  const thumbs = Boolean(opts.thumbs);
  const canvas = opts.canvas || document.createElement('canvas');
  const hatColor = HAT_COLORS[s.hatColor].value;
  const hairColor = HAIR_COLORS[s.hairColor].value;
  if ((s.capText && FIT.capText[s.hat]) || (s.item === 'sign' && s.sign)) await readyLettering();

  // Load everything first so the frame is drawn in one go (no flashing).
  const layers = layersFor(s);
  const [bgImg, ...imgs] = await Promise.all([
    opts.background === false ? null : backgroundImage(s.bg, s.pattern),
    ...layers.map((l) => processedPart(l.group, l.key, partSrc(l.group, l.key, thumbs), { hatColor, hairColor, skin: s.skin })),
  ]);

  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  const k = size / crop[2];
  ctx.setTransform(k, 0, 0, k, -crop[0] * k, -crop[1] * k);
  if (bgImg) ctx.drawImage(bgImg, 0, 0, CANVAS, CANVAS);
  // A small body type must be smaller as a complete character. Scaling only
  // its torso would leave oversized hands, faces and clothes attached to it.
  const bodySize = BODY_PROFILES[s.body].size;
  ctx.translate(512, 880); ctx.scale(bodySize, bodySize); ctx.translate(-512, -880);
  const body = imgs[layers.findIndex(l => l.group === 'body')];
  const { surface, transforms } = fittedLayers(layers, imgs, body, s);
  const pieces = layers.map((l, i) => splitWearable(imgs[i], l.group, l.key, s));
  // Match temporary skin/shadow planes to the requested pixel density.
  // Full preview and both downloads still compose at native 1024 px.
  const workSize = thumbs ? 256 : Math.min(1024, Math.max(256, Math.ceil(size * CANVAS / crop[2])));
  const head = layers.flatMap((l, i) => ['hat', 'hair', 'item', 'gesture', 'extra', 'neckwear'].includes(l.group) ? [{ ...l, img: imgs[i], transform: transforms[i] }] : []);
  if (head.length) {
    const frame = headFrame(head);
    if (bodySize < 1) {
      // Wide props can force a large body farther from the camera. Petite
      // must not look larger simply because its narrow body needs less zoom.
      const referenceState = { ...s, body: 'classic' };
      const referenceBody = await loadImage(partSrc('body', `classic-${s.skin}`, thumbs));
      const referenceLayers = layers.map(l => ({ ...l, transform: layerTransform(l.group, l.key, 'classic') }));
      const reference = fittedLayers(referenceLayers, imgs, referenceBody, referenceState);
      const referenceHead = referenceLayers.flatMap((l, i) => ['hat', 'hair', 'item', 'gesture', 'extra', 'neckwear'].includes(l.group) ? [{ ...l, img: imgs[i], transform: reference.transforms[i] }] : []);
      frame.scale = Math.min(frame.scale, headFrame(referenceHead).scale);
    }
    ctx.translate(512, 512); ctx.scale(frame.scale, frame.scale); ctx.translate(-512, -frame.centerY);
  }
  // A world-space silhouette of everything already worn. Hat shadows land
  // on hair; glasses and clips land on the actual underlying material.
  const receiver = document.createElement('canvas');
  receiver.width = receiver.height = workSize;
  const receiverCtx = receiver.getContext('2d');
  receiverCtx.scale(workSize / CANVAS, workSize / CANVAS);
  // Rear rims go behind the wearer, with the same fit as their front piece.
  // Drawing source pieces directly preserves tall tips beyond the world canvas.
  for (let i = 0; i < layers.length; i++) if (pieces[i].behind === 'body') {
    const l = layers[i];
    drawTransformed(ctx, pieces[i].rear, l.group, l.key, transforms[i]);
    drawTransformed(receiverCtx, pieces[i].rear, l.group, l.key, transforms[i]);
  }
  receiverCtx.drawImage(body, 0, 0, CANVAS, CANVAS);
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    if (l.group === 'body') {
      drawLayer(ctx, imgs[i], l.group, l.key, l.transform);
      for (let j = 0; j < layers.length; j++) {
        const back = layers[j];
        if (pieces[j].behind === 'hair') {
          drawTransformed(ctx, pieces[j].rear, back.group, back.key, transforms[j]);
          drawTransformed(receiverCtx, pieces[j].rear, back.group, back.key, transforms[j]);
        }
        if (transforms[j].temples) {
          // Temple arms turn around the bare head, then disappear under hair.
          // Only the sampled hinge strips are behind hair; lenses stay in front.
          const arms = document.createElement('canvas'); arms.width = arms.height = workSize;
          const armsCtx = arms.getContext('2d'); armsCtx.scale(workSize / CANVAS, workSize / CANVAS);
          drawTransformed(armsCtx, imgs[j], back.group, back.key, { ...transforms[j], templesOnly: true });
          armsCtx.globalCompositeOperation = 'destination-in'; armsCtx.drawImage(body, 0, 0, CANVAS, CANVAS);
          ctx.drawImage(arms, 0, 0, CANVAS, CANVAS); receiverCtx.drawImage(arms, 0, 0, CANVAS, CANVAS);
        }
      }
      continue;
    }
    const transform = transforms[i].temples ? { ...transforms[i], temples: undefined } : transforms[i];
    const front = pieces[i].front;
    if (l.group === 'hat' && l.key === 'backwardCap') ctx.drawImage(apertureBacking(imgs[i], receiver, transform, surface, workSize), 0, 0, CANVAS, CANVAS);
    let plane = integratedLayer(front, l.group, l.key, transform, surface, workSize);
    const wrappedBand = l.group === 'hat' && l.key === 'headband';
    if (wrappedBand) {
      const clipped = document.createElement('canvas'); clipped.width = clipped.height = workSize;
      const bandCtx = clipped.getContext('2d'); bandCtx.drawImage(plane, 0, 0);
      // Cloth follows a continuous head surface. Following individual curl
      // rows made rectangular steps and pointed scraps at the lateral turns.
      // Fit a smooth local contour after rejecting sprouts and loose flyaways.
      const contour = document.createElement('canvas'); contour.width = contour.height = workSize;
      const contourCtx = contour.getContext('2d'); contourCtx.scale(workSize / CANVAS, workSize / CANVAS);
      const left = [], right = [], row = surface.headRow || surface.row;
      const low = Math.max((surface.headTop ?? surface.crownY) + 12, surface.eyeY - 235), high = surface.eyeY - 45;
      const centerY = (low + high) / 2, span = (high - low) / 2;
      const samples = Array.from({length:11}, (_, i) => {
        const u = (i - 5) / 5, y = centerY + u * span;
        const rows = Array.from({length:17}, (_,j) => row(y+(j-8)*4));
        return [u, ...[0,1].map(side => rows.map(r=>r[side]).sort((a,b)=>a-b)[8])];
      });
      const s2 = samples.reduce((n,[u])=>n+u*u,0), s4 = samples.reduce((n,[u])=>n+u**4,0);
      const curves = [1,2].map(side => {
        const sum = samples.reduce((n,p)=>n+p[side],0), linear = samples.reduce((n,p)=>n+p[0]*p[side],0);
        const square = samples.reduce((n,p)=>n+p[0]*p[0]*p[side],0);
        const c = (square - s2 * sum / samples.length) / (s4 - s2*s2/samples.length);
        return [(sum-c*s2)/samples.length, linear/s2, c];
      });
      const edgeAt = (side, y) => {
        const u = (y-centerY)/span;
        return curves[side][0] + curves[side][1]*u + curves[side][2]*u*u;
      };
      for (let y = surface.crownY - 80; y <= surface.eyeY + 140; y += 4) {
        left.push([edgeAt(0,y)+4,y]); right.push([edgeAt(1,y)-4,y]);
      }
      contourCtx.beginPath(); for (const [i,[x,y]] of [...left,...right.reverse()].entries()) i ? contourCtx.lineTo(x,y) : contourCtx.moveTo(x,y);
      contourCtx.closePath(); contourCtx.fill();
      bandCtx.globalCompositeOperation = 'destination-in'; bandCtx.drawImage(contour, 0, 0);
      const hairIndex = layers.findIndex(part => part.group === 'hair');
      if (hairIndex >= 0) {
        // A few existing strands overlap the band where it turns behind the
        // hairstyle. Preserve those strands rather than ending fabric in a
        // conspicuous straight cut across the curls.
        const hair = integratedLayer(imgs[hairIndex], 'hair', layers[hairIndex].key, transforms[hairIndex], surface, workSize);
        const overlap = document.createElement('canvas'); overlap.width = overlap.height = workSize;
        const overlapCtx = overlap.getContext('2d', {willReadFrequently:true}); overlapCtx.drawImage(hair, 0, 0);
        const image = overlapCtx.getImageData(0,0,workSize,workSize), unit = CANVAS/workSize;
        const turn = Math.max(18,Math.min(30,surface.faceWidth*.055));
        for (let y = 0; y < workSize; y++) {
          const yy = (y+.5)*unit, lo = edgeAt(0,yy)+4, hi = edgeAt(1,yy)-4;
          for (let x = 0; x < workSize; x++) {
            const distance = Math.min((x+.5)*unit-lo, hi-(x+.5)*unit);
            image.data[(y*workSize+x)*4+3] *= smooth(1-Math.max(0,distance)/turn);
          }
        }
        overlapCtx.putImageData(image,0,0); bandCtx.globalCompositeOperation='destination-out'; bandCtx.drawImage(overlap,0,0);
      }
      plane = clipped;
    }
    const shadow = l.group === 'hat' && l.key === 'halo' ? null : contactShadow(plane, receiver, l.group === 'gesture' && l.key === 'hip' ? 'handOnHip' : l.group, workSize);
    if (shadow) ctx.drawImage(shadow, ...(shadow.worldBox || [0, 0, CANVAS, CANVAS]));
    // Wearables can extend beyond the original 1024 world canvas. Draw their
    // original image into the fitted scene so tall tips are never pre-clipped.
    if (!wrappedBand && ['hair', 'hat', 'extra', 'neckwear', 'eyewear', 'brows', 'jewelry'].includes(l.group)) drawTransformed(ctx, front, l.group, l.key, transform);
    else ctx.drawImage(plane, ...(plane.worldBox || [0, 0, CANVAS, CANVAS]));
    if (!wrappedBand && ['hair', 'hat', 'extra', 'neckwear', 'eyewear', 'brows', 'jewelry'].includes(l.group)) drawTransformed(receiverCtx, front, l.group, l.key, transform);
    else receiverCtx.drawImage(plane, ...(plane.worldBox || [0, 0, CANVAS, CANVAS]));
    if (l.group === 'item' && l.key === 'laptop') await drawStickers(ctx, s, thumbs, transform);
    if (l.group === 'item' && l.key === 'sign') drawSignText(ctx, s, transform);
    if (l.group === 'hat') drawCapText(ctx, s, transform);
  }
  return canvas;
}

/** The 512 px PNG the app downloads: composed at 1024, then downsampled. */
export async function exportPng(rawState, size = 512) {
  const full = await renderPotato(rawState, { size: 1024 });
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(full, 0, 0, size, size);
  return new Promise((resolve, reject) => out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png'));
}

/** Crop regions (1024 space) used for option thumbnails. */
export function cropBox(category) {
  if (['eyes', 'brows', 'mouth', 'cheeks', 'facialHair', 'eyewear', 'preset'].includes(category)) return [292, 300, 440, 440];
  if (['hat', 'hatColor', 'capText'].includes(category)) return [212, 0, 600, 600];
  if (category === 'extra') return [112, 180, 800, 650];
  if (['hair', 'hairColor'].includes(category)) return [112, 40, 800, 800];
  if (category === 'jewelry') return [152, 290, 720, 500];
  if (category === 'neckwear') return [180, 450, 664, 500];
  if (category === 'item') return [0, 380, 620, 620];
  if (category === 'gesture') return [404, 380, 620, 620];
  return [0, 0, CANVAS, CANVAS];
}
