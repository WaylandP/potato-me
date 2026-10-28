#!/usr/bin/env node
// Render potatoes to PNG with headless Chromium, for checking art without
// opening the app. Needs Playwright (npm i -D playwright && npx playwright
// install chromium); it is not a project dependency.
//
//   node scripts/render.mjs out.png '{"hat":"wizard","skin":"gold"}'        one potato, 512 px
//   node scripts/render.mjs out.png spec.json --cell 128 --cols 8           grid: [[label, state, opts], ...]
//   node scripts/render.mjs out.png '{}' --size 88 --crop hat --round        a thumbnail as the editor shows it
//   node scripts/render.mjs --export-check '{"hat":"wizard"}'                prove the SVG survives canvas PNG export
//
// Grid opts per cell: {crop: 'hat'|'eyes'|..., round: true, size: n}.

import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { composeSVG, cropFor } from '../src/compose.js';

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  if (i === -1) return dflt;
  if (dflt === false) return true;
  return argv[i + 1];
};
const exportCheck = flag('--export-check', false);
const positional = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1]?.startsWith('--') && !['--round', '--export-check'].includes(argv[i - 1])));
const out = exportCheck ? null : positional[0];
const input = exportCheck ? positional[0] : positional[1];
if (!input) {
  console.error('usage: node scripts/render.mjs out.png <stateJSON | spec.json> [--cell 128 --cols 8] [--size 512] [--crop hat] [--round]');
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const parse = async (s) => (s.trim().startsWith('{') || s.trim().startsWith('[') ? JSON.parse(s) : JSON.parse(await readFile(s, 'utf8')));
const spec = await parse(input);
const cell = Number(flag('--cell', 512));
const cols = Number(flag('--cols', 6));
const size = Number(flag('--size', 512));
const crop = flag('--crop', null);
const round = flag('--round', false);

const svgFor = (state, opts, i) => {
  const o = { idPrefix: 'r' + i, size: opts.size || cell, ...opts };
  if (o.crop) {
    o.viewBox = cropFor(o.crop, state);
    delete o.crop;
  }
  delete o.round;
  return composeSVG(state, o);
};

const browser = await chromium.launch();
try {
  if (exportCheck) {
    // Same path the app uses: SVG string -> <img> -> canvas -> PNG. Fails if filters or fonts break export.
    const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
    const svg = composeSVG(spec, { idPrefix: 'x', size: 512 });
    const result = await page.evaluate(
      (svgString) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = c.height = 512;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, 512, 512);
            const d = ctx.getImageData(0, 0, 512, 512).data;
            let opaque = 0;
            const sample = new Set();
            for (let i = 0; i < d.length; i += 4) {
              if (d[i + 3] > 0) opaque++;
              if (i % 64 === 0) sample.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
            }
            // A blank or single-color canvas means the SVG did not rasterize (bad filter, font, or markup).
            resolve({ ok: opaque > 512 * 512 * 0.9 && sample.size > 24, opaque, distinctColors: sample.size, pngBytes: Math.round((c.toDataURL('image/png').length * 3) / 4) });
          };
          img.onerror = () => resolve({ ok: false, error: 'image failed to load' });
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        }),
      svg,
    );
    console.log(JSON.stringify(result));
    if (!result.ok) process.exit(1);
  } else if (Array.isArray(spec)) {
    const cells = spec.map(([label, state, opts = {}], i) => {
      const s = opts.size || cell;
      return `<div style="position:relative;width:${s}px;height:${s}px;overflow:hidden;${opts.round ? 'border-radius:50%;' : ''}">${svgFor(state, opts, i)}${label ? `<span style="position:absolute;left:3px;top:2px;font:11px monospace;background:#fff9;padding:0 3px;border-radius:3px">${label}</span>` : ''}</div>`;
    });
    const page = await browser.newPage({ viewport: { width: cols * cell, height: cell } });
    await page.setContent(`<body style="margin:0;background:#ccc;display:grid;grid-template-columns:repeat(${cols},${cell}px);align-items:start">${cells.join('')}</body>`);
    await page.screenshot({ path: out, fullPage: true });
    console.log(`wrote ${out} (${spec.length} potatoes)`);
  } else {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const svg = svgFor(spec, { size, crop, round }, 0);
    await page.setContent(`<body style="margin:0;background:#fff"><div style="width:${size}px;height:${size}px;overflow:hidden;${round ? 'border-radius:50%' : ''}">${svg}</div></body>`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: size, height: size } });
    console.log(`wrote ${out}`);
  }
} finally {
  await browser.close();
}
