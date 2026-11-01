#!/usr/bin/env node
// Reproducible visual inventory audit. Optional Playwright; no app dependency.
// node scripts/audit-art.mjs /tmp/potato-art-audit [group ...]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(process.argv[2] || '/tmp/potato-art-audit');
await mkdir(out, { recursive: true });
const groups = process.argv.slice(3);
const port = 5700 + Math.floor(Math.random() * 600);
const server = spawn(process.execPath, [root + 'scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const browser = await chromium.launch();
const report = { count: 0, groups: {}, maxExportBytes: 0, errors: [] };
try {
  const page = await browser.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => document.body.dataset.rendered === 'true');
  const selected = groups.length ? groups : ['body', 'eyes', 'brows', 'mouth', 'cheeks', 'facialHair', 'hat', 'eyewear', 'neckwear', 'extra', 'item', 'gesture', 'stickers'];
  for (const group of selected) {
    const result = await page.evaluate(async group => {
      const { PARTS } = await import('./src/assets.js');
      const { DEFAULT_STATE } = await import('./src/options.js');
      const { renderPotato, exportPng } = await import('./src/raster.js');
      const { encodeState, decodeState } = await import('./src/state.js');
      const shapes = ['classic', 'lumpy', 'round', 'long'], skins = ['russet', 'red', 'gold', 'purple'];
      const frames = []; let maxExportBytes = 0;
      for (const key of Object.keys(PARTS[group])) for (let b = 0; b < (group === 'body' ? 1 : 4); b++) {
        const state = { ...DEFAULT_STATE, body: shapes[b], skin: skins[b], hat: 'none', item: 'none', gesture: 'rest', bg: 'cream', pattern: 'solid', capText: group === 'hat' ? 'A+W' : '' };
        if (group === 'body') {
          [state.body, state.skin] = key.split('-');
          Object.assign(state, { eyes: 'wide', brows: 'angry', mouth: 'grin', item: 'pizza', gesture: 'wave' });
        } else if (group === 'stickers') Object.assign(state, { item: 'laptop', stickers: [key] });
        else state[group] = key;
        // Exercise the same full-size path used by the Download button.
        const blob = await exportPng(state);
        if (blob.size >= 1000000) throw Error(`Export exceeds 1 MB: ${group}/${key}/${state.body}`);
        maxExportBytes = Math.max(maxExportBytes, blob.size);
        const decoded = decodeState(encodeState(state));
        for (const field of ['body', 'skin', 'eyes', 'mouth', 'item', 'gesture']) if (decoded[field] !== state[field]) throw Error(`Share mismatch: ${field}`);
        const url = URL.createObjectURL(blob), img = new Image(); img.src = url; await img.decode();
        if (img.width !== 512 || img.height !== 512) throw Error('Wrong export size');
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 220;
        canvas.getContext('2d').drawImage(img, 0, 0, 220, 220); URL.revokeObjectURL(url);
        // Exercise thumbnail rendering independently (different source resolution).
        await renderPotato(state, { size: 96, thumbs: true });
        frames.push({ label: `${key} / ${state.body}`, image: canvas.toDataURL() });
      }
      return { frames, maxExportBytes };
    }, group);
    for (let start = 0; start < result.frames.length; start += 32) {
      const frames = result.frames.slice(start, start + 32);
      const sheet = await browser.newPage({ viewport: { width: 960, height: 45 + Math.ceil(frames.length / 4) * 250 } });
      await sheet.setContent(`<body style="margin:0;background:#edf6f3;color:#123d40;font-family:system-ui"><h2 style="margin:8px 12px;height:29px">${group} · ${start / 4}</h2><div style="display:grid;grid-template-columns:repeat(4,240px)">${frames.map(f => `<figure style="margin:0;text-align:center;height:250px"><img src="${f.image}" style="width:220px;height:220px;border-radius:50%"><figcaption>${f.label}</figcaption></figure>`).join('')}</div></body>`);
      await sheet.screenshot({ path: `${out}/${group}-${start / 4}.png` });
      await sheet.close();
    }
    report.count += result.frames.length; report.groups[group] = result.frames.length;
    report.maxExportBytes = Math.max(report.maxExportBytes, result.maxExportBytes);
    console.log(`${group}: ${result.frames.length} renders, exports and thumbnails`);
  }
  if (report.errors.length) throw Error(report.errors.join('\n'));
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await browser.close(); server.kill(); }
