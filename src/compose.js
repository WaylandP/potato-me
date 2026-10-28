// Pure function: state in, SVG string out. No DOM, so it runs in the browser
// and in Node tests alike. The canvas is 512x512 and everything important sits
// inside the centered circle GitHub crops avatars to.

import { SKINS, BG_COLORS, HAT_COLORS, DEFAULT_STATE } from './options.js';
import { normalizeState } from './state.js';

const CX = 256;
const INK = '#1B1412';

// Each body knows where its face, hat, arms and feet go.
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

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function background(color, pattern, id) {
  let defs = '';
  let overlay = '';
  if (pattern === 'dots') {
    defs = `<pattern id="${id}-pat" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="4" fill="#fff" fill-opacity="0.16"/><circle cx="24" cy="24" r="4" fill="#fff" fill-opacity="0.16"/></pattern>`;
    overlay = `<rect width="512" height="512" fill="url(#${id}-pat)"/>`;
  } else if (pattern === 'grid') {
    defs = `<pattern id="${id}-pat" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" stroke-opacity="0.14" stroke-width="2"/></pattern>`;
    overlay = `<rect width="512" height="512" fill="url(#${id}-pat)"/>`;
  } else if (pattern === 'rays') {
    const wedges = [];
    for (let i = 0; i < 12; i++) {
      const a1 = (i * 30 * Math.PI) / 180;
      const a2 = ((i * 30 + 15) * Math.PI) / 180;
      const r = 420;
      const p = (a) => `${(256 + r * Math.cos(a)).toFixed(1)} ${(280 + r * Math.sin(a)).toFixed(1)}`;
      wedges.push(`M256 280 L${p(a1)} L${p(a2)} Z`);
    }
    overlay = `<path d="${wedges.join(' ')}" fill="#fff" fill-opacity="0.12"/>`;
  }
  return { defs, svg: `<rect width="512" height="512" fill="${color}"/>${overlay}` };
}

function feet(b, skin) {
  const y = b.bottom - 2;
  return `<g fill="${skin.shade}" stroke="${skin.line}" stroke-width="6">
<ellipse cx="${CX - 50}" cy="${y}" rx="34" ry="15"/><ellipse cx="${CX + 50}" cy="${y}" rx="34" ry="15"/></g>`;
}

