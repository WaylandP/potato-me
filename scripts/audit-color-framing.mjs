#!/usr/bin/env node
// Real-Chromium regression for camera stability across original PNGs and
// recolored canvases. Optional Playwright/Sharp tooling, not a runtime dependency.
// node scripts/audit-color-framing.mjs /tmp/potato-color-framing
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright'), sharp = require('sharp');
const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(process.argv[2] || '/tmp/potato-color-framing');
const port = process.env.POTATO_AUDIT_PORT || '7904';
await mkdir(output, { recursive: true });
async function sourceFiles(directory) {
  const entries = await readdir(join(root, directory), { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? sourceFiles(join(directory, entry.name)) : entry.name.endsWith('.js') ? [join(directory, entry.name)] : []))).flat();
}
const files = [...await sourceFiles('src'), 'assets/manifest.json', 'assets/parts/hair/bun.png', 'assets/thumbs/hair/bun.png'].sort();
async function sourceHashes() {
  return Object.fromEntries(await Promise.all(files.map(async file => [file, createHash('sha256').update(await readFile(join(root, file))).digest('hex')])));
}
const report = { started: new Date().toISOString(), scope: 'Bun source/copy camera equivalence and rendered alpha across six bodies and all six hair colors, with full-source and actual-thumbnail inputs; 12 additional native outputs. Automated equivalence is separate from manual visual review.', sourceHashes: await sourceHashes(), cases: [], diagnostics: [], errors: [], findings: [], proofs: [], sheets: [], visualInspection: 'Pending.' };
const server = spawn(process.execPath, [join(root, 'scripts/serve.mjs'), '--port', port], { stdio: ['ignore', 'pipe', 'pipe'] });
const serverReady = new Promise((resolve, reject) => {
  let stdout = '', stderr = '';
  const cleanup = () => {
    clearTimeout(timer);
    server.off('error', failed); server.off('exit', exited);
    server.stdout.off('data', output); server.stderr.off('data', diagnostic);
  };
  const failed = error => { cleanup(); reject(error); };
  const exited = (code, signal) => failed(new Error(`Local server exited before listening (${code ?? signal}): ${stderr}`));
  const diagnostic = chunk => { stderr = (stderr + chunk).slice(-4096); };
  const output = chunk => {
    stdout = (stdout + chunk).slice(-4096);
    if (stdout.includes(`potato-me is cooking at http://localhost:${port}/`)) { cleanup(); resolve(); }
  };
  const timer = setTimeout(() => failed(new Error(`Local server did not start on port ${port}: ${stderr}`)), 10000);
  server.on('error', failed); server.on('exit', exited);
  server.stdout.on('data', output); server.stderr.on('data', diagnostic);
});
let browser;
try {
  await serverReady;
  browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(`http://localhost:${port}/?shot=sheet`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.dataset.rendered === 'true');
  const results = await page.evaluate(async () => {
    const raster = await import('./src/raster.js'), surface = await import('./src/surface.js');
    const { DEFAULT_STATE, OPTIONS } = await import('./src/options.js');
    const bodies = Object.keys(OPTIONS.body), colors = Object.keys(OPTIONS.hairColor);
    const base = { ...DEFAULT_STATE, hair: 'bun', hat: 'none', hatColor: 'red', item: 'none', gesture: 'rest', eyewear: 'none', neckwear: 'none', jewelry: 'none', extra: 'none', facialHair: 'none', capText: '', stickers: [] };
    const images = new Map(), cases = [], diagnostics = [], findings = [], frames = [];
    const load = async src => { if (!images.has(src)) { const img = new Image(); img.src = src; await img.decode(); images.set(src, img); } return images.get(src); };
    const copy = img => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); return c; };
    const alpha = canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const compare = (a, b) => { let changedPixels = 0, maxDelta = 0; for (let i = 3; i < a.length; i += 4) { const delta = Math.abs(a[i] - b[i]); if (delta > 2) changedPixels++; maxDelta = Math.max(maxDelta, delta); } return { changedPixels, maxDelta }; };
    for (const thumbs of [false, true]) {
      const original = await load(raster.partSrc('hair', 'bun', thumbs)), nativeCopy = copy(original), tinted = copy(original);
      const context = tinted.getContext('2d'), pixels = context.getImageData(0, 0, tinted.width, tinted.height);
      for (let i = 0; i < pixels.data.length; i += 4) if (pixels.data[i + 3]) pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 20;
      context.putImageData(pixels, 0, 0);
      surface.registerFramingSource(nativeCopy, original); surface.registerFramingSource(tinted, original);
      for (const [index, body] of bodies.entries()) {
        const state = { ...base, body, skin: ['gold', 'blue', 'purple', 'ghost', 'red', 'zombie'][index] };
        const bodyImage = await load(raster.partSrc('body', `${body}-${state.skin}`, thumbs));
        const bodySurface = surface.bodySurface(bodyImage, body), layer = raster.layersFor(state).find(layer => layer.group === 'hair');
        const transform = surface.surfaceTransform(layer, original, bodySurface, state);
        const camera = {}, worn = {};
        for (const [name, img] of Object.entries({ original, nativeCopy, tinted })) {
          camera[name] = surface.headFrame([{ ...layer, img, transform }]);
          const wearer = surface.withHairSurface(bodySurface, img, 'bun', transform);
          worn[name] = { top: wearer.hairTop, rows: Array.from({ length: 256 }, (_, y) => wearer.hairRow(y * 4)) };
        }
        const frameEqual = JSON.stringify(camera.original) === JSON.stringify(camera.nativeCopy) && JSON.stringify(camera.original) === JSON.stringify(camera.tinted);
        const wearerEqual = JSON.stringify(worn.original) === JSON.stringify(worn.nativeCopy) && JSON.stringify(worn.original) === JSON.stringify(worn.tinted);
        diagnostics.push({ body, thumbs, camera, frameEqual, wearerEqual });
        if (!frameEqual || !wearerEqual) findings.push({ body, thumbs, check: 'original-copy-geometry', frameEqual, wearerEqual });
        for (const size of thumbs ? [256] : [256, 1024]) {
          let reference;
          for (const hairColor of size === 1024 ? ['chestnut', 'black'] : colors) {
            const canvas = await raster.renderPotato({ ...state, hairColor }, { size, thumbs, background: false });
            const data = alpha(canvas), delta = reference ? compare(reference, data) : null;
            const id = `${body}-${hairColor}-${thumbs ? 'thumbs' : 'full'}-${size}`;
            if (!reference) reference = new Uint8ClampedArray(data);
            cases.push({ id, state: { ...state, hairColor }, size, thumbs, alphaDifferenceFromChestnut: delta });
            if (delta?.changedPixels) findings.push({ id, check: 'color-changes-rendered-alpha', ...delta });
            const ctx = canvas.getContext('2d'); ctx.resetTransform(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#edf6f3'; ctx.fillRect(0, 0, size, size);
            frames.push({ id, body, hairColor, size, thumbs, url: canvas.toDataURL('image/png') });
          }
        }
      }
    }
    return { cases, diagnostics, findings, frames };
  });
  report.cases = results.cases; report.diagnostics = results.diagnostics; report.findings = results.findings;
  for (const frame of results.frames.filter(frame => frame.size === 1024)) {
    const file = `${frame.id}.png`; await writeFile(join(output, file), Buffer.from(frame.url.split(',')[1], 'base64')); report.proofs.push(file);
  }
  for (const thumbs of [false, true]) {
    const frames = results.frames.filter(frame => frame.size === 256 && frame.thumbs === thumbs), composites = [];
    for (const [index, frame] of frames.entries()) {
      const left = index % 6 * 256, top = Math.floor(index / 6) * 280;
      composites.push({ input: Buffer.from(frame.url.split(',')[1], 'base64'), left, top });
      composites.push({ input: Buffer.from(`<svg width="256" height="24"><rect width="100%" height="100%" fill="#dce7e3"/><text x="5" y="17" font-family="sans-serif" font-size="13">${frame.body} / ${frame.hairColor}</text></svg>`), left, top: top + 256 });
    }
    const file = `bun-${thumbs ? 'thumbs' : 'full'}-palette.png`;
    await sharp({ create: { width: 1536, height: 1680, channels: 4, background: '#edf6f3' } }).composite(composites).png().toFile(join(output, file)); report.sheets.push(file);
  }
} catch (error) {
  report.errors.push(error.stack || error.message);
} finally {
  await browser?.close(); server.kill();
  report.finishedSourceHashes = await sourceHashes();
  report.sourceFilesUnchangedDuringRun = JSON.stringify(report.sourceHashes) === JSON.stringify(report.finishedSourceHashes);
  report.status = report.errors.length || report.findings.length || !report.sourceFilesUnchangedDuringRun ? 'failed' : 'passed';
  report.completed = new Date().toISOString();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ status: report.status, cases: report.cases.length, diagnostics: report.diagnostics.length, findings: report.findings, errors: report.errors, output }));
if (report.status !== 'passed') process.exitCode = 1;
