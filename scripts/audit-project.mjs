#!/usr/bin/env node
// Render real PNG compositions, not the legacy SVG renderer.
// Optional Playwright: node scripts/audit-project.mjs /tmp/audit inventory
// Modes: inventory, headwear, expressions, facial-hair, eyewear, poses,
// colors, hair, pairwise, backgrounds, details. Trailing filters: category or category/key
// for inventory, category for colors, category/key for the other modes.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { PARTS } from '../src/assets.js';
import { OPTIONS, DEFAULT_STATE, PRESETS, STICKERS } from '../src/options.js';
import { surprise } from '../src/surprise.js';
import { FIT } from '../src/fit-data.js';
import { pairwiseCases, verifyPairCoverage } from './pairwise.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(process.argv[2] || '/tmp/potato-project-audit');
const mode = process.argv[3] || 'inventory', filters = process.argv.slice(4);
const shapes = Object.keys(OPTIONS.body), skins = Object.keys(OPTIONS.skin);
const baseline = { ...DEFAULT_STATE, hat: 'none', item: 'none', gesture: 'rest', bg: 'cream', pattern: 'solid', capText: '' };
const batches = [];
let pairCoverage;
const add = (name, cases) => batches.push({ name, cases });
const frame = (label, patch) => ({ label, state: { ...baseline, ...patch } });
const crossBodies = (label, patch) => shapes.flatMap(body => skins.map(skin => frame(`${label} · ${body}/${skin}`, { body, skin, ...patch })));
if (mode === 'inventory') {
  for (const [group, options] of Object.entries(PARTS)) {
    if (filters.length && !filters.some(f => f === group || f.startsWith(group + '/'))) continue;
    if (group === 'body') { add('body', crossBodies('body', {})); continue; }
    for (const key of Object.keys(options)) {
      if (filters.length && !filters.includes(group) && !filters.includes(`${group}/${key}`)) continue;
      add(`${group}-${key}`, crossBodies(key, group === 'stickers' ? { item: 'laptop', stickers: [key] } : { [group]: key }));
    }
  }
} else if (mode === 'headwear') {
  for (const hat of Object.keys(OPTIONS.hat)) add(hat, shapes.flatMap((body, i) => Object.keys(OPTIONS.extra).map(extra => frame(`${hat}/${extra} · ${body}`, { body, skin: skins[(i * 2) % skins.length], hat, extra }))));
} else if (mode === 'expressions') {
  for (const mouth of Object.keys(OPTIONS.mouth)) add(mouth, Object.keys(OPTIONS.eyes).flatMap((eyes, i) => Object.keys(OPTIONS.brows).map((brows, j) => frame(`${eyes}/${brows}/${mouth}`, { mouth, eyes, brows, body: shapes[(i + j) % shapes.length], skin: skins[(i * 3 + j) % skins.length] }))));
} else if (mode === 'facial-hair') {
  for (const facialHair of Object.keys(OPTIONS.facialHair)) for (const neckwear of Object.keys(OPTIONS.neckwear)) add(`${facialHair}-${neckwear}`, shapes.flatMap((body, i) => Object.keys(OPTIONS.mouth).map(mouth => frame(`${mouth} · ${body}`, { body, skin: skins[(i * 2) % skins.length], facialHair, neckwear, mouth, eyes: 'wide', brows: 'raised' }))));
} else if (mode === 'eyewear') {
  for (const eyewear of Object.keys(OPTIONS.eyewear)) add(eyewear, shapes.flatMap((body, i) => Object.keys(OPTIONS.eyes).map(eyes => frame(`${eyes} · ${body}`, { body, skin: skins[(i * 2) % skins.length], eyewear, eyes }))));
} else if (mode === 'poses') {
  for (const item of Object.keys(OPTIONS.item)) add(item, shapes.flatMap((body, i) => Object.keys(OPTIONS.gesture).map(gesture => frame(`${item}/${gesture} · ${body}`, { body, skin: skins[(i * 2) % skins.length], item, gesture, hat: gesture === 'salute' ? 'backwardCap' : 'none' }))));
} else if (mode === 'colors') {
  for (const [group, keys] of Object.entries(FIT.recolor)) {
    if (filters.length && !filters.includes(group)) continue;
    for (const key of keys) add(`${group}-${key}`, shapes.flatMap((body, i) => Object.keys(OPTIONS.hatColor).map(hatColor => frame(`${hatColor} · ${body}`, { body, skin: skins[(i * 2) % skins.length], [group]: key, hatColor, capText: 'A+W' }))));
  }
} else if (mode === 'hair') {
  for (const hair of Object.keys(PARTS.hair)) {
    add(`${hair}-hats`, shapes.flatMap((body, i) => Object.keys(OPTIONS.hat).map(hat => frame(`${body}/${hat}`, { body, skin: skins[i % skins.length], hair, hat, eyes: 'almond', brows: 'softArch', mouth: 'smile' }))));
    add(`${hair}-extras`, shapes.flatMap((body, i) => Object.keys(OPTIONS.extra).map(extra => frame(`${body}/${extra}`, { body, skin: skins[(i * 2) % skins.length], hair, extra }))));
    add(`${hair}-jewelry`, shapes.flatMap((body, i) => Object.keys(OPTIONS.jewelry).flatMap(jewelry => Object.keys(OPTIONS.neckwear).map(neckwear => frame(`${body}/${jewelry}/${neckwear}`, { body, skin: skins[(i * 2) % skins.length], hair, jewelry, neckwear, eyes: 'almond', brows: 'softArch', mouth: 'smile' })))));
    add(`${hair}-colors`, shapes.flatMap((body, i) => Object.keys(OPTIONS.hairColor).map(hairColor => frame(`${body}/${hairColor}`, { body, skin: skins[(i * 2) % skins.length], hair, hairColor }))));
  }
} else if (mode === 'pairwise') {
  const factors = Object.fromEntries(Object.entries(OPTIONS).map(([key, values]) => [key, Object.keys(values)]));
  const rows = pairwiseCases(factors);
  pairCoverage = verifyPairCoverage(factors, rows);
  if (pairCoverage.missing.length) throw Error('Covering array has missing pairs');
  for (let i = 0; i < rows.length; i += 56) add(`outfits-${i}`, rows.slice(i, i + 56).map((state, j) => frame(`pairwise ${i + j + 1}`, state)));
} else if (mode === 'backgrounds') {
  for (const pattern of Object.keys(OPTIONS.pattern)) add(pattern, Object.keys(OPTIONS.bg).map(bg => frame(`${pattern}/${bg}`, { ...DEFAULT_STATE, pattern, bg })));
} else if (mode === 'details') {
  add('salute-hats', Object.keys(OPTIONS.hat).flatMap(hat => shapes.map(body => frame(`${hat} · ${body}`, { body, hat, gesture: 'salute', item: 'laptop' }))));
  add('text', shapes.flatMap(body => ['', 'A', 'A+W', 'WWW'].map(capText => frame(`cap ${capText || 'empty'} · ${body}`, { body, hat: 'backwardCap', capText })).concat(['', 'I', 'POTATO!', 'WWWWWWWWWW'].map(sign => frame(`sign ${sign || 'empty'} · ${body}`, { body, item: 'sign', sign })))));
  add('sticker-layouts', shapes.flatMap(body => Array.from({ length: 7 }, (_, count) => frame(`${count} stickers · ${body}`, { body, item: 'laptop', stickers: Object.keys(STICKERS).slice(0, count) }))));
  add('presets', Object.entries(PRESETS).flatMap(([key, preset]) => shapes.map(body => frame(`${key} · ${body}`, { ...DEFAULT_STATE, body, ...preset.patch }))));
  let seed = 20261101;
  const rng = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  add('random-outfits', Array.from({ length: 112 }, (_, i) => ({ label: `outfit ${i + 1}`, state: surprise(rng) })));
} else throw Error(`Unknown audit mode: ${mode}`);

