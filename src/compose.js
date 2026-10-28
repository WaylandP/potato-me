// Pure function: state in, SVG string out. No DOM, so it runs in the browser
// and in Node tests alike. The canvas is 512x512 and everything important sits
// inside the centered circle GitHub crops avatars to.
//
// Drawing conventions
// - One light source, top-left. Highlights go up-left, shade goes down-right.
// - Bold 6–7 px ink outlines, soft gradients inside them, "sticker" look.
// - Shapes that must read as one blob (hands, pom-poms) are drawn with
//   `union()`: an outline pass underneath, a fill pass on top, so no seams.
// - Anything with an id goes through `Defs` so every id carries the prefix.

import { SKINS, BG_COLORS, HAT_COLORS } from './options.js';
import { normalizeState } from './state.js';

const CX = 256;
export const INK = '#1B1412';

// Each body knows where its face, hat, arms and feet go.
// top/bottom: extent on the y axis, face: eye line, armY: where arms leave the body,
// half: half-width at arm height, hatScale: hats shrink/grow to fit the head.
const BODIES = {
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

// ---------------------------------------------------------------- helpers

/** Compact number formatting: at most one decimal, no trailing ".0". */
const n = (v) => String(Math.round(v * 10) / 10);

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const hexToRgb = (hex) => {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const rgbToHex = (rgb) =>
  '#' + rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase();

/** Mix two hex colors: t = 0 gives a, t = 1 gives b. */
export function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}
const tint = (c, t) => mix(c, '#FFFFFF', t);
const shade = (c, t) => mix(c, '#000000', t);

/** Collects <defs> for one SVG so every id is unique on a page full of potatoes. */
class Defs {
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
function union(shapes, fill, line, width = 6) {
  return `<g fill="${line}" stroke="${line}" stroke-width="${width * 2}" stroke-linejoin="round">${shapes}</g><g fill="${fill}">${shapes}</g>`;
}

/** A capsule (rounded bar) of the given length pointing `deg` degrees from straight up, from (x, y). */
function capsule(x, y, deg, length, width) {
  return `<rect x="${n(-width / 2)}" y="${n(-length)}" width="${n(width)}" height="${n(length + width / 2)}" rx="${n(width / 2)}" transform="translate(${n(x)} ${n(y)}) rotate(${n(deg)})"/>`;
}

function star(cx, cy, r, inner = 0.45) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (-90 + i * 36) * (Math.PI / 180);
    const rr = i % 2 ? r * inner : r;
    pts.push(`${n(cx + Math.cos(a) * rr)} ${n(cy + Math.sin(a) * rr)}`);
  }
  return `M${pts.join(' L')} Z`;
}

// ------------------------------------------------------------- background

function background({ defs }, color, pattern) {
  const fill = defs.radial('bg', { cx: CX, cy: 210, r: 420 }, [[0, tint(color, 0.14)], [0.55, color], [1, shade(color, 0.16)]]);
  let overlay = '';
  if (pattern === 'dots') {
    const id = defs.id('pat');
    defs.add(`<pattern id="${id}" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="5" fill="#fff" fill-opacity="0.16"/><circle cx="27" cy="27" r="3" fill="#fff" fill-opacity="0.16"/></pattern>`);
    overlay = `<rect width="512" height="512" fill="url(#${id})"/>`;
  } else if (pattern === 'grid') {
    const id = defs.id('pat');
    defs.add(`<pattern id="${id}" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" stroke-opacity="0.14" stroke-width="2"/></pattern>`);
    overlay = `<rect width="512" height="512" fill="url(#${id})"/>`;
  } else if (pattern === 'rays') {
    const wedges = [];
    for (let i = 0; i < 12; i++) {
      const a1 = ((i * 30 + 7) * Math.PI) / 180;
      const a2 = ((i * 30 + 22) * Math.PI) / 180;
      const r = 440;
      const p = (a) => `${n(CX + r * Math.cos(a))} ${n(276 + r * Math.sin(a))}`;
      wedges.push(`M${CX} 276 L${p(a1)} L${p(a2)} Z`);
    }
    overlay = `<path d="${wedges.join(' ')}" fill="#fff" fill-opacity="0.12"/>`;
  } else if (pattern === 'confetti') {
    // Deterministic scatter so the same state always draws the same picture.
    let seed = 20240517;
    const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    const bits = [];
    for (let i = 0; i < 36; i++) {
      const x = 14 + rnd() * 484;
      const y = 14 + rnd() * 484;
      const s = 6 + rnd() * 8;
      const rot = n(rnd() * 360);
      if (i % 3 === 0) bits.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(s * 0.55)}"/>`);
      else if (i % 3 === 1) bits.push(`<rect x="${n(x - s / 2)}" y="${n(y - s / 2)}" width="${n(s)}" height="${n(s)}" rx="2" transform="rotate(${rot} ${n(x)} ${n(y)})"/>`);
      else bits.push(`<path d="M${n(x)} ${n(y - s * 0.7)} L${n(x + s * 0.65)} ${n(y + s * 0.45)} L${n(x - s * 0.65)} ${n(y + s * 0.45)} Z" transform="rotate(${rot} ${n(x)} ${n(y)})"/>`);
    }
    overlay = `<g fill="#fff" fill-opacity="0.28">${bits.join('')}</g>`;
  }
  return `<rect width="512" height="512" fill="${fill}"/>${overlay}`;
}

// ------------------------------------------------------------------- body

function groundShadow({ defs, b }) {
  const fill = defs.radialBox('gs', [[0, INK, 0.32], [0.55, INK, 0.16], [1, INK, 0]]);
  return `<ellipse cx="${CX}" cy="${n(b.bottom + 4)}" rx="${n(b.half + 46)}" ry="22" fill="${fill}"/>`;
}

