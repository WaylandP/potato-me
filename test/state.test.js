import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeState, encodeState, decodeState, randomState, cleanSign, cleanText, ALL_KEYS } from '../src/state.js';
import { DEFAULT_STATE, OPTIONS, MULTI, SIGN_MAX, CAP_TEXT_MAX } from '../src/options.js';

const seeded = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

test('normalizeState fills gaps and rejects unknown values', () => {
  assert.deepEqual(normalizeState(undefined), { ...DEFAULT_STATE });
  const s = normalizeState({ body: 'round', hat: 'sombrero', eyes: 42 });
  assert.equal(s.body, 'round');
  assert.equal(s.hat, DEFAULT_STATE.hat);
  assert.equal(s.eyes, DEFAULT_STATE.eyes);
  assert.deepEqual(Object.keys(s).sort(), [...ALL_KEYS].sort());
});

test('normalizeState ignores prototype keys', () => {
  const s = normalizeState({ body: 'toString', hat: '__proto__', stickers: 'constructor,panda' });
  assert.equal(s.body, DEFAULT_STATE.body);
  assert.equal(s.hat, DEFAULT_STATE.hat);
  assert.deepEqual(s.stickers, ['panda']);
});

test('old share links with accessory= still work', () => {
  assert.equal(decodeState('#accessory=shades').eyewear, 'shades');
  assert.equal(decodeState('#accessory=glasses').eyewear, 'round');
  assert.equal(decodeState('#accessory=mustache').facialHair, 'mustache');
  assert.equal(decodeState('#accessory=bowtie').neckwear, 'bowtie');
  // An explicit new key wins over the old one.
  assert.equal(decodeState('#accessory=shades&eyewear=monocle').eyewear, 'monocle');
});

test('multi-select keys accept lists or comma strings, drop junk and cap the count', () => {
  assert.deepEqual(normalizeState({ stickers: 'panda,code,nope,panda,cloud' }).stickers, ['panda', 'code', 'cloud']);
  assert.deepEqual(normalizeState({ stickers: ['rocket', 'bug'] }).stickers, ['rocket', 'bug']);
  assert.deepEqual(normalizeState({ stickers: '' }).stickers, []);
  const all = Object.keys(MULTI.stickers.options);
  assert.equal(normalizeState({ stickers: all }).stickers.length, MULTI.stickers.max);
  assert.notEqual(normalizeState({}).stickers, DEFAULT_STATE.stickers, 'the default list is copied, not shared');
});

test('text fields are uppercased, filtered and capped', () => {
  assert.equal(cleanSign('ship it'), 'SHIP IT');
  assert.equal(cleanSign('<b>"hi"</b>'), '<B>HI</B>');
  assert.equal(cleanSign('emoji 🥔 ok'), 'EMOJI  OK');
  assert.equal(cleanSign('x'.repeat(50)).length, SIGN_MAX);
  assert.equal(cleanText('capText', 'a+w'), 'A+W');
  assert.equal(cleanText('capText', 'abcdef').length, CAP_TEXT_MAX);
  assert.equal(cleanText('capText', 'a b<c'), 'ABC');
});

test('the default potato encodes to an empty hash', () => {
  assert.equal(encodeState(DEFAULT_STATE), '');
});

test('encode and decode round-trip, including lists and text', () => {
  const rng = seeded(11);
  for (let i = 0; i < 200; i++) {
    const s = randomState(rng, { sign: i % 2 ? 'SHIP IT!' : 'LGTM', capText: i % 3 ? 'A+W' : '' });
    assert.deepEqual(decodeState(encodeState(s)), s);
  }
  assert.equal(encodeState({ ...DEFAULT_STATE, stickers: ['bug', 'rocket'] }), '#stickers=bug%2Crocket');
});

test('decodeState survives junk', () => {
  assert.deepEqual(decodeState('#%%%&&body=<script>'), { ...DEFAULT_STATE });
  assert.deepEqual(decodeState(null), { ...DEFAULT_STATE });
});

test('randomState is repeatable with a seeded rng and always valid', () => {
  assert.deepEqual(randomState(seeded(5)), randomState(seeded(5)));
  const rng = seeded(99);
  for (let i = 0; i < 100; i++) {
    const s = randomState(rng);
    for (const key of Object.keys(OPTIONS)) assert.ok(Object.hasOwn(OPTIONS[key], s[key]), `${key}=${s[key]}`);
    assert.ok(s.stickers.length >= 2 && s.stickers.length <= MULTI.stickers.max);
    assert.equal(new Set(s.stickers).size, s.stickers.length);
    assert.equal(s.sign, DEFAULT_STATE.sign);
  }
});
