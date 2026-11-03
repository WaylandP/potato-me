#!/usr/bin/env node
// Focused grip review using the actual Chromium renderer. Optional development
// tools: Playwright and Sharp; neither is a production dependency.
//
// node scripts/audit-grips.mjs <output-dir> <native|matrix|inspiration|all> [--plan]
// CHROME_EXECUTABLE=/path/to/chromium AUDIT_PORT=7906
// AUDIT_GROUPS=item,gesture,inspiration AUDIT_MATCH=book AUDIT_LIMIT=6
// Use separate output directories/ports for concurrent subset jobs. Filters are
// explicit in spec.json/report.json and never count as the complete 595 cases.
// Render, root-contact and crop checks do NOT establish a plausible grasp;
// anatomy, finger opposition and support require inspection of the saved art.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { OPTIONS, DEFAULT_STATE, BODY_PROFILES } from '../src/options.js';
import { PARTS } from '../src/assets.js';
import { normalizeState } from '../src/state.js';
import { drawableState, layersFor, partSrc } from '../src/raster.js';
import { INSPIRATION_LOOKS } from '../src/inspiration.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2), positional = args.filter(arg => !arg.startsWith('--'));
const mode = positional[1] || 'all', planOnly = args.includes('--plan');
if (!positional[0] || positional.length > 2 || args.some(arg => arg.startsWith('--') && arg !== '--plan') || !['native', 'matrix', 'inspiration', 'all'].includes(mode)) {
  console.error('usage: node scripts/audit-grips.mjs <output-dir> <native|matrix|inspiration|all> [--plan]');
  process.exit(2);
}
const output = resolve(positional[0]);
const bodies = Object.keys(OPTIONS.body), skins = Object.keys(OPTIONS.skin);
const items = Object.keys(PARTS.item), gestures = Object.keys(PARTS.gesture);
const affectedIdeas = ['tiny-wizard', 'moon-mood', 'book-club', 'cozy-creature'];
const baseline = normalizeState({ ...DEFAULT_STATE, body: 'classic', hair: 'none', hat: 'none', hatColor: 'red', hairColor: 'chestnut', item: 'none', gesture: 'rest', eyewear: 'none', neckwear: 'none', jewelry: 'none', extra: 'none', facialHair: 'none', capText: '', stickers: [], bg: 'cream', pattern: 'solid' });
// Independently observed source-art landmarks, not values read from FIT. These
// diagnose arm direction/attachment only; they cannot certify a plausible grip.
const bookLandmarks = {
  source: 'assets/parts/item/book.png',
  sourceSha256: 'b0c3626240066b250e3f1f3301d2fa0fda98cf7285033ed7bec9011cf47129fa',
  shoulder: [370, 650],
  points: [
    { name: 'palm', point: [226, 747] },
    { name: 'finger-pad-1', point: [100, 676] },
    { name: 'finger-pad-2', point: [126, 688] },
    { name: 'finger-pad-3', point: [151, 709] },
    { name: 'finger-pad-4', point: [179, 734] },
    { name: 'spine-bottom', point: [197, 728] },
    { name: 'cover-center', point: [215, 650] },
  ],
};
const crop = [0, 0, 1024, 1024], cohorts = [];
function add(name, subset, group, entries, options) {
  cohorts.push({ name, subset, group, count: entries.length });
  return entries.map(entry => ({ id: `${name}/${entry.label}`, cohort: name, subset, group, ...entry, state: normalizeState(entry.state), options: { crop, ...options } }));
}
const allCases = [
  ...add('native-item', 'native', 'item', items.map(item => ({ label: `${item}-classic-blue`, state: { ...baseline, skin: 'blue', item } })), { api: 'renderPotato', size: 1024, thumbs: false, background: false, saveNative: true }),
  ...add('native-gesture', 'native', 'gesture', gestures.map(gesture => ({ label: `${gesture}-classic-purple`, state: { ...baseline, skin: 'purple', gesture } })), { api: 'renderPotato', size: 1024, thumbs: false, background: false, saveNative: true }),
  ...['book', 'donut', 'coffee', 'sign', 'trophy'].flatMap(item => [false, true].flatMap(thumbs => add(`matrix-${item}-${thumbs ? 'thumbs' : 'full-export'}`, 'matrix', 'item', bodies.flatMap(body => skins.map(skin => ({ label: `${body}-${skin}`, state: { ...baseline, body, skin, item } }))), { api: thumbs ? 'renderPotato' : 'exportPng', size: thumbs ? 192 : 512, thumbs, background: !thumbs, saveNative: false }))),
  ...add('inspiration-thumbs', 'inspiration', 'inspiration', INSPIRATION_LOOKS.map(idea => ({ label: idea.id, inspirationId: idea.id, inspirationName: idea.name, state: idea.state })), { api: 'renderPotato', size: 192, thumbs: true, background: true, saveNative: false }),
  ...add('native-inspiration', 'native', 'inspiration', affectedIdeas.map(id => {
    const idea = INSPIRATION_LOOKS.find(entry => entry.id === id);
    if (!idea) throw Error(`Required inspiration look missing: ${id}`);
    return { label: idea.id, inspirationId: idea.id, inspirationName: idea.name, state: idea.state };
  }), { api: 'renderPotato', size: 1024, thumbs: false, background: true, saveNative: true }),
];
const catalogCounts = { items: items.length, gestures: gestures.length, bodies: bodies.length, skins: skins.length, inspiration: INSPIRATION_LOOKS.length };
if (items.length !== 19 || gestures.length !== 14 || bodies.length !== 6 || skins.length !== 9 || INSPIRATION_LOOKS.length !== 18 || allCases.length !== 595) throw Error(`Grip audit catalog changed; review the explicit 595-case plan: ${JSON.stringify(catalogCounts)}`);
if (new Set(allCases.map(entry => entry.id)).size !== allCases.length) throw Error('Duplicate audit case IDs');
const groups = process.env.AUDIT_GROUPS?.split(',').map(value => value.trim()).filter(Boolean) || [];
if (groups.some(group => !['item', 'gesture', 'inspiration'].includes(group))) throw Error('AUDIT_GROUPS accepts item,gesture,inspiration');
const match = process.env.AUDIT_MATCH || null, limit = Number(process.env.AUDIT_LIMIT || 0);
if (!Number.isInteger(limit) || limit < 0) throw Error('AUDIT_LIMIT must be a nonnegative integer');
const modeCases = allCases.filter(entry => mode === 'all' || entry.subset === mode);
let cases = modeCases.filter(entry => (!groups.length || groups.includes(entry.group)) && (!match || entry.id.includes(match)));
if (limit) cases = cases.slice(0, limit);
if (!cases.length) throw Error('No audit cases selected');
const filters = { groups, match, limit };
const spec = { schemaVersion: 1, mode, catalogCounts, fullPlanCount: allCases.length, modeUnfilteredCount: modeCases.length, expectedFilteredCount: cases.length, filters, cohorts, cases, bookLandmarks, coverage: 'Only these exact states. Native proof review and plausible anatomy are manual; an automated pass is not artistic acceptance.' };
await mkdir(output, { recursive: true });
await writeFile(join(output, 'spec.json'), JSON.stringify(spec, null, 2) + '\n');
if (planOnly) {
  console.log(JSON.stringify({ mode, fullPlanCount: allCases.length, modeUnfilteredCount: modeCases.length, expectedFilteredCount: cases.length, filters, cohorts, output }));
  process.exit(0);
}

