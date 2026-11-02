#!/usr/bin/env node
// Structural inventory coverage. This catches missing images and crop defects;
// it deliberately does not infer aesthetic approval from successful renders.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { PARTS } from '../src/assets.js';
import { OPTIONS, DEFAULT_STATE } from '../src/options.js';
const require = createRequire(import.meta.url), { chromium } = require('playwright');
const sharp = require('sharp');
const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(process.argv[2] || '/tmp/potato-cohesion-audit');
const groups = process.argv.slice(3);
const baseline = { ...DEFAULT_STATE, hat: 'none', item: 'none', gesture: 'rest', bg: 'cream', pattern: 'solid', capText: '' };
await mkdir(out, { recursive: true });
const report = { date: new Date().toISOString(), sourceDigest: '', cases: 0, parts: 0, renderSize: 256, errors: [], circleFindings: [], visualReview: 'Not implied. Review representative PNGs separately at full size.' };
const source = await Promise.all(['surface.js','raster.js','fit-data.js','options.js','assets.js'].map(n => readFile(root + 'src/' + n)));
report.sourceDigest = createHash('sha256').update(Buffer.concat(source)).digest('hex');
const port = 6300 + Math.floor(Math.random() * 300);
const server = spawn(process.execPath, [root + 'scripts/serve.mjs', '--port', String(port)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => document.body.dataset.rendered === 'true');
  for (const [group, parts] of Object.entries(PARTS)) {
    if (groups.length && !groups.some(f => f === group || f.startsWith(group + '/'))) continue;
    const keys = group === 'body' ? ['all'] : Object.keys(parts);
    for (const key of keys) {
      if (groups.length && !groups.includes(group) && !groups.includes(`${group}/${key}`)) continue;
      const cases = Object.keys(OPTIONS.body).flatMap(body => Object.keys(OPTIONS.skin).map(skin => ({ ...baseline, body, skin, ...(group === 'body' ? {} : group === 'stickers' ? { item: 'laptop', stickers: [key] } : { [group]: key }) })));
      const result = await page.evaluate(async cases => {
        const { renderPotato } = await import('./src/raster.js');
        const { encodeState, decodeState } = await import('./src/state.js');
        const frames = [], findings = [];
        for (const state of cases) {
          const roundTrip = decodeState(encodeState(state));
          for (const key of Object.keys(state)) if (JSON.stringify(state[key]) !== JSON.stringify(roundTrip[key])) throw Error(`Share round trip: ${key}`);
          const c = await renderPotato(state, { size: 256, background: false });
          const ctx = c.getContext('2d'), pixels = ctx.getImageData(0, 0, 256, 256).data;
          let cropped = 0;
          for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (pixels[(y * 256 + x) * 4 + 3] > 180 && Math.hypot(x - 128, y - 128) > 127) cropped++;
          if (cropped > 8) findings.push({ body: state.body, skin: state.skin, cropped });
          ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#edf6f3'; ctx.fillRect(0, 0, 256, 256);
          frames.push(c.toDataURL());
        }
        return { frames, findings };
      }, cases);
      const layers = [];
      for (let i = 0; i < result.frames.length; i++) layers.push({ input: Buffer.from(result.frames[i].split(',')[1], 'base64'), left: i % 9 * 256, top: Math.floor(i / 9) * 256 });
      await sharp({ create: { width: 2304, height: 1536, channels: 4, background: '#edf6f3' } }).composite(layers).png().toFile(`${out}/${group}-${key}.png`);
      report.cases += cases.length; report.parts++;
      report.circleFindings.push(...result.findings.map(f => ({ group, key, ...f })));
      await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
      console.log(`${group}/${key}: ${report.cases} cases; ${result.findings.length} crop findings`);
    }
  }
  if (report.errors.length || report.circleFindings.length) process.exitCode = 1;
} finally { await browser.close(); server.kill(); }
