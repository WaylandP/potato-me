// Every choice the editor offers. Order matters: it is the order shown in the UI
// and the order the randomizer and share links rely on.

export const SKINS = {
  russet: { label: 'Russet', base: '#B98252', shade: '#8E5C34', spot: '#6F4426', line: '#3A2414' },
  red: { label: 'Red', base: '#C4594C', shade: '#963C33', spot: '#7A2D26', line: '#3D1714' },
  purple: { label: 'Purple', base: '#8A5AA0', shade: '#653E7A', spot: '#4E2D60', line: '#25142F' },
  sweet: { label: 'Sweet', base: '#E0813F', shade: '#B55E25', spot: '#8F4518', line: '#40200B' },
  ghost: { label: 'Ghost', base: '#EADFCB', shade: '#C9B999', spot: '#A8956F', line: '#4A3D28' },
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
  hat: { backwardCap: 'Backward cap', beanie: 'Beanie', wizard: 'Wizard', crown: 'Crown', hardhat: 'Hard hat', none: 'No hat' },
  hatColor: Object.fromEntries(Object.entries(HAT_COLORS).map(([k, v]) => [k, v.label])),
  accessory: { none: 'None', shades: 'Shades', mustache: 'Mustache', bowtie: 'Bow tie' },
  item: { laptop: 'Laptop', coffee: 'Coffee', sign: 'Sign', none: 'Nothing' },
  gesture: { rest: 'Chill', wave: 'Wave', shaka: 'Shaka' },
  bg: Object.fromEntries(Object.entries(BG_COLORS).map(([k, v]) => [k, v.label])),
  pattern: { solid: 'Solid', dots: 'Dots', rays: 'Rays', grid: 'Grid' },
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
