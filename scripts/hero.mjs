#!/usr/bin/env node
// Builds the banner, link-preview card, six-scene README gallery and favicon
// from the real app, so the docs never drift from the art.
//
//   npm run hero
//
// Needs Playwright (npm i -D playwright && npx playwright install chromium);
// it is a dev tool, not a project dependency. Starts its own dev server.

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const root = fileURLToPath(new URL('..', import.meta.url));

// Five potatoes that show off the range in the banner and link-preview card.
export const HERO_POTATOES = [
  '#character=female&body=pear&skin=russet&hair=ponytail&hairColor=chestnut&hat=none&neckwear=pendant&item=bouquet&gesture=hip&eyes=almond&brows=softArch&mouth=roseSmile&bg=sage&pattern=botanical',
  '#character=female&body=petite&skin=gold&hair=curls&hairColor=black&hat=bow&hatColor=pink&jewelry=pearlDrops&item=teacup&gesture=palmUp&eyes=joyLashes&brows=softArch&mouth=laugh&bg=berry&pattern=aurora',
  '#capText=A%2BW',
  '#body=long&skin=purple&hat=wizard&hatColor=purple&eyes=wide&brows=raised&mouth=grin&item=book&gesture=fist&bg=indigo&pattern=orbit',
  '#character=female&body=round&skin=ghost&hair=braids&hairColor=copper&hat=sunhat&hatColor=teal&item=palette&gesture=peace&eyes=almond&brows=softArch&mouth=smile&bg=sky&pattern=coast',
];

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const port = 5600 + Math.floor(Math.random() * 300);
const server = spawn(process.execPath, [root + 'scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
  const potatoes = [];
  for (let i = 0; i < HERO_POTATOES.length; i++) {
    await page.goto(`http://localhost:${port}/?hero=${i}${HERO_POTATOES[i]}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.body.dataset.rendered === 'true', null, { timeout: 30000 });
    potatoes.push(await page.evaluate(() => document.querySelector('#preview canvas').toDataURL('image/png')));
  }

  // Banner: five circles on a transparent background.
  const CELL = 280;
  const GAP = 28;
  const PAD = 16;
  const W = PAD * 2 + 5 * CELL + 4 * GAP;
  const H = PAD * 2 + CELL;
  const circles = potatoes.map((src) => `<img src="${src}" style="width:${CELL}px;height:${CELL}px;border-radius:50%;display:block">`).join('');
  const hero = await browser.newPage({ viewport: { width: W, height: H } });
  await hero.setContent(`<body style="margin:0;background:transparent"><div style="display:flex;gap:${GAP}px;padding:${PAD}px">${circles}</div></body>`);
  await hero.screenshot({ path: root + 'docs/hero.png', omitBackground: true });
  console.log(`wrote docs/hero.png (${W}×${H})`);

  const icon = await page.evaluate(async src => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d'); ctx.beginPath(); ctx.arc(64, 64, 64, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(img, 0, 0, 128, 128);
    return c.toDataURL().split(',')[1];
  }, potatoes[2]);
  await writeFile(root + 'favicon.png', Buffer.from(icon, 'base64'));
  console.log('wrote favicon.png');

  // Link preview card, 1200 x 630.
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const row = [2, 0, 1, 3, 4]
    .map((i, k) => `<div style="width:196px;height:196px;border-radius:50%;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.18);${k % 2 ? 'margin-top:54px' : ''}"><img src="${potatoes[i]}" style="width:100%;height:100%;display:block"></div>`)
    .join('');
  await og.setContent(`<!doctype html><html><head><style>
body{margin:0;width:1200px;height:630px;background:linear-gradient(135deg,#E7F3F2 0%,#D3ECEA 100%);font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#142624;overflow:hidden}
h1{position:absolute;left:72px;top:88px;margin:0;font-size:84px;font-weight:800;letter-spacing:-0.02em}
p{position:absolute;left:76px;top:200px;margin:0;font-size:34px;font-weight:600;color:#475F5C}
.sub{top:252px;font-size:24px;font-weight:500;color:#5C7572}
.row{position:absolute;left:72px;top:330px;display:flex;gap:22px}
.pill{position:absolute;right:72px;top:96px;background:#C4402A;color:#fff;font-weight:700;font-size:22px;padding:14px 22px;border-radius:999px}
</style></head><body><h1>potato-me</h1><p>Build a potato. Become the potato.</p><p class="sub">Free potato avatars for GitHub, Slack and anywhere else. Nothing uploaded.</p><div class="pill">Open source · no build step</div><div class="row">${row}</div></body></html>`);
  await og.screenshot({ path: root + 'docs/og.png' });
  console.log('wrote docs/og.png');

  // The README gallery uses the same recipes and Canvas path as the shared editor.
  // Render at full resolution before scaling for the grid; a failed asset must stop publication.
  const recipes = JSON.parse(await readFile(root + 'docs/scenes-spec.json', 'utf8'));
  const scenes = await page.evaluate(async recipes => {
    const { renderPotato, drawableState } = await import('./src/raster.js');
    const { decodeState } = await import('./src/state.js');
    const { OPTIONS } = await import('./src/options.js');
    const scenes = [];
    for (const [label, hash] of recipes) {
      const state = decodeState(hash);
      const drawable = drawableState(state);
      for (const key of Object.keys(OPTIONS)) {
        if (drawable[key] !== state[key]) throw new Error(`${label}: unavailable ${key}=${state[key]}`);
      }
      const canvas = await renderPotato(drawable, { size: 1024 });
      scenes.push({ label, detail: `${OPTIONS.body[state.body]} · ${OPTIONS.item[state.item]}`, src: canvas.toDataURL('image/png') });
    }
    return scenes;
  }, recipes);
  const sheet = await browser.newPage({ viewport: { width: 1152, height: 900 }, deviceScaleFactor: 1 });
  await sheet.setContent(`<style>
    *{box-sizing:border-box}body{margin:0;background:#152825;font:20px system-ui,sans-serif;color:#f1f4ec}
    main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding:20px}
    figure{margin:0;overflow:hidden;border-radius:16px;background:#223733}img{width:100%;display:block}
    figcaption{padding:11px 16px 14px}
    strong{display:block;font-size:22px;line-height:1.2}small{display:block;margin-top:3px;color:#bfd3cb;font-size:15px;line-height:1.3}
  </style><main></main>`);
  await sheet.evaluate(async scenes => {
    const grid = document.querySelector('main');
    for (const { label, detail, src } of scenes) {
      const frame = document.createElement('figure'), picture = new Image();
      picture.src = src; await picture.decode();
      const caption = document.createElement('figcaption'), title = document.createElement('strong'), parts = document.createElement('small');
      title.textContent = label; parts.textContent = detail;
      caption.append(title, parts); frame.append(picture, caption); grid.append(frame);
    }
  }, scenes);
  await sheet.locator('main').screenshot({ path: root + 'docs/scene-examples.jpg', type: 'jpeg', quality: 91 });
  console.log('wrote docs/scene-examples.jpg');

} finally {
  await browser.close();
  server.kill();
}
