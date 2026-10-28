// The potato itself: ground shadow, feet and the shaded body with dimples.
import { CX, INK, n } from '../draw.js';

export function groundShadow({ defs, b }) {
  const fill = defs.radialBox('gs', [[0, INK, 0.32], [0.55, INK, 0.16], [1, INK, 0]]);
  return `<ellipse cx="${CX}" cy="${n(b.bottom + 4)}" rx="${n(b.half + 46)}" ry="22" fill="${fill}"/>`;
}

export function feet({ defs, b, skin }) {
  const fill = defs.linear('ft', 'v', [[0, skin.base], [1, skin.shade]]);
  const y = b.bottom - 2;
  const foot = (x) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="36" ry="17"/>`;
  return `<g fill="${fill}" stroke="${skin.line}" stroke-width="6">${foot(CX - 52)}${foot(CX + 52)}</g>`;
}

export function body({ defs, b, skin, skinFill }) {
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
