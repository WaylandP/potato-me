#!/usr/bin/env node
// Builds the README banner (docs/hero.png) and the link-preview card
// (docs/og.png) from the real app, so the docs never drift from the art.
//
//   npm run hero
//
// Needs Playwright (npm i -D playwright && npx playwright install chromium);
// it is a dev tool, not a project dependency. Starts its own dev server.

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

// Five potatoes that show off the range. Keep them in sync with README.md's alt text.
export const HERO_POTATOES = [
  '#body=round&skin=gold&hat=beanie&hatColor=red&item=coffee&eyes=happy&mouth=grin&cheeks=on&bg=coral&pattern=dots',
  '#body=long&skin=purple&hat=wizard&hatColor=purple&eyes=wide&brows=raised&mouth=oh&item=book&bg=navy&pattern=stars',
  '#',
  '#body=lumpy&skin=zombie&hat=crown&eyewear=shades&neckwear=chain&item=wrench&mouth=grin&eyes=angry&brows=angry&bg=mint&pattern=hex',
  '#body=classic&skin=sweet&hat=party&hatColor=teal&facialHair=mustache&eyes=wink&mouth=laugh&cheeks=freckles&stickers=rocket,bolt,dino,planet&bg=sky&pattern=confetti',
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
</style></head><body><h1>potato-me 🥔</h1><p>Build a potato. Become the potato.</p><p class="sub">Free potato avatars for GitHub, Slack and anywhere else. Nothing uploaded.</p><div class="pill">Open source · no build step</div><div class="row">${row}</div></body></html>`);
  await og.screenshot({ path: root + 'docs/og.png' });
  console.log('wrote docs/og.png');
} finally {
  await browser.close();
  server.kill();
}
