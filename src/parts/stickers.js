// Laptop stickers: flat die-cut vinyl, drawn in a 64x64 box centered at (32, 32).
// They use no ids (no gradients or clips), so they can be dropped anywhere,
// including the editor's sticker picker via stickerSVG().
//
// Every sticker is original art. No logos, mascots or characters from other brands.

import { STICKERS } from '../options.js';

const INK = '#1B1412';

/** A die-cut backing: white border with a faint edge so it reads on any lid color. */
const cutCircle = (r = 27, fill = '#fff') => `<circle cx="32" cy="32" r="${r}" fill="${fill}" stroke="#000" stroke-opacity="0.12" stroke-width="1.5"/>`;
const cutRect = (w = 50, h = 50, rx = 12, fill = '#fff') =>
  `<rect x="${32 - w / 2}" y="${32 - h / 2}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="#000" stroke-opacity="0.12" stroke-width="1.5"/>`;
/** Inner panel inside a white cut, leaving a 4 px white border. */
const panelRect = (w = 50, h = 50, rx = 12, fill = '#333') => `<rect x="${32 - w / 2 + 4}" y="${32 - h / 2 + 4}" width="${w - 8}" height="${h - 8}" rx="${Math.max(2, rx - 4)}" fill="${fill}"/>`;
const panelCircle = (r = 27, fill = '#333') => `<circle cx="32" cy="32" r="${r - 4}" fill="${fill}"/>`;
const eye = (x, y, r = 2.4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.4}" r="${(r * 0.35).toFixed(1)}" fill="#fff"/>`;
const text = (t, y, size, fill, family = "'Arial Black', Impact, 'Helvetica Neue', Arial, sans-serif") =>
  `<text x="32" y="${y}" text-anchor="middle" font-family="${family}" font-weight="900" font-size="${size}" fill="${fill}">${t}</text>`;

