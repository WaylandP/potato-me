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
  const thumbs = () => page.waitForFunction(() => [...document.querySelectorAll('.thumb')].every(t => t.querySelector('canvas, svg') || (t.querySelector('img')?.complete && t.querySelector('img')?.naturalWidth > 0)), null, { timeout: 60000 });
  const shot = async name => { await thumbs(); await page.screenshot({ path: `${out}/${name}.png`, fullPage: true }); report.screenshots.push(name + '.png'); };
  const pick = async (key, value) => {
    const section = { body:'body', skin:'body', hair:'hair', hairColor:'hair', hat:'hat', hatColor:'hat', item:'props', gesture:'gestures', eyewear:'accessories', neckwear:'accessories', jewelry:'accessories', extra:'accessories', stickers:'stickers', bg:'bg', pattern:'bg' }[key] || 'face';
    await page.locator(`#tab-${section}`).click(); await thumbs(); await page.locator(`[data-key="${key}"][data-value="${value}"]`).click(); await ready(); assert.equal(await page.locator(`[data-key="${key}"][data-value="${value}"]`).getAttribute('aria-pressed'), 'true'); };
  const tab = async key => { await page.locator(`#tab-${key}`).click(); await thumbs(); };
  await page.goto(base); await ready(); await thumbs();
  await page.locator('#inspiration').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelectorAll('.inspiration-card[data-idea] canvas').length === 6);
  await page.evaluate(() => scrollTo(0, 0));
  await shot('desktop-light');
  const firstIdeas = await page.locator('.inspiration-card[data-idea]').evaluateAll(cards => cards.map(card => card.dataset.idea));
  const beforeIdeas = page.url();
  await page.locator('#shuffle-ideas').click();
  await page.waitForFunction(() => document.querySelector('#inspiration-grid').getAttribute('aria-busy') === 'false');
  const nextIdeas = await page.locator('.inspiration-card[data-idea]').evaluateAll(cards => cards.map(card => card.dataset.idea));
  assert.equal(new Set(nextIdeas).size, 6);
  assert.ok(nextIdeas.every(id => !firstIdeas.includes(id)));
  assert.equal(page.url(), beforeIdeas, 'browsing ideas does not change the current potato');
  await page.locator('.inspiration-card[data-idea]').first().focus(); await page.keyboard.press('Enter'); await ready();
  const expectedIdea = await page.evaluate(async id => {
    const { INSPIRATION_LOOKS } = await import('./src/inspiration.js');
    const { decodeState } = await import('./src/state.js');
    return { expected: INSPIRATION_LOOKS.find(idea => idea.id === id).state, actual: decodeState(location.hash) };
  }, nextIdeas[0]);
  assert.deepEqual(expectedIdea.actual, expectedIdea.expected);
  const ideaPixels = await page.locator('#preview canvas').evaluate(c => c.toDataURL());
  await page.reload(); await ready();
  assert.equal(await page.locator('#preview canvas').evaluate(c => c.toDataURL()), ideaPixels);
  report.checks.push('Six lazy-rendered inspiration cards shuffle without repeats or changing the current potato; keyboard selection loads the complete look and share/reload reproduces its canvas.');

  let versionChecks = 0;
  await page.route('**/package.json', route => { versionChecks++; return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: '999.0.0' }) }); });
  const beforeUpdate = page.url();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.locator('#update-notice').waitFor({ state: 'visible' });
  assert.equal(page.url(), beforeUpdate, 'the update notice does not reload or edit the potato');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  assert.equal(versionChecks, 1, 'update checks are throttled');
  const refreshed = page.waitForEvent('load');
  await page.locator('#refresh-editor').click(); await refreshed; await ready();
  assert.equal(page.url(), beforeUpdate);
  assert.equal(await page.locator('#preview canvas').evaluate(c => c.toDataURL()), ideaPixels);
  await page.unroute('**/package.json');
  report.checks.push('A mocked new version shows a nonblocking update notice; checks are throttled and Refresh editor preserves the exact shared state and canvas.');
  await page.goto(base); await ready(); await thumbs();
  for (const key of ['body', 'face', 'hair', 'hat', 'accessories', 'props', 'gestures', 'stickers', 'bg']) { await tab(key); await shot(`desktop-${key}`); }
  report.checks.push('All nine sections render their option thumbnails without failed images.');
  await tab('body');
  assert.equal(await page.locator('[data-key="body"][data-value="long"]').innerText(), 'Petite');
  assert.equal(await page.locator('[data-key="body"][data-value="petite"]').innerText(), 'Wide');
  await pick('body', 'long');
  assert.ok(await page.getByText('Petite: A smaller, slender potato with matching smaller parts.').isVisible());
  await page.reload(); await ready(); assert.equal(await page.locator('[data-key="body"][data-value="long"]').getAttribute('aria-pressed'), 'true');
  await pick('body', 'petite');
  assert.ok(await page.getByText('Wide: A short, broad potato with a wide silhouette.').isVisible());
  report.checks.push('Petite and Wide labels, descriptions and historical share keys select the correct shapes.');
  await tab('body'); await pick('body', 'round'); await pick('skin', 'purple');
  const beforeSkip = page.url(); await page.locator('.skip').focus(); await page.keyboard.press('Enter');
  assert.equal(page.url(), beforeSkip); assert.equal(await page.locator('#controls').evaluate(e => e === document.activeElement), true);
  await page.locator('#tab-body').focus(); await page.keyboard.press('ArrowRight'); assert.equal(await page.locator('#tab-face').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('End'); assert.equal(await page.locator('#tab-bg').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('Home'); assert.equal(await page.locator('#tab-body').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('ArrowDown'); assert.equal(await page.locator('#tab-hat').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('ArrowUp'); assert.equal(await page.locator('#tab-body').getAttribute('aria-selected'), 'true');
  report.checks.push('Keyboard tabs, selected states, focus and skip link preserve the avatar.');
  await page.getByRole('radio', { name: 'Female', exact: true }).check(); await ready();
  let femaleHash = new URL(page.url()).hash;
  assert.ok(femaleHash.includes('character=female')); assert.ok(femaleHash.includes('body=round')); assert.ok(femaleHash.includes('skin=purple'));
  await tab('hat'); await pick('hair', 'ponytail'); await pick('hairColor', 'copper');
  await page.getByRole('radio', { name: 'Male', exact: true }).check(); await ready();
  await page.getByRole('radio', { name: 'Male', exact: true }).focus(); await page.keyboard.press('ArrowRight'); await ready();
  assert.ok(new URL(page.url()).hash.includes('character=female')); assert.ok(new URL(page.url()).hash.includes('hair=ponytail'));
  await page.reload(); await ready(); assert.equal(await page.getByRole('radio', { name: 'Female', exact: true }).isChecked(), true);
  await page.locator('#randomize').click(); await ready(); assert.ok(new URL(page.url()).hash.includes('character=female'));
  await page.locator('#reset').click(); await ready(); assert.ok(new URL(page.url()).hash.includes('character=female')); assert.ok(new URL(page.url()).hash.includes('hair=waves'));
  await shot('female-starter');
  await page.getByRole('radio', { name: 'Male', exact: true }).check(); await ready(); await page.locator('#reset').click(); await ready();
  assert.equal(new URL(page.url()).hash, '');
  report.checks.push('Male/Female switch preserves the body and props, restores styling, supports arrow keys, share/reload, Surprise me and style-specific reset.');

  await tab('bg'); await pick('pattern', 'aurora'); await pick('bg', 'indigo'); await page.reload(); await ready();
  assert.ok(new URL(page.url()).hash.includes('pattern=aurora')); assert.ok(new URL(page.url()).hash.includes('bg=indigo'));
  await tab('props'); await pick('item', 'bouquet'); await tab('stickers'); await page.getByRole('button', { name: 'Hold a laptop', exact: true }).click(); await ready();
  assert.ok(await page.locator('[data-key="stickers"]').count() > 20);
  report.checks.push('New scenes/colors survive reload; the Stickers section can equip the laptop.');
  await tab('body'); await pick('body', 'pear');
  await tab('hat'); await pick('hair', 'waves'); await pick('hairColor', 'silver');
  await pick('hat', 'backwardCap'); await page.locator('#capText-input').fill('a+w'); await ready(); assert.equal(await page.locator('#capText-input').inputValue(), 'A+W');
  await tab('accessories'); await pick('item', 'sign'); await page.locator('#sign-input').fill('ship it'); await ready(); assert.equal(await page.locator('#sign-input').inputValue(), 'SHIP IT');
  await pick('jewelry', 'pearlDrops'); await pick('neckwear', 'pearls'); await pick('gesture', 'fingerHeart');
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
  await page.goto(base); await ready(); await tab('stickers');
  const all = page.locator('[data-key="stickers"]');
  for (const button of await all.all()) if (await button.getAttribute('aria-pressed') === 'true') await button.click();
  for (let i = 0; i < 7; i++) await all.nth(i).click();
  assert.equal(await page.locator('[data-key="stickers"][aria-pressed="true"]').count(), 6);
  report.checks.push('Laptop sticker limit permits six selections and rejects a seventh.');
  for (const button of await all.all()) if (await button.getAttribute('aria-pressed') === 'true') await button.click();
  for (const sticker of ['sunflower', 'butterfly', 'books', 'music', 'camera', 'yarn']) await pick('stickers', sticker);
  assert.equal(await page.locator('[data-key="stickers"][aria-pressed="true"]').count(), 6);
  await shot('new-stickers');
  await tab('body'); await pick('body', 'petite'); await tab('hat'); await pick('hair', 'braids'); await pick('hairColor', 'copper'); await pick('hat', 'flowerCrown');
  await tab('accessories'); await pick('jewelry', 'hoops'); await pick('item', 'bouquet'); await pick('gesture', 'hip'); await shot('everyday-style');
  report.checks.push('New body shapes, hair colors, jewelry, props, gestures and six new stickers are reachable through the actual controls.');
  await tab('hat'); await pick('hair', 'none'); await tab('accessories'); await pick('extra', 'barrette');
  await tab('hair'); assert.equal(await page.locator('[data-key="hair"][data-value="bob"]').getAttribute('aria-pressed'), 'true');
  await pick('hair', 'none'); await tab('accessories'); assert.equal(await page.locator('[data-key="extra"][data-value="none"]').getAttribute('aria-pressed'), 'true');
  report.checks.push('Hair clips add a hairstyle; explicitly choosing no hair removes the clip.');
  for (const colorScheme of ['light', 'dark']) {
    await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto(base); await ready(); await thumbs();
    // Compare finished concurrent thumbnails with fresh sequential renders.
    // Readback also flushes deferred canvas painting before full-page captures.
    const incomplete = await page.evaluate(async () => {
      const { renderPotato, cropBox } = await import('./src/raster.js');
      const { DEFAULT_STATE } = await import('./src/options.js');
      const { bodyPreviewState } = await import('./src/inspiration.js');
      const mismatches = [];
      for (const button of document.querySelectorAll('[data-key="body"], [data-key="skin"]')) {
        const c = button.querySelector('canvas');
        const candidate = { ...DEFAULT_STATE, [button.dataset.key]: button.dataset.value };
        const fresh = await renderPotato(button.dataset.key === 'body' ? bodyPreviewState(candidate) : candidate, { size: 176, crop: cropBox(button.dataset.key), thumbs: true });
        const actual = c.getContext('2d').getImageData(0, 0, 176, 176).data;
        const expected = fresh.getContext('2d').getImageData(0, 0, 176, 176).data;
        if (actual.some((v, i) => Math.abs(v - expected[i]) > 2)) mismatches.push(`${button.dataset.key}/${button.dataset.value}`);
      }
      return mismatches;
    });
    assert.deepEqual(incomplete, []);
    const beforeShelf = report.requests.length;
    await page.locator('#inspiration').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelectorAll('.inspiration-card[data-idea] canvas').length === 6);
    assert.deepEqual(report.requests.slice(beforeShelf).filter(url => url.includes('/assets/parts/')), [], 'inspiration uses thumbnail sources only');
    await page.evaluate(() => scrollTo(0, 0));
    await shot(`mobile-${colorScheme}`);
    for (const key of ['body', 'face', 'hair', 'hat', 'accessories', 'props', 'gestures', 'stickers', 'bg']) {
      await tab(key);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const small = await page.locator('button:not([hidden])').evaluateAll(els => els.filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.width < 44 || r.height < 44); }).map(e => e.textContent));
      assert.deepEqual(small, []);
    }
    await page.locator('#controls').screenshot({ path: `${out}/mobile-${colorScheme}-controls.png` });
  }
  report.checks.push('Concurrent body/skin thumbnails match sequential renders in both mobile themes (2-channel-value tolerance).');
  report.checks.push('Phone inspiration shelves load on approach and request no full-resolution part files.');
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
