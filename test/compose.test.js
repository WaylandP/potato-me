import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeSVG, cropFor, mix } from '../src/compose.js';
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
  assert.ok(!/undefined|NaN|null|\[object/.test(svg), 'no undefined/NaN/null leaked into the markup');
  assertWellFormed(svg);
}

const ids = (svg) => [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const refs = (svg) => [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);

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

test('every skin works on every body with every accessory', () => {
  for (const body of Object.keys(OPTIONS.body))
    for (const skin of Object.keys(OPTIONS.skin))
      for (const accessory of Object.keys(OPTIONS.accessory))
        assertClean(composeSVG({ ...DEFAULT_STATE, body, skin, accessory, cheeks: 'on' }));
});

test('every id carries the prefix and every url(#…) points at a defined id', () => {
  for (const hat of Object.keys(OPTIONS.hat))
    for (const pattern of Object.keys(OPTIONS.pattern))
      for (const item of Object.keys(OPTIONS.item)) {
        const svg = composeSVG({ ...DEFAULT_STATE, hat, pattern, item, accessory: 'bowtie' }, { idPrefix: 'zz' });
        const defined = ids(svg);
        assert.ok(defined.length > 0);
        for (const id of defined) assert.ok(id.startsWith('zz-'), `id "${id}" lacks the prefix`);
        assert.equal(new Set(defined).size, defined.length, 'duplicate id');
        for (const ref of refs(svg)) assert.ok(defined.includes(ref), `url(#${ref}) has no definition`);
      }
});

test('id prefixes keep multiple SVGs on one page from colliding', () => {
  const a = composeSVG({ ...DEFAULT_STATE, pattern: 'dots' }, { idPrefix: 'a' });
  const b = composeSVG({ ...DEFAULT_STATE, pattern: 'dots' }, { idPrefix: 'b' });
  assert.ok(ids(a).length > 0);
  for (const id of ids(a)) assert.ok(!ids(b).includes(id), `id ${id} collides`);
});

test('every hat casts a shadow on the body, and no hat means no shadow', () => {
  for (const hat of Object.keys(OPTIONS.hat)) {
    const svg = composeSVG({ ...DEFAULT_STATE, hat }, { idPrefix: 'p' });
    assert.equal(svg.includes('url(#p-hs)'), hat !== 'none', `hat shadow for ${hat}`);
  }
});

test('shades hide the eyes, glasses keep them', () => {
  const eyes = (svg) => svg.includes('rx="13.5" ry="17.5"'); // the pupil of the default "smug" eyes
  assert.ok(eyes(composeSVG(DEFAULT_STATE)));
  assert.ok(!eyes(composeSVG({ ...DEFAULT_STATE, accessory: 'shades' })));
  assert.ok(eyes(composeSVG({ ...DEFAULT_STATE, accessory: 'glasses' })));
});

test('sign text is escaped and an empty sign still renders', () => {
  const svg = composeSVG({ ...DEFAULT_STATE, item: 'sign', sign: '<B>' });
  assert.ok(svg.includes('&lt;B&gt;'));
  assert.ok(!svg.includes('<B>'));
  assertClean(composeSVG({ ...DEFAULT_STATE, item: 'sign', sign: '' }));
});

test('size and viewBox options are applied', () => {
  const svg = composeSVG(DEFAULT_STATE, { size: 88, viewBox: '10 10 100 100' });
  assert.match(svg, /width="88" height="88"/);
  assert.match(svg, /viewBox="10 10 100 100"/);
  assert.match(cropFor('eyes', DEFAULT_STATE), /^\d+ \d+ 240 240$/);
  assert.match(cropFor('hat', DEFAULT_STATE), /^\d+ -?\d+ 320 320$/);
  assert.equal(cropFor('body', DEFAULT_STATE), undefined);
});

test('mix blends hex colors', () => {
  assert.equal(mix('#000000', '#FFFFFF', 0.5), '#808080');
  assert.equal(mix('#C8372D', '#000000', 0), '#C8372D');
  assert.equal(mix('#C8372D', '#FFFFFF', 1), '#FFFFFF');
});

test('output stays small enough for a page full of thumbnails', () => {
  for (const pattern of Object.keys(OPTIONS.pattern)) {
    const svg = composeSVG({ ...DEFAULT_STATE, pattern, hat: 'wizard', item: 'laptop', accessory: 'glasses', cheeks: 'on' });
    assert.ok(svg.length < 24_000, `SVG is ${svg.length} chars`);
  }
});