const ART = {
  panda: () => `${cutCircle()}
<circle cx="18" cy="17" r="8" fill="#B4432A"/><circle cx="46" cy="17" r="8" fill="#B4432A"/>
<circle cx="18" cy="18" r="3.5" fill="#F7E7DC"/><circle cx="46" cy="18" r="3.5" fill="#F7E7DC"/>
<circle cx="32" cy="33" r="19" fill="#D9552B"/>
<ellipse cx="24" cy="27" rx="5.5" ry="4.5" fill="#F7E7DC"/><ellipse cx="40" cy="27" rx="5.5" ry="4.5" fill="#F7E7DC"/>
<ellipse cx="32" cy="40" rx="11" ry="8" fill="#F7E7DC"/>
${eye(25, 30, 2.6)}${eye(39, 30, 2.6)}
<path d="M19 34q-3 4-3 8 M45 34q3 4 3 8" fill="none" stroke="#8F3A22" stroke-width="2.2" stroke-linecap="round"/>
<ellipse cx="32" cy="38" rx="3.2" ry="2.3" fill="${INK}"/><path d="M29 41q3 3 6 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`,

  code: () => `${cutRect(52, 44, 10)}${panelRect(52, 44, 10, '#23395B')}
<path d="M22 24l-8 8 8 8 M42 24l8 8-8 8" fill="none" stroke="#7FE0D2" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M36 22l-8 20" stroke="#F5C542" stroke-width="4" stroke-linecap="round"/>`,

  terminal: () => `${cutRect(52, 44, 8)}${panelRect(52, 44, 8, '#1F1F22')}
<circle cx="15" cy="17" r="2.2" fill="#FF5F56"/><circle cx="21.5" cy="17" r="2.2" fill="#FFBD2E"/><circle cx="28" cy="17" r="2.2" fill="#27C93F"/>
<path d="M14 26l7 6-7 6" fill="none" stroke="#5BE37D" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M26 38h12" stroke="#5BE37D" stroke-width="3.5" stroke-linecap="round"/>`,

  cloud: () => `${cutCircle()}${panelCircle(27, '#86C5F0')}
<path d="M18 40h27a7 7 0 0 0 1-14 10 10 0 0 0-19-3 8 8 0 0 0-9 17z" fill="#fff"/>
<path d="M21 36h22" stroke="#C9E4F8" stroke-width="2" stroke-linecap="round"/>`,

  rocket: () => `${cutCircle()}${panelCircle(27, '#1E2A4A')}
<g transform="rotate(-40 32 32)">
<path d="M32 10c6 6 8 14 8 24l-8 6-8-6c0-10 2-18 8-24z" fill="#F4F4F2"/>
<path d="M32 10c6 6 8 14 8 24l-8 6V10z" fill="#DADBD8"/>
<path d="M24 32l-6 6 6 2z M40 32l6 6-6 2z" fill="#C8372D"/>
<circle cx="32" cy="24" r="4" fill="#86C5F0" stroke="#23395B" stroke-width="1.8"/>
<path d="M28 42l4 10 4-10z" fill="#F5A623"/><path d="M30 42l2 6 2-6z" fill="#FFE27A"/></g>
<circle cx="14" cy="18" r="1.3" fill="#fff"/><circle cx="50" cy="44" r="1.1" fill="#fff"/><circle cx="46" cy="14" r="0.9" fill="#fff"/>`,

  bug: () => `${cutCircle()}
<path d="M14 30q-6-6-8-12 M50 30q6-6 8-12 M12 40h-7 M52 40h7 M16 48l-6 6 M48 48l6 6" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
<circle cx="32" cy="22" r="8" fill="${INK}"/>
<path d="M32 26a15 15 0 0 1 15 15v2a15 15 0 0 1-30 0v-2a15 15 0 0 1 15-15z" fill="#C8372D"/>
<path d="M32 26v32" stroke="${INK}" stroke-width="2"/>
<circle cx="25" cy="36" r="2.8" fill="${INK}"/><circle cx="39" cy="38" r="2.8" fill="${INK}"/><circle cx="27" cy="47" r="2.4" fill="${INK}"/><circle cx="38" cy="48" r="2.4" fill="${INK}"/>
<circle cx="29" cy="20" r="1.6" fill="#fff"/><circle cx="35" cy="20" r="1.6" fill="#fff"/>`,

  database: () => `${cutRect(46, 52, 10)}
<ellipse cx="32" cy="18" rx="15" ry="5" fill="#5CC9D6"/>
<path d="M17 18v10a15 5 0 0 0 30 0V18" fill="#0F8585"/><ellipse cx="32" cy="28" rx="15" ry="5" fill="#5CC9D6"/>
<path d="M17 28v10a15 5 0 0 0 30 0V28" fill="#0F8585"/><ellipse cx="32" cy="38" rx="15" ry="5" fill="#5CC9D6"/>
<path d="M17 38v8a15 5 0 0 0 30 0v-8" fill="#0F8585"/>
<path d="M21 23q11 4 22 0 M21 33q11 4 22 0" stroke="#0B5F5F" stroke-width="1.6" fill="none" stroke-opacity="0.6"/>`,

  lock: () => `${cutRect(44, 52, 10)}
<path d="M22 28v-7a10 10 0 0 1 20 0v7" fill="none" stroke="#5A5F66" stroke-width="5" stroke-linecap="round"/>
<rect x="17" y="27" width="30" height="24" rx="6" fill="#F2B632"/>
<rect x="17" y="27" width="30" height="7" rx="4" fill="#FBD75B"/>
<circle cx="32" cy="39" r="3.6" fill="#6B4F14"/><rect x="30.4" y="40" width="3.2" height="7" rx="1.4" fill="#6B4F14"/>`,

  flame: () => `${cutCircle()}
<path d="M32 10c2 9 11 13 11 24a11 11 0 0 1-22 0c0-5 2-8 4-11 0 4 2 6 4 6 0-7 0-13 3-19z" fill="#F26B21"/>
<path d="M32 28c1 5 6 7 6 13a6 6 0 0 1-12 0c0-3 1-5 3-7 0 2 1 3 2 3 0-4 0-6 1-9z" fill="#FFD23F"/>
<path d="M32 40c1 2 2 3 2 5a2 2 0 0 1-4 0c0-2 1-3 2-5z" fill="#FFF4C2"/>`,

  bolt: () => `${cutCircle()}${panelCircle(27, '#6A3D9A')}
<path d="M36 10L18 36h11l-3 18 20-28H35z" fill="#FFD23F"/>
<path d="M36 10L18 36h11l-1 6 12-18h-6z" fill="#FFF0A6" fill-opacity="0.6"/>`,

  heart: () => `${cutCircle()}
<path d="M32 52S10 38 10 24a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 14-22 28-22 28z" fill="#E0334A"/>
<path d="M18 22a6 6 0 0 1 6-6" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="3" stroke-linecap="round"/>`,

  star: () => `${cutCircle()}
<path d="M32 9l6.6 14.4 15.6 1.7-11.6 10.6 3.2 15.5L32 43.4l-13.8 7.8 3.2-15.5L9.8 25.1l15.6-1.7z" fill="#FFC53D"/>
<path d="M32 9l6.6 14.4 15.6 1.7-11.6 10.6L32 30z" fill="#FFE08A" fill-opacity="0.7"/>
${eye(27, 30, 2)}${eye(37, 30, 2)}<path d="M28 36q4 3 8 0" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,

  ghost: () => `${cutCircle()}${panelCircle(27, '#6A3D9A')}
<path d="M18 48V30a14 14 0 0 1 28 0v18l-5-4-4 4-5-4-5 4-4-4z" fill="#fff"/>
<circle cx="26" cy="30" r="4" fill="#4A2A5D"/><circle cx="38" cy="30" r="4" fill="#4A2A5D"/>
<circle cx="27.5" cy="29" r="1.4" fill="#fff"/><circle cx="39.5" cy="29" r="1.4" fill="#fff"/>`,

  dino: () => `${cutCircle()}
<path d="M12 42c-2-6 2-10 8-10h6c0-8 4-14 12-14h14l-3 6 5 3-6 2 1 5-6-1c-2 6-6 9-11 9l1 6h-5l-1-6h-3l-1 6h-5l1-6c-3 0-5-1-7-4z" fill="#3E9C5A"/>
<path d="M26 20l2-6 2 6z M32 18l2-6 2 6z M20 28l2-5 2 5z" fill="#2A6E3E"/>
<path d="M12 42c-2-6 2-10 8-10l-4 4 2 6z" fill="#2A6E3E" fill-opacity="0.5"/>
<path d="M42 29l-6-1 M40 24l5 2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
<circle cx="43" cy="22" r="2.6" fill="${INK}"/><circle cx="44" cy="21" r="0.9" fill="#fff"/>
<path d="M30 34l-3 2 3 1" fill="none" stroke="#2A6E3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,

  duck: () => `${cutCircle()}
<ellipse cx="30" cy="40" rx="17" ry="11" fill="#FFD23F"/>
<circle cx="37" cy="24" r="10" fill="#FFD23F"/>
<path d="M45 24q8-2 9 2-3 4-9 2z" fill="#F26B21"/>
<path d="M14 36q-4 2-2 6" fill="none" stroke="#F2B632" stroke-width="3" stroke-linecap="round"/>
${eye(40, 21, 2.3)}
<path d="M22 44q8 4 16 0" fill="none" stroke="#F2B632" stroke-width="2" stroke-linecap="round"/>`,

  cat: () => `${cutCircle()}
<path d="M14 34l-3-18 12 8h18l12-8-3 18a18 18 0 0 1-36 0z" fill="#2E2A2E"/>
<path d="M15 31l-2-11 8 5z M49 31l2-11-8 5z" fill="#F2A3C6"/>
<ellipse cx="25" cy="35" rx="4" ry="4.6" fill="#7FE05C"/><ellipse cx="39" cy="35" rx="4" ry="4.6" fill="#7FE05C"/>
<ellipse cx="25" cy="35" rx="1.4" ry="3.9" fill="${INK}"/><ellipse cx="39" cy="35" rx="1.4" ry="3.9" fill="${INK}"/>
<path d="M32 42l-2.5-2.5h5z" fill="#F2A3C6"/>
<path d="M29 45q3 2.5 6 0 M16 41l8-1 M17 46l7-2 M48 41l-8-1 M47 46l-7-2" fill="none" stroke="#C9C1C6" stroke-width="1.6" stroke-linecap="round"/>`,

  gear: () => {
    const teeth = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * 45 * Math.PI) / 180;
      const a1 = a - 0.2, a2 = a + 0.2;
      const p = (ang, r) => `${(32 + Math.cos(ang) * r).toFixed(1)} ${(32 + Math.sin(ang) * r).toFixed(1)}`;
      teeth.push(`M${p(a1 - 0.08, 15)} L${p(a1, 22)} L${p(a2, 22)} L${p(a2 + 0.08, 15)} Z`);
    }
    return `${cutCircle()}<path d="${teeth.join(' ')}" fill="#8A8F96"/><circle cx="32" cy="32" r="16" fill="#8A8F96"/><circle cx="32" cy="32" r="7" fill="#fff"/><circle cx="32" cy="32" r="16" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="2"/>`;
  },

  branch: () => `${cutRect(46, 52, 10)}${panelRect(46, 52, 10, '#2E3440')}
<path d="M23 20v24 M41 22c0 10-18 6-18 18" fill="none" stroke="#F26B21" stroke-width="3.5" stroke-linecap="round"/>
<circle cx="23" cy="18" r="4.5" fill="#F26B21"/><circle cx="41" cy="20" r="4.5" fill="#F26B21"/><circle cx="23" cy="46" r="4.5" fill="#F26B21"/>`,

  lambda: () => `${cutRect(50, 50, 12)}${panelRect(50, 50, 12, '#6A3D9A')}
<path d="M20 18h5c3 0 4 2 5 5l10 23h6 M18 46l12-24" fill="none" stroke="#FFD23F" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`,

  notFound: () => `${cutRect(54, 36, 8)}${panelRect(54, 36, 8, '#C8372D')}${text('404', 39, 19, '#fff')}`,

  pizza: () => `${cutCircle()}
<path d="M32 54L12 20a40 40 0 0 1 40 0z" fill="#F2B632"/>
<path d="M12 20a40 40 0 0 1 40 0l-2 4a36 36 0 0 0-36 0z" fill="#C8782A"/>
<circle cx="32" cy="30" r="4" fill="#C8372D"/><circle cx="24" cy="36" r="3.4" fill="#C8372D"/><circle cx="38" cy="40" r="3.2" fill="#C8372D"/>
<circle cx="31" cy="44" r="1.6" fill="#3E9C5A"/><circle cx="26" cy="28" r="1.4" fill="#3E9C5A"/>`,

  coffee: () => `${cutCircle()}
<path d="M18 26h26l-3 24H21z" fill="#F4F4F2" stroke="#D7D3CC" stroke-width="1.5"/>
<rect x="15" y="20" width="32" height="7" rx="3" fill="#5A3A22"/>
<path d="M21 36h20l-1 7H22z" fill="#C8372D"/>
<path d="M27 12q-3 3 0 6 M33 10q-3 4 0 8" fill="none" stroke="#8A8F96" stroke-width="2" stroke-linecap="round"/>`,

  planet: () => `${cutCircle()}${panelCircle(27, '#1E2A4A')}
<circle cx="32" cy="32" r="11" fill="#B08AC8"/>
<path d="M27 24a11 11 0 0 1 14 12" fill="none" stroke="#D8C2E8" stroke-width="3" stroke-linecap="round"/>
<ellipse cx="32" cy="34" rx="20" ry="6" fill="none" stroke="#F5C542" stroke-width="3" transform="rotate(-18 32 34)"/>
<circle cx="15" cy="18" r="1.2" fill="#fff"/><circle cx="48" cy="16" r="1" fill="#fff"/><circle cx="50" cy="46" r="1.3" fill="#fff"/>`,

  skull: () => `${cutCircle()}${panelCircle(27, '#1B1412')}
<path d="M32 12a16 16 0 0 1 16 16c0 6-3 9-6 11v6h-20v-6c-3-2-6-5-6-11a16 16 0 0 1 16-16z" fill="#F4F4F2"/>
<circle cx="25" cy="29" r="5" fill="#1B1412"/><circle cx="39" cy="29" r="5" fill="#1B1412"/>
<path d="M32 34l-2.5 4h5z" fill="#1B1412"/>
<path d="M26 45v-4 M30 45v-4 M34 45v-4 M38 45v-4" stroke="#1B1412" stroke-width="1.6"/>`,

  mountain: () => `${cutCircle()}${panelCircle(27, '#86C5F0')}
<circle cx="44" cy="18" r="5" fill="#FFD23F"/>
<path d="M8 48l14-22 8 12 6-8 16 18z" fill="#3E9C5A"/>
<path d="M22 26l5 8-3 1-2-3-3 3-2-1z M36 30l5 6-3 1-2-3-3 2-1-1z" fill="#fff"/>
<path d="M8 48l14-22 3 5-10 17z" fill="#2A6E3E" fill-opacity="0.5"/>`,

  lgtm: () => `${cutRect(54, 40, 10)}${panelRect(54, 40, 10, '#3E9C5A')}
${text('LGTM', 43, 17, '#fff')}
<circle cx="49" cy="17" r="7" fill="#fff"/><path d="M45.5 17l2.5 2.5 4.5-5" fill="none" stroke="#3E9C5A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
};

/** The sticker's art in its 64x64 box (no wrapper). Unknown keys draw nothing. */
export function stickerArt(key) {
  return ART[key] ? ART[key]() : '';
}

/** A sticker placed on the canvas: centered at (x, y), `size` px wide, rotated `rot` degrees. */
export function sticker(key, x, y, size = 64, rot = 0) {
  const art = stickerArt(key);
  if (!art) return '';
  const k = size / 64;
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k}) translate(-32 -32)">${art}</g>`;
}

/** A standalone SVG of one sticker, for the editor's sticker picker. */
export function stickerSVG(key, size = 64) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="${STICKERS[key] || key} sticker">${stickerArt(key)}</svg>`;
}

export const STICKER_KEYS = Object.keys(STICKERS);
