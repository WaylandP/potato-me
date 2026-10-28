// Every choice the editor offers. Order matters: it is the order shown in the UI.
// Keys are what share links store, so rename a key only with a LEGACY entry below.
//
// Three kinds of state keys:
//   OPTIONS  single choice (one key per group)
//   MULTI    pick several, in order, up to `max` (stored comma-separated in links)
//   TEXT     free text, cleaned and capped (sign text, cap initials)

export const SKINS = {
  russet: { label: 'Russet', light: '#D9A672', base: '#BD8656', shade: '#8A5631', spot: '#6A4023', line: '#3A2414' },
  gold: { label: 'Yukon gold', light: '#F4D98A', base: '#E2BB5B', shade: '#B58A2E', spot: '#8D6A1E', line: '#4A3410' },
  red: { label: 'Red', light: '#E08173', base: '#C75B4E', shade: '#953A32', spot: '#772A25', line: '#3D1714' },
  purple: { label: 'Purple', light: '#B08AC8', base: '#8C5CA4', shade: '#623B78', spot: '#4A2A5D', line: '#25142F' },
  sweet: { label: 'Sweet', light: '#F5A868', base: '#E38443', shade: '#B35C25', spot: '#8C4418', line: '#40200B' },
  blue: { label: 'Adirondack blue', light: '#9FA3D6', base: '#6F72B5', shade: '#4A4C88', spot: '#363866', line: '#1F2040' },
  pink: { label: 'Fingerling pink', light: '#F6BBB4', base: '#E6928C', shade: '#B9635E', spot: '#8F4844', line: '#4A2220' },
  ghost: { label: 'Ghost', light: '#FAF5EA', base: '#ECE2CF', shade: '#C7B795', spot: '#A4916A', line: '#4A3D28' },
  zombie: { label: 'Zombie', light: '#B9C9A0', base: '#8FA276', shade: '#5E7050', spot: '#45533B', line: '#232B1D' },
};

export const BG_COLORS = {
  ocean: { label: 'Ocean teal', value: '#14A3B8' },
  mint: { label: 'Mint', value: '#7DD3B8' },
  sky: { label: 'Sky', value: '#86C5F0' },
  lavender: { label: 'Lavender', value: '#A99BE0' },
  pink: { label: 'Bubblegum', value: '#F2A3C6' },
  coral: { label: 'Coral', value: '#F27C6B' },
  sunset: { label: 'Sunset', value: '#F39A4E' },
  lime: { label: 'Lime', value: '#B5D45A' },
  gold: { label: 'Gold', value: '#E8C14A' },
  cream: { label: 'Cream', value: '#F1E7D2' },
  slate: { label: 'Slate', value: '#5B6B7A' },
  navy: { label: 'Navy', value: '#1E2A4A' },
  charcoal: { label: 'Charcoal', value: '#2E3440' },
  black: { label: 'Black', value: '#121214' },
};

export const HAT_COLORS = {
  black: { label: 'Black', value: '#1F1F22' },
  gray: { label: 'Gray', value: '#8A8F96' },
  white: { label: 'White', value: '#F4F4F2' },
  red: { label: 'Red', value: '#C8372D' },
  orange: { label: 'Orange', value: '#E46F1F' },
  yellow: { label: 'Yellow', value: '#E9C13B' },
  green: { label: 'Green', value: '#3E9C5A' },
  teal: { label: 'Teal', value: '#0F8585' },
  navy: { label: 'Navy', value: '#23395B' },
  purple: { label: 'Purple', value: '#6A3D9A' },
  pink: { label: 'Pink', value: '#E0609A' },
  brown: { label: 'Brown', value: '#7A4B2A' },
};

