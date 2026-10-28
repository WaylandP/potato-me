#!/usr/bin/env node
// Builds the README banner from the real renderer, so the docs never drift
// from the art.
//
//   npm run hero
//
// Always writes docs/hero.svg. Also writes docs/hero.png when Playwright is
// installed (npm i -D playwright && npx playwright install chromium); the PNG is
// what README.md embeds, so commit it when the art changes.

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { composeSVG } from '../src/compose.js';

const out = fileURLToPath(new URL('../docs/', import.meta.url));

// Five potatoes that show off the range. Keep them in sync with README.md's caption.
export const HERO_POTATOES = [
  { body: 'round', skin: 'russet', eyes: 'happy', mouth: 'grin', cheeks: 'on', hat: 'beanie', hatColor: 'red', item: 'coffee', bg: 'coral', pattern: 'dots' },
  { body: 'long', skin: 'purple', eyes: 'wide', mouth: 'oh', hat: 'wizard', hatColor: 'purple', item: 'none', gesture: 'wave', bg: 'navy', pattern: 'rays' },
  { body: 'classic', skin: 'russet', eyes: 'smug', mouth: 'smirk', hat: 'backwardCap', hatColor: 'black', item: 'laptop', bg: 'ocean', pattern: 'solid' },
  { body: 'lumpy', skin: 'gold', eyes: 'dots', mouth: 'flat', hat: 'crown', hatColor: 'teal', accessory: 'shades', item: 'sign', sign: 'SHIP IT', bg: 'mint', pattern: 'grid' },
  { body: 'classic', skin: 'sweet', eyes: 'wink', mouth: 'laugh', hat: 'party', hatColor: 'orange', accessory: 'mustache', item: 'none', gesture: 'shaka', bg: 'sky', pattern: 'confetti' },
];

const CELL = 280;
const GAP = 28;
const PAD = 16;
const W = PAD * 2 + HERO_POTATOES.length * CELL + (HERO_POTATOES.length - 1) * GAP;
const H = PAD * 2 + CELL;

export function heroSVG() {
  const cells = HERO_POTATOES.map((state, i) => {
    const x = PAD + i * (CELL + GAP);
    const id = `hero${i}`;
    const inner = composeSVG(state, { idPrefix: id, size: CELL });
    return `<clipPath id="${id}-clip"><circle cx="${x + CELL / 2}" cy="${PAD + CELL / 2}" r="${CELL / 2}"/></clipPath>
<g clip-path="url(#${id}-clip)"><svg x="${x}" y="${PAD}" width="${CELL}" height="${CELL}" viewBox="0 0 512 512">${inner.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</svg></g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Five example potato avatars">
${cells.join('\n')}
</svg>`;
}

async function main() {
  await mkdir(out, { recursive: true });
  const svg = heroSVG();
  await writeFile(out + 'hero.svg', svg);
  console.log(`wrote docs/hero.svg (${W}×${H})`);

  let chromium;
  try {
    ({ chromium } = createRequire(import.meta.url)('playwright'));
  } catch {
    console.log('Playwright not installed, skipped docs/hero.png. Install it with: npm i -D playwright && npx playwright install chromium');
    return;
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`);
  await page.screenshot({ path: out + 'hero.png', omitBackground: true });
  await browser.close();
  console.log('wrote docs/hero.png');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
