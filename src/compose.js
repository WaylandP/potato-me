// Pure function: state in, SVG string out. No DOM, so it runs in the browser
// and in Node tests alike. The parts live in src/parts/*, the shared kit in
// src/draw.js; this file only decides the layer order.

import { SKINS, BG_COLORS, HAT_COLORS } from './options.js';
import { normalizeState } from './state.js';
import { CX, BODIES, Defs } from './draw.js';
import { background } from './parts/background.js';
import { groundShadow, feet, body } from './parts/body.js';
import { cheeks, eyes, mouth } from './parts/face.js';
import { accessory } from './parts/accessories.js';
import { HAT_BRIM, hatShadow, hat } from './parts/hats.js';
import { itemAndArms } from './parts/items.js';

export { INK, mix } from './draw.js';

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
  // Interim shim until the eyewear/neckwear/facial-hair modules land: the old
  // accessory module draws whichever of its four parts the new keys ask for.
  const legacyAccessory =
    state.eyewear === 'shades' ? 'shades' : state.eyewear === 'round' ? 'glasses' : state.facialHair === 'mustache' ? 'mustache' : state.neckwear === 'bowtie' ? 'bowtie' : 'none';

  const layers = [
    background(ctx, BG_COLORS[state.bg].value, state.pattern),
    groundShadow(ctx),
    feet(ctx),
    body(ctx),
    state.hat in HAT_BRIM ? hatShadow(ctx) : '',
    cheeks(ctx),
    state.eyewear === 'shades' ? '' : eyes(ctx),
    mouth(ctx),
    accessory({ ...ctx, state: { ...state, accessory: legacyAccessory } }),
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
  if (['eyes', 'brows', 'mouth', 'cheeks', 'facialHair', 'eyewear', 'preset'].includes(category)) return `${CX - 120} ${b.face - 100} 240 240`;
  if (['hat', 'hatColor', 'capText', 'extra'].includes(category)) return `${CX - 160} ${b.top - 190} 320 320`;
  if (category === 'neckwear') return `${CX - 120} ${b.face + 20} 240 240`;
  if (category === 'stickers') return `${CX - 130} ${b.face + 40} 260 260`;
  return undefined;
}