const sha256 = data => createHash('sha256').update(data).digest('hex');
const safe = name => name.replace(/[^A-Za-z0-9_-]/g, '-');
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(file));
    else if (/\.(js|css)$/.test(entry.name)) files.push(file);
  }
  return files;
}
async function sourceList() { return [...await sourceFiles('src'), 'assets/manifest.json', 'index.html', 'package.json', 'scripts/serve.mjs', 'scripts/audit-grips.mjs'].sort(); }
async function fingerprint(files) {
  const records = [];
  for (const file of files) {
    try { const data = await readFile(join(root, file)); records.push({ file, bytes: data.length, sha256: sha256(data) }); }
    catch (error) { records.push({ file, error: error.code || error.message }); }
  }
  return { digest: sha256(JSON.stringify(records)), files: records };
}
const assetSet = new Set(['assets/fonts/Fredoka.ttf']);
for (const entry of cases) {
  const state = drawableState(entry.state), thumbs = entry.options.thumbs;
  for (const layer of layersFor(state)) assetSet.add(partSrc(layer.group, layer.key, thumbs));
  for (const sticker of state.stickers) if (PARTS.stickers?.[sticker]) assetSet.add(partSrc('stickers', sticker, thumbs));
  if (BODY_PROFILES[state.body].size < 1) assetSet.add(partSrc('body', `classic-${state.skin}`, thumbs));
}
const assetFiles = [...assetSet].sort();
const port = Number(process.env.AUDIT_PORT || 7906);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('AUDIT_PORT must be an integer from 1024 to 65535');
const report = { ...spec, started: new Date().toISOString(), status: 'running', port, cases: [], errors: [], findings: [], proofs: [], sheets: [], visualInspection: 'Pending. Successful exports, round-trips, root contact and crop checks do not establish thumb/finger opposition, wrist anatomy or object support.', checks: { output: 'Full 512 cases call actual exportPng, which renders full source PNGs at1024 before downsampling. 192 cases use actual thumbnail PNG inputs. All output dimensions and PNG SHA256 are recorded.', crop: 'Character-only alpha measured before review backgrounds; background-bearing outputs have a separately recorded transparent probe. Circle bounds are a framing diagnostic, not an anatomy test.', geometry: 'Actual source alpha and exported bodySurface/surfaceTransform/drawTransformed functions. Root overlap is an attachment diagnostic only.', share: 'Complete normalized state encoded, decoded and compared; drawable fallback changes are failures.' } };
const checkpoint = () => writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
let browser, server, closing = false, activeId = null, sharp;
let serverStdout = '', serverStderr = '';
const errorRecord = (stage, error, extra = {}) => ({ stage, ...extra, message: error?.message || String(error), ...(error?.stack ? { stack: error.stack } : {}) });
function startServer() {
  server = spawn(process.execPath, [join(root, 'scripts/serve.mjs'), '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', chunk => { serverStdout = (serverStdout + chunk).slice(-8192); });
  server.stderr.on('data', chunk => { serverStderr = (serverStderr + chunk).slice(-8192); });
  server.on('exit', (code, signal) => {
    report.serverExit = { code, signal, expectedShutdown: closing };
    if (!closing && report.serverReady) report.errors.push({ stage: 'server-runtime', message: 'Owned server exited during audit', code, signal, id: activeId });
  });
  return new Promise((resolveReady, reject) => {
    const cleanup = () => { clearTimeout(timer); server.off('error', failed); server.off('exit', exited); server.stdout.off('data', listening); };
    const failed = error => { cleanup(); reject(error); };
    const exited = (code, signal) => failed(new Error(`Owned server exited before listening (${code ?? signal}): ${serverStderr}`));
    const listening = () => {
      if (serverStdout.includes(`potato-me is cooking at http://localhost:${port}/`)) { cleanup(); report.serverReady = true; report.serverPid = server.pid; resolveReady(); }
    };
    const timer = setTimeout(() => failed(new Error(`Owned server did not start on port ${port}: ${serverStderr}`)), 10000);
    server.on('error', failed); server.on('exit', exited); server.stdout.on('data', listening);
  });
}
async function writeSheet(name, frames, kind, columns) {
  if (!frames.length) return;
  const cell = kind === 'contact' ? 256 : 192, labelHeight = 42, composite = [];
  for (const [index, frame] of frames.entries()) {
    const left = index % columns * cell, top = Math.floor(index / columns) * (cell + labelHeight);
    let art = sharp(frame.png);
    let contactCrop = null;
    if (kind === 'contact') {
      const world = frame.group === 'gesture' ? [500, 280, 524, 650] : [0, 280, 540, 650];
      const scale = frame.options.size / 1024;
      contactCrop = { left: Math.floor(world[0] * scale), top: Math.floor(world[1] * scale), width: Math.floor(world[2] * scale), height: Math.floor(world[3] * scale) };
      art = art.extract(contactCrop);
    }
    const input = await art.resize(cell, cell, { fit: 'contain', background: '#edf6f3' }).flatten({ background: '#edf6f3' }).png().toBuffer();
    composite.push({ input, left, top });
    const label = frame.inspirationName || `${frame.state.body} / ${frame.state.skin}`;
    const detail = frame.inspirationId || `${frame.group === 'gesture' ? frame.state.gesture : frame.state.item} · ${frame.options.size} ${frame.options.thumbs ? 'thumbs' : 'full'}`;
    composite.push({ input: Buffer.from(`<svg width="${cell}" height="42"><rect width="100%" height="100%" fill="#e3e7e6"/><text x="5" y="16" font-family="sans-serif" font-size="12">${xml(label)}</text><text x="5" y="34" font-family="sans-serif" font-size="11">${xml(detail)}</text></svg>`), left, top: top + cell });
    frame.sheetCells ||= [];
    frame.sheetCells.push({ kind, column: index % columns, row: Math.floor(index / columns), sourceCropPixels: contactCrop });
  }
  const file = `${safe(name)}.png`, width = columns * cell, height = Math.ceil(frames.length / columns) * (cell + labelHeight);
  await sharp({ create: { width, height, channels: 4, background: '#edf6f3' } }).composite(composite).png().toFile(join(output, file));
  report.sheets.push({ file, kind, width, height, cellSize: cell, caseIds: frames.map(frame => frame.id), cells: frames.map(frame => ({ id: frame.id, ...frame.sheetCells.at(-1) })), sha256: sha256(await readFile(join(output, file))) });
}
try {
  report.startSources = await fingerprint(await sourceList());
  report.startAssets = await fingerprint(assetFiles);
  const missing = [...report.startSources.files, ...report.startAssets.files].filter(file => file.error);
  if (missing.length) throw Error(`Missing audit inputs: ${JSON.stringify(missing)}`);
  await checkpoint();
  const require = createRequire(import.meta.url), { chromium } = require('playwright');
  sharp = require('sharp');
  await startServer();
  browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {});
  report.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', error => report.errors.push(errorRecord('page', error, { id: activeId })));
  page.on('response', response => { if (!closing && response.status() >= 400) report.errors.push({ stage: 'http', id: activeId, status: response.status(), url: response.url() }); });
  page.on('requestfailed', request => { if (!closing) report.errors.push({ stage: 'request', id: activeId, url: request.url(), failure: request.failure() }); });
  const baseURL = `http://localhost:${port}`;
  // A same-origin audit document avoids unrelated UI/random shelf work. Modules,
  // assets and the optional lettering font still come from our owned server.
  await page.route(`${baseURL}/__grip-audit__`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><style>@font-face{font-family:Fredoka;src:url(/assets/fonts/Fredoka.ttf);font-weight:100 900}</style><title>Grip audit</title>' }));
  await page.goto(`${baseURL}/__grip-audit__`);
  await page.evaluate(async bookLandmarks => {
    const raster = await import('/src/raster.js'), surfaceApi = await import('/src/surface.js'), stateApi = await import('/src/state.js');
    const canvas = size => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
    const dataOf = c => c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
    const finite = value => typeof value === 'number' ? Number.isFinite(value) : Array.isArray(value) ? value.every(finite) : value && typeof value === 'object' ? Object.values(value).every(finite) : true;
    const bodyData = new WeakMap();
    const imagePixels = img => { if (!bodyData.has(img)) { const c = canvas(256); c.getContext('2d').drawImage(img, 0, 0, 256, 256); bodyData.set(img, dataOf(c)); } return bodyData.get(img); };
    const alpha = (data, x, y) => { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= 256 || y >= 256 ? 0 : data[(y * 256 + x) * 4 + 3]; };
    const blobURL = blob => new Promise((resolveURL, reject) => { const reader = new FileReader(); reader.onload = () => resolveURL(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
    window.auditGrip = async entry => {
      const begun = performance.now(), planned = stateApi.normalizeState(entry.state), state = raster.drawableState(planned), options = entry.options, findings = [], metrics = {};
      const hash = stateApi.encodeState(planned), roundTrip = stateApi.decodeState(hash);
      const shareMismatches = Object.keys(planned).filter(key => JSON.stringify(planned[key]) !== JSON.stringify(roundTrip[key]));
      if (shareMismatches.length) findings.push({ check: 'share-roundtrip', keys: shareMismatches });
      const fallbackKeys = Object.keys(planned).filter(key => JSON.stringify(planned[key]) !== JSON.stringify(state[key]));
      if (fallbackKeys.length) findings.push({ check: 'drawable-state-fallback', keys: fallbackKeys, planned, drawn: state });
      const layers = raster.layersFor(state), imgs = await Promise.all(layers.map(layer => raster.loadImage(raster.partSrc(layer.group, layer.key, options.thumbs))));
      const body = imgs[layers.findIndex(layer => layer.group === 'body')], bp = imagePixels(body);
      let surface = surfaceApi.bodySurface(body, state.body);
      const hairIndex = layers.findIndex(layer => layer.group === 'hair');
      const hairTransform = hairIndex < 0 ? null : surfaceApi.surfaceTransform(layers[hairIndex], imgs[hairIndex], surface, state);
      if (hairTransform) surface = surfaceApi.withHairSurface(surface, imgs[hairIndex], state.hair, hairTransform);
      metrics.roots = [];
      for (const [index, layer] of layers.entries()) {
        const transform = index === hairIndex ? hairTransform : layer.group === 'body' ? layer.transform : surfaceApi.surfaceTransform(layer, imgs[index], surface, state);
        if (!finite(transform) || !(transform.scale > 0)) findings.push({ check: 'finite-positive-transform', group: layer.group, key: layer.key, transform });
        if (!transform.root) continue;
        const c = canvas(256), ctx = c.getContext('2d'); ctx.scale(.25, .25); surfaceApi.drawTransformed(ctx, imgs[index], layer.group, layer.key, transform);
        const ap = dataOf(c), [rx, ry] = transform.root.map(value => value / 4); let overlap = 0, limbPixels = 0;
        for (let y = Math.max(0, Math.floor(ry - 18)); y <= Math.min(255, Math.ceil(ry + 18)); y++) for (let x = Math.max(0, Math.floor(rx - 18)); x <= Math.min(255, Math.ceil(rx + 18)); x++) if (Math.hypot(x - rx, y - ry) <= 18 && alpha(ap, x, y) > 180) { limbPixels++; if (alpha(bp, x, y) > 180) overlap++; }
        const bodyAlpha = alpha(bp, rx, ry);
        metrics.roots.push({ group: layer.group, key: layer.key, root: transform.root, bodyAlpha, limbPixelsNearRoot: limbPixels, overlapPixelsNearRoot: overlap, transform });
        if (bodyAlpha < 128 || overlap < 2) findings.push({ check: 'arm-body-alpha-contact', group: layer.group, key: layer.key, root: transform.root, bodyAlpha, overlapPixels: overlap });
        if (layer.group === 'item' && layer.key === 'book') {
          const source = imagePixels(imgs[index]);
          const shoulder = surfaceApi.fittedPoint('item', 'book', transform, bookLandmarks.shoulder);
          const shoulderToRoot = Math.hypot(shoulder[0] - transform.root[0], shoulder[1] - transform.root[1]);
          const shoulderBodyAlpha = alpha(bp, shoulder[0] / 4, shoulder[1] / 4);
          const witnesses = bookLandmarks.points.map(witness => {
            const projected = surfaceApi.fittedPoint('item', 'book', transform, witness.point);
            return { name: witness.name, sourcePoint: witness.point, sourceAlpha: alpha(source, witness.point[0] / 4, witness.point[1] / 4), projected,
              leftwardFromShoulder: shoulder[0] - projected[0], distanceFromShoulder: Math.hypot(shoulder[0] - projected[0], shoulder[1] - projected[1]),
              bodyAlpha: alpha(bp, projected[0] / 4, projected[1] / 4), leftOfTorsoBy: surface.row(projected[1])[0] - projected[0] };
          });
          metrics.bookLandmarks = { reference: bookLandmarks, shoulder: { sourcePoint: bookLandmarks.shoulder, sourceAlpha: alpha(source, bookLandmarks.shoulder[0] / 4, bookLandmarks.shoulder[1] / 4), projected: shoulder, bodyAlpha: shoulderBodyAlpha, distanceToAttachmentRoot: shoulderToRoot }, witnesses,
            explanation: 'World-space positions before common camera framing. Positive leftwardFromShoulder means viewer-left. Torso alpha tests actual overlap; row clearance is a diagnostic. Neither checks finger anatomy or support.' };
          if (metrics.bookLandmarks.shoulder.sourceAlpha < 180 || shoulderBodyAlpha < 128 || shoulderToRoot > Math.max(16, transform.scale * 28)) findings.push({ check: 'book-observed-shoulder-attachment', ...metrics.bookLandmarks.shoulder });
          for (const witness of witnesses) {
            if (witness.sourceAlpha < 180) findings.push({ check: 'book-source-witness-not-opaque', ...witness });
            if (witness.leftwardFromShoulder < 16 || witness.bodyAlpha >= 128) findings.push({ check: 'book-hand-or-prop-direction', ...witness });
          }
        }
      }
      const renderOptions = { size: options.size, thumbs: options.thumbs, background: options.background, crop: options.crop };
      const renderPasses = []; let outputURL, character;
      if (options.api === 'exportPng') {
        outputURL = await blobURL(await raster.exportPng(state, options.size));
        renderPasses.push({ purpose: 'output', api: 'exportPng', size: options.size, internalSize: 1024, thumbs: false, background: true, crop: options.crop });
      } else {
        const rendered = await raster.renderPotato(state, renderOptions);
        outputURL = rendered.toDataURL('image/png');
        renderPasses.push({ purpose: 'output', api: 'renderPotato', ...renderOptions });
        if (!options.background) character = rendered;
      }
      if (!character) {
        const probeOptions = { ...renderOptions, background: false };
        character = await raster.renderPotato(state, probeOptions);
        renderPasses.push({ purpose: 'transparent-crop-probe', api: 'renderPotato', ...probeOptions });
      }
      const data = dataOf(character), size = options.size; let opaque = 0, outside = 0, edge = 0, minX = size, minY = size, maxX = -1, maxY = -1;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[(y * size + x) * 4 + 3] > 180) {
        opaque++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        if (Math.hypot(x - size / 2, y - size / 2) > size * .496) outside++;
        if (x === 0 || y === 0 || x === size - 1 || y === size - 1) edge++;
      }
      metrics.crop = { alphaThreshold: 180, opaque, outsideCircle: outside, edge, opaqueBounds: [minX, minY, maxX, maxY], outsideAllowance: Math.max(8, size * size * .00015), probeSource: options.background ? 'separate transparent render' : 'output canvas' };
      if (outside > metrics.crop.outsideAllowance || edge || opaque < 100) findings.push({ check: 'opaque-crop-bounds', ...metrics.crop });
      return { state, hash, roundTrip, shareRoundTripPassed: !shareMismatches.length, renderPasses, metrics, findings, milliseconds: performance.now() - begun, url: outputURL };
    };
  }, bookLandmarks);
  for (const cohort of cohorts) {
    const selected = cases.filter(entry => entry.cohort === cohort.name), frames = [];
    if (!selected.length) continue;
    for (const entry of selected) {
      activeId = entry.id;
      try {
        if (server.exitCode !== null || server.signalCode !== null) throw Error('Owned server is no longer running');
        const { url, ...result } = await page.evaluate(entry => window.auditGrip(entry), entry);
        const png = Buffer.from(url.split(',')[1], 'base64'), metadata = await sharp(png).metadata();
        if (metadata.width !== entry.options.size || metadata.height !== entry.options.size || metadata.format !== 'png') result.findings.push({ check: 'output-png-dimensions', width: metadata.width, height: metadata.height, format: metadata.format, expected: entry.options.size });
        const file = entry.options.saveNative || result.findings.length ? `proof-${safe(entry.id)}.png` : null;
        if (file) { await writeFile(join(output, file), png); report.proofs.push({ id: entry.id, file, kind: entry.options.saveNative ? 'native' : 'finding' }); }
        const record = { ...entry, ...result, output: { width: metadata.width, height: metadata.height, bytes: png.length, sha256: sha256(png), ...(file ? { file } : {}) } };
        report.cases.push(record); report.findings.push(...result.findings.map(finding => ({ id: entry.id, ...finding })));
        frames.push({ ...entry, ...result, png });
      } catch (error) {
        report.errors.push(errorRecord('case', error, { id: entry.id, state: entry.state, options: entry.options }));
        await checkpoint();
        if (page.isClosed() || server.exitCode !== null || server.signalCode !== null) throw error;
      }
      if (report.cases.length % 6 === 0 || entry === selected.at(-1)) {
        await checkpoint();
        console.log(JSON.stringify({ mode, completed: report.cases.length, expected: cases.length, findings: report.findings.length, errors: report.errors.length, current: entry.id }));
      }
    }
    // Matrix rows preserve body/skin ordering; every cell has an explicit ID.
    const columns = cohort.subset === 'matrix' ? 9 : 6, chunkSize = cohort.subset === 'matrix' ? 54 : 36;
    for (let start = 0; start < frames.length; start += chunkSize) {
      const chunk = frames.slice(start, start + chunkSize), suffix = start / chunkSize + 1;
      await writeSheet(`${cohort.name}-whole-${suffix}`, chunk, 'whole', columns);
      if (cohort.group !== 'inspiration') await writeSheet(`${cohort.name}-contacts-${suffix}`, chunk, 'contact', columns);
    }
    await checkpoint();
  }
} catch (error) {
  report.errors.push(errorRecord('audit', error, { id: activeId }));
} finally {
  closing = true;
  try { await browser?.close(); } catch (error) { report.errors.push(errorRecord('browser-close', error)); }
  if (server && server.exitCode === null && server.signalCode === null) server.kill();
  try {
    report.endSources = await fingerprint(await sourceList()); report.endAssets = await fingerprint(assetFiles);
    report.sourcesUnchanged = report.startSources?.digest === report.endSources.digest;
    report.assetsUnchanged = report.startAssets?.digest === report.endAssets.digest;
    const changes = (before, after) => {
      const a = new Map((before?.files || []).map(file => [file.file, file])), b = new Map(after.files.map(file => [file.file, file]));
      return [...new Set([...a.keys(), ...b.keys()])].filter(file => JSON.stringify(a.get(file)) !== JSON.stringify(b.get(file))).map(file => ({ file, before: a.get(file) || null, after: b.get(file) || null }));
    };
    report.changedSources = changes(report.startSources, report.endSources); report.changedAssets = changes(report.startAssets, report.endAssets);
  } catch (error) { report.errors.push(errorRecord('final-fingerprints', error)); }
  report.missingCaseIds = cases.filter(entry => !report.cases.some(result => result.id === entry.id)).map(entry => entry.id);
  report.serverLogs = { stdout: serverStdout, stderr: serverStderr };
  report.status = report.errors.length || report.findings.length || report.missingCaseIds.length || !report.sourcesUnchanged || !report.assetsUnchanged ? 'failed' : 'passed-automated-checks';
  report.completed = new Date().toISOString();
  await checkpoint();
}
console.log(JSON.stringify({ mode, status: report.status, cases: report.cases.length, expected: cases.length, findings: report.findings.length, errors: report.errors.length, sourcesUnchanged: report.sourcesUnchanged, assetsUnchanged: report.assetsUnchanged, output }));
if (report.status !== 'passed-automated-checks') process.exitCode = 1;
