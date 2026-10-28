// Arms and hands. Hands are unions of simple shapes so they read at any size.
import { n, union, capsule } from '../draw.js';

export function arm(path, skin) {
  return `<path d="${path}" fill="none" stroke="${skin.line}" stroke-width="30" stroke-linecap="round"/>
<path d="${path}" fill="none" stroke="${skin.base}" stroke-width="18" stroke-linecap="round"/>`;
}

/** A mitten: palm plus a thumb bump. `side` is which way the thumb points (-1 left, 1 right). */

export function mitten(x, y, skin, side = 1, r = 15) {
  const shapes = `<circle cx="${n(x)}" cy="${n(y)}" r="${r}"/><circle cx="${n(x + side * r * 0.72)}" cy="${n(y - r * 0.5)}" r="${n(r * 0.52)}"/>`;
  return union(shapes, skin.base, skin.line);
}

/** An open, waving hand: palm, four spread fingers and a thumb. */

export function openHand(x, y, skin, side = 1) {
  const fingers = [[-36, 38], [-12, 44], [12, 44], [36, 38]]
    .map(([deg, len]) => capsule(x, y, deg * side, len, 16))
    .join('');
  const thumb = capsule(x, y, -88 * side, 30, 15);
  const shapes = `<circle cx="${n(x)}" cy="${n(y)}" r="20"/>${fingers}${thumb}`;
  return union(shapes, skin.base, skin.line) + `<path d="M${n(x - 8)} ${n(y + 2)} q8 7 16 0" fill="none" stroke="${skin.line}" stroke-opacity="0.4" stroke-width="3" stroke-linecap="round"/>`;
}

/** Shaka: a fist with thumb and pinky out, tilted so it reads at thumbnail size. */

export function shakaHand(x, y, skin) {
  const fist = `<rect x="${n(x - 22)}" y="${n(y - 16)}" width="44" height="38" rx="15"/>`;
  const knuckles = [-13, 0, 13].map((dx, i) => `<circle cx="${n(x + dx)}" cy="${n(y - 15 - (i === 1 ? 2 : 0))}" r="9.5"/>`).join('');
  const thumb = capsule(x - 15, y - 6, -28, 38, 16);
  const pinky = capsule(x + 16, y + 2, 152, 32, 13);
  const shapes = fist + knuckles + thumb + pinky;
  return `<g transform="rotate(-30 ${n(x)} ${n(y)})">${union(shapes, skin.base, skin.line)}
<path d="M${n(x - 7)} ${n(y - 10)} v12 M${n(x + 7)} ${n(y - 10)} v12" fill="none" stroke="${skin.line}" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round"/></g>`;
}
