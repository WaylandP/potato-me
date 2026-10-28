// Every choice the editor offers. Order matters: it is the order shown in the UI.
// Keys are what share links store, so rename a key only with a migration in state.js.

export const SKINS = {
  russet: { label: 'Russet', light: '#D9A672', base: '#BD8656', shade: '#8A5631', spot: '#6A4023', line: '#3A2414' },
  gold: { label: 'Yukon gold', light: '#F4D98A', base: '#E2BB5B', shade: '#B58A2E', spot: '#8D6A1E', line: '#4A3410' },
  red: { label: 'Red', light: '#E08173', base: '#C75B4E', shade: '#953A32', spot: '#772A25', line: '#3D1714' },
  purple: { label: 'Purple', light: '#B08AC8', base: '#8C5CA4', shade: '#623B78', spot: '#4A2A5D', line: '#25142F' },
  sweet: { label: 'Sweet', light: '#F5A868', base: '#E38443', shade: '#B35C25', spot: '#8C4418', line: '#40200B' },
  ghost: { label: 'Ghost', light: '#FAF5EA', base: '#ECE2CF', shade: '#C7B795', spot: '#A4916A', line: '#4A3D28' },
};

export const BG_COLORS = {
  ocean: { label: 'Ocean teal', value: '#14A3B8' },
  mint: { label: 'Mint', value: '#7DD3B8' },
  sky: { label: 'Sky', value: '#86C5F0' },
  lavender: { label: 'Lavender', value: '#A99BE0' },
  coral: { label: 'Coral', value: '#F27C6B' },
  sunset: { label: 'Sunset', value: '#F39A4E' },
  navy: { label: 'Navy', value: '#1E2A4A' },
  charcoal: { label: 'Charcoal', value: '#2E3440' },
};

export const HAT_COLORS = {
  black: { label: 'Black', value: '#1F1F22' },
  navy: { label: 'Navy', value: '#23395B' },
  red: { label: 'Red', value: '#C8372D' },
  teal: { label: 'Teal', value: '#0F8585' },
  purple: { label: 'Purple', value: '#6A3D9A' },
  orange: { label: 'Orange', value: '#E46F1F' },
  white: { label: 'White', value: '#F4F4F2' },
};

export const OPTIONS = {
  body: { classic: 'Classic', lumpy: 'Lumpy', round: 'Round', long: 'Long' },
  skin: Object.fromEntries(Object.entries(SKINS).map(([k, v]) => [k, v.label])),
  eyes: { smug: 'Smug', dots: 'Dots', happy: 'Happy', wide: 'Wide', wink: 'Wink', sleepy: 'Sleepy' },
  mouth: { smirk: 'Smirk', grin: 'Grin', laugh: 'Laugh', flat: 'Flat', oh: 'Oh' },
  cheeks: { off: 'No blush', on: 'Blush' },
  hat: {
    backwardCap: 'Backward cap',
    beanie: 'Beanie',
    wizard: 'Wizard',
    crown: 'Crown',
    hardhat: 'Hard hat',
    party: 'Party hat',
    beret: 'Beret',
    none: 'No hat',
  },
  hatColor: Object.fromEntries(Object.entries(HAT_COLORS).map(([k, v]) => [k, v.label])),
  accessory: { none: 'None', shades: 'Shades', glasses: 'Glasses', mustache: 'Mustache', bowtie: 'Bow tie' },
  item: { laptop: 'Laptop', coffee: 'Coffee', sign: 'Sign', none: 'Nothing' },
  gesture: { rest: 'Chill', wave: 'Wave', shaka: 'Shaka' },
  bg: Object.fromEntries(Object.entries(BG_COLORS).map(([k, v]) => [k, v.label])),
  pattern: { solid: 'Solid', dots: 'Dots', rays: 'Rays', grid: 'Grid', confetti: 'Confetti' },
};

export const DEFAULT_STATE = Object.freeze({
  body: 'classic',
  skin: 'russet',
  eyes: 'smug',
  mouth: 'smirk',
  cheeks: 'off',
  hat: 'backwardCap',
  hatColor: 'black',
  accessory: 'none',
  item: 'laptop',
  gesture: 'rest',
  bg: 'ocean',
  pattern: 'solid',
  sign: 'LGTM',
});

export const SIGN_MAX = 10;
