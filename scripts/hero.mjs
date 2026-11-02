#!/usr/bin/env node
// Builds the banner, link-preview card, eight-avatar gallery and favicon
// from the real app, so the docs never drift from the art.
//
//   npm run hero
//
// Needs Playwright (npm i -D playwright && npx playwright install chromium);
// it is a dev tool, not a project dependency. Starts its own dev server.

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

const root = fileURLToPath(new URL('..', import.meta.url));

// Five potatoes that show off the range in the banner and link-preview card.
export const HERO_POTATOES = [
  '#character=female&body=pear&skin=russet&hair=ponytail&hairColor=chestnut&hat=none&neckwear=pendant&item=bouquet&gesture=hip&eyes=almond&brows=softArch&mouth=roseSmile&bg=mint&pattern=spotlight',
  '#character=female&body=petite&skin=gold&hair=curls&hairColor=black&hat=bow&hatColor=pink&jewelry=pearlDrops&item=teacup&gesture=palmUp&eyes=joyLashes&brows=softArch&mouth=laugh&bg=coral',
  '#capText=A%2BW',
  '#body=long&skin=purple&hat=wizard&hatColor=purple&eyes=wide&brows=raised&mouth=grin&item=book&gesture=fist&bg=navy&pattern=stars',
  '#character=female&body=round&skin=ghost&hair=braids&hairColor=copper&hat=sunhat&hatColor=teal&item=palette&gesture=peace&eyes=almond&brows=softArch&mouth=smile&bg=sky',
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

  // Banner: five circles on a transparent background, 1544 x 312 like before.
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

  // Keep the larger artwork gallery reproducible as well.
  const gallerySpec = [
    ['Ship it.', '#capText=A%2BW'],
    ['Just for you.', HERO_POTATOES[0]],
    ['Tea & company.', HERO_POTATOES[1]],
    ['Tiny victory.', '#body=long&skin=purple&hat=wizard&hatColor=purple&item=trophy&gesture=fist&eyes=stars&brows=raised&mouth=grin&bg=navy'],
    ['Chef approved.', '#body=lumpy&skin=sweet&hat=chef&item=pizza&gesture=ok&eyes=wink&brows=smug&mouth=tongue&bg=mint'],
    ['Make something.', HERO_POTATOES[4]],
    ['One more chapter.', '#character=female&skin=blue&hair=bun&hairColor=silver&hat=none&eyewear=catEye&hatColor=red&jewelry=hoops&item=book&gesture=palmUp&eyes=almond&brows=softArch&mouth=smile&bg=cream'],
    ['Your words.', '#character=female&body=petite&skin=pink&hair=pixie&hairColor=rose&hat=none&item=sign&sign=LOVE%20YOU&gesture=fingerHeart&eyes=lashWink&brows=softArch&mouth=smile&bg=lavender'],
  ];
  const gallery = [];
  for (const [label, hash] of gallerySpec) {
    await page.goto(`http://localhost:${port}/${hash}`);
    await page.waitForFunction(() => document.body.dataset.rendered === 'true');
    gallery.push([label, await page.evaluate(() => document.querySelector('#preview canvas').toDataURL())]);
  }
  const galleryPage = await browser.newPage({ viewport: { width: 1600, height: 1060 } });
  await galleryPage.setContent(`<body style="margin:0;padding:28px;box-sizing:border-box;background:#edf6f3;color:#123d40;font-family:system-ui"><h1 style="font-size:42px;margin:0">A little potato. A lot of personality.</h1><p style="font-size:22px;margin:8px 0 30px;color:#526d6b">Made in potato-me · actual editor output</p><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:28px 24px">${gallery.map(([label, src]) => `<figure style="margin:0;text-align:center"><img src="${src}" width="360" height="360" style="border-radius:50%"><figcaption style="font-size:25px;font-weight:700;margin-top:8px">${label}</figcaption></figure>`).join('')}</div></body>`);
  await galleryPage.screenshot({ path: root + 'docs/completion-preview.png' });
  console.log('wrote docs/completion-preview.png');

} finally {
  await browser.close();
  server.kill();
}