function feet({ defs, b, skin }) {
  const fill = defs.linear('ft', 'v', [[0, skin.base], [1, skin.shade]]);
  const y = b.bottom - 2;
  const foot = (x) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="36" ry="17"/>`;
  return `<g fill="${fill}" stroke="${skin.line}" stroke-width="6">${foot(CX - 52)}${foot(CX + 52)}</g>`;
}

function body({ defs, b, skin, skinFill }) {
  const clip = defs.id('body');
  defs.add(`<clipPath id="${clip}"><path d="${b.d}"/></clipPath>`);
  const core = defs.radialBox('core', [[0, skin.shade, 0.62], [1, skin.shade, 0]]);
  const rim = defs.radialBox('rim', [[0, '#FFFFFF', 0.45], [1, '#FFFFFF', 0]]);
  const grain = defs.id('grain');
  defs.add(`<pattern id="${grain}" width="30" height="30" patternUnits="userSpaceOnUse"><g fill="${skin.spot}"><circle cx="4" cy="6" r="1.4"/><circle cx="19" cy="3" r="1.1"/><circle cx="12" cy="17" r="1.6"/><circle cx="25" cy="22" r="1.2"/><circle cx="7" cy="26" r="1"/></g></pattern>`);

  const H = b.bottom - b.top;
  // Potato "eyes": shallow dimples, placed as fractions of the body so they fit every shape.
  const dimples = [
    [-0.62, 0.24, 9, 5, -25], [0.6, 0.36, 8, 4.5, 20],
    [-0.56, 0.72, 10, 5.5, -10], [0.72, 0.56, 7, 4, 30], [0.2, 0.9, 8, 4.5, -15], [-0.1, 0.12, 5, 3, 10],
  ]
    .map(([fx, fy, rx, ry, rot]) => {
      const x = CX + fx * b.half;
      const y = b.top + fy * H;
      return `<g transform="rotate(${rot} ${n(x)} ${n(y)})"><ellipse cx="${n(x + 1.5)}" cy="${n(y + 3)}" rx="${rx}" ry="${ry}" fill="${skin.light}" fill-opacity="0.55"/><ellipse cx="${n(x)}" cy="${n(y)}" rx="${rx}" ry="${ry}" fill="${skin.spot}" fill-opacity="0.62"/></g>`;
    })
    .join('');

  return `<path d="${b.d}" fill="${skinFill}"/>
<g clip-path="url(#${clip})">
<ellipse cx="${n(CX + 60)}" cy="${n(b.bottom - 40)}" rx="${n(b.half + 70)}" ry="${n(H * 0.4)}" fill="${core}"/>
<path d="${b.d}" fill="none" stroke="${skin.shade}" stroke-width="36" stroke-opacity="0.16"/>
<path d="${b.d}" fill="none" stroke="${skin.shade}" stroke-width="14" stroke-opacity="0.16"/>
<ellipse cx="${n(CX - 64)}" cy="${n(b.top + 76)}" rx="98" ry="56" transform="rotate(-26 ${n(CX - 64)} ${n(b.top + 76)})" fill="${rim}"/>
<path d="${b.d}" fill="url(#${grain})" fill-opacity="0.35"/>
${dimples}
</g>
<path d="${b.d}" fill="none" stroke="${skin.line}" stroke-width="7" stroke-linejoin="round"/>`;
}

// ------------------------------------------------------------------- face

function cheeks({ defs, b, state }) {
  if (state.cheeks !== 'on') return '';
  const fill = defs.radialBox('blush', [[0, '#F2836F', 0.72], [1, '#F2836F', 0]]);
  const y = n(b.face + 36);
  return `<ellipse cx="${CX - 78}" cy="${y}" rx="26" ry="15" fill="${fill}"/><ellipse cx="${CX + 78}" cy="${y}" rx="26" ry="15" fill="${fill}"/>`;
}

function eyes({ b, skin, skinFill, state }) {
  const y = b.face;
  const xs = [CX - 42, CX + 42];
  const dot = (x) =>
    `<ellipse cx="${n(x)}" cy="${n(y)}" rx="13.5" ry="17.5" fill="${INK}"/><circle cx="${n(x - 4.5)}" cy="${n(y - 6.5)}" r="5" fill="#fff"/><circle cx="${n(x + 4.5)}" cy="${n(y + 6)}" r="2.4" fill="#fff" fill-opacity="0.85"/>`;
  const arc = (x) =>
    `<path d="M${n(x - 17)} ${n(y + 7)} Q${n(x)} ${n(y - 17)} ${n(x + 17)} ${n(y + 7)}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;
  switch (state.eyes) {
    case 'dots':
      return xs.map(dot).join('');
    case 'happy':
      return xs.map(arc).join('');
    case 'wide':
      return xs
        .map(
          (x) =>
            `<ellipse cx="${n(x)}" cy="${n(y)}" rx="22" ry="26" fill="#fff" stroke="${INK}" stroke-width="4.5"/><circle cx="${n(x + 3)}" cy="${n(y + 4)}" r="12" fill="#5A3A22"/><circle cx="${n(x + 3)}" cy="${n(y + 4)}" r="8" fill="${INK}"/><circle cx="${n(x - 1)}" cy="${n(y - 1)}" r="3.8" fill="#fff"/>`,
        )
        .join('');
    case 'wink':
      return dot(xs[0]) + `<path d="M${n(xs[1] - 16)} ${n(y)} Q${n(xs[1])} ${n(y + 13)} ${n(xs[1] + 16)} ${n(y)}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;
    case 'sleepy':
      return xs
        .map(
          (x) =>
            `<path d="M${n(x - 16)} ${n(y)} Q${n(x)} ${n(y + 19)} ${n(x + 16)} ${n(y)} Z" fill="${INK}"/><path d="M${n(x - 19)} ${n(y - 1)} Q${n(x)} ${n(y + 4)} ${n(x + 19)} ${n(y - 1)}" fill="none" stroke="${skin.line}" stroke-width="5" stroke-linecap="round"/>`,
        )
        .join('');
    case 'smug':
    default: {
      // Half-lidded eyes plus one cocked eyebrow: the house smirk.
      const lids = xs
        .map((x, i) => {
          const tilt = i === 0 ? -3 : 3;
          return `<path d="M${n(x - 18)} ${n(y - 1 + tilt)} C${n(x - 18)} ${n(y - 26)} ${n(x + 18)} ${n(y - 26)} ${n(x + 18)} ${n(y - 1 - tilt)} Z" fill="${skinFill}"/>
<path d="M${n(x - 17)} ${n(y - 1 + tilt)} L${n(x + 17)} ${n(y - 1 - tilt)}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
        })
        .join('');
      const brows = `<path d="M${n(xs[0] - 18)} ${n(y - 30)} Q${n(xs[0])} ${n(y - 46)} ${n(xs[0] + 18)} ${n(y - 36)}" fill="none" stroke="${skin.line}" stroke-width="6" stroke-linecap="round"/>
<path d="M${n(xs[1] - 18)} ${n(y - 28)} Q${n(xs[1])} ${n(y - 32)} ${n(xs[1] + 18)} ${n(y - 27)}" fill="none" stroke="${skin.line}" stroke-width="6" stroke-linecap="round"/>`;
      return xs.map(dot).join('') + lids + brows;
    }
  }
}