await mkdir(out, { recursive: true });
const report = { mode, automatedCases: 0, exports: 0, thumbnails: 0, maxExportBytes: 0, circleFindings: [], sheets: [], errors: [], visualReview: 'pending; rendering success is not visual approval' };
if (pairCoverage) report.pairCoverage = pairCoverage;
const port = 5700 + Math.floor(Math.random() * 600);
const server = spawn(process.execPath, [root + 'scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => document.body.dataset.rendered === 'true');
  for (const batch of batches) {
    if (filters.length && !['inventory', 'colors'].includes(mode)) {
      batch.cases = batch.cases.filter(({ state }) => filters.some(f => { const [group, key] = f.split('/'); return state[group] === key; }));
      if (!batch.cases.length) continue;
    }
    const result = await page.evaluate(async ({ cases, inventory }) => {
      const { renderPotato, exportPng } = await import('./src/raster.js');
      const { encodeState, decodeState } = await import('./src/state.js');
      const result = { frames: [], maxExportBytes: 0, circleFindings: [], exports: 0, thumbnails: 0 };
      for (const { label, state } of cases) {
        const roundTrip = decodeState(encodeState(state));
        for (const [key, value] of Object.entries(state)) if (JSON.stringify(roundTrip[key]) !== JSON.stringify(value)) throw Error(`Share mismatch: ${label}/${key}`);
        const canvas = await renderPotato(state, { size: 512 });
        const small = document.createElement('canvas'); small.width = small.height = 200;
        small.getContext('2d').drawImage(canvas, 0, 0, 200, 200);
        result.frames.push({ label, image: small.toDataURL() });
        const foreground = await renderPotato(state, { size: 256, background: false });
        const pixels = foreground.getContext('2d').getImageData(0, 0, 256, 256).data;
        let clipped = 0;
        for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (pixels[(y * 256 + x) * 4 + 3] > 180 && Math.hypot(x - 128, y - 128) > 127) clipped++;
        if (clipped > 8) result.circleFindings.push({ label, opaquePixelsOutsideCircle: clipped, state });
        if (inventory) {
          const blob = await exportPng(state);
          result.exports++; result.maxExportBytes = Math.max(result.maxExportBytes, blob.size);
          if (blob.size >= 1000000) throw Error(`512 px export exceeds 1 MB: ${label}`);
          await renderPotato(state, { size: 96, thumbs: true }); result.thumbnails++;
        }
      }
      return result;
    }, { cases: batch.cases, inventory: mode === 'inventory' });
    for (let offset = 0; offset < result.frames.length; offset += 56) {
      const frames = result.frames.slice(offset, offset + 56), cols = mode === 'inventory' ? 9 : 7;
      const sheet = await browser.newPage({ viewport: { width: cols * 204, height: 38 + Math.ceil(frames.length / cols) * 226 } });
      await sheet.setContent(`<body style="margin:0;background:#edf6f3;color:#123d40;font:11px system-ui"><h2 style="margin:6px 10px;height:26px">${mode} / ${batch.name}</h2><div style="display:grid;grid-template-columns:repeat(${cols},204px)">${frames.map(f => `<figure style="margin:0;text-align:center;height:226px"><img src="${f.image}" style="width:200px;height:200px;border-radius:50%"><figcaption>${f.label}</figcaption></figure>`).join('')}</div></body>`);
      const name = `${batch.name}-${offset}.png`;
      await sheet.screenshot({ path: `${out}/${name}` }); await sheet.close(); report.sheets.push(name);
    }
    report.automatedCases += batch.cases.length;
    report.exports += result.exports; report.thumbnails += result.thumbnails;
    report.maxExportBytes = Math.max(report.maxExportBytes, result.maxExportBytes);
    report.circleFindings.push(...result.circleFindings);
    await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
    console.log(`${batch.name}: ${batch.cases.length} (${report.automatedCases} total), crop findings ${result.circleFindings.length}`);
  }
  if (report.errors.length) throw Error(report.errors.join('\n'));
  console.log(JSON.stringify({ ...report, sheets: report.sheets.length, circleFindings: report.circleFindings.length }));
} finally { await browser.close(); server.kill(); }
