#!/usr/bin/env node
// Screenshot the real app (rendered PNG parts) with headless Chromium.
//
//   node scripts/shot.mjs out.png '#hat=wizard&skin=gold'            the 512 px preview for that share hash
//   node scripts/shot.mjs out.png spec.json --cell 256 --cols 4      a grid: [[label, "#hash"], ...]
//   node scripts/shot.mjs out.png '#...' --page [--width 1280] [--dark]   the whole page
//
// Starts its own dev server on a free port. Needs Playwright (dev tool only).

import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  if (i === -1) return dflt;
  return dflt === false ? true : argv[i + 1];
};
const [out, input] = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1]?.startsWith('--') && !['--page', '--dark'].includes(argv[i - 1])));
if (!out || !input) {
  console.error('usage: node scripts/shot.mjs out.png <#hash | spec.json> [--cell 256 --cols 4] [--page] [--width 1280] [--dark]');
  process.exit(2);
}
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const port = 5300 + Math.floor(Math.random() * 500);
const server = spawn(process.execPath, [root + 'scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const base = `http://localhost:${port}/`;

const browser = await chromium.launch();
try {
  const page = flag('--page', false);
  const cell = Number(flag('--cell', 256));
  const cols = Number(flag('--cols', 4));
  const dark = flag('--dark', false);
  if (page) {
    const ctx = await browser.newContext({ viewport: { width: Number(flag('--width', 1280)), height: 900 }, colorScheme: dark ? 'dark' : 'light' });
    const p = await ctx.newPage();
    await p.goto(`${base}?shot=page${input}`, { waitUntil: 'networkidle' });
    await p.waitForFunction(() => document.body.dataset.rendered === 'true', null, { timeout: 30000 });
    await p.screenshot({ path: out, fullPage: true });
  } else {
    const spec = input.trim().startsWith('#') ? [['', input.trim()]] : JSON.parse(await readFile(input, 'utf8'));
    const p = await browser.newPage({ viewport: { width: 512, height: 512 } });
    if (spec.length === 1 && !spec[0][0]) {
      // One potato: go through the real app so the preview path itself is exercised.
      await p.goto(`${base}?shot=0${spec[0][1]}`, { waitUntil: 'networkidle' });
      await p.waitForFunction(() => document.body.dataset.rendered === 'true', null, { timeout: 30000 });
      const url = await p.evaluate(() => document.querySelector('#preview canvas').toDataURL('image/png'));
      await (await import('node:fs/promises')).writeFile(out, Buffer.from(url.split(',')[1], 'base64'));
    } else {
      // A sheet: load the app once, then render every cell in-page at cell size (images stay cached).
      await p.goto(`${base}?shot=sheet`, { waitUntil: 'networkidle' });
      await p.waitForFunction(() => document.body.dataset.rendered === 'true', null, { timeout: 30000 });
      const shots = await p.evaluate(
        async ([cells, size]) => {
          const { renderPotato } = await import('./src/raster.js');
          const { decodeState } = await import('./src/state.js');
          const out = [];
          for (const [label, hash] of cells) {
            const c = await renderPotato(decodeState(hash), { size });
            out.push([label, c.toDataURL('image/png')]);
          }
          return out;
        },
        [spec, cell],
      );
      const sheet = await browser.newPage({ viewport: { width: cols * cell, height: cell } });
      const cells = shots.map(([label, url]) => `<div style="position:relative;width:${cell}px;height:${cell}px"><img src="${url}" style="width:${cell}px;height:${cell}px;display:block"><span style="position:absolute;left:3px;top:2px;font:11px monospace;background:#fff9;padding:0 3px;border-radius:3px">${label}</span></div>`);
      await sheet.setContent(`<body style="margin:0;background:#ccc;display:grid;grid-template-columns:repeat(${cols},${cell}px)">${cells.join('')}</body>`);
      await sheet.screenshot({ path: out, fullPage: true });
    }
  }
  console.log('wrote', out);
} finally {
  await browser.close();
  server.kill();
}