function mouth({ b, state }) {
  const x = CX;
  const y = b.face + 54;
  switch (state.mouth) {
    case 'grin':
      return `<path d="M${x - 40} ${n(y - 8)} Q${x} ${n(y + 48)} ${x + 40} ${n(y - 8)} Z" fill="${INK}"/>
<path d="M${x - 32} ${n(y - 5)} H${x + 32} L${x + 27} ${n(y + 7)} Q${x} ${n(y + 11)} ${x - 27} ${n(y + 7)} Z" fill="#fff"/>
<path d="M${x} ${n(y - 5)} V${n(y + 9)}" stroke="#D7D7D7" stroke-width="1.5"/>
<path d="M${x - 15} ${n(y + 24)} Q${x} ${n(y + 14)} ${x + 15} ${n(y + 24)} Q${x} ${n(y + 38)} ${x - 15} ${n(y + 24)} Z" fill="#E26B6B"/>
<path d="M${x - 40} ${n(y - 8)} Q${x} ${n(y + 48)} ${x + 40} ${n(y - 8)} Z" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'laugh':
      return `<path d="M${x - 25} ${n(y - 6)} Q${x} ${n(y + 2)} ${x + 25} ${n(y - 6)} Q${x + 27} ${n(y + 30)} ${x} ${n(y + 32)} Q${x - 27} ${n(y + 30)} ${x - 25} ${n(y - 6)} Z" fill="${INK}"/>
<ellipse cx="${x}" cy="${n(y + 22)}" rx="13" ry="8" fill="#E26B6B"/><ellipse cx="${n(x - 3)}" cy="${n(y + 19)}" rx="5" ry="2.5" fill="#F2A3A3"/>
<path d="M${x - 25} ${n(y - 6)} Q${x} ${n(y + 2)} ${x + 25} ${n(y - 6)} Q${x + 27} ${n(y + 30)} ${x} ${n(y + 32)} Q${x - 27} ${n(y + 30)} ${x - 25} ${n(y - 6)} Z" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'flat':
      return `<path d="M${x - 22} ${n(y + 4)} L${x + 22} ${n(y + 4)}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;
    case 'oh':
      return `<ellipse cx="${x}" cy="${n(y + 4)}" rx="10" ry="13" fill="${INK}"/><ellipse cx="${n(x - 3)}" cy="${n(y - 2)}" rx="3" ry="2" fill="#fff" fill-opacity="0.35"/>`;
    case 'smirk':
    default:
      return `<path d="M${x - 30} ${n(y + 2)} Q${x + 2} ${n(y + 18)} ${x + 30} ${n(y - 10)}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
<path d="M${x + 27} ${n(y - 17)} Q${x + 34} ${n(y - 10)} ${x + 33} ${n(y - 2)}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  }
}

function accessory({ defs, b, state, hatColor }) {
  const y = b.face;
  const stroke = `stroke="${INK}" stroke-width="5" stroke-linejoin="round"`;
  switch (state.accessory) {
    case 'shades': {
      const lens = defs.linear('lens', 'd', [[0, '#3A3A46'], [0.5, '#1B1B22'], [1, '#0C0B0E']]);
      return `<g ${stroke}>
<path d="M${CX - 76} ${n(y - 18)} H${CX - 10} V${n(y + 4)} Q${CX - 12} ${n(y + 28)} ${CX - 43} ${n(y + 28)} Q${CX - 74} ${n(y + 28)} ${CX - 76} ${n(y + 4)} Z" fill="${lens}"/>
<path d="M${CX + 10} ${n(y - 18)} H${CX + 76} V${n(y + 4)} Q${CX + 74} ${n(y + 28)} ${CX + 43} ${n(y + 28)} Q${CX + 12} ${n(y + 28)} ${CX + 10} ${n(y + 4)} Z" fill="${lens}"/>
<path d="M${CX - 10} ${n(y - 12)} Q${CX} ${n(y - 18)} ${CX + 10} ${n(y - 12)}" fill="none"/>
<path d="M${CX - 76} ${n(y - 14)} L${CX - 106} ${n(y - 24)} M${CX + 76} ${n(y - 14)} L${CX + 106} ${n(y - 24)}" fill="none"/></g>
<path d="M${CX - 66} ${n(y - 8)} L${CX - 50} ${n(y - 8)} M${CX + 20} ${n(y - 8)} L${CX + 36} ${n(y - 8)}" stroke="#fff" stroke-opacity="0.6" stroke-width="4" stroke-linecap="round"/>
<path d="M${CX - 70} ${n(y + 2)} L${CX - 62} ${n(y + 2)} M${CX + 16} ${n(y + 2)} L${CX + 24} ${n(y + 2)}" stroke="#fff" stroke-opacity="0.3" stroke-width="3" stroke-linecap="round"/>`;
    }
    case 'glasses': {
      const glass = defs.linear('glass', 'd', [[0, '#FFFFFF', 0.4], [0.5, '#FFFFFF', 0.08], [1, '#FFFFFF', 0.28]]);
      return `<g ${stroke}>
<circle cx="${CX - 42}" cy="${n(y + 2)}" r="27" fill="${glass}"/><circle cx="${CX + 42}" cy="${n(y + 2)}" r="27" fill="${glass}"/>
<path d="M${CX - 15} ${n(y - 2)} Q${CX} ${n(y - 10)} ${CX + 15} ${n(y - 2)}" fill="none"/>
<path d="M${CX - 69} ${n(y - 4)} L${CX - 104} ${n(y - 16)} M${CX + 69} ${n(y - 4)} L${CX + 104} ${n(y - 16)}" fill="none"/></g>
<path d="M${CX - 58} ${n(y - 10)} Q${CX - 52} ${n(y - 18)} ${CX - 44} ${n(y - 20)} M${CX + 26} ${n(y - 10)} Q${CX + 32} ${n(y - 18)} ${CX + 40} ${n(y - 20)}" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="4" stroke-linecap="round"/>`;
    }
    case 'mustache':
      return `<path d="M${CX} ${n(y + 36)} C${CX - 14} ${n(y + 24)} ${CX - 44} ${n(y + 28)} ${CX - 54} ${n(y + 44)} C${CX - 60} ${n(y + 54)} ${CX - 70} ${n(y + 50)} ${CX - 72} ${n(y + 42)} C${CX - 66} ${n(y + 66)} ${CX - 30} ${n(y + 60)} ${CX} ${n(y + 44)} C${CX + 30} ${n(y + 60)} ${CX + 66} ${n(y + 66)} ${CX + 72} ${n(y + 42)} C${CX + 70} ${n(y + 50)} ${CX + 60} ${n(y + 54)} ${CX + 54} ${n(y + 44)} C${CX + 44} ${n(y + 28)} ${CX + 14} ${n(y + 24)} ${CX} ${n(y + 36)} Z" fill="#3B2416" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M${CX - 40} ${n(y + 36)} Q${CX - 24} ${n(y + 30)} ${CX - 8} ${n(y + 36)} M${CX + 8} ${n(y + 36)} Q${CX + 24} ${n(y + 30)} ${CX + 40} ${n(y + 36)}" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="3" stroke-linecap="round"/>`;
    case 'bowtie': {
      const by = y + 106;
      const fill = defs.linear('bow', 'v', [[0, tint(hatColor, 0.18)], [1, shade(hatColor, 0.3)]]);
      return `<g ${stroke} fill="${fill}">
<path d="M${CX} ${by} L${CX - 44} ${by - 23} Q${CX - 50} ${by} ${CX - 44} ${by + 23} Z"/><path d="M${CX} ${by} L${CX + 44} ${by - 23} Q${CX + 50} ${by} ${CX + 44} ${by + 23} Z"/>
<rect x="${CX - 11}" y="${by - 12}" width="22" height="24" rx="6"/></g>
<path d="M${CX - 36} ${n(by - 14)} L${CX - 16} ${n(by - 4)} M${CX + 36} ${n(by - 14)} L${CX + 16} ${n(by - 4)}" stroke="${INK}" stroke-opacity="0.3" stroke-width="3" stroke-linecap="round"/>
<path d="M${CX - 6} ${n(by - 6)} V${n(by + 2)}" stroke="#fff" stroke-opacity="0.35" stroke-width="3" stroke-linecap="round"/>`;
    }
    default:
      return '';
  }
}

// -------------------------------------------------------------------- hats

// How far below the body top each hat's lower edge sits (at scale 1), for the cast shadow.
const HAT_BRIM = { backwardCap: 34, beanie: 48, wizard: 52, crown: 36, hardhat: 42, party: 30, beret: 34 };

function hatShadow({ defs, b, state }) {
  if (state.hat === 'none') return '';
  const s = b.hatScale;
  const y0 = b.top + (HAT_BRIM[state.hat] - 8) * s;
  const fill = defs.linear('hs', 'v', [[0, INK, 0.3], [1, INK, 0]]);
  return `<g clip-path="url(#${defs.id('body')})"><rect x="${CX - 200}" y="${n(y0)}" width="400" height="${n(70 * s)}" fill="${fill}"/></g>`;
}

function hat({ defs, b, state, skin, hatColor: color }) {
  if (state.hat === 'none') return '';
  const t = b.top;
  const stroke = `stroke="${INK}" stroke-width="6" stroke-linejoin="round"`;
  const gloss = (d) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="0.32" stroke-width="7" stroke-linecap="round"/>`;
  // Keep highlights and decals inside the hat's main shape, whatever the hat color.
  const inside = (shape, inner) => {
    const id = defs.id('hatclip');
    defs.add(`<clipPath id="${id}"><path d="${shape}"/></clipPath>`);
    return `<g clip-path="url(#${id})">${inner}</g>`;
  };
  let g = '';
  switch (state.hat) {
    case 'backwardCap': {
      const fill = defs.linear('hat', 'h', [[0, tint(color, 0.18)], [0.5, color], [1, shade(color, 0.3)]]);
      const dome = `M${CX - 98} ${t + 34} C${CX - 102} ${t - 64} ${CX + 102} ${t - 64} ${CX + 98} ${t + 34} Z`;
      g = `<path d="M${CX + 60} ${t + 10} Q${CX + 150} ${t - 24} ${CX + 170} ${t + 8} Q${CX + 128} ${t + 34} ${CX + 78} ${t + 32} Z" fill="${shade(color, 0.22)}" ${stroke}/>
<path d="${dome}" fill="${fill}" ${stroke}/>
${inside(dome, `<path d="M${CX} ${t - 40} Q${CX - 44} ${t - 20} ${CX - 64} ${t + 34} M${CX} ${t - 40} Q${CX + 44} ${t - 20} ${CX + 64} ${t + 34}" fill="none" stroke="${INK}" stroke-opacity="0.22" stroke-width="3"/>${gloss(`M${CX - 70} ${t - 8} Q${CX - 50} ${t - 32} ${CX - 22} ${t - 40}`)}`)}
<path d="M${CX - 28} ${t + 34} Q${CX} ${t - 2} ${CX + 28} ${t + 34} Z" fill="${skin.shade}" ${stroke}/>
<rect x="${CX - 34}" y="${t + 13}" width="68" height="11" rx="5" fill="${INK}"/>
<circle cx="${CX - 20}" cy="${t + 18.5}" r="2" fill="#fff" fill-opacity="0.45"/><circle cx="${CX}" cy="${t + 18.5}" r="2" fill="#fff" fill-opacity="0.45"/><circle cx="${CX + 20}" cy="${t + 18.5}" r="2" fill="#fff" fill-opacity="0.45"/>
<circle cx="${CX}" cy="${t - 40}" r="7" fill="${color}" ${stroke}/>`;
      break;
    }
    case 'beanie': {
      const fill = defs.linear('hat', 'h', [[0, tint(color, 0.16)], [0.5, color], [1, shade(color, 0.28)]]);
      const ribs = [];
      for (let x = CX - 84; x <= CX + 84; x += 14) ribs.push(`M${x} ${t + 13} V${t + 41}`);
      const pom = [[0, 0, 22], [-16, -12, 10], [16, -12, 10], [-20, 8, 9], [20, 8, 9], [0, -21, 10], [-6, 19, 9], [9, 18, 9]]
        .map(([dx, dy, r]) => `<circle cx="${CX + dx}" cy="${t - 84 + dy}" r="${r}"/>`)
        .join('');
      const dome = `M${CX - 96} ${t + 30} C${CX - 100} ${t - 80} ${CX + 100} ${t - 80} ${CX + 96} ${t + 30} Z`;
      g = `<path d="${dome}" fill="${fill}" ${stroke}/>
${inside(dome, `<path d="M${CX - 46} ${t - 42} Q${CX - 52} ${t - 10} ${CX - 54} ${t + 22} M${CX} ${t - 52} V${t + 22} M${CX + 46} ${t - 42} Q${CX + 52} ${t - 10} ${CX + 54} ${t + 22}" fill="none" stroke="${INK}" stroke-opacity="0.2" stroke-width="4" stroke-linecap="round"/>${gloss(`M${CX - 72} ${t - 24} Q${CX - 52} ${t - 48} ${CX - 24} ${t - 54}`)}`)}
<rect x="${CX - 104}" y="${t + 6}" width="208" height="42" rx="16" fill="${fill}" ${stroke}/>
<path d="${ribs.join(' ')}" stroke="${INK}" stroke-opacity="0.2" stroke-width="3" stroke-linecap="round"/>
${union(pom, '#F4F1EA', INK)}
<path d="M${CX - 10} ${t - 96} Q${CX - 2} ${t - 104} ${CX + 8} ${t - 100}" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="4" stroke-linecap="round"/>`;
      break;
    }
    case 'wizard': {
      const fill = defs.linear('hat', 'h', [[0, tint(color, 0.18)], [0.45, color], [1, shade(color, 0.32)]]);
      const brim = defs.linear('brim', 'v', [[0, tint(color, 0.12)], [1, shade(color, 0.32)]]);
      const gold = '#F5C542';
      const cone = `M${CX - 88} ${t + 26} C${CX - 50} ${t - 40} ${CX - 10} ${t - 100} ${CX + 10} ${t - 126} C${CX + 18} ${t - 142} ${CX + 48} ${t - 150} ${CX + 58} ${t - 132} C${CX + 44} ${t - 132} ${CX + 36} ${t - 120} ${CX + 36} ${t - 106} C${CX + 46} ${t - 60} ${CX + 70} ${t - 20} ${CX + 88} ${t + 26} Z`;
      g = `<ellipse cx="${CX}" cy="${t + 28}" rx="138" ry="24" fill="${brim}" ${stroke}/>
<path d="${cone}" fill="${fill}" ${stroke}/>
${inside(cone, `<path d="${star(CX - 24, t - 50, 13)}" fill="${gold}"/><path d="${star(CX + 22, t - 90, 8)}" fill="${gold}"/><path d="${star(CX + 18, t - 112, 4.5)}" fill="${gold}"/>
<path d="M${CX + 38} ${t - 42} a10 10 0 1 0 8 14 a7 7 0 1 1 -8 -14 Z" fill="${gold}"/>
${gloss(`M${CX - 60} ${t - 22} Q${CX - 42} ${t - 60} ${CX - 14} ${t - 96}`)}`)}
<path d="M${CX - 70} ${t - 12} Q${CX} ${t + 6} ${CX + 70} ${t - 12} L${CX + 78} ${t + 12} Q${CX} ${t + 30} ${CX - 78} ${t + 12} Z" fill="${shade(color, 0.42)}" ${stroke}/>
<rect x="${CX - 14}" y="${t - 8}" width="28" height="24" rx="4" fill="${gold}" ${stroke.replace('6', '4')}/>
<rect x="${CX - 6}" y="${t - 1}" width="12" height="10" rx="2" fill="${shade(color, 0.42)}"/>`;
      break;
    }
    case 'crown': {
      const gold = defs.linear('hat', 'v', [[0, '#FBD75B'], [0.55, '#F2B632'], [1, '#C98A14']]);
      const velvet = defs.linear('velvet', 'h', [[0, tint(color, 0.16)], [1, shade(color, 0.3)]]);
      const points = `M${CX - 82} ${t + 12} L${CX - 88} ${t - 50} L${CX - 44} ${t - 12} L${CX} ${t - 72} L${CX + 44} ${t - 12} L${CX + 88} ${t - 50} L${CX + 82} ${t + 12} Z`;
      const gem = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${INK}" stroke-width="3.5"/><circle cx="${n(x - r * 0.35)}" cy="${n(y - r * 0.35)}" r="${n(r * 0.28)}" fill="#fff" fill-opacity="0.85"/>`;
      g = `<path d="M${CX - 72} ${t + 14} C${CX - 70} ${t - 32} ${CX + 70} ${t - 32} ${CX + 72} ${t + 14} Z" fill="${velvet}" ${stroke}/>
<path d="${points}" fill="${gold}" ${stroke}/>
${inside(points, gloss(`M${CX - 76} ${t + 4} L${CX - 82} ${t - 38}`))}
<circle cx="${CX - 88}" cy="${t - 52}" r="7" fill="#FBD75B" ${stroke}/><circle cx="${CX}" cy="${t - 74}" r="8" fill="#FBD75B" ${stroke}/><circle cx="${CX + 88}" cy="${t - 52}" r="7" fill="#FBD75B" ${stroke}/>
<rect x="${CX - 88}" y="${t + 6}" width="176" height="30" rx="8" fill="${gold}" ${stroke}/>
${gem(CX, t + 21, 10, '#D9342B')}${gem(CX - 52, t + 21, 7, '#2D7DD2')}${gem(CX + 52, t + 21, 7, '#2D7DD2')}
<circle cx="${CX - 26}" cy="${t + 21}" r="4" fill="#3FA86B" stroke="${INK}" stroke-width="2.5"/><circle cx="${CX + 26}" cy="${t + 21}" r="4" fill="#3FA86B" stroke="${INK}" stroke-width="2.5"/>`;
      break;
    }
    case 'hardhat': {
      const fill = defs.linear('hat', 'h', [[0, tint(color, 0.22)], [0.5, color], [1, shade(color, 0.3)]]);
      const dome = `M${CX - 94} ${t + 22} C${CX - 98} ${t - 74} ${CX + 98} ${t - 74} ${CX + 94} ${t + 22} Z`;
      g = `<path d="${dome}" fill="${fill}" ${stroke}/>
${inside(dome, gloss(`M${CX - 74} ${t - 10} Q${CX - 60} ${t - 36} ${CX - 36} ${t - 44}`))}
<path d="M${CX - 18} ${t - 50} Q${CX} ${t - 58} ${CX + 18} ${t - 50} V${t + 22} H${CX - 18} Z" fill="${tint(color, 0.14)}" ${stroke}/>
<path d="M${CX - 126} ${t + 22} H${CX + 126} Q${CX + 128} ${t + 42} ${CX + 106} ${t + 42} H${CX - 106} Q${CX - 128} ${t + 42} ${CX - 126} ${t + 22} Z" fill="${fill}" ${stroke}/>
<path d="M${CX - 116} ${t + 31} H${CX + 116}" stroke="${INK}" stroke-opacity="0.22" stroke-width="3"/>
<path d="M${CX - 62} ${t - 2} h14 M${CX + 48} ${t - 2} h14" stroke="${INK}" stroke-opacity="0.35" stroke-width="4" stroke-linecap="round"/>`;
      break;
    }
    case 'party': {
      const fill = defs.linear('hat', 'h', [[0, tint(color, 0.2)], [0.5, color], [1, shade(color, 0.3)]]);
      const cone = `M${CX - 72} ${t + 30} L${CX + 6} ${t - 124} L${CX + 76} ${t + 30} Z`;
      const pom = [[0, 0, 13], [-9, -8, 7], [9, -8, 7], [-11, 5, 6], [11, 5, 6], [0, -13, 6], [0, 12, 6]]
        .map(([dx, dy, r]) => `<circle cx="${CX + 6 + dx}" cy="${t - 128 + dy}" r="${r}"/>`)
        .join('');
      g = `<path d="${cone}" fill="${fill}" ${stroke}/>
${inside(cone, `<path d="M${CX - 110} ${t + 4} L${CX + 70} ${t - 70} M${CX - 90} ${t + 40} L${CX + 110} ${t - 40}" stroke="#fff" stroke-opacity="0.45" stroke-width="14"/>`)}
<path d="${cone}" fill="none" ${stroke}/>
<circle cx="${CX - 22}" cy="${t + 8}" r="5" fill="#fff" fill-opacity="0.8"/><circle cx="${CX + 26}" cy="${t - 30}" r="4" fill="#fff" fill-opacity="0.8"/><circle cx="${CX + 36}" cy="${t + 12}" r="4.5" fill="#fff" fill-opacity="0.8"/>
${union(pom, '#F4F1EA', INK)}`;
      break;
    }
    case 'beret': {
      const fill = defs.linear('hat', 'h', [[0, tint(color, 0.18)], [0.5, color], [1, shade(color, 0.3)]]);
      const disc = `M${CX - 100} ${t + 24} C${CX - 118} ${t - 36} ${CX + 50} ${t - 84} ${CX + 118} ${t - 10} C${CX + 128} ${t + 16} ${CX + 60} ${t + 34} ${CX - 20} ${t + 36} C${CX - 60} ${t + 36} ${CX - 92} ${t + 34} ${CX - 100} ${t + 24} Z`;
      g = `<path d="${disc}" fill="${fill}" ${stroke}/>
${inside(disc, `<path d="M${CX - 94} ${t + 26} C${CX - 60} ${t + 14} ${CX + 20} ${t + 10} ${CX + 108} ${t - 2}" fill="none" stroke="${INK}" stroke-opacity="0.25" stroke-width="4"/>${gloss(`M${CX - 66} ${t - 8} Q${CX - 30} ${t - 44} ${CX + 12} ${t - 50}`)}`)}
<path d="M${CX - 4} ${t - 56} q2 -14 14 -18" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
      break;
    }
    default:
      return '';
  }
  const s = b.hatScale;
  return s === 1 ? g : `<g transform="translate(${CX} ${t}) scale(${s}) translate(${-CX} ${-t})">${g}</g>`;
}

// ------------------------------------------------------------ arms & gear

function arm(path, skin) {
  return `<path d="${path}" fill="none" stroke="${skin.line}" stroke-width="30" stroke-linecap="round"/>
<path d="${path}" fill="none" stroke="${skin.base}" stroke-width="18" stroke-linecap="round"/>`;
}

/** A mitten: palm plus a thumb bump. `side` is which way the thumb points (-1 left, 1 right). */
function mitten(x, y, skin, side = 1, r = 15) {
  const shapes = `<circle cx="${n(x)}" cy="${n(y)}" r="${r}"/><circle cx="${n(x + side * r * 0.72)}" cy="${n(y - r * 0.5)}" r="${n(r * 0.52)}"/>`;
  return union(shapes, skin.base, skin.line);
}

/** An open, waving hand: palm, four spread fingers and a thumb. */
function openHand(x, y, skin, side = 1) {
  const fingers = [[-36, 38], [-12, 44], [12, 44], [36, 38]]
    .map(([deg, len]) => capsule(x, y, deg * side, len, 16))
    .join('');
  const thumb = capsule(x, y, -88 * side, 30, 15);
  const shapes = `<circle cx="${n(x)}" cy="${n(y)}" r="20"/>${fingers}${thumb}`;
  return union(shapes, skin.base, skin.line) + `<path d="M${n(x - 8)} ${n(y + 2)} q8 7 16 0" fill="none" stroke="${skin.line}" stroke-opacity="0.4" stroke-width="3" stroke-linecap="round"/>`;
}

/** Shaka: a fist with thumb and pinky out, tilted so it reads at thumbnail size. */
function shakaHand(x, y, skin) {
  const fist = `<rect x="${n(x - 22)}" y="${n(y - 16)}" width="44" height="38" rx="15"/>`;
  const knuckles = [-13, 0, 13].map((dx, i) => `<circle cx="${n(x + dx)}" cy="${n(y - 15 - (i === 1 ? 2 : 0))}" r="9.5"/>`).join('');
  const thumb = capsule(x - 15, y - 6, -28, 38, 16);
  const pinky = capsule(x + 16, y + 2, 152, 32, 13);
  const shapes = fist + knuckles + thumb + pinky;
  return `<g transform="rotate(-30 ${n(x)} ${n(y)})">${union(shapes, skin.base, skin.line)}
<path d="M${n(x - 7)} ${n(y - 10)} v12 M${n(x + 7)} ${n(y - 10)} v12" fill="none" stroke="${skin.line}" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round"/></g>`;
}

function laptop({ defs, b, skin }, L, R, ay) {
  // Drawn in its own 176x116 space, then scaled down and parked below the mouth.
  const k = 0.84;
  const w = 176 * k;
  const x0 = CX - w / 2;
  const y0 = b.face + 84;
  const hy = y0 + 46;
  const lid = defs.linear('lid', 'v', [[0, '#EAEEF2'], [1, '#C3CBD4']]);
  const panda = `<g transform="translate(44 40)">
<circle r="26" fill="#fff" stroke="${INK}" stroke-width="3"/>
<g stroke="${INK}" stroke-width="2.5"><circle cx="-14" cy="-14" r="8" fill="#B4432A"/><circle cx="14" cy="-14" r="8" fill="#B4432A"/></g>
<circle cx="-14" cy="-13" r="3.5" fill="#F7E7DC"/><circle cx="14" cy="-13" r="3.5" fill="#F7E7DC"/>
<circle r="18" fill="#D9552B" stroke="${INK}" stroke-width="2.5"/>
<ellipse cx="-8" cy="-5" rx="5.5" ry="4.5" fill="#F7E7DC"/><ellipse cx="8" cy="-5" rx="5.5" ry="4.5" fill="#F7E7DC"/>
<ellipse cy="7" rx="10" ry="7" fill="#F7E7DC"/>
<circle cx="-7" cy="-3" r="2.6" fill="${INK}"/><circle cx="7" cy="-3" r="2.6" fill="${INK}"/>
<path d="M-12 2 q-3 4 -4 8 M12 2 q3 4 4 8" fill="none" stroke="#8F3A22" stroke-width="2.2" stroke-linecap="round"/>
<ellipse cy="5" rx="3" ry="2.2" fill="${INK}"/><path d="M-3 8 q3 3 6 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/></g>`;
  const code = `<g transform="translate(118 30) rotate(6)"><rect x="-32" y="-17" width="64" height="34" rx="9" fill="#fff"/><rect x="-29" y="-14" width="58" height="28" rx="7" fill="#23395B" stroke="${INK}" stroke-width="2.5"/>
<text x="0" y="6" text-anchor="middle" font-family="Menlo, Consolas, 'DejaVu Sans Mono', monospace" font-weight="700" font-size="17" fill="#7FE0D2">&lt;/&gt;</text></g>`;
  const cloud = `<g transform="translate(128 82) rotate(-8)"><rect x="-28" y="-20" width="56" height="40" rx="13" fill="#fff"/><rect x="-25" y="-17" width="50" height="34" rx="11" fill="#86C5F0" stroke="${INK}" stroke-width="2.5"/>
<path d="M-14 8 H14 A8 8 0 0 0 12 -6 A11 11 0 0 0 -8 -6 A8 8 0 0 0 -14 8 Z" fill="#fff"/></g>`;
  const term = `<g transform="translate(58 88) rotate(-4)"><rect x="-28" y="-17" width="56" height="34" rx="7" fill="#fff"/><rect x="-25" y="-14" width="50" height="28" rx="5" fill="#1F1F22" stroke="${INK}" stroke-width="2.5"/>
<circle cx="-18" cy="-8" r="2" fill="#FF5F56"/><circle cx="-12" cy="-8" r="2" fill="#FFBD2E"/><circle cx="-6" cy="-8" r="2" fill="#27C93F"/>
<text x="-18" y="9" font-family="Menlo, Consolas, 'DejaVu Sans Mono', monospace" font-weight="700" font-size="15" fill="#5BE37D">&gt;_</text></g>`;
  return `${arm(`M${n(L)} ${n(ay)} Q${n(L - 10)} ${n(hy)} ${n(x0 + 4)} ${n(hy)}`, skin)}${arm(`M${n(R)} ${n(ay)} Q${n(R + 10)} ${n(hy)} ${n(x0 + w - 4)} ${n(hy)}`, skin)}
<g transform="translate(${n(x0)} ${n(y0)}) scale(${k})">
<rect x="-8" y="110" width="192" height="16" rx="8" fill="#AEB6BF" stroke="${INK}" stroke-width="6"/>
<path d="M4 113 H172" stroke="#fff" stroke-opacity="0.5" stroke-width="2.5" stroke-linecap="round"/>
<rect x="0" y="0" width="176" height="116" rx="14" fill="${lid}" stroke="${INK}" stroke-width="7"/>
<rect x="9" y="9" width="158" height="98" rx="9" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="2"/>
${panda}${code}${cloud}${term}</g>
${mitten(x0 + 4, hy, skin, 1)}${mitten(x0 + w - 4, hy, skin, -1)}`;
}

function coffee({ defs, b, skin, hatColor }, L, R, ay) {
  const mx = CX;
  const my = ay + 24;
  const mug = defs.linear('mug', 'h', [[0, tint(hatColor, 0.2)], [0.5, hatColor], [1, shade(hatColor, 0.3)]]);
  const steam = (x, o, len) => `<path d="M${n(x)} ${n(my - 48)} q-9 -${n(len * 0.45)} 0 -${n(len * 0.9)} q9 -${n(len * 0.45)} 0 -${n(len * 0.9)}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="5" stroke-linecap="round"/>`;
  return `${arm(`M${n(L)} ${n(ay)} Q${n(L + 10)} ${n(my + 30)} ${n(mx - 42)} ${n(my + 8)}`, skin)}${arm(`M${n(R)} ${n(ay)} Q${n(R - 10)} ${n(my + 30)} ${n(mx + 42)} ${n(my + 8)}`, skin)}
${steam(mx - 16, 0.85, 20)}${steam(mx + 2, 0.6, 26)}${steam(mx + 18, 0.75, 16)}
<path d="M${mx + 34} ${n(my - 20)} q32 0 32 22 q0 22 -32 22" fill="none" stroke="${INK}" stroke-width="17" stroke-linecap="round"/>
<path d="M${mx + 34} ${n(my - 20)} q32 0 32 22 q0 22 -32 22" fill="none" stroke="${mug}" stroke-width="8" stroke-linecap="round"/>
<path d="M${mx - 38} ${n(my - 36)} H${mx + 38} V${n(my + 30)} Q${mx + 38} ${n(my + 46)} ${mx + 22} ${n(my + 46)} H${mx - 22} Q${mx - 38} ${n(my + 46)} ${mx - 38} ${n(my + 30)} Z" fill="${mug}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
<path d="M${mx - 28} ${n(my - 24)} V${n(my + 30)}" stroke="#fff" stroke-opacity="0.3" stroke-width="6" stroke-linecap="round"/>
<ellipse cx="${mx}" cy="${n(my - 36)}" rx="38" ry="8" fill="#4A2C19" stroke="${INK}" stroke-width="5"/>
<ellipse cx="${n(mx - 6)}" cy="${n(my - 37)}" rx="22" ry="3.5" fill="#7A4A2A"/>
${mitten(mx - 42, my + 8, skin, 1)}${mitten(mx + 42, my + 8, skin, -1)}`;
}

function sign({ b, skin, state }, L, R, ay) {
  const text = esc(state.sign || ' ');
  const fs = state.sign.length > 7 ? 26 : 34;
  const sy = ay - 6;
  return `<rect x="${CX - 7}" y="${n(sy + 30)}" width="14" height="${n(b.bottom - sy + 10)}" rx="5" fill="#A0703F" stroke="${INK}" stroke-width="5"/>
<path d="M${CX - 2} ${n(sy + 46)} V${n(b.bottom)}" stroke="#7A5230" stroke-width="2" stroke-opacity="0.7"/>
${arm(`M${n(L)} ${n(ay)} Q${n(L - 8)} ${n(sy + 40)} ${CX - 98} ${n(sy + 14)}`, skin)}${arm(`M${n(R)} ${n(ay)} Q${n(R + 8)} ${n(sy + 40)} ${CX + 98} ${n(sy + 14)}`, skin)}
<rect x="${CX - 104}" y="${n(sy - 31)}" width="216" height="80" rx="12" fill="${INK}" fill-opacity="0.18"/>
<rect x="${CX - 108}" y="${n(sy - 36)}" width="216" height="80" rx="12" fill="#FFFDF7" stroke="${INK}" stroke-width="6"/>
<rect x="${CX - 100}" y="${n(sy - 28)}" width="200" height="64" rx="7" fill="none" stroke="${INK}" stroke-opacity="0.22" stroke-width="2"/>
<text x="${CX}" y="${n(sy + 4 + fs / 3)}" text-anchor="middle" font-family="'Arial Black', 'Helvetica Neue', Arial, 'Liberation Sans', sans-serif" font-weight="900" font-size="${fs}" fill="${INK}">${text}</text>
${mitten(CX - 98, sy + 14, skin, 1)}${mitten(CX + 98, sy + 14, skin, -1)}`;
}

function itemAndArms(ctx) {
  const { b, skin, state } = ctx;
  const L = CX - b.half + 6;
  const R = CX + b.half - 6;
  const ay = b.armY;

  if (state.item === 'laptop') return laptop(ctx, L, R, ay);
  if (state.item === 'coffee') return coffee(ctx, L, R, ay);
  if (state.item === 'sign') return sign(ctx, L, R, ay);

  // Nothing held: both hands free.
  const left = arm(`M${n(L)} ${n(ay)} Q${n(L - 30)} ${n(ay + 18)} ${n(L - 26)} ${n(ay + 52)}`, skin) + mitten(L - 26, ay + 56, skin, 1);
  if (state.gesture === 'rest') {
    return left + arm(`M${n(R)} ${n(ay)} Q${n(R + 30)} ${n(ay + 18)} ${n(R + 26)} ${n(ay + 52)}`, skin) + mitten(R + 26, ay + 56, skin, -1);
  }
  const raised = arm(`M${n(R)} ${n(ay)} Q${n(R + 44)} ${n(ay - 20)} ${n(R + 52)} ${n(ay - 84)}`, skin);
  return left + raised + (state.gesture === 'shaka' ? shakaHand(R + 56, ay - 100, skin) : openHand(R + 54, ay - 96, skin, 1));
}

// ---------------------------------------------------------------- compose

/**
 * @param {object} rawState  any partial state; unknown values fall back to defaults
 * @param {{idPrefix?: string, viewBox?: string, size?: number}} [opts]
 */
export function composeSVG(rawState, opts = {}) {
  const state = normalizeState(rawState);
  const defs = new Defs(opts.idPrefix || 'pm');
  const viewBox = opts.viewBox || '0 0 512 512';
  const size = opts.size || 512;
  const b = BODIES[state.body];
  const skin = SKINS[state.skin];
  const hatColor = HAT_COLORS[state.hatColor].value;
  // The skin gradient is shared by the body and anything that must blend into it (eyelids).
  const skinFill = defs.radial('skin', { cx: CX - 70, cy: b.top + 90, r: 300 }, [[0, skin.light], [0.42, skin.base], [1, skin.shade]]);
  const ctx = { defs, b, skin, skinFill, hatColor, state };

  const layers = [
    background(ctx, BG_COLORS[state.bg].value, state.pattern),
    groundShadow(ctx),
    feet(ctx),
    body(ctx),
    hatShadow(ctx),
    cheeks(ctx),
    state.accessory === 'shades' ? '' : eyes(ctx),
    mouth(ctx),
    accessory(ctx),
    hat(ctx),
    itemAndArms(ctx),
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}" role="img" aria-label="Potato avatar">
<defs>${defs.items.join('')}</defs>
${layers.filter(Boolean).join('\n')}
</svg>`;
}

/** Crop regions used for option thumbnails, so a face option shows the face. */
export function cropFor(category, rawState) {
  const b = BODIES[normalizeState(rawState).body];
  if (['eyes', 'mouth', 'cheeks', 'accessory'].includes(category)) return `${CX - 120} ${b.face - 100} 240 240`;
  if (['hat', 'hatColor'].includes(category)) return `${CX - 160} ${b.top - 190} 320 320`;
  return undefined;
}