export const OPTIONS = {
  body: { classic: 'Classic', lumpy: 'Lumpy', round: 'Round', long: 'Long' },
  skin: Object.fromEntries(Object.entries(SKINS).map(([k, v]) => [k, v.label])),
  eyes: {
    smug: 'Smug',
    dots: 'Dots',
    happy: 'Happy',
    wide: 'Wide',
    wink: 'Wink',
    sleepy: 'Sleepy',
    angry: 'Angry',
    surprised: 'Surprised',
    side: 'Side-eye',
    squint: 'Squint',
    rolling: 'Eye roll',
    heart: 'Hearts',
    stars: 'Stars',
    dead: 'Dead',
  },
  brows: { smug: 'Smug', thick: 'Thick', angry: 'Angry', worried: 'Worried', raised: 'Raised', flat: 'Flat', uni: 'Unibrow', none: 'None' },
  mouth: {
    smirk: 'Smirk',
    grin: 'Grin',
    laugh: 'Laugh',
    smile: 'Smile',
    flat: 'Flat',
    frown: 'Frown',
    oh: 'Oh',
    tongue: 'Tongue',
    grit: 'Gritted',
    whistle: 'Whistle',
    kiss: 'Kiss',
    wavy: 'Wavy',
  },
  cheeks: { off: 'Plain', on: 'Blush', freckles: 'Freckles' },
  facialHair: { none: 'None', mustache: 'Mustache', handlebar: 'Handlebar', goatee: 'Goatee', beard: 'Beard', stubble: 'Stubble' },
  hat: {
    backwardCap: 'Backward cap',
    cap: 'Cap',
    beanie: 'Beanie',
    headband: 'Headband',
    bucket: 'Bucket hat',
    cowboy: 'Cowboy',
    tophat: 'Top hat',
    fedora: 'Fedora',
    wizard: 'Wizard',
    crown: 'Crown',
    hardhat: 'Hard hat',
    chef: 'Chef',
    viking: 'Viking',
    party: 'Party hat',
    beret: 'Beret',
    propeller: 'Propeller',
    halo: 'Halo',
    horns: 'Horns',
    santa: 'Santa',
    none: 'No hat',
  },
  hatColor: Object.fromEntries(Object.entries(HAT_COLORS).map(([k, v]) => [k, v.label])),
  item: {
    laptop: 'Laptop',
    coffee: 'Coffee',
    boba: 'Boba',
    phone: 'Phone',
    controller: 'Controller',
    sign: 'Sign',
    pizza: 'Pizza',
    donut: 'Donut',
    duck: 'Rubber duck',
    wrench: 'Wrench',
    book: 'Book',
    mic: 'Mic',
    trophy: 'Trophy',
    plant: 'Plant',
    none: 'Nothing',
  },
  gesture: {
    rest: 'Chill',
    wave: 'Wave',
    shaka: 'Shaka',
    thumbsUp: 'Thumbs up',
    peace: 'Peace',
    point: 'Point',
    rock: 'Rock on',
    ok: 'OK',
    fist: 'Fist up',
    salute: 'Salute',
    flex: 'Flex',
  },
  eyewear: { none: 'None', shades: 'Shades', aviators: 'Aviators', round: 'Round glasses', square: 'Square glasses', monocle: 'Monocle', eyepatch: 'Eye patch' },
  neckwear: { none: 'None', bowtie: 'Bow tie', tie: 'Necktie', scarf: 'Scarf', chain: 'Chain', lanyard: 'Lanyard', bandana: 'Bandana' },
  extra: { none: 'None', headphones: 'Headphones', earbuds: 'Earbuds', bandaid: 'Band-aid', earring: 'Earring', flower: 'Flower' },
  bg: Object.fromEntries(Object.entries(BG_COLORS).map(([k, v]) => [k, v.label])),
  pattern: {
    solid: 'Solid',
    spotlight: 'Spotlight',
    dots: 'Dots',
    rays: 'Rays',
    grid: 'Grid',
    stripes: 'Stripes',
    confetti: 'Confetti',
    stars: 'Stars',
    hearts: 'Hearts',
    circuit: 'Circuit',
    hex: 'Hex',
    code: 'Code',
  },
};

