// "Surprise me": a random potato that still looks like someone chose it.
// Rather than rolling every slot independently, it picks a vibe for the
// face, adds accessories sparingly, and keeps hat, skin and background
// colors from clashing. Pure: pass your own rng (0..1) for repeatable results.

import { OPTIONS, PRESETS, MULTI, DEFAULT_STATE } from './options.js';
import { normalizeState } from './state.js';

// Backgrounds and hat colors that disappear into, or fight with, each skin.
const BAD_BG = {
  russet: ['sunset', 'gold'],
  gold: ['gold', 'cream', 'sunset', 'lime'],
  red: ['coral', 'pink', 'sunset'],
  purple: ['lavender', 'pink', 'slate'],
  sweet: ['sunset', 'gold', 'coral'],
  blue: ['sky', 'lavender', 'slate', 'navy'],
  pink: ['pink', 'coral', 'cream'],
  ghost: ['cream'],
  zombie: ['lime', 'mint', 'slate'],
};
const BAD_HAT_COLOR = {
  red: ['red', 'pink', 'brown'],
  pink: ['pink', 'red'],
  sweet: ['orange', 'brown'],
  gold: ['yellow', 'brown'],
  purple: ['purple'],
  blue: ['navy', 'purple'],
  zombie: ['green'],
  russet: ['brown'],
};
// Headphones only make sense with hats that leave room for the band.
const HEADPHONE_HATS = ['none', 'backwardCap', 'cap', 'beanie', 'headband', 'bucket', 'halo'];
// Eyewear that covers the eyes hides the eye choice, so it stays rarer.
const QUIET_PATTERNS = ['solid', 'spotlight', 'dots', 'grid', 'hex', 'stripes'];

const pickFrom = (rng, keys) => keys[Math.floor(rng() * keys.length) % keys.length];
const chance = (rng, p) => rng() < p;

/**
 * @param {() => number} rng
 * @param {object} available  option sets the renderer can draw (availableOptions()); defaults to all OPTIONS
 * @param {object} keep       text fields to carry over (sign, capText)
 */
export function surprise(rng = Math.random, available = OPTIONS, keep = {}) {
  const keys = (group) => Object.keys(available[group] || OPTIONS[group]);
  const s = { ...DEFAULT_STATE };

  s.body = pickFrom(rng, keys('body'));
  s.skin = pickFrom(rng, keys('skin'));

  // Face: a vibe, then one twist so repeats don't look identical.
  const vibe = PRESETS[pickFrom(rng, Object.keys(PRESETS))].patch;
  for (const [k, v] of Object.entries(vibe)) if (k in OPTIONS && keys(k).includes(v)) s[k] = v;
  if (chance(rng, 0.35)) s.mouth = pickFrom(rng, keys('mouth'));
  if (chance(rng, 0.25)) s.cheeks = pickFrom(rng, keys('cheeks'));
  s.facialHair = chance(rng, 0.22) ? pickFrom(rng, keys('facialHair').filter((k) => k !== 'none')) : 'none';

  // Hat and colors.
  s.hat = chance(rng, 0.85) ? pickFrom(rng, keys('hat').filter((k) => k !== 'none')) : 'none';
  const hatColors = keys('hatColor').filter((k) => !(BAD_HAT_COLOR[s.skin] || []).includes(k));
  s.hatColor = pickFrom(rng, hatColors);
  s.capText = keep.capText ?? '';

  // Gear: one item, a few stickers, and at most two worn accessories.
  s.item = pickFrom(rng, keys('item'));
  s.gesture = pickFrom(rng, keys('gesture'));
  const stickerKeys = Object.keys(MULTI.stickers.options);
  const count = 3 + Math.floor(rng() * 3);
  const stickers = new Set();
  while (stickers.size < count) stickers.add(pickFrom(rng, stickerKeys));
  s.stickers = [...stickers];
  s.sign = keep.sign ?? DEFAULT_STATE.sign;

  let worn = 0;
  const eyewearAlready = s.eyewear && s.eyewear !== 'none';
  if (eyewearAlready) worn++;
  else if (chance(rng, 0.25)) {
    s.eyewear = pickFrom(rng, keys('eyewear').filter((k) => k !== 'none'));
    worn++;
  } else s.eyewear = 'none';
  s.neckwear = worn < 2 && chance(rng, 0.35) ? pickFrom(rng, keys('neckwear').filter((k) => k !== 'none')) : 'none';
  if (s.neckwear !== 'none') worn++;
  const extras = keys('extra').filter((k) => k !== 'none' && (k !== 'headphones' || HEADPHONE_HATS.includes(s.hat)));
  s.extra = worn < 2 && chance(rng, 0.25) && extras.length ? pickFrom(rng, extras) : 'none';

  // Background: never the skin's own color family, mostly quiet patterns.
  s.bg = pickFrom(rng, keys('bg').filter((k) => !(BAD_BG[s.skin] || []).includes(k)));
  s.pattern = chance(rng, 0.7) ? pickFrom(rng, QUIET_PATTERNS.filter((k) => keys('pattern').includes(k))) : pickFrom(rng, keys('pattern'));

  return normalizeState(s);
}
