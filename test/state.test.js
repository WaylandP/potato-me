import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeState, encodeState, decodeState, randomState, cleanSign } from '../src/state.js';
import { DEFAULT_STATE, OPTIONS, SIGN_MAX } from '../src/options.js';

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
});

test('normalizeState ignores prototype keys', () => {
  const s = normalizeState({ body: 'toString', hat: '__proto__' });
  assert.equal(s.body, DEFAULT_STATE.body);
  assert.equal(s.hat, DEFAULT_STATE.hat);
});

test('the default potato encodes to an empty hash', () => {
  assert.equal(encodeState(DEFAULT_STATE), '');
});

test('encode and decode round-trip', () => {
  const rng = seeded(11);
  for (let i = 0; i < 200; i++) {
    const s = randomState(rng, i % 2 ? 'SHIP IT!' : 'LGTM');
    assert.deepEqual(decodeState(encodeState(s)), s);
  }
});

test('decodeState survives junk', () => {
  assert.deepEqual(decodeState('#%%%&&body=<script>'), { ...DEFAULT_STATE });
  assert.deepEqual(decodeState(null), { ...DEFAULT_STATE });
});

test('cleanSign uppercases, filters and caps length', () => {
  assert.equal(cleanSign('ship it'), 'SHIP IT');
  assert.equal(cleanSign('<b>"hi"</b>'), '<B>HI</B>');
  assert.equal(cleanSign('emoji 🥔 ok'), 'EMOJI  OK');
  assert.equal(cleanSign('x'.repeat(50)).length, SIGN_MAX);
});

test('randomState is repeatable with a seeded rng and always valid', () => {
  assert.deepEqual(randomState(seeded(5)), randomState(seeded(5)));
  const rng = seeded(99);
  for (let i = 0; i < 100; i++) {
    const s = randomState(rng);
    for (const key of Object.keys(OPTIONS)) assert.ok(Object.hasOwn(OPTIONS[key], s[key]), `${key}=${s[key]}`);
  }
});
