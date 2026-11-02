#!/usr/bin/env node
// Browser proofs and structural checks for headwear/hair contact. A completed
// render matrix does not imply that each image has been visually approved.
// The exhaustive matrix uses the actual 256px thumbnail PNG inputs. Focused,
// skin, and accessory checks use full source PNGs at their stated output size.
//
// node scripts/audit-wrap.mjs /tmp/potato-wrap-review focused
// node scripts/audit-wrap.mjs /tmp/potato-wrap-review matrix
// node scripts/audit-wrap.mjs /tmp/potato-wrap-review skins
// node scripts/audit-wrap.mjs /tmp/potato-wrap-review accessories
//
// Optional development tooling: Playwright (Chromium) and Sharp. Set
// CHROME_EXECUTABLE only when using an existing compatible Chromium binary.
// AUDIT_MATCH optionally limits a follow-up run to labels containing its value.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { DEFAULT_STATE, OPTIONS } from '../src/options.js';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');
const appRoot = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(process.argv[2] || '/tmp/potato-wrap-review');
const mode = process.argv[3] || 'focused';
if (!['focused', 'matrix', 'skins', 'accessories'].includes(mode)) {
 console.error('usage: node scripts/audit-wrap.mjs <output-dir> <focused|matrix|skins|accessories>');
 process.exit(2);
}
await mkdir(output, { recursive: true });
const base = { ...DEFAULT_STATE, item: 'none', gesture: 'rest', stickers: [], neckwear: 'none', jewelry: 'none', extra: 'none', hat: 'none', hair: 'none', eyewear: 'none', capText: '', bg: 'cream', pattern: 'solid', hairColor: 'chestnut', hatColor: 'red' };
const bodies = Object.keys(OPTIONS.body), hairs = Object.keys(OPTIONS.hair), skins = Object.keys(OPTIONS.skin), hats = Object.keys(OPTIONS.hat).filter(h => h !== 'none');
const focused = [
 ['cap-curls', { hat:'cap', hair:'curls', skin:'purple' }],
 ['headband-curls', { hat:'headband', hair:'curls', skin:'blue' }],
 ['backwardCap-waves', { hat:'backwardCap', hair:'waves', skin:'purple' }],
 ['headphones-bun', { extra:'headphones', hair:'bun', skin:'blue' }],
 ['halo-headphones-bun', { hat:'halo', extra:'headphones', hair:'bun', skin:'purple' }],
 ['catEye-pixie', { eyewear:'catEye', hair:'pixie', skin:'blue' }],
 ['earbuds-braids', { extra:'earbuds', hair:'braids', skin:'purple' }],
 ['headphones-bare', { extra:'headphones', skin:'russet' }],
 ['santa-curls', { hat:'santa', hair:'curls', skin:'blue' }],
 ['barrette-curls', { extra:'barrette', hair:'curls', skin:'purple' }],
 ['sunhat-bob', { hat:'sunhat', hair:'bob', skin:'blue' }],
 ['crown-bun', { hat:'crown', hair:'bun', skin:'russet' }],
 ['viking-waves', { hat:'viking', hair:'waves', skin:'purple' }],
 ['horns-ponytail', { hat:'horns', hair:'ponytail', skin:'blue' }],
 ['round-headband', { body:'round', hat:'headband', skin:'purple' }],
 ['wide-headband-curls', { body:'petite', hat:'headband', hair:'curls', skin:'blue' }],
 ['petite-hardhat-pixie', { body:'long', hat:'hardhat', hair:'pixie', skin:'purple' }],
 ['pear-cowboy-waves', { body:'pear', hat:'cowboy', hair:'waves', skin:'blue' }],
 ['bucket-curls', { hat:'bucket', hair:'curls', skin:'purple' }],
 ['wide-beret-bare', { body:'petite', hat:'beret', skin:'blue' }],
 ['wide-propeller-curls', { body:'petite', hat:'propeller', hair:'curls', skin:'blue' }],
 ['round-wizard-bob', { body:'round', hat:'wizard', hair:'bob', skin:'purple' }],
 ['round-tophat-bare', { body:'round', hat:'tophat', skin:'blue' }],
 ['round-flowerCrown-waves', { body:'round', hat:'flowerCrown', hair:'waves', skin:'purple' }],
];
const accessoryCases = [
 ...['shades','aviators','round','square','catEye'].flatMap((eyewear,e)=>bodies.map((body,b)=>[`${eyewear}-${body}`,{eyewear,body,hair:['none','pixie','bob','curls','waves','braids'][(b+e)%6],skin:['russet','blue','purple'][b%3]}])),
 ...hairs.flatMap(hair=>bodies.map((body,b)=>[`headphones-${hair}-${body}`,{extra:'headphones',hair,body,skin:['russet','blue','purple'][b%3]}])),
 ...['backwardCap','cap','beanie'].flatMap(hat=>['bob','bun'].flatMap(hair=>bodies.map((body,b)=>[`${hat}-headphones-${hair}-${body}`,{hat,extra:'headphones',hair,body,skin:['russet','blue','purple'][b%3]}]))),
];
const allCases = mode === 'focused' ? focused : mode === 'accessories' ? accessoryCases : mode === 'matrix' ? hats.flatMap(hat => hairs.flatMap(hair => bodies.map((body,b) => [`${hat}-${hair}-${body}`, {hat,hair,body,skin:skins[(b+hairs.indexOf(hair))%skins.length]}]))) : bodies.flatMap(body => skins.flatMap(skin => [ ['headband', {body,skin,hat:'headband',hair:'curls'}], ['halo-headphones', {body,skin,hat:'halo',hair:'bun',extra:'headphones'}], ['santa', {body,skin,hat:'santa',hair:'waves'}], ['glasses', {body,skin,hair:'bob',eyewear:'catEye'}], ['earbuds', {body,skin,extra:'earbuds'}] ].map(([label,state]) => [`${body}-${skin}-${label}`,state])));
const match = process.env.AUDIT_MATCH || null;
const cases = match ? allCases.filter(([label]) => label.includes(match)) : allCases;
if (!cases.length) throw Error('No cases for mode ' + mode);
const port = 7200 + Math.floor(Math.random()*500);
const server = spawn(process.execPath, [join(appRoot,'scripts/serve.mjs'),'--port',String(port)], {stdio:'ignore'});
let browser;
const renderOptions = { size: mode === 'focused' ? 1024 : 256, background: false, thumbs: mode === 'matrix' };
const report = {mode,match,expectedCases:cases.length,date:new Date().toISOString(),renderSize:renderOptions.size,imageSource:renderOptions.thumbs?'256px thumbnail PNG inputs':'full source PNG inputs',renderOptions,proofBackground:'#edf6f3',cases:[],errors:[],cropFindings:[],sheets:[],visualInspection:'No aesthetic approval implied by these automated render checks. Inspect native contact proofs and representative sheets separately.'};
const sourceHash = createHash('sha256');
async function sourceFiles(directory) {
 const entries=await readdir(join(appRoot,directory),{withFileTypes:true});
 const files=[];
 for(const entry of entries) {
  const path=join(directory,entry.name);
  if(entry.isDirectory())files.push(...await sourceFiles(path));
  else if(entry.name.endsWith('.js'))files.push(path);
 }
 return files;
}
report.sourceFiles=[...await sourceFiles('src'),'assets/manifest.json'].sort();
for (const name of report.sourceFiles) sourceHash.update(name).update(await readFile(join(appRoot,name)));
report.sourceDigest = sourceHash.digest('hex');
try {
 await new Promise(r=>setTimeout(r,500));
 browser=await chromium.launch(process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']} : {});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://localhost:${port}/?shot=sheet`,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.body.dataset.rendered==='true',null,{timeout:60000});
 const renderSize = renderOptions.size;
 const frames=[];
 const batchSize = mode === 'focused' ? 1 : 12;
 for(let start=0;start<cases.length;start+=batchSize){
  const batch=cases.slice(start,start+batchSize).map(([label,state])=>({label,state:{...base,...state}}));
  const results=await page.evaluate(async({batch,renderOptions})=>{
   const {renderPotato}=await import('./src/raster.js');
   const {encodeState,decodeState}=await import('./src/state.js');
   const out=[],size=renderOptions.size;
   for(const {label,state} of batch){
    const hash=encodeState(state),roundTrip=decodeState(hash);
    for(const k of Object.keys(state))if(JSON.stringify(roundTrip[k])!==JSON.stringify(state[k]))throw Error(`Share mismatch ${label}/${k}`);
    const c=await renderPotato(state,renderOptions);
    const ctx=c.getContext('2d'),d=ctx.getImageData(0,0,size,size).data;
    let outside=0,opaque=0,edge=0;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(d[(y*size+x)*4+3]>180){opaque++;if(Math.hypot(x-size/2,y-size/2)>size*.496)outside++;if(x===0||y===0||x===size-1||y===size-1)edge++;}
    ctx.resetTransform();ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#edf6f3';ctx.fillRect(0,0,size,size);
    out.push({label,hash,url:c.toDataURL(),outside,opaque,edge});
   }
   return out;
  },{batch,renderOptions});
  for(const r of results){
   const png=Buffer.from(r.url.split(',')[1],'base64');
   const file=`${mode}-${r.label}.png`;
   if(mode==='focused')await writeFile(join(output,file),png);
   frames.push({label:r.label,input:png});
   report.cases.push({label:r.label,hash:r.hash,opaque:r.opaque,edge:r.edge,outsideCircle:r.outside,...(mode==='focused'?{file}:{} )});
   if(r.outside>Math.max(8,renderSize*renderSize*.00015)||r.edge>0||r.opaque<100)report.cropFindings.push({label:r.label,outside:r.outside,edge:r.edge,opaque:r.opaque});
  }
  await writeFile(join(output,`${mode}-report.json`),JSON.stringify(report,null,2)+'\n');
  console.log(`${mode}: ${Math.min(start+batchSize,cases.length)}/${cases.length}`);
 }
 const cell=mode==='focused'?384:256, cols=mode==='focused'?6:6, maxPerSheet=mode==='focused'?18:36;
 for(let offset=0;offset<frames.length;offset+=maxPerSheet){
  const chunk=frames.slice(offset,offset+maxPerSheet),composites=[];
  for(let i=0;i<chunk.length;i++){
   const left=(i%cols)*cell,top=Math.floor(i/cols)*(cell+24);
   composites.push({input:await sharp(chunk[i].input).resize(cell,cell).png().toBuffer(),left,top});
   const label=chunk[i].label.replaceAll('&','&amp;').replaceAll('<','&lt;');
   composites.push({input:Buffer.from(`<svg width="${cell}" height="24"><rect width="100%" height="100%" fill="#e3e7e6"/><text x="5" y="17" font-family="sans-serif" font-size="13">${label}</text></svg>`),left,top:top+cell});
  }
  const sheet=`${mode}-sheet-${offset/maxPerSheet+1}.png`;
  await sharp({create:{width:cols*cell,height:Math.ceil(chunk.length/cols)*(cell+24),channels:4,background:'#e3e7e6'}}).composite(composites).png().toFile(join(output,sheet));
  report.sheets.push(sheet);
 }
 if(report.errors.length||report.cropFindings.length)process.exitCode=1;
 console.log(JSON.stringify({mode,cases:report.cases.length,errors:report.errors,cropFindings:report.cropFindings,sourceDigest:report.sourceDigest}));
} catch(error) {
 report.errors.push(String(error?.stack||error));
 throw error;
} finally { await writeFile(join(output,`${mode}-report.json`),JSON.stringify(report,null,2)+'\n'); await browser?.close(); server.kill(); }
