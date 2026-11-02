// Deterministic, resolution-independent scenes and patterns. Each scene derives
// its palette from the chosen color and leaves the center quiet for the avatar.
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
  aurora: ({ defs }, color) => {
    const sky = defs.linear('aurora-sky', 'v', [[0, shade(color, .72)], [.65, shade(color, .38)], [1, color]]);
    const veil = defs.linear('aurora-veil', 'v', [[0, '#A3F3DB', 0], [.55, '#A3F3DB', .28], [.82, '#9ED7F9', .42], [1, '#C5B3FF', 0]]);
    const stars = scatter(61, 95, (x, y, r) => `<circle cx="${n(x)}" cy="${n(y * .72)}" r="${n(.4 + r() * 1.1)}" fill="white" opacity="${n(.15 + r() * .65)}"/>`);
    const curtains = Array.from({ length: 20 }, (_, i) => `<path d="M${-150 + i * 38} -25 Q${-20 + i * 30} 180 ${70 + i * 24} 230 T${440 + i * 13} 110 L${460 + i * 14} -30Z" fill="${veil}" opacity=".13"/>`).join('');
    return `<rect width="512" height="512" fill="${sky}"/>${stars}<path d="M-60 45 Q120 310 300 120 T580 90 L560 200 Q350 180 250 255 T-60 140Z" fill="${veil}"/>${curtains}<path d="M0 458 Q90 425 170 461T350 448T512 456V512H0Z" fill="${shade(color, .64)}"/>`;
  },
  coast: ({ defs }, color) => {
    const sky = defs.linear('coast-sky', 'v', [[0, tint(color, .48)], [1, '#F8E9D1']]);
    const sea = defs.linear('coast-sea', 'v', [[0, shade(color, .22)], [1, tint(color, .35)]]);
    const light = defs.radialBox('coast-sun', [[0, '#FFF6D7', .9], [.3, '#FFF6D7', .5], [1, '#FFF6D7', 0]]);
    const waves = Array.from({ length: 14 }, (_, i) => `<path d="M-20 ${286 + i * 9} Q100 ${281 + i * 9} 230 ${287 + i * 9} T540 ${284 + i * 9}" fill="none" stroke="${tint(color, .78)}" stroke-width="${n(.7 + i * .08)}" opacity="${n(.18 + i * .025)}"/>`).join('');
    return `<rect width="512" height="300" fill="${sky}"/><circle cx="405" cy="130" r="94" fill="${light}"/><circle cx="405" cy="130" r="23" fill="#FFF4DA"/><path d="M0 254Q150 246 290 255T512 250V512H0Z" fill="${sea}"/>${waves}<path d="M-10 434Q120 390 285 424T525 399V512H-10Z" fill="#E7D4B4"/><path d="M-10 429Q120 385 285 419T525 394" fill="none" stroke="#FFF8EC" stroke-width="8" opacity=".8"/><path d="M-10 440Q120 396 285 430T525 405" fill="none" stroke="#BCA98D" stroke-width="2" opacity=".4"/>`;
  },
  mountains: ({ defs }, color) => {
    const sky = defs.linear('mountain-sky', 'v', [[0, shade(color, .50)], [.6, tint(color, .22)], [1, '#F4C8A4']]);
    const glow = defs.radialBox('mountain-glow', [[0, '#FFD9B0', .4], [1, '#FFD9B0', 0]]);
    return `<rect width="512" height="512" fill="${sky}"/><circle cx="100" cy="150" r="95" fill="${glow}"/><circle cx="100" cy="150" r="25" fill="#FFE5BD"/><path d="M0 330L90 211 143 280 225 177 340 295 411 224 512 321V512H0Z" fill="${tint(color, .16)}"/><path d="M196 222L225 177 265 219 242 208 224 217 215 207Z" fill="${tint(color, .68)}" opacity=".7"/><path d="M0 370L84 300 172 356 307 245 406 338 512 283V512H0Z" fill="${shade(color, .26)}"/><path d="M0 405Q95 353 202 416T390 392T512 414V512H0Z" fill="${shade(color, .52)}"/><path d="M0 462Q85 425 180 461T360 452T512 465V512H0Z" fill="${shade(color, .69)}"/>`;
  },
  botanical: ({ defs }, color) => {
    const glow = defs.radialBox('garden-glow', [[0, '#FFF9DF', .40], [1, '#FFF9DF', 0]]);
    const stems = [[45,490,20],[467,490,-20],[10,305,35],[502,285,-35]];
    const plants = stems.map(([x,y,rotation], index) => {
      const leaves = Array.from({length: 7}, (_, i) => {
        const yy = -30 - i * 30, side = i % 2 ? 1 : -1, length = 50 - i * 3;
        return `<g transform="translate(0 ${yy}) scale(${side} 1)"><path d="M0 0Q${length*.35} -36 ${length} -30Q${length*.85} 1 0 0Z" fill="${index%2 ? shade(color,.32) : shade(color,.50)}"/><path d="M0 0Q${length*.45} -17 ${length-5} -28M${length*.3} -11l3 -10M${length*.55} -18l7 4" fill="none" stroke="${tint(color,.4)}" stroke-width=".8" opacity=".65"/></g>`;
      }).join('');
      return `<g transform="translate(${x} ${y}) rotate(${rotation})"><path d="M0 0Q8 -130 0 -245" fill="none" stroke="${shade(color,.45)}" stroke-width="2.4"/>${leaves}</g>`;
    }).join('');
    const pollen = scatter(42, 35, (x,y,r) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(.7+r()*1.6)}" fill="#FFF5D6" opacity=".42"/>`);
    return `<ellipse cx="256" cy="235" rx="300" ry="310" fill="${glow}"/>${pollen}${plants}`;
  },
  orbit: ({ defs }, color) => {
    const sky = defs.linear('orbit-sky', 'v', [[0, shade(color, .80)], [1, shade(color, .46)]]);
    const nebula = defs.radialBox('nebula', [[0, tint(color,.42), .48], [.45, '#AD95DA', .16], [1, '#AD95DA', 0]]);
    const planet = defs.radial('planet', {cx: 371, cy: 96, r: 98}, [[0, tint(color,.75)], [.55, color], [1, shade(color,.72)]]);
    const stars = scatter(901, 130, (x,y,r,i) => i%15 ? `<circle cx="${n(x)}" cy="${n(y)}" r="${n(.4+r()*1.15)}" fill="white" opacity="${n(.2+r()*.6)}"/>` : `<path d="M${n(x-3)} ${n(y)}h6M${n(x)} ${n(y-3)}v6" stroke="#E9E3FF" stroke-width=".8" opacity=".7"/>`);
    return `<rect width="512" height="512" fill="${sky}"/><ellipse cx="170" cy="170" rx="310" ry="210" fill="${nebula}" transform="rotate(-30 170 170)"/>${stars}<ellipse cx="402" cy="130" rx="98" ry="28" transform="rotate(-25 402 130)" fill="none" stroke="${tint(color,.55)}" stroke-width="5" opacity=".35"/><circle cx="402" cy="130" r="49" fill="${planet}"/><path d="M314 170Q411 180 488 92" fill="none" stroke="${tint(color,.7)}" stroke-width="4" opacity=".6"/>`;
  },
  dunes: ({ defs }, color) => {
    const sky = defs.linear('dune-sky', 'v', [[0, shade(color,.13)], [.7, tint(color,.48)], [1, '#FFE5BD']]);
    const front = defs.linear('dune-front', 'v', [[0, tint(color,.22)], [.25,color], [1,shade(color,.35)]]);
    const ridges = Array.from({length:9},(_,i) => `<path d="M-20 ${415+i*9}Q120 ${354+i*12} 290 ${448+i*8}" fill="none" stroke="${tint(color,.6)}" stroke-width=".8" opacity=".20"/>`).join('');
    return `<rect width="512" height="512" fill="${sky}"/><circle cx="398" cy="165" r="41" fill="#FFE6C0" opacity=".9"/><path d="M0 333Q130 255 284 319T512 289V512H0Z" fill="${tint(color,.18)}"/><path d="M0 388Q221 376 512 307V512H0Z" fill="${shade(color,.17)}"/><path d="M0 401Q118 342 268 420T512 425V512H0Z" fill="${front}"/><path d="M0 401Q118 342 268 420T512 425" fill="none" stroke="${tint(color,.65)}" stroke-width="2" opacity=".6"/>${ridges}`;
  },

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
