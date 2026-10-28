// Shared drawing kit: canvas constants, body anchors, color math, the Defs
// collector and a few shape helpers. Every part module imports from here and
// nothing here imports a part, so there are no cycles.
//
// Drawing conventions
// - The canvas is 512x512 and everything important sits inside the centered
//   circle GitHub crops avatars to.
// - One light source, top-left. Highlights go up-left, shade goes down-right.
// - Shapes that must read as one blob (hands, pom-poms) are drawn with
//   `union()`: an outline pass underneath, a fill pass on top, so no seams.
// - Anything with an id goes through `Defs` so every id carries the prefix.

export const CX = 256;

export const INK = '#1B1412';

// Each body knows where its face, hat, arms and feet go.
// top/bottom: extent on the y axis, face: eye line, armY: where arms leave the body,
// half: half-width at arm height, hatScale: hats shrink/grow to fit the head.

export const BODIES = {
  classic: {
    d: 'M256 150 C332 146 386 198 393 268 C401 338 371 410 300 432 C270 441 238 442 208 433 C140 412 112 342 119 272 C126 200 180 153 256 150 Z',
    top: 152, face: 268, armY: 330, half: 132, bottom: 436, hatScale: 1,
  },
  lumpy: {
    d: 'M250 150 C302 140 352 160 373 200 C392 234 381 254 392 290 C406 338 380 404 318 428 C286 440 250 444 214 434 C150 418 116 368 122 318 C126 284 108 262 118 228 C132 180 190 156 250 150 Z',
    top: 150, face: 270, armY: 332, half: 130, bottom: 436, hatScale: 1,
  },
  round: {
    d: 'M256 172 C340 172 400 230 400 306 C400 384 336 436 256 436 C176 436 112 384 112 306 C112 230 172 172 256 172 Z',
    top: 174, face: 292, armY: 342, half: 140, bottom: 434, hatScale: 1.05,
  },
  long: {
    d: 'M256 122 C318 120 360 172 362 252 C366 340 350 410 300 432 C272 444 240 444 212 432 C162 410 148 340 150 252 C152 172 194 124 256 122 Z',
    top: 124, face: 250, armY: 322, half: 106, bottom: 438, hatScale: 0.88,
  },
};

export const n = (v) => String(Math.round(v * 10) / 10);

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const hexToRgb = (hex) => {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

export const rgbToHex = (rgb) =>
  '#' + rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase();

/** Mix two hex colors: t = 0 gives a, t = 1 gives b. */

export function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}

export const tint = (c, t) => mix(c, '#FFFFFF', t);

export const shade = (c, t) => mix(c, '#000000', t);

/** Collects <defs> for one SVG so every id is unique on a page full of potatoes. */

export class Defs {
  constructor(prefix) {
    this.prefix = prefix;
    this.items = [];
  }
  id(name) {
    return `${this.prefix}-${name}`;
  }
  add(markup) {
    this.items.push(markup);
  }
  stops(stops) {
    return stops
      .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`)
      .join('');
  }
  /** Radial gradient in canvas coordinates (so it can match across shapes). */
  radial(name, { cx, cy, r }, stops) {
    const id = this.id(name);
    this.add(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}">${this.stops(stops)}</radialGradient>`);
    return `url(#${id})`;
  }
  /** Radial gradient that fills the shape's own box (soft blobs, glows). */
  radialBox(name, stops) {
    const id = this.id(name);
    this.add(`<radialGradient id="${id}">${this.stops(stops)}</radialGradient>`);
    return `url(#${id})`;
  }
  /** Linear gradient across the shape's own box: 'h' left→right, 'v' top→bottom, 'd' diagonal. */
  linear(name, dir, stops) {
    const id = this.id(name);
    const coords = dir === 'v' ? 'x1="0" y1="0" x2="0" y2="1"' : dir === 'd' ? 'x1="0" y1="0" x2="1" y2="1"' : 'x1="0" y1="0" x2="1" y2="0"';
    this.add(`<linearGradient id="${id}" ${coords}>${this.stops(stops)}</linearGradient>`);
    return `url(#${id})`;
  }
}

/** Draw several shapes as one blob: outline pass underneath, fill pass on top. */

export function union(shapes, fill, line, width = 6) {
  return `<g fill="${line}" stroke="${line}" stroke-width="${width * 2}" stroke-linejoin="round">${shapes}</g><g fill="${fill}">${shapes}</g>`;
}

/** A capsule (rounded bar) of the given length pointing `deg` degrees from straight up, from (x, y). */

export function capsule(x, y, deg, length, width) {
  return `<rect x="${n(-width / 2)}" y="${n(-length)}" width="${n(width)}" height="${n(length + width / 2)}" rx="${n(width / 2)}" transform="translate(${n(x)} ${n(y)}) rotate(${n(deg)})"/>`;
}

export function star(cx, cy, r, inner = 0.45) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (-90 + i * 36) * (Math.PI / 180);
    const rr = i % 2 ? r * inner : r;
    pts.push(`${n(cx + Math.cos(a) * rr)} ${n(cy + Math.sin(a) * rr)}`);
  }
  return `M${pts.join(' L')} Z`;
}
