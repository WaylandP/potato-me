// Backgrounds: a gradient fill plus an optional pattern overlay. Patterns are
// white at low opacity so they work on every color, light or dark.
import { CX, n, tint, shade } from '../draw.js';

/** Relative luminance 0..1 of a hex color, to pick a pattern ink that shows on it. */
function luminance(hex) {
  const v = parseInt(hex.slice(1), 16);
  const c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => {
    const u = x / 255;
    return u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Deterministic scatter: same seed, same picture, so the renderer stays pure. */
function scatter(seed, count, fn) {
  let s = seed;
  const rnd = () => (s = (s * 48271) % 2147483647) / 2147483647;
  const bits = [];
  for (let i = 0; i < count; i++) bits.push(fn(14 + rnd() * 484, 14 + rnd() * 484, rnd, i));
  return bits.join('');
}

const PATTERNS = {
  solid: (ctx, color, ink) => '',
  spotlight: ({ defs }, color) => {
    // A studio backdrop: a soft pool of light behind the potato and a floor that darkens toward the bottom edge.
    const pool = defs.radialBox('pool', [[0, '#FFFFFF', 0.3], [0.6, '#FFFFFF', 0.1], [1, '#FFFFFF', 0]]);
    const floor = defs.linear('floor', 'v', [[0, shade(color, 0.2), 0], [0.35, shade(color, 0.22), 0.35], [1, shade(color, 0.4), 0.55]]);
    return `<ellipse cx="${CX}" cy="250" rx="300" ry="270" fill="${pool}"/><rect x="0" y="372" width="512" height="140" fill="${floor}"/>`;
  },
  dots: ({ defs }, color, ink) => {
    const id = defs.id('pat');
    defs.add(`<pattern id="${id}" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="5" fill="${ink}" fill-opacity="0.16"/><circle cx="27" cy="27" r="3" fill="${ink}" fill-opacity="0.16"/></pattern>`);
    return `<rect width="512" height="512" fill="url(#${id})"/>`;
  },
  rays: (ctx, color, ink) => {
    const wedges = [];
    for (let i = 0; i < 12; i++) {
      const a1 = ((i * 30 + 7) * Math.PI) / 180;
      const a2 = ((i * 30 + 22) * Math.PI) / 180;
      const r = 440;
      const p = (a) => `${n(CX + r * Math.cos(a))} ${n(276 + r * Math.sin(a))}`;
      wedges.push(`M${CX} 276 L${p(a1)} L${p(a2)} Z`);
    }
    return `<path d="${wedges.join(' ')}" fill="${ink}" fill-opacity="0.12"/>`;
  },
  grid: ({ defs }, color, ink) => {
    const id = defs.id('pat');
    defs.add(`<pattern id="${id}" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${ink}" stroke-opacity="0.14" stroke-width="2"/></pattern>`);
    return `<rect width="512" height="512" fill="url(#${id})"/>`;
  },
  stripes: ({ defs }, color, ink) => {
    const id = defs.id('pat');
    defs.add(`<pattern id="${id}" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><rect width="24" height="48" fill="${ink}" fill-opacity="0.11"/></pattern>`);
    return `<rect width="512" height="512" fill="url(#${id})"/>`;
  },
  confetti: (ctx, color, ink) =>
    `<g fill="${ink}" fill-opacity="0.28">${scatter(20240517, 36, (x, y, rnd, i) => {
      const s = 6 + rnd() * 8;
      const rot = n(rnd() * 360);
      if (i % 3 === 0) return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(s * 0.55)}"/>`;
      if (i % 3 === 1) return `<rect x="${n(x - s / 2)}" y="${n(y - s / 2)}" width="${n(s)}" height="${n(s)}" rx="2" transform="rotate(${rot} ${n(x)} ${n(y)})"/>`;
      return `<path d="M${n(x)} ${n(y - s * 0.7)} L${n(x + s * 0.65)} ${n(y + s * 0.45)} L${n(x - s * 0.65)} ${n(y + s * 0.45)} Z" transform="rotate(${rot} ${n(x)} ${n(y)})"/>`;
    })}</g>`,
  stars: (ctx, color, ink) =>
    `<g fill="${ink}">${scatter(7, 30, (x, y, rnd) => {
      const s = 3 + rnd() * 9;
      const o = (0.35 + rnd() * 0.5).toFixed(2);
      // Four-point sparkle.
      return `<path d="M${n(x)} ${n(y - s)} Q${n(x)} ${n(y)} ${n(x + s)} ${n(y)} Q${n(x)} ${n(y)} ${n(x)} ${n(y + s)} Q${n(x)} ${n(y)} ${n(x - s)} ${n(y)} Q${n(x)} ${n(y)} ${n(x)} ${n(y - s)} Z" fill-opacity="${o}"/>`;
    })}</g>`,
  hearts: (ctx, color, ink) =>
    `<g fill="${ink}" fill-opacity="0.22">${scatter(99, 22, (x, y, rnd) => {
      const s = 7 + rnd() * 9;
      const rot = n(-20 + rnd() * 40);
      return `<path d="M0 ${n(s)} C${n(-s * 1.3)} ${n(s * 0.1)} ${n(-s * 0.9)} ${n(-s * 1.1)} 0 ${n(-s * 0.4)} C${n(s * 0.9)} ${n(-s * 1.1)} ${n(s * 1.3)} ${n(s * 0.1)} 0 ${n(s)} Z" transform="translate(${n(x)} ${n(y)}) rotate(${rot})"/>`;
    })}</g>`,
  circuit: ({ defs }, color, ink) => {
    const id = defs.id('pat');
    defs.add(
      `<pattern id="${id}" width="96" height="96" patternUnits="userSpaceOnUse"><g fill="none" stroke="${ink}" stroke-opacity="0.16" stroke-width="2.5" stroke-linecap="round"><path d="M8 16h30l14 14v26 M74 8v22l12 12h8 M48 80h-26l-10 -10 M60 56h22v30"/></g><g fill="${ink}" fill-opacity="0.22"><circle cx="8" cy="16" r="3.5"/><circle cx="52" cy="56" r="3.5"/><circle cx="74" cy="8" r="3.5"/><circle cx="48" cy="80" r="3.5"/><circle cx="82" cy="86" r="3.5"/><circle cx="60" cy="56" r="3.5"/></g></pattern>`,
    );
    return `<rect width="512" height="512" fill="url(#${id})"/>`;
  },
  hex: ({ defs }, color, ink) => {
    const id = defs.id('pat');
    // Pointy-top hexagons, 28 px across, tiled on a 48.5 x 84 cell.
    const hexPath = (cx, cy) => {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = ((60 * i - 30) * Math.PI) / 180;
        pts.push(`${n(cx + 14 * Math.cos(a))} ${n(cy + 14 * Math.sin(a))}`);
      }
      return `M${pts.join(' L')} Z`;
    };
    defs.add(
      `<pattern id="${id}" width="48.5" height="84" patternUnits="userSpaceOnUse"><path d="${hexPath(24.25, 21)} ${hexPath(0, 63)} ${hexPath(48.5, 63)}" fill="none" stroke="${ink}" stroke-opacity="0.15" stroke-width="2"/></pattern>`,
    );
    return `<rect width="512" height="512" fill="url(#${id})"/>`;
  },
  code: (ctx, color, ink) => {
    // Blurred-out source code: rows of rounded bars with indentation, like a file seen from across the room.
    const rows = [];
    let seed = 404;
    const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let y = 22; y < 500; y += 26) {
      let x = 24 + Math.floor(rnd() * 4) * 22;
      const words = 2 + Math.floor(rnd() * 4);
      for (let w = 0; w < words && x < 470; w++) {
        const len = 18 + rnd() * 60;
        rows.push(`<rect x="${n(x)}" y="${y}" width="${n(len)}" height="10" rx="5" fill-opacity="${(0.1 + rnd() * 0.14).toFixed(2)}"/>`);
        x += len + 12;
      }
    }
    return `<g fill="${ink}">${rows.join('')}</g>`;
  },
};

export function background(ctx, color, pattern) {
  const { defs } = ctx;
  const fill = defs.radial('bg', { cx: CX, cy: 210, r: 420 }, [[0, tint(color, 0.14)], [0.55, color], [1, shade(color, 0.16)]]);
  // White decorations on mid/dark colors, a darker tint of the color on light ones.
  const ink = luminance(color) > 0.55 ? shade(color, 0.45) : '#FFFFFF';
  const overlay = (PATTERNS[pattern] || PATTERNS.solid)(ctx, color, ink);
  return `<rect width="512" height="512" fill="${fill}"/>${overlay}`;
}
