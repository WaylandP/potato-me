import { OPTIONS, MULTI, TEXT, LEGACY, DEFAULT_STATE } from './options.js';

const KEYS = Object.keys(OPTIONS);
const MULTI_KEYS = Object.keys(MULTI);
const TEXT_KEYS = Object.keys(TEXT);
export const ALL_KEYS = [...KEYS, ...MULTI_KEYS, ...TEXT_KEYS];

/** Clean a text field: uppercase, only characters that read well on a tiny sign, capped. */
export function cleanText(key, text) {
  const spec = TEXT[key];
  return String(text ?? '')
    .toUpperCase()
    .replace(spec.allow, '')
    .slice(0, spec.max);
}

/** Backwards-compatible alias for the sign field. */
export const cleanSign = (text) => cleanText('sign', text);

function cleanList(key, value) {
  const spec = MULTI[key];
  const raw = Array.isArray(value) ? value : String(value ?? '').split(',');
  const out = [];
  for (const v of raw) {
    const k = String(v).trim();
    if (Object.hasOwn(spec.options, k) && !out.includes(k)) out.push(k);
    if (out.length >= spec.max) break;
  }
  return out;
}

/** Any input in, a complete valid state out. Unknown values become defaults, old keys are migrated. */
export function normalizeState(input) {
  const src = input && typeof input === 'object' ? { ...input } : {};
  for (const [oldKey, map] of Object.entries(LEGACY)) {
    const v = src[oldKey];
    if (typeof v === 'string' && Object.hasOwn(map, v)) {
      for (const [k, nv] of Object.entries(map[v])) if (!(k in src)) src[k] = nv;
    }
  }
  const out = {};
  for (const key of KEYS) {
    const v = src[key];
    out[key] = typeof v === 'string' && Object.hasOwn(OPTIONS[key], v) ? v : DEFAULT_STATE[key];
  }
  for (const key of MULTI_KEYS) out[key] = key in src ? cleanList(key, src[key]) : [...DEFAULT_STATE[key]];
  for (const key of TEXT_KEYS) out[key] = key in src ? cleanText(key, src[key]) : DEFAULT_STATE[key];
  return out;
}

const same = (a, b) => (Array.isArray(a) ? a.join(',') === b.join(',') : a === b);

/** State to a short, readable URL hash: "#body=round&hat=wizard". Defaults are left out. */
export function encodeState(state) {
  const s = normalizeState(state);
  const params = new URLSearchParams();
  for (const key of ALL_KEYS) {
    if (!same(s[key], DEFAULT_STATE[key])) params.set(key, Array.isArray(s[key]) ? s[key].join(',') : s[key]);
  }
  const str = params.toString();
  return str ? `#${str}` : '';
}

export function decodeState(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const raw = Object.fromEntries(params.entries());
  return normalizeState(raw);
}

/** Random potato. Pass your own rng (0..1) for repeatable results in tests. Text fields are kept. */
export function randomState(rng = Math.random, keep = {}) {
  const pick = (obj) => {
    const keys = Object.keys(obj);
    return keys[Math.floor(rng() * keys.length) % keys.length];
  };
  const out = {};
  for (const key of KEYS) out[key] = pick(OPTIONS[key]);
  for (const key of MULTI_KEYS) {
    const spec = MULTI[key];
    const count = 2 + Math.floor(rng() * (spec.max - 1));
    const picks = new Set();
    while (picks.size < count) picks.add(pick(spec.options));
    out[key] = [...picks];
  }
  for (const key of TEXT_KEYS) out[key] = key in keep ? keep[key] : DEFAULT_STATE[key];
  return normalizeState(out);
}
