// Canvas compositor for the rendered PNG parts (assets/parts). Browser only.
//
// Every part image is a 1024x1024 transparent PNG already placed on a shared
// canvas, so a potato is just the layers drawn in order with small per-shape
// transforms from src/fit-data.js. On top of that: red garments are recolored
// to the chosen hat color, arms are tinted to the chosen skin, stickers are
// projected onto the laptop lid, and cap initials are lettered on.

import { PARTS, NO_IMAGE, LAYER_ORDER, CANVAS } from './assets.js';
import { FIT } from './fit-data.js';
import { SKINS, HAT_COLORS, BG_COLORS, OPTIONS, MULTI } from './options.js';
import { normalizeState } from './state.js';
import { Defs } from './draw.js';
import { background } from './parts/background.js';
import { stickerSVG } from './parts/stickers.js';

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
    else if (group === 'bg' || group === 'pattern' || group === 'hatColor') out[group] = options;
    else out[group] = Object.fromEntries(Object.entries(options).filter(([key]) => hasPart(group, key)));
  }
  return out;
}

/** The parts the manifest planned but that have no image yet, per group. */
export function missingParts() {
  const avail = availableOptions();
  const out = {};
  for (const [group, options] of Object.entries(OPTIONS)) {
    if (['bg', 'pattern', 'hatColor', 'body', 'skin'].includes(group)) continue;
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

const images = new Map();

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
const SKIN_WINDOW = { hue: 30, hueWidth: 14, sMin: 0.28, lMin: 0.2, lMax: 0.86 };
// Only the light skin tones: eyelids and lips, not the dark brown irises.
const SKIN_LIGHT_WINDOW = { hue: 30, hueWidth: 14, sMin: 0.28, lMin: 0.5, lMax: 0.9 };

const processed = new Map();
const PROCESSED_MAX = 60;

/** A part image with recolor / skin tint applied, cached by (src, hat color, skin). */
async function processedPart(group, key, src, { hatColor, skin }) {
  const wantsRecolor = FIT.recolor[group]?.includes(key) && hatColor && hatColor !== RED;
  const tintMode = FIT.skinTint[group];
  const wantsSkin = tintMode && skin && skin !== 'russet' && !FIT.noSkinTint.includes(`${group}/${key}`);
  const img = await loadImage(src);
  if (!wantsRecolor && !wantsSkin) return img;
  const cacheKey = `${src}|${wantsRecolor ? hatColor : ''}|${wantsSkin ? skin : ''}`;
  if (processed.has(cacheKey)) {
    const v = processed.get(cacheKey);
    processed.delete(cacheKey);
    processed.set(cacheKey, v); // refresh LRU position
    return v;
  }
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height);
  if (wantsRecolor) remap(id.data, RED_WINDOW, RED, hatColor);
  if (wantsSkin) remap(id.data, tintMode === 'light' ? SKIN_LIGHT_WINDOW : SKIN_WINDOW, SKINS.russet.base, SKINS[skin].base);
  ctx.putImageData(id, 0, 0);
  processed.set(cacheKey, c);
  if (processed.size > PROCESSED_MAX) processed.delete(processed.keys().next().value);
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
  if (s.extra === 'headphones' && FIT.headphonesOver.includes(s.hat)) {
    order = LAYER_ORDER.filter((g) => g !== 'extra');
    order.splice(order.indexOf('hat') + 1, 0, 'extra');
  }
  const layers = [];
  for (const group of order) {
    const key = group === 'body' ? `${s.body}-${s.skin}` : s[group];
    if (group !== 'body' && !PARTS[group]?.[key]) continue; // "none" choices and missing images draw nothing
    layers.push({ group, key, transform: layerTransform(group, key, s.body) });
  }
  return layers;
}

const bgImages = new Map();

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

async function drawStickers(ctx, s, thumbs) {
  const keys = s.stickers.slice(0, MULTI.stickers.max);
  if (!keys.length) return;
  const [tl, tr, , bl] = FIT.laptop.lid;
  const ax = tr[0] - tl[0];
  const ay = tr[1] - tl[1];
  const bx = bl[0] - tl[0];
  const by = bl[1] - tl[1];
  ctx.save();
  applyTransform(ctx, 'item', layerTransform('item', 'laptop', s.body), 'laptop');
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

function drawCapText(ctx, s) {
  const spec = FIT.capText[s.hat];
  if (!spec || !s.capText) return;
  ctx.save();
  applyTransform(ctx, 'hat', layerTransform('hat', s.hat, s.body), s.hat);
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
}

// ---------------------------------------------------------------- render

/**
 * Draw a potato onto a canvas.
 * @param {object} rawState
 * @param {{size?: number, canvas?: HTMLCanvasElement, crop?: number[], thumbs?: boolean, background?: boolean}} [opts]
 *   size: output pixel size (square). crop: [x, y, w, h] region of the 1024 canvas to show.
 *   thumbs: use the 256 px thumbnails instead of full-size parts (for option grids).
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderPotato(rawState, opts = {}) {
  const s = drawableState(rawState);
  const size = opts.size || 1024;
  const crop = opts.crop || [0, 0, CANVAS, CANVAS];
  const thumbs = Boolean(opts.thumbs);
  const canvas = opts.canvas || document.createElement('canvas');
  const hatColor = HAT_COLORS[s.hatColor].value;

  // Load everything first so the frame is drawn in one go (no flashing).
  const layers = layersFor(s);
  const [bgImg, ...imgs] = await Promise.all([
    opts.background === false ? null : backgroundImage(s.bg, s.pattern),
    ...layers.map((l) => processedPart(l.group, l.key, partSrc(l.group, l.key, thumbs), { hatColor, skin: s.skin })),
  ]);

  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  const k = size / crop[2];
  ctx.setTransform(k, 0, 0, k, -crop[0] * k, -crop[1] * k);
  if (bgImg) ctx.drawImage(bgImg, 0, 0, CANVAS, CANVAS);
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    drawLayer(ctx, imgs[i], l.group, l.key, l.transform);
    if (l.group === 'item' && l.key === 'laptop') await drawStickers(ctx, s, thumbs);
    if (l.group === 'hat') drawCapText(ctx, s);
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
  if (['hat', 'hatColor', 'capText', 'extra'].includes(category)) return [212, 0, 600, 600];
  if (category === 'neckwear') return [292, 520, 440, 440];
  if (category === 'item') return [0, 380, 620, 620];
  if (category === 'gesture') return [404, 380, 620, 620];
  return [0, 0, CANVAS, CANVAS];
}
