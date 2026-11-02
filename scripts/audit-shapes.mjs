#!/usr/bin/env node
// Regression for misleading body names and inconsistent whole-character sizes.
// Compare real raster output at one camera scale; do not auto-crop each body.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { OPTIONS, BODY_PROFILES, DEFAULT_STATE, characterLook } from '../src/options.js';
const require = createRequire(import.meta.url), { chromium } = require('playwright'), sharp = require('sharp');
const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(process.argv[2] || '/tmp/potato-shape-audit');
await mkdir(out, { recursive: true });
const port = 7000 + Math.floor(Math.random() * 300);
const server = spawn(process.execPath, [root + 'scripts/serve.mjs', '--port', String(port)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => document.body.dataset.rendered === 'true');
  const rows = [];
  for (const character of ['male', 'female']) for (const body of Object.keys(OPTIONS.body)) for (const skin of Object.keys(OPTIONS.skin)) {
    rows.push({ ...characterLook(DEFAULT_STATE, character), body, skin, hat: 'none', item: 'none', gesture: 'rest' });
  }
  const galleryCount = rows.length;
  for (const character of ['male', 'female']) for (const body of ['classic', 'long']) for (const skin of Object.keys(OPTIONS.skin)) for (const item of Object.keys(OPTIONS.item).filter(k => k !== 'none')) {
    rows.push({ ...characterLook(DEFAULT_STATE, character), body, skin, hat: 'none', item, gesture: 'rest' });
  }
  const results = await page.evaluate(async rows => {
    const { renderPotato } = await import('./src/raster.js');
    const results = [];
    for (const state of rows) {
      const canvas = await renderPotato(state, { size: 512, background: false });
      const ctx = canvas.getContext('2d'), { data } = ctx.getImageData(0, 0, 512, 512);
      let left = 512, top = 512, right = 0, bottom = 0;
      for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) if (data[(y * 512 + x) * 4 + 3] > 200) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      ctx.resetTransform(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#edf6f3'; ctx.fillRect(0, 0, 512, 512);
      results.push({ state, bounds: { left, top, right, bottom, width: right - left, height: bottom - top }, png: canvas.toDataURL() });
    }
    return results;
  }, rows);
  const proportions = [];
  for (const character of ['male', 'female']) for (const skin of Object.keys(OPTIONS.skin)) for (const item of Object.keys(OPTIONS.item)) {
    const find = body => results.find(r => r.state.body === body && r.state.skin === skin && r.state.character === character && r.state.item === item).bounds;
    const classic = find('classic'), petite = find('long');
    const ratio = { character, skin, item, width: petite.width / classic.width, height: petite.height / classic.height };
    assert.ok(ratio.width < (item === 'none' ? .8 : .9), `Petite is not narrower: ${character}/${skin}/${item}`);
    assert.ok(ratio.height < .9, `Petite is not shorter: ${character}/${skin}/${item}`);
    proportions.push(ratio);
  }
  const sheets = [];
  for (const character of ['male', 'female']) {
    const selected = results.slice(0, galleryCount).filter(r => r.state.character === character), layers = [];
    for (let i = 0; i < selected.length; i++) layers.push({ input: await sharp(Buffer.from(selected[i].png.split(',')[1], 'base64')).resize(256).png().toBuffer(), left: i % 9 * 256, top: Math.floor(i / 9) * 256 });
    const name = `${character}-all-shapes-skins.png`;
    await sharp({ create: { width: 2304, height: 1536, channels: 4, background: '#edf6f3' } }).composite(layers).png().toFile(`${out}/${name}`); sheets.push(name);
  }
  const gallery = [];
  for (const [i, body] of Object.keys(OPTIONS.body).entries()) {
    const label = OPTIONS.body[body];
    gallery.push({ input: Buffer.from(`<svg width="256" height="48"><text x="128" y="31" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#123d40">${label}</text></svg>`), left: i * 256, top: 0 });
    for (const [j, character] of ['male', 'female'].entries()) {
      const row = results.find(r => r.state.body === body && r.state.skin === 'russet' && r.state.character === character);
      gallery.push({ input: await sharp(Buffer.from(row.png.split(',')[1], 'base64')).resize(256).png().toBuffer(), left: i * 256, top: 48 + j * 256 });
    }
  }
  await sharp({ create: { width: 1536, height: 560, channels: 4, background: '#edf6f3' } }).composite(gallery).png().toFile(`${out}/body-comparison.png`);
  assert.equal(errors.length, 0);
  const report = { date: new Date().toISOString(), cases: rows.length, profiles: BODY_PROFILES, proportions, errors, sheets, visualReview: 'Inspect sheets separately; proportions are measured from final output at identical framing.' };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ cases: rows.length, comparisons: proportions.length, maxWidthRatio: Math.max(...proportions.map(r => r.width)), maxHeightRatio: Math.max(...proportions.map(r => r.height)), errors }));
} finally { await browser.close(); server.kill(); }
