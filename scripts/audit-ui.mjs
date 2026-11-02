#!/usr/bin/env node
// Optional Playwright smoke audit. Runs a local server, real controls and downloads.
// node scripts/audit-ui.mjs /tmp/potato-ui-audit [https://deployed.example/]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(process.argv[2] || '/tmp/potato-ui-audit');
await mkdir(out, { recursive: true });
const port = 6500 + Math.floor(Math.random() * 400);
const server = process.argv[3] ? null : spawn(process.execPath, [root + 'scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
if (server) await new Promise(r => setTimeout(r, 600));
const base = process.argv[3] || `http://localhost:${port}/`;
const report = { checks: [], screenshots: [], errors: [], requests: [] };
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('request', r => report.requests.push(r.url().split('#')[0]));
  const ready = () => page.waitForFunction(() => document.body.dataset.rendered === 'true');
  const thumbs = () => page.waitForFunction(() => [...document.querySelectorAll('.thumb')].every(t => t.querySelector('canvas, img, svg')), null, { timeout: 60000 });
  const shot = async name => { await page.screenshot({ path: `${out}/${name}.png`, fullPage: true }); report.screenshots.push(name + '.png'); };
  const pick = async (key, value) => { await page.locator(`[data-key="${key}"][data-value="${value}"]`).click(); await ready(); assert.equal(await page.locator(`[data-key="${key}"][data-value="${value}"]`).getAttribute('aria-pressed'), 'true'); };
  const tab = async key => { await page.locator(`#tab-${key}`).click(); await thumbs(); };
  await page.goto(base); await ready(); await thumbs();
  await shot('desktop-light');
  for (const key of ['body', 'face', 'hat', 'gear', 'bg']) { await tab(key); await shot(`desktop-${key}`); }
  report.checks.push('All five tabs render their option thumbnails without failed images.');
  await tab('body'); await pick('body', 'round'); await pick('skin', 'purple');
  const beforeSkip = page.url(); await page.locator('.skip').focus(); await page.keyboard.press('Enter');
  assert.equal(page.url(), beforeSkip); assert.equal(await page.locator('#controls').evaluate(e => e === document.activeElement), true);
  await page.locator('#tab-body').focus(); await page.keyboard.press('ArrowRight'); assert.equal(await page.locator('#tab-face').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('End'); assert.equal(await page.locator('#tab-bg').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('Home'); assert.equal(await page.locator('#tab-body').getAttribute('aria-selected'), 'true');
  report.checks.push('Keyboard tabs, selected states, focus and skip link preserve the avatar.');
  await tab('hat'); await pick('hat', 'backwardCap'); await page.locator('#capText-input').fill('a+w'); await ready(); assert.equal(await page.locator('#capText-input').inputValue(), 'A+W');
  await tab('gear'); await pick('item', 'sign'); await page.locator('#sign-input').fill('ship it'); await ready(); assert.equal(await page.locator('#sign-input').inputValue(), 'SHIP IT');
  await pick('neckwear', 'scarf'); await pick('gesture', 'wave');
  await page.locator('#copy-link').click(); const copied = await page.evaluate(() => navigator.clipboard.readText()); assert.equal(copied, page.url());
  const beforeReload = await page.locator('#preview canvas').evaluate(c => c.toDataURL());
  await page.reload(); await ready(); assert.equal(await page.locator('#preview canvas').evaluate(c => c.toDataURL()), beforeReload);
  report.checks.push('Text normalization, copied share URL and reload reproduce the exact canvas.');
  for (const [selector, size] of [['#download-png', 512], ['#download-big', 1024]]) {
    const waiting = page.waitForEvent('download'); await page.locator(selector).click(); const dl = await waiting;
    const path = `${out}/${dl.suggestedFilename()}`; await dl.saveAs(path); const png = await readFile(path);
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
    if (size === 512) assert.ok(png.length < 1000000);
    report.checks.push(`${size} px download: valid PNG, ${png.length} bytes.`);
  }
  await page.locator('#crop-toggle').uncheck(); assert.equal(await page.locator('#preview').getAttribute('data-crop'), 'off');
  await page.locator('#reset').click(); await ready(); assert.equal(new URL(page.url()).hash, '');
  await page.locator('#randomize').click(); await ready(); assert.notEqual(new URL(page.url()).hash, '');
  report.checks.push('Crop toggle, reset and Surprise me update the real preview.');
  await page.goto(base); await ready(); await tab('gear');
  const all = page.locator('[data-key="stickers"]');
  for (const button of await all.all()) if (await button.getAttribute('aria-pressed') === 'true') await button.click();
  for (let i = 0; i < 7; i++) await all.nth(i).click();
  assert.equal(await page.locator('[data-key="stickers"][aria-pressed="true"]').count(), 6);
  report.checks.push('Laptop sticker limit permits six selections and rejects a seventh.');
  for (const colorScheme of ['light', 'dark']) {
    await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto(base); await ready(); await thumbs(); await shot(`mobile-${colorScheme}`);
    for (const key of ['body', 'face', 'hat', 'gear', 'bg']) {
      await tab(key);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const small = await page.locator('button:not([hidden])').evaluateAll(els => els.filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.width < 44 || r.height < 44); }).map(e => e.textContent));
      assert.deepEqual(small, []);
    }
    await page.locator('#controls').screenshot({ path: `${out}/mobile-${colorScheme}-controls.png` });
  }
  report.checks.push('390 px light/dark layouts: no horizontal overflow; all visible buttons meet 44 × 44 px.');
  const recovery = await context.newPage();
  await recovery.route('**/assets/parts/body/classic-russet.png', route => route.abort());
  await recovery.goto(base); await recovery.locator('#retry-preview').waitFor({ state: 'visible' });
  await recovery.unroute('**/assets/parts/body/classic-russet.png'); await recovery.locator('#retry-preview').click();
  await recovery.waitForFunction(() => document.body.dataset.rendered === 'true'); await recovery.close();
  report.checks.push('Failed body request shows retry; retry recovers after the connection is restored.');
  await page.goto(new URL('fit.html', base).href); await page.locator('#group').selectOption('item');
  assert.equal(await page.locator('#part option[value="none"]').count(), 1);
  await page.locator('#part').selectOption('none'); await page.locator('#scale').fill('0');
  assert.ok((await page.locator('#out').inputValue()).includes('0.05'));
  await page.locator('#scale').fill(''); assert.ok(!(await page.locator('#out').inputValue()).includes('NaN'));
  await page.locator('#scale').fill('1');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const overflowing = await page.locator('.fit-panel input, .fit-panel select, .fit-panel textarea, .fit-panel button').evaluateAll(els => els.filter(e => { const r = e.getBoundingClientRect(), p = e.parentElement.getBoundingClientRect(); return r.left < p.left - 1 || r.right > p.right + 1; }).map(e => e.id));
  assert.deepEqual(overflowing, []);
  await shot('fit-tool'); report.checks.push('Fitting tool includes empty holding hand, guards invalid scale input and fits its mobile controls without overflow.');
  assert.deepEqual(report.errors, []);
  const external = [...new Set(report.requests.filter(u => /^https?:/.test(u) && new URL(u).origin !== new URL(base).origin))];
  assert.deepEqual(external, []); report.checks.push('Editor and fitting tool make no third-party requests.');
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close(); server?.kill();
}
console.log(JSON.stringify({ checks: report.checks, screenshots: report.screenshots, errors: report.errors }));
