import { OPTIONS, DEFAULT_STATE, SIGN_MAX } from './options.js';

const KEYS = Object.keys(OPTIONS);

/** Keep sign text short and to characters that read well on a tiny sign. */
export function cleanSign(text) {
  return String(text ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9 !?.<>/_\-#:+]/g, '')
    .slice(0, SIGN_MAX);
}

/** Any input in, a complete valid state out. Unknown values become defaults. */
export function normalizeState(input) {
  const src = input && typeof input === 'object' ? input : {};
  const out = {};
  for (const key of KEYS) {
    const v = src[key];
    out[key] = typeof v === 'string' && Object.hasOwn(OPTIONS[key], v) ? v : DEFAULT_STATE[key];
  }
  out.sign = 'sign' in src ? cleanSign(src.sign) : DEFAULT_STATE.sign;
  return out;
}

/** State to a short, readable URL hash: "#body=round&hat=wizard". Defaults are left out. */
export function encodeState(state) {
  const s = normalizeState(state);
  const params = new URLSearchParams();
  for (const key of [...KEYS, 'sign']) {
    if (s[key] !== DEFAULT_STATE[key]) params.set(key, s[key]);
  }
  const str = params.toString();
  return str ? `#${str}` : '';
}

export function decodeState(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const raw = Object.fromEntries(params.entries());
  return normalizeState(raw);
}

/** Random potato. Pass your own rng (0..1) for repeatable results in tests. */
export function randomState(rng = Math.random, keepSign = DEFAULT_STATE.sign) {
  const pick = (obj) => {
    const keys = Object.keys(obj);
    return keys[Math.floor(rng() * keys.length) % keys.length];
  };
  const out = {};
  for (const key of KEYS) out[key] = pick(OPTIONS[key]);
  out.sign = keepSign;
  return normalizeState(out);
}
