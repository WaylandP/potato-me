import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeSVG, cropFor } from '../src/compose.js';
import { OPTIONS, DEFAULT_STATE } from '../src/options.js';

// Minimal well-formedness check: every opened tag closes, in order.
function assertWellFormed(svg) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const [, closing, name, , selfClosing] = m;
    if (selfClosing) continue;
    if (closing) {
      const open = stack.pop();
      assert.equal(open, name, `expected </${open}> but found </${name}>`);
    } else stack.push(name);
  }
  assert.deepEqual(stack, [], `unclosed tags: ${stack.join(', ')}`);
}

function assertClean(svg) {
  assert.ok(svg.startsWith('<svg'), 'starts with <svg');
  assert.ok(svg.trimEnd().endsWith('</svg>'), 'ends with </svg>');
  assert.ok(!/undefined|NaN|null/.test(svg), 'no undefined/NaN/null leaked into the markup');
  assertWellFormed(svg);
}

test('the default potato renders', () => {
  assertClean(composeSVG(DEFAULT_STATE));
});

test('every single option renders cleanly against the default', () => {
  for (const [key, values] of Object.entries(OPTIONS)) {
    for (const value of Object.keys(values)) {
      assertClean(composeSVG({ ...DEFAULT_STATE, [key]: value }));
    }
  }
});

test('every body works with every hat, item and gesture', () => {
  for (const body of Object.keys(OPTIONS.body))
    for (const hat of Object.keys(OPTIONS.hat))
      for (const item of Object.keys(OPTIONS.item))
        for (const gesture of Object.keys(OPTIONS.gesture))
          assertClean(composeSVG({ ...DEFAULT_STATE, body, hat, item, gesture }));
});

test('sign text is escaped', () => {
  const svg = composeSVG({ ...DEFAULT_STATE, item: 'sign', sign: '<B>' });
  assert.ok(svg.includes('&lt;B&gt;'));
  assert.ok(!svg.includes('<B>'));
});

test('id prefixes keep multiple SVGs on one page from colliding', () => {
  const a = composeSVG({ ...DEFAULT_STATE, pattern: 'dots' }, { idPrefix: 'a' });
  const b = composeSVG({ ...DEFAULT_STATE, pattern: 'dots' }, { idPrefix: 'b' });
  const ids = (s) => [...s.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids(a).length > 0);
  for (const id of ids(a)) assert.ok(!ids(b).includes(id), `id ${id} collides`);
});

test('size and viewBox options are applied', () => {
  const svg = composeSVG(DEFAULT_STATE, { size: 88, viewBox: '10 10 100 100' });
  assert.match(svg, /width="88" height="88"/);
  assert.match(svg, /viewBox="10 10 100 100"/);
  assert.match(cropFor('eyes', DEFAULT_STATE), /^\d+ \d+ 240 240$/);
  assert.equal(cropFor('body', DEFAULT_STATE), undefined);
});

test('output stays small', () => {
  const svg = composeSVG({ ...DEFAULT_STATE, pattern: 'rays' });
  assert.ok(svg.length < 20_000, `SVG is ${svg.length} chars`);
});