function body(b, skin, id) {
  const spots = [
    [CX - 92, b.top + 58, 7, 4], [CX + 88, b.top + 96, 6, 3.5],
    [CX - 74, b.face + 112, 8, 4.5], [CX + 104, b.face + 70, 5, 3], [CX + 30, b.bottom - 34, 6, 3.5],
  ]
    .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${skin.spot}" fill-opacity="0.7"/>`)
    .join('');
  const specks = [[CX - 40, b.top + 40], [CX + 52, b.top + 52], [CX - 108, b.face + 40], [CX + 70, b.bottom - 70], [CX - 20, b.bottom - 44]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="${skin.spot}" fill-opacity="0.55"/>`)
    .join('');
  return {
    defs: `<clipPath id="${id}-body"><path d="${b.d}"/></clipPath>`,
    svg: `<path d="${b.d}" fill="${skin.base}"/>
<g clip-path="url(#${id}-body)">
<circle cx="${CX + 150}" cy="${b.bottom + 70}" r="250" fill="${skin.shade}" fill-opacity="0.45"/>
<ellipse cx="${CX - 60}" cy="${b.top + 70}" rx="70" ry="40" fill="#fff" fill-opacity="0.18" transform="rotate(-24 ${CX - 60} ${b.top + 70})"/>
${spots}${specks}</g>
<path d="${b.d}" fill="none" stroke="${skin.line}" stroke-width="7" stroke-linejoin="round"/>`,
  };
}

function eyes(kind, b, skin) {
  const y = b.face;
  const xs = [CX - 42, CX + 42];
  const dot = (x) => `<ellipse cx="${x}" cy="${y}" rx="13" ry="17" fill="${INK}"/><circle cx="${x - 4}" cy="${y - 6}" r="4.5" fill="#fff"/>`;
  const arc = (x) => `<path d="M${x - 16} ${y + 6} Q${x} ${y - 16} ${x + 16} ${y + 6}" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/>`;
  switch (kind) {
    case 'dots':
      return xs.map(dot).join('');
    case 'happy':
      return xs.map(arc).join('');
    case 'wide':
      return xs
        .map((x) => `<ellipse cx="${x}" cy="${y}" rx="21" ry="25" fill="#fff" stroke="${INK}" stroke-width="4.5"/><circle cx="${x + 3}" cy="${y + 4}" r="10" fill="${INK}"/><circle cx="${x}" cy="${y}" r="3.5" fill="#fff"/>`)
        .join('');
    case 'wink':
      return dot(xs[0]) + `<path d="M${xs[1] - 16} ${y} Q${xs[1]} ${y + 12} ${xs[1] + 16} ${y}" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/>`;
    case 'sleepy':
      return xs
        .map((x) => `<path d="M${x - 16} ${y} Q${x} ${y + 18} ${x + 16} ${y} Z" fill="${INK}"/><path d="M${x - 19} ${y} L${x + 19} ${y}" stroke="${skin.line}" stroke-width="5" stroke-linecap="round"/>`)
        .join('');
    case 'smug':
    default: {
      // Half-lidded eyes plus one cocked eyebrow: the house smirk.
      const lids = xs
        .map((x, i) => {
          const tilt = i === 0 ? -3 : 3;
          return `<path d="M${x - 18} ${y - 1 + tilt} C${x - 18} ${y - 26} ${x + 18} ${y - 26} ${x + 18} ${y - 1 - tilt} Z" fill="${skin.base}"/>
<path d="M${x - 17} ${y - 1 + tilt} L${x + 17} ${y - 1 - tilt}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
        })
        .join('');
      const brows = `<path d="M${xs[0] - 18} ${y - 30} Q${xs[0]} ${y - 46} ${xs[0] + 18} ${y - 36}" fill="none" stroke="${skin.line}" stroke-width="6" stroke-linecap="round"/>
<path d="M${xs[1] - 18} ${y - 28} Q${xs[1]} ${y - 32} ${xs[1] + 18} ${y - 27}" fill="none" stroke="${skin.line}" stroke-width="6" stroke-linecap="round"/>`;
      return xs.map(dot).join('') + lids + brows;
    }
  }
}

