// Backgrounds: a gradient fill plus an optional pattern overlay.
import { CX, n, tint, shade } from '../draw.js';

export function background({ defs }, color, pattern) {
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
