import { DEFAULT_STATE } from './options.js';
import { normalizeState } from './state.js';

// Every idea starts from a complete look. Loading one never inherits a prop,
// background, sticker or custom text from the potato that was open before it.
const BASE = {
  ...DEFAULT_STATE,
  eyes: 'dots', brows: 'raised', mouth: 'smile',
  hat: 'none', item: 'none', gesture: 'rest',
  bg: 'cream', pattern: 'solid', stickers: [],
};

const looks = [
  ['garden-day', 'Garden day', { character: 'female', body: 'pear', skin: 'gold', eyes: 'almond', brows: 'softArch', hair: 'braids', hairColor: 'copper', hat: 'sunhat', item: 'plant', gesture: 'wave', bg: 'sage', pattern: 'botanical' }],
  ['night-owl', 'Night owl', { body: 'lumpy', skin: 'purple', eyes: 'sleepy', brows: 'flat', hair: 'curls', hairColor: 'silver', extra: 'headphones', hatColor: 'teal', item: 'coffee', bg: 'indigo', pattern: 'aurora' }],
  ['pixel-pal', 'Pixel pal', { body: 'classic', skin: 'russet', eyes: 'wink', mouth: 'grin', hat: 'backwardCap', hatColor: 'navy', item: 'laptop', gesture: 'shaka', stickers: ['code', 'cloud', 'terminal'], bg: 'ocean', pattern: 'circuit' }],
  ['tiny-wizard', 'Tiny wizard', { body: 'long', skin: 'blue', eyes: 'stars', mouth: 'oh', hat: 'wizard', hatColor: 'purple', item: 'book', gesture: 'point', bg: 'plum', pattern: 'orbit' }],
  ['sweet-sip', 'Sweet sip', { character: 'female', body: 'round', skin: 'pink', eyes: 'joyLashes', brows: 'softArch', hair: 'bob', hairColor: 'chestnut', hat: 'bow', hatColor: 'pink', item: 'boba', gesture: 'fingerHeart', bg: 'rosewater', pattern: 'hearts' }],
  ['weekend-mode', 'Weekend mode', { body: 'petite', skin: 'sweet', eyes: 'happy', mouth: 'grin', hat: 'bucket', hatColor: 'teal', eyewear: 'shades', item: 'pizza', gesture: 'peace', bg: 'sky', pattern: 'coast' }],
  ['studio-time', 'Studio time', { character: 'female', body: 'classic', skin: 'gold', eyes: 'almond', brows: 'softArch', hair: 'ponytail', hairColor: 'copper', hat: 'beret', hatColor: 'red', item: 'palette', gesture: 'palmUp', bg: 'peach', pattern: 'dots' }],
  ['royal-spud', 'Royal spud', { body: 'round', skin: 'purple', eyes: 'smug', brows: 'smug', mouth: 'smirk', hat: 'crown', neckwear: 'bowtie', hatColor: 'purple', item: 'trophy', gesture: 'thumbsUp', bg: 'navy', pattern: 'rays' }],
  ['tea-break', 'Tea break', { character: 'female', body: 'long', skin: 'ghost', eyes: 'almond', brows: 'softArch', cheeks: 'on', hair: 'waves', hairColor: 'rose', extra: 'barrette', hatColor: 'pink', item: 'teacup', bg: 'lavender', pattern: 'spotlight' }],
  ['good-game', 'Good game', { body: 'petite', skin: 'blue', eyes: 'happy', mouth: 'laugh', hair: 'pixie', hairColor: 'black', extra: 'headphones', hatColor: 'orange', item: 'controller', gesture: 'rock', bg: 'charcoal', pattern: 'hex' }],
  ['trail-mix', 'Trail mix', { body: 'lumpy', skin: 'russet', eyes: 'dots', cheeks: 'freckles', hat: 'beanie', hatColor: 'orange', neckwear: 'scarf', item: 'coffee', gesture: 'wave', bg: 'forest', pattern: 'mountains' }],
  ['flower-power', 'Flower power', { character: 'female', body: 'pear', skin: 'pink', eyes: 'lashWink', brows: 'softArch', mouth: 'roseSmile', hair: 'waves', hairColor: 'black', hat: 'flowerCrown', item: 'bouquet', gesture: 'hip', bg: 'mint', pattern: 'botanical' }],
  ['hello-sunshine', 'Hello sunshine', { body: 'classic', skin: 'sweet', eyes: 'happy', mouth: 'laugh', hat: 'propeller', hatColor: 'yellow', item: 'sign', sign: 'HELLO!', gesture: 'wave', bg: 'coral', pattern: 'confetti' }],
  ['moon-mood', 'Moon mood', { character: 'female', body: 'round', skin: 'ghost', eyes: 'side', brows: 'softArch', hair: 'bun', hairColor: 'silver', hat: 'halo', jewelry: 'starStuds', item: 'book', bg: 'periwinkle', pattern: 'stars' }],
  ['little-rebel', 'Little rebel', { body: 'long', skin: 'red', eyes: 'smug', brows: 'smug', mouth: 'smirk', hair: 'pixie', hairColor: 'black', eyewear: 'aviators', item: 'mic', gesture: 'rock', bg: 'slate', pattern: 'spotlight' }],
  ['cozy-creature', 'Cozy creature', { body: 'petite', skin: 'zombie', eyes: 'sleepy', brows: 'flat', mouth: 'smile', hat: 'beanie', hatColor: 'brown', item: 'donut', gesture: 'ok', bg: 'sand', pattern: 'dunes' }],
  ['book-club', 'Book club', { character: 'female', body: 'lumpy', skin: 'gold', eyes: 'almond', brows: 'softArch', hair: 'bob', hairColor: 'silver', eyewear: 'catEye', hatColor: 'purple', item: 'book', bg: 'berry', pattern: 'spotlight' }],
  ['small-celebration', 'Small celebration', { body: 'pear', skin: 'blue', eyes: 'stars', mouth: 'laugh', cheeks: 'on', hat: 'party', hatColor: 'pink', item: 'duck', gesture: 'thumbsUp', bg: 'sunset', pattern: 'confetti' }],
];

export const INSPIRATION_LOOKS = Object.freeze(looks.map(([id, name, patch]) => {
  const state = normalizeState({ ...BASE, ...patch });
  Object.freeze(state.stickers);
  return Object.freeze({ id, name, state: Object.freeze(state) });
}));

/** Six fresh ideas, with no repeats from the shelf the person just shuffled. */
export function pickInspiration(previous = [], rng = Math.random) {
  const excluded = new Set(previous);
  const pool = INSPIRATION_LOOKS.filter(look => !excluded.has(look.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 6).map(look => ({ ...look, state: normalizeState(look.state) }));
}

/** A fair silhouette comparison; this is only a thumbnail, never an editor edit. */
export function bodyPreviewState(candidate) {
  return normalizeState({
    ...BASE,
    body: candidate.body, skin: candidate.skin,
    brows: 'none', cheeks: 'off', facialHair: 'none',
    hair: 'none', hat: 'none', eyewear: 'none', neckwear: 'none',
    jewelry: 'none', extra: 'none', item: 'none', gesture: 'rest',
    bg: 'cream', pattern: 'solid', stickers: [],
  });
}
