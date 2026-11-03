import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INSPIRATION_LOOKS, pickInspiration, bodyPreviewState } from '../src/inspiration.js';
import { ALL_KEYS, normalizeState, encodeState, decodeState } from '../src/state.js';
import { DEFAULT_STATE, OPTIONS } from '../src/options.js';
import { drawableState } from '../src/raster.js';

test('every inspiration look is a complete, drawable share-link state', () => {
  assert.equal(new Set(INSPIRATION_LOOKS.map(look => look.id)).size, INSPIRATION_LOOKS.length);
  for (const { id, state } of INSPIRATION_LOOKS) {
    assert.deepEqual(Object.keys(state).sort(), [...ALL_KEYS].sort(), id);
    assert.deepEqual(drawableState(state), state, `${id}: every selected part exists`);
    assert.deepEqual(decodeState(encodeState(state)), state, `${id}: shared look is complete`);
  }
});

test('shuffling offers six unique ideas and replaces all six previous suggestions', () => {
  for (const value of [0, .5, .999999]) {
    const previous = pickInspiration([], () => value);
    const next = pickInspiration(previous.map(look => look.id), () => value);
    assert.equal(previous.length, 6);
    assert.equal(next.length, 6);
    assert.equal(new Set(next.map(look => look.id)).size, 6);
    assert.ok(next.every(look => !previous.some(old => old.id === look.id)));
  }
});

test('editing an inspiration result cannot change future suggestions or inherit custom text', () => {
  const first = pickInspiration([], () => .5);
  const expected = structuredClone(first);
  first[0].state.stickers.push('books');
  first[0].state.capText = 'ZZZ';
  first[0].state.sign = 'OLD TEXT';
  assert.deepEqual(pickInspiration([], () => .5), expected);
  for (const look of expected) {
    assert.equal(look.state.capText, '');
    assert.equal(look.state.sign, look.id === 'hello-sunshine' ? 'HELLO!' : DEFAULT_STATE.sign);
  }
});

test('body previews reveal all six silhouettes in the selected skin without changing the outfit', () => {
  for (const body of Object.keys(OPTIONS.body)) for (const skin of Object.keys(OPTIONS.skin)) {
    const outfit = normalizeState({
      ...DEFAULT_STATE, body, skin, character: 'female',
      hair: 'waves', hairColor: 'silver', hat: 'flowerCrown',
      eyewear: 'catEye', neckwear: 'scarf', jewelry: 'hoops',
      extra: 'headphones', facialHair: 'beard', item: 'phone', gesture: 'wave',
      eyes: 'stars', mouth: 'laugh', bg: 'indigo', pattern: 'orbit',
    });
    const original = structuredClone(outfit);
    const shown = bodyPreviewState(outfit);
    assert.equal(shown.body, body);
    assert.equal(shown.skin, skin);
    for (const key of ['hair', 'hat', 'eyewear', 'neckwear', 'jewelry', 'extra', 'facialHair', 'item']) assert.equal(shown[key], 'none');
    assert.equal(shown.gesture, 'rest');
    assert.equal(shown.bg, 'cream');
    assert.equal(shown.pattern, 'solid');
    assert.equal(shown.eyes, 'dots');
    assert.equal(shown.brows, 'none');
    assert.equal(shown.mouth, 'smile');
    assert.deepEqual(drawableState(shown), shown);
    assert.deepEqual(outfit, original, 'the current outfit is never stripped');
  }
});
