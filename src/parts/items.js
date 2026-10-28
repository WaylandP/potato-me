// Held items and the arm poses that go with them.
import { CX, INK, n, esc, tint, shade } from '../draw.js';
import { arm, mitten, openHand, shakaHand } from './hands.js';

export function laptop({ defs, b, skin }, L, R, ay) {
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

export function coffee({ defs, b, skin, hatColor }, L, R, ay) {
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

export function sign({ b, skin, state }, L, R, ay) {
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

export function itemAndArms(ctx) {
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