/** Laptop stickers: pick up to `max`, shown in the order picked. */
export const STICKERS = {
  panda: 'Red panda',
  code: 'Code tag',
  terminal: 'Terminal',
  cloud: 'Cloud',
  rocket: 'Rocket',
  bug: 'Bug',
  database: 'Database',
  lock: 'Lock',
  flame: 'Flame',
  bolt: 'Bolt',
  heart: 'Heart',
  star: 'Star',
  ghost: 'Ghost',
  dino: 'Dino',
  duck: 'Duck',
  cat: 'Cat',
  gear: 'Gear',
  branch: 'Git branch',
  lambda: 'Lambda',
  notFound: '404',
  pizza: 'Pizza',
  coffee: 'Coffee',
  planet: 'Planet',
  skull: 'Skull',
  mountain: 'Mountains',
  lgtm: 'LGTM',
};

export const MULTI = {
  stickers: { options: STICKERS, max: 6, default: ['panda', 'code', 'cloud', 'terminal'] },
};

export const SIGN_MAX = 10;
export const CAP_TEXT_MAX = 3;

export const TEXT = {
  sign: { max: SIGN_MAX, default: 'LGTM', allow: /[^A-Z0-9 !?.<>/_\-#:+]/g },
  capText: { max: CAP_TEXT_MAX, default: '', allow: /[^A-Z0-9+&!?]/g },
};

/** One-click personalities: a patch of face options (and sometimes more) applied over the current potato. */
export const PRESETS = {
  smug: { label: 'Smug dev', patch: { eyes: 'smug', brows: 'smug', mouth: 'smirk', cheeks: 'off' } },
  hype: { label: 'Hype', patch: { eyes: 'stars', brows: 'raised', mouth: 'laugh', cheeks: 'on' } },
  chill: { label: 'Chill', patch: { eyes: 'sleepy', brows: 'flat', mouth: 'smile', cheeks: 'off', eyewear: 'shades' } },
  oncall: { label: 'On call', patch: { eyes: 'wide', brows: 'worried', mouth: 'wavy', cheeks: 'off' } },
  villain: { label: 'Villain', patch: { eyes: 'angry', brows: 'angry', mouth: 'grin', cheeks: 'off', facialHair: 'goatee' } },
  nerd: { label: 'Nerd', patch: { eyes: 'dots', brows: 'raised', mouth: 'grin', cheeks: 'freckles', eyewear: 'round' } },
  shy: { label: 'Shy', patch: { eyes: 'side', brows: 'worried', mouth: 'smile', cheeks: 'on' } },
  salty: { label: 'Salty', patch: { eyes: 'rolling', brows: 'flat', mouth: 'flat', cheeks: 'off' } },
  sleepy: { label: 'Zzz', patch: { eyes: 'sleepy', brows: 'flat', mouth: 'oh', cheeks: 'off' } },
  party: { label: 'Party', patch: { eyes: 'happy', brows: 'raised', mouth: 'laugh', cheeks: 'on', hat: 'party' } },
};

/** Keys from older share links, mapped onto today's keys. */
export const LEGACY = {
  accessory: {
    shades: { eyewear: 'shades' },
    glasses: { eyewear: 'round' },
    mustache: { facialHair: 'mustache' },
    bowtie: { neckwear: 'bowtie' },
  },
};

export const DEFAULT_STATE = Object.freeze({
  body: 'classic',
  skin: 'russet',
  eyes: 'smug',
  brows: 'smug',
  mouth: 'smirk',
  cheeks: 'off',
  facialHair: 'none',
  hat: 'backwardCap',
  hatColor: 'black',
  item: 'laptop',
  gesture: 'shaka',
  eyewear: 'none',
  neckwear: 'none',
  extra: 'none',
  bg: 'ocean',
  pattern: 'spotlight',
  stickers: MULTI.stickers.default,
  sign: 'LGTM',
  capText: '',
});