function mouth(kind, b) {
  const x = CX;
  const y = b.face + 54;
  switch (kind) {
    case 'grin':
      return `<path d="M${x - 38} ${y - 8} Q${x} ${y + 46} ${x + 38} ${y - 8} Z" fill="${INK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
<path d="M${x - 31} ${y - 5} L${x + 31} ${y - 5} L${x + 27} ${y + 6} L${x - 27} ${y + 6} Z" fill="#fff"/>
<ellipse cx="${x}" cy="${y + 20}" rx="14" ry="7" fill="#E26B6B"/>`;
    case 'laugh':
      return `<ellipse cx="${x}" cy="${y + 6}" rx="23" ry="21" fill="${INK}"/><ellipse cx="${x}" cy="${y + 17}" rx="13" ry="7.5" fill="#E26B6B"/>`;
    case 'flat':
      return `<path d="M${x - 22} ${y + 4} L${x + 22} ${y + 4}" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/>`;
    case 'oh':
      return `<ellipse cx="${x}" cy="${y + 4}" rx="10" ry="13" fill="${INK}"/>`;
    case 'smirk':
    default:
      return `<path d="M${x - 30} ${y + 2} Q${x + 2} ${y + 18} ${x + 30} ${y - 10}" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/>
<path d="M${x + 27} ${y - 17} Q${x + 34} ${y - 10} ${x + 33} ${y - 2}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  }
}

function cheeks(on, b) {
  if (on !== 'on') return '';
  return `<ellipse cx="${CX - 74}" cy="${b.face + 34}" rx="17" ry="10" fill="#F2836F" fill-opacity="0.55"/>
<ellipse cx="${CX + 74}" cy="${b.face + 34}" rx="17" ry="10" fill="#F2836F" fill-opacity="0.55"/>`;
}

function accessory(kind, b, color) {
  const y = b.face;
  switch (kind) {
    case 'shades':
      return `<g stroke="${INK}" stroke-width="5" stroke-linejoin="round">
<path d="M${CX - 74} ${y - 18} H${CX - 12} V${y + 4} Q${CX - 14} ${y + 26} ${CX - 42} ${y + 26} Q${CX - 72} ${y + 26} ${CX - 74} ${y + 4} Z" fill="${INK}"/>
<path d="M${CX + 12} ${y - 18} H${CX + 74} V${y + 4} Q${CX + 72} ${y + 26} ${CX + 42} ${y + 26} Q${CX + 14} ${y + 26} ${CX + 12} ${y + 4} Z" fill="${INK}"/>
<path d="M${CX - 12} ${y - 12} Q${CX} ${y - 18} ${CX + 12} ${y - 12}" fill="none"/>
<path d="M${CX - 74} ${y - 14} L${CX - 104} ${y - 22} M${CX + 74} ${y - 14} L${CX + 104} ${y - 22}" fill="none"/></g>
<path d="M${CX - 62} ${y - 10} L${CX - 48} ${y - 10} M${CX + 24} ${y - 10} L${CX + 38} ${y - 10}" stroke="#fff" stroke-opacity="0.55" stroke-width="4" stroke-linecap="round"/>`;
    case 'mustache':
      return `<path d="M${CX} ${y + 36} C${CX - 14} ${y + 24} ${CX - 44} ${y + 28} ${CX - 54} ${y + 44} C${CX - 60} ${y + 54} ${CX - 70} ${y + 50} ${CX - 72} ${y + 42} C${CX - 66} ${y + 66} ${CX - 30} ${y + 60} ${CX} ${y + 44} C${CX + 30} ${y + 60} ${CX + 66} ${y + 66} ${CX + 72} ${y + 42} C${CX + 70} ${y + 50} ${CX + 60} ${y + 54} ${CX + 54} ${y + 44} C${CX + 44} ${y + 28} ${CX + 14} ${y + 24} ${CX} ${y + 36} Z" fill="#3B2416" stroke="${INK}" stroke-width="3"/>`;
    case 'bowtie': {
      const by = y + 104;
      return `<g stroke="${INK}" stroke-width="5" stroke-linejoin="round" fill="${color}">
<path d="M${CX} ${by} L${CX - 42} ${by - 22} L${CX - 42} ${by + 22} Z"/><path d="M${CX} ${by} L${CX + 42} ${by - 22} L${CX + 42} ${by + 22} Z"/>
<rect x="${CX - 11}" y="${by - 11}" width="22" height="22" rx="6"/></g>`;
    }
    default:
      return '';
  }
}

function hat(kind, b, color, skin) {
  if (kind === 'none') return '';
  const t = b.top;
  const stroke = `stroke="${INK}" stroke-width="6" stroke-linejoin="round"`;
  let g = '';
  switch (kind) {
    case 'backwardCap':
      g = `<path d="M${CX + 64} ${t + 8} Q${CX + 150} ${t - 26} ${CX + 168} ${t + 6} Q${CX + 128} ${t + 32} ${CX + 78} ${t + 30} Z" fill="${color}" ${stroke}/>
<path d="M${CX - 98} ${t + 34} C${CX - 100} ${t - 62} ${CX + 100} ${t - 62} ${CX + 98} ${t + 34} Z" fill="${color}" ${stroke}/>
<path d="M${CX - 28} ${t + 34} Q${CX} ${t - 2} ${CX + 28} ${t + 34} Z" fill="${skin.base}" ${stroke}/>
<path d="M${CX - 32} ${t + 18} H${CX + 32}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
<path d="M${CX} ${t - 36} V${t + 4}" stroke="${INK}" stroke-opacity="0.35" stroke-width="3"/>
<circle cx="${CX}" cy="${t - 38}" r="7" fill="${color}" ${stroke}/>
<path d="M${CX - 60} ${t - 18} Q${CX - 42} ${t - 34} ${CX - 24} ${t - 38}" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="6" stroke-linecap="round"/>`;
      break;
    case 'beanie':
      g = `<path d="M${CX - 94} ${t + 30} C${CX - 98} ${t - 74} ${CX + 98} ${t - 74} ${CX + 94} ${t + 30} Z" fill="${color}" ${stroke}/>
<path d="M${CX - 40} ${t - 36} V${t + 8} M${CX} ${t - 44} V${t + 8} M${CX + 40} ${t - 36} V${t + 8}" stroke="${INK}" stroke-opacity="0.25" stroke-width="4"/>
<rect x="${CX - 102}" y="${t + 8}" width="204" height="38" rx="14" fill="${color}" ${stroke}/>
<circle cx="${CX}" cy="${t - 62}" r="22" fill="#F4F1EA" ${stroke}/>`;
      break;
    case 'wizard':
      g = `<path d="M${CX - 92} ${t + 26} Q${CX - 30} ${t - 70} ${CX + 40} ${t - 150} Q${CX + 36} ${t - 60} ${CX + 92} ${t + 26} Z" fill="${color}" ${stroke}/>
<ellipse cx="${CX}" cy="${t + 28}" rx="132" ry="22" fill="${color}" ${stroke}/>
<path d="M${CX - 20} ${t - 40} l6 12 13 2 -10 9 3 13 -12 -7 -12 7 3 -13 -10 -9 13 -2 Z" fill="#F5C542"/>
<path d="M${CX + 30} ${t - 92} l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1 Z" fill="#F5C542"/>`;
      break;
    case 'crown':
      g = `<path d="M${CX - 78} ${t + 26} L${CX - 84} ${t - 46} L${CX - 42} ${t - 8} L${CX} ${t - 62} L${CX + 42} ${t - 8} L${CX + 84} ${t - 46} L${CX + 78} ${t + 26} Z" fill="#F2B632" ${stroke}/>
<circle cx="${CX}" cy="${t + 6}" r="10" fill="#C8372D" stroke="${INK}" stroke-width="4"/>
<circle cx="${CX - 48}" cy="${t + 10}" r="7" fill="#2D7DD2" stroke="${INK}" stroke-width="4"/>
<circle cx="${CX + 48}" cy="${t + 10}" r="7" fill="#2D7DD2" stroke="${INK}" stroke-width="4"/>`;
      break;
    case 'hardhat':
      g = `<path d="M${CX - 92} ${t + 22} C${CX - 96} ${t - 70} ${CX + 96} ${t - 70} ${CX + 92} ${t + 22} Z" fill="${color}" ${stroke}/>
<path d="M${CX - 18} ${t - 46} H${CX + 18} V${t + 22} H${CX - 18} Z" fill="${color}" ${stroke}/>
<path d="M${CX - 122} ${t + 22} H${CX + 122} Q${CX + 124} ${t + 40} ${CX + 104} ${t + 40} H${CX - 104} Q${CX - 124} ${t + 40} ${CX - 122} ${t + 22} Z" fill="${color}" ${stroke}/>`;
      break;
    default:
      return '';
  }
  const s = b.hatScale;
  return s === 1 ? g : `<g transform="translate(${CX} ${t}) scale(${s}) translate(${-CX} ${-t})">${g}</g>`;
}

function arm(path, skin) {
  return `<path d="${path}" fill="none" stroke="${skin.line}" stroke-width="30" stroke-linecap="round"/>
<path d="${path}" fill="none" stroke="${skin.base}" stroke-width="18" stroke-linecap="round"/>`;
}

function hand(x, y, skin, r = 15) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${skin.base}" stroke="${skin.line}" stroke-width="6"/>`;
}

function shakaHand(x, y, skin) {
  // Fist with thumb and pinky out.
  return `<g fill="${skin.base}" stroke="${skin.line}" stroke-width="6" stroke-linejoin="round" transform="translate(${x} ${y}) rotate(36) scale(1.35) translate(${-x} ${-y})">
<rect x="${x - 46}" y="${y - 12}" width="34" height="23" rx="11.5"/>
<rect x="${x + 10}" y="${y - 9}" width="32" height="20" rx="10"/>
<circle cx="${x}" cy="${y}" r="20"/>
<path d="M${x - 9} ${y - 8} V${y + 8} M${x + 1} ${y - 9} V${y + 9}" fill="none" stroke-width="3" stroke-opacity="0.6"/></g>`;
}

function itemAndArms(state, b, skin, hatColor) {
  const L = CX - b.half + 6;
  const R = CX + b.half - 6;
  const ay = b.armY;
  const iy = ay + 34;

  if (state.item === 'none') {
    const left = arm(`M${L} ${ay} Q${L - 30} ${ay + 18} ${L - 26} ${ay + 52}`, skin) + hand(L - 26, ay + 56, skin);
    if (state.gesture === 'rest') {
      return left + arm(`M${R} ${ay} Q${R + 30} ${ay + 18} ${R + 26} ${ay + 52}`, skin) + hand(R + 26, ay + 56, skin);
    }
    const raised = arm(`M${R} ${ay} Q${R + 44} ${ay - 20} ${R + 52} ${ay - 84}`, skin);
    return left + raised + (state.gesture === 'shaka' ? shakaHand(R + 54, ay - 98, skin) : hand(R + 52, ay - 92, skin, 17));
  }

  if (state.item === 'laptop') {
    // Drawn in its own 176x116 space, then scaled down and parked below the mouth.
    const k = 0.84;
    const w = 176 * k;
    const x0 = CX - w / 2;
    const y0 = b.face + 84;
    const hy = y0 + 46;
    const lx = 88;
    const panda = `<g transform="translate(${lx - 44} 38)">
<circle r="23" fill="#fff" stroke="${INK}" stroke-width="3"/>
<circle cx="-12" cy="-13" r="7" fill="#9A3A1C"/><circle cx="12" cy="-13" r="7" fill="#9A3A1C"/>
<circle r="17" fill="#D2552B"/>
<ellipse cx="-8" cy="4" rx="7" ry="6" fill="#fff"/><ellipse cx="8" cy="4" rx="7" ry="6" fill="#fff"/>
<circle cx="-7" cy="-2" r="2.6" fill="${INK}"/><circle cx="7" cy="-2" r="2.6" fill="${INK}"/>
<ellipse cy="6" rx="3" ry="2" fill="${INK}"/></g>`;
    const code = `<g transform="translate(${lx + 30} 30) rotate(6)"><rect x="-30" y="-15" width="60" height="30" rx="8" fill="#23395B" stroke="${INK}" stroke-width="3"/>
<text x="0" y="6" text-anchor="middle" font-family="Menlo, Consolas, monospace" font-weight="700" font-size="17" fill="#7FE0D2">&lt;/&gt;</text></g>`;
    const cloud = `<g transform="translate(${lx + 40} 80) rotate(-8)"><rect x="-26" y="-18" width="52" height="36" rx="12" fill="#86C5F0" stroke="${INK}" stroke-width="3"/>
<path d="M-14 8 H14 A8 8 0 0 0 12 -6 A11 11 0 0 0 -8 -6 A8 8 0 0 0 -14 8 Z" fill="#fff"/></g>`;
    const term = `<g transform="translate(${lx - 30} 86) rotate(-4)"><rect x="-26" y="-15" width="52" height="30" rx="6" fill="#1F1F22" stroke="${INK}" stroke-width="3"/>
<text x="-15" y="6" font-family="Menlo, Consolas, monospace" font-weight="700" font-size="16" fill="#5BE37D">&gt;_</text></g>`;
    return `${arm(`M${L} ${ay} Q${L - 10} ${hy} ${x0 + 2} ${hy}`, skin)}${arm(`M${R} ${ay} Q${R + 10} ${hy} ${x0 + w - 2} ${hy}`, skin)}
<g transform="translate(${x0} ${y0}) scale(${k})">
<rect x="-8" y="112" width="192" height="14" rx="7" fill="#AEB6BF" stroke="${INK}" stroke-width="6"/>
<rect x="0" y="0" width="176" height="116" rx="14" fill="#D6DCE2" stroke="${INK}" stroke-width="7"/>
${panda}${code}${cloud}${term}</g>
${hand(x0 + 2, hy, skin)}${hand(x0 + w - 2, hy, skin)}`;
  }

  if (state.item === 'coffee') {
    const mx = CX;
    const my = iy - 10;
    return `${arm(`M${L} ${ay} Q${L + 10} ${my + 30} ${mx - 40} ${my + 6}`, skin)}${arm(`M${R} ${ay} Q${R - 10} ${my + 30} ${mx + 40} ${my + 6}`, skin)}
<path d="M${mx - 14} ${my - 52} q-10 -14 0 -26 M${mx + 10} ${my - 50} q-10 -14 0 -26" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="5" stroke-linecap="round"/>
<path d="M${mx + 34} ${my - 20} q30 0 30 22 q0 22 -30 22" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
<path d="M${mx + 34} ${my - 20} q30 0 30 22 q0 22 -30 22" fill="none" stroke="${hatColor}" stroke-width="7" stroke-linecap="round"/>
<path d="M${mx - 38} ${my - 36} H${mx + 38} V${my + 30} Q${mx + 38} ${my + 46} ${mx + 22} ${my + 46} H${mx - 22} Q${mx - 38} ${my + 46} ${mx - 38} ${my + 30} Z" fill="${hatColor}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
<ellipse cx="${mx}" cy="${my - 36}" rx="38" ry="8" fill="#5A3A22" stroke="${INK}" stroke-width="5"/>
${hand(mx - 40, my + 6, skin)}${hand(mx + 40, my + 6, skin)}`;
  }

  // sign
  const text = esc(state.sign || ' ');
  const fs = state.sign.length > 7 ? 26 : 34;
  const sy = iy - 40;
  return `<rect x="${CX - 7}" y="${sy + 30}" width="14" height="${b.bottom - sy + 10}" rx="5" fill="#A0703F" stroke="${INK}" stroke-width="5"/>
${arm(`M${L} ${ay} Q${L - 8} ${sy + 40} ${CX - 98} ${sy + 14}`, skin)}${arm(`M${R} ${ay} Q${R + 8} ${sy + 40} ${CX + 98} ${sy + 14}`, skin)}
<rect x="${CX - 108}" y="${sy - 36}" width="216" height="80" rx="12" fill="#FFFDF7" stroke="${INK}" stroke-width="6"/>
<text x="${CX}" y="${sy + 4 + fs / 3}" text-anchor="middle" font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="${fs}" fill="${INK}">${text}</text>
${hand(CX - 98, sy + 14, skin)}${hand(CX + 98, sy + 14, skin)}`;
}

/**
 * @param {object} rawState  any partial state; unknown values fall back to defaults
 * @param {{idPrefix?: string, viewBox?: string, size?: number}} [opts]
 */
export function composeSVG(rawState, opts = {}) {
  const state = normalizeState(rawState);
  const id = opts.idPrefix || 'pm';
  const viewBox = opts.viewBox || '0 0 512 512';
  const size = opts.size || 512;
  const b = BODIES[state.body];
  const skin = SKINS[state.skin];
  const hatColor = HAT_COLORS[state.hatColor].value;
  const bg = background(BG_COLORS[state.bg].value, state.pattern, id);
  const bod = body(b, skin, id);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}" role="img" aria-label="Potato avatar">
<defs>${bg.defs}${bod.defs}</defs>
${bg.svg}
${feet(b, skin)}
${bod.svg}
${cheeks(state.cheeks, b)}
${state.accessory === 'shades' ? '' : eyes(state.eyes, b, skin)}
${mouth(state.mouth, b)}
${accessory(state.accessory, b, hatColor)}
${hat(state.hat, b, hatColor, skin)}
${itemAndArms(state, b, skin, hatColor)}
</svg>`;
}

/** Crop regions used for option thumbnails, so a face option shows the face. */
export function cropFor(category, rawState) {
  const b = BODIES[normalizeState(rawState).body];
  if (['eyes', 'mouth', 'cheeks', 'accessory'].includes(category)) return `${CX - 120} ${b.face - 100} 240 240`;
  if (['hat', 'hatColor'].includes(category)) return `${CX - 150} ${b.top - 170} 300 300`;
  return undefined;
}
