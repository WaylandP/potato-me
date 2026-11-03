#!/usr/bin/env node
// Attachment review: every listed case is recorded, successful rendering is
// not visual approval. Full PNG inputs are the default; interactions use the
// real thumbnail inputs unless AUDIT_SOURCE=full is specified.
//
// node scripts/audit-attachments.mjs <output> <reported|inventory|materials|interactions> [--plan]
// AUDIT_GROUPS=hat,hair  AUDIT_MATCH=flowerCrown  AUDIT_LIMIT=6
// AUDIT_SOURCE=full|thumbs  AUDIT_SIZE=1024  AUDIT_PORT=8201  CHROME_EXECUTABLE=/path/to/chromium
// Filters and limits are written into the report; they never count as full coverage.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { OPTIONS, DEFAULT_STATE, CHARACTER_LOOKS, BODY_PROFILES } from '../src/options.js';
import { PARTS } from '../src/assets.js';
import { FIT } from '../src/fit-data.js';
import { drawableState, layersFor } from '../src/raster.js';
import { pairwiseCases, verifyPairCoverage } from './pairwise.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(process.argv[2] || '/tmp/potato-attachments');
const mode = process.argv[3] || 'reported';
if (!['reported', 'inventory', 'materials', 'interactions'].includes(mode)) throw Error('Unknown audit mode');
const planOnly = process.argv.includes('--plan');
const groups = ['hat', 'hair', 'facialHair', 'eyewear', 'neckwear', 'jewelry', 'extra', 'item', 'gesture'];
const bodies = Object.keys(OPTIONS.body), skins = Object.keys(OPTIONS.skin);
const hairs = Object.keys(OPTIONS.hair), hairColors = Object.keys(OPTIONS.hairColor), accents = Object.keys(OPTIONS.hatColor);
const keys = group => Object.keys(PARTS[group]);
const accessories = ['eyewear', 'neckwear', 'jewelry', 'extra'];
const baseline = { ...DEFAULT_STATE, hat:'none', hair:'none', hairColor:'chestnut', hatColor:'red', item:'none', gesture:'rest', eyewear:'none', neckwear:'none', jewelry:'none', extra:'none', capText:'', stickers:[], bg:'cream', pattern:'solid' };
const screenshot = { ...baseline, ...CHARACTER_LOOKS.female, character:'female', body:'lumpy', skin:'gold', hair:'waves', hairColor:'silver', hat:'flowerCrown', hatColor:'black', eyewear:'catEye', item:'phone', gesture:'wave' };
const cohorts = [];
function add(name, entries, meta = {}) {
 cohorts.push({ name, ...meta, cases: entries.map((entry, index) => ({
  id:`${name}/${entry.label || index + 1}`, cohort:name, group:meta.group || entry.group || 'stack',
  focus:meta.focus || entry.focus || 'head', ...entry, state:{...baseline,...entry.state},
 })) });
}
const contextCases = (group, key) => bodies.flatMap(body => skins.map(skin => ({
 label:`${body}-${skin}`, state:{body,skin,[group]:key},
})));
let pairCoverage;
if (mode === 'reported') {
 add('reported', [
  { label:'lumpy-gold-silver-flower', state:screenshot },
  { label:'without-flower', state:{...screenshot,hat:'none'} },
  { label:'without-hair', state:{...screenshot,hair:'none',jewelry:'none'} },
  { label:'chestnut-control', state:{...screenshot,hairColor:'chestnut'} },
  { label:'without-glasses', state:{...screenshot,eyewear:'none'} },
  ...['blue','purple'].map(skin=>({label:`contrast-${skin}`,state:{...screenshot,skin}})),
  ...bodies.filter(body=>body!=='lumpy').map(body=>({label:`shape-${body}`,state:{...screenshot,body}})),
 ], { group:'hat',focus:'head', note:'Reconstruction of visible screenshot choices. Unshared facial details use the female starter; every actual state is recorded.' });
} else if (mode === 'inventory') {
 for (const group of groups) for (const key of group==='facialHair'?Object.keys(OPTIONS.facialHair):keys(group)) add(`${group}-${key}`, contextCases(group,key), {
  group, part:key, focus:['item','gesture'].includes(group)?'arms':group==='neckwear'?'torso':'head',
  matrix:{ rows:bodies, columns:skins },
 });
} else if (mode === 'materials') {
 for (const key of keys('hair')) add(`hair-${key}`, bodies.flatMap((body,b)=>hairColors.map(hairColor=>({
  label:`${body}-${hairColor}`, materialSet:`hair/${key}/${body}`, material:hairColor,
  state:{body,skin:['gold','blue','purple','ghost','red','zombie'][b],hair:key,hairColor},
 }))), {group:'hair',part:key,focus:'head',matrix:{rows:bodies,columns:hairColors}});
 for (const [group,parts] of Object.entries(FIT.recolor)) for (const key of parts) add(`${group}-${key}`, bodies.flatMap((body,b)=>accents.map(hatColor=>({
  label:`${body}-${hatColor}`, materialSet:`${group}/${key}/${body}`, material:hatColor,
  state:{body,skin:['blue','gold','purple','ghost','red','zombie'][b],hair:['scrunchie'].includes(key)?'waves':'none',[group]:key,hatColor},
 }))), {group,part:key,focus:group==='item'?'arms':group==='neckwear'?'torso':'head',matrix:{rows:bodies,columns:accents}});
} else {
 for (const hat of keys('hat')) add(`hat-hair-${hat}`, hairs.flatMap((hair,h)=>bodies.map((body,b)=>({
  label:`${hair}-${body}`, state:{hat,hair,body,skin:skins[(h+b)%skins.length],hairColor:hairColors[(h+b)%hairColors.length],hatColor:accents[(h*3+b)%accents.length]},
 }))), {group:'hat',part:hat,focus:'head'});
 for (const group of accessories) for (const key of keys(group)) add(`${group}-hair-${key}`, hairs.filter(h=>h!=='none').flatMap((hair,h)=>bodies.map((body,b)=>({
  label:`${hair}-${body}`,state:{[group]:key,hair,body,skin:skins[(h+b)%skins.length],hairColor:hairColors[(h+b)%hairColors.length],hatColor:accents[(h*3+b)%accents.length]},
 }))), {group,part:key,focus:group==='neckwear'?'torso':'head'});
 for (const hat of keys('hat')) add(`headphones-hat-${hat}`, hairs.flatMap((hair,h)=>bodies.map((body,b)=>({
  label:`${hair}-${body}`,state:{hat,hair,body,extra:'headphones',skin:skins[(h+b)%skins.length],hairColor:hairColors[(h+b)%hairColors.length],hatColor:accents[(h*3+b)%accents.length]},
 }))), {group:'extra',part:'headphones',focus:'head'});
 add('beard-scarf-palettes',bodies.flatMap((body,b)=>hairColors.map(hairColor=>({
  label:`${body}-${hairColor}`,state:{body,skin:skins[b],hair:'waves',hairColor,facialHair:'beard',neckwear:'scarf',hatColor:'navy'},
 }))),{group:'facialHair',part:'beard',focus:'torso',note:'Scalp palettes with the original facial-hair material; inspect beard edges and scarf contact. This does not assume facial hair follows the scalp color selector.'});
 const factors={body:bodies,skin:skins,item:keys('item'),gesture:keys('gesture')};
 const pairs=pairwiseCases(factors,20261103);pairCoverage=verifyPairCoverage(factors,pairs);
 if(pairCoverage.missing.length)throw Error('Arm pair generation left uncovered pairs');
 add('arm-pairs',pairs.map((state,index)=>({label:String(index+1).padStart(4,'0'),state})),{group:'arms',focus:'arms',note:'All pairs across item, gesture, body and skin; not every four-way combination.'});
}

const groupFilter = process.env.AUDIT_GROUPS?.split(',').filter(Boolean) || [];
const match = process.env.AUDIT_MATCH || null, limit = Number(process.env.AUDIT_LIMIT || 0);
let cases=cohorts.flatMap(c=>c.cases);
for(const entry of cases)for(const [group,value] of Object.entries(entry.state))if(OPTIONS[group]&&!Object.hasOwn(OPTIONS[group],value))throw Error(`Invalid planned option ${entry.id}: ${group}=${value}`);
const unfilteredCount=cases.length;
if(groupFilter.length)cases=cases.filter(c=>groupFilter.includes(c.group));
if(match)cases=cases.filter(c=>c.id.includes(match));
if(limit>0)cases=cases.slice(0,limit);
if(!cases.length)throw Error('Filters selected no cases');
const size=Number(process.env.AUDIT_SIZE || (mode==='reported'?1024:256));
if(![256,512,1024].includes(size))throw Error('AUDIT_SIZE must be256,512,or1024');
const imageSource=process.env.AUDIT_SOURCE || (mode==='interactions'?'thumbs':'full');
if(!['full','thumbs'].includes(imageSource))throw Error('AUDIT_SOURCE must befullorthumbs');
const renderOptions={size,background:false,thumbs:imageSource==='thumbs'};
await mkdir(output,{recursive:true});
await writeFile(join(output,'spec.json'),JSON.stringify({mode,unfilteredCount,selectedCount:cases.length,filters:{groups:groupFilter,match,limit},imageSource,renderOptions,cohorts:cohorts.map(({cases,...c})=>({...c,count:cases.length})),pairCoverage,cases},null,2)+'\n');
if(planOnly){console.log(JSON.stringify({mode,unfilteredCount,selectedCount:cases.length,cohorts:cohorts.length,pairCoverage:pairCoverage&&{cases:pairCoverage.cases,coveredPairs:pairCoverage.coveredPairs}}));process.exit(0);}

const require=createRequire(import.meta.url),{chromium}=require('playwright'),sharp=require('sharp');
async function sourceFiles(dir){const names=[];for(const e of await readdir(join(root,dir),{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())names.push(...await sourceFiles(p));else if(e.name.endsWith('.js'))names.push(p);}return names;}
const files=[...await sourceFiles('src'),'assets/manifest.json'].sort();
async function digestSources(){const hash=createHash('sha256');for(const file of files)hash.update(file).update(await readFile(join(root,file)));return hash.digest('hex');}
const report={mode,started:new Date().toISOString(),status:'running',sourceFiles:files,sourceDigest:await digestSources(),imageSource,renderOptions,filters:{groups:groupFilter,match,limit},unfilteredCount,expectedCases:cases.length,cases:[],errors:[],findings:[],sheets:[],timing:[],pairCoverage,checks:{attachment:'Raw source alpha and the renderer fitting functions; recolor effects are checked separately against final rendered alpha.',crop:'Final output alpha, excluding the review-sheet background.',materials:'Final rendered alpha comparison within each fixed body/part material set; this checks geometry, not the artistic quality of color.',coverage:'Only listed states. Pair coverage is not a full four-way outfit Cartesian product.'},visualInspection:'Pending. Render, crop, attachment and material invariance checks do not establish artistic acceptance.'};
// Hash every source PNG actually used by the planned cases. This includes the
// specific body/skin files, so a changed body asset cannot hide behind a JS hash.
const assetPaths=new Set();
const imageDir=`assets/${imageSource==='thumbs'?'thumbs':'parts'}`;
for(const entry of cases){const state=drawableState(entry.state);for(const layer of layersFor(state))assetPaths.add(`${imageDir}/${layer.group}/${layer.key}.png`);if(BODY_PROFILES[state.body].size<1)assetPaths.add(`${imageDir}/body/classic-${state.skin}.png`);}
report.assetFiles=[];for(const file of [...assetPaths].sort())report.assetFiles.push({file,sha256:createHash('sha256').update(await readFile(join(root,file))).digest('hex')});
const port=Number(process.env.AUDIT_PORT || 8200+Math.floor(Math.random()*400));
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('AUDIT_PORT must be an integer from 1024 to 65535');
report.port=port;
const server=spawn(process.execPath,[join(root,'scripts/serve.mjs'),'--port',String(port)],{stdio:'ignore'});
let browser;
const checkpoint=()=>writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const safe=name=>name.replace(/[^A-Za-z0-9_-]/g,'-');
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
async function sheet(name,frames,cols,kind='contact'){
 if(!frames.length)return;
 const cell=256,labelHeight=44,layers=[];
 for(let i=0;i<frames.length;i++){
  const f=frames[i],left=(i%cols)*cell,top=Math.floor(i/cols)*(cell+labelHeight);
  let pipeline=sharp(f.png);
  if(kind==='contact'){
   const crop=f.contact;
   pipeline=pipeline.extract({left:Math.max(0,Math.round(crop[0]*size/1024)),top:Math.max(0,Math.round(crop[1]*size/1024)),width:Math.round(crop[2]*size/1024),height:Math.round(crop[3]*size/1024)});
  }
  layers.push({input:await pipeline.resize(cell,cell,{fit:'contain',background:'#edf6f3'}).png().toBuffer(),left,top});
  const lines=[`${f.state.body} / ${f.state.skin}`,f.label.length>38?f.label.slice(0,38):f.label];
  layers.push({input:Buffer.from(`<svg width="256" height="44"><rect width="256" height="44" fill="#e3e7e6"/><text x="4" y="16" font-family="sans-serif" font-size="11">${xml(lines[0])}</text><text x="4" y="34" font-family="sans-serif" font-size="10">${xml(lines[1])}</text></svg>`),left,top:top+cell});
 }
 const file=`${safe(name)}.png`;await sharp({create:{width:cols*cell,height:Math.ceil(frames.length/cols)*(cell+labelHeight),channels:4,background:'#e3e7e6'}}).composite(layers).png().toFile(join(output,file));report.sheets.push({file,kind,cases:frames.map(f=>f.id)});
}
try{
 await new Promise(r=>setTimeout(r,500));
 browser=await chromium.launch(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}:{});
 report.browser=browser.version();
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${new URL(r.url()).pathname}`);});
 await page.goto(`http://localhost:${port}/?shot=attachments`,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.body.dataset.rendered==='true');
 // Developer audit helper only. It reads actual alpha masks and renders through
 // the same public module as the app; no production/browser state is modified.
 await page.evaluate(async()=>{
  const raster=await import('./src/raster.js'),surfaceApi=await import('./src/surface.js'),{PARTS}=await import('./src/assets.js'),{FIT}=await import('./src/fit-data.js'),{BODY_PROFILES}=await import('./src/options.js'),stateApi=await import('./src/state.js'),{splitWearable}=await import('./src/wrap.js');
  const make=()=>{const c=document.createElement('canvas');c.width=c.height=256;return c;};
  const pixels=c=>c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;
  const materialAlphas=new Map(),bodyData=new WeakMap();
  const bodyPixels=img=>{if(!bodyData.has(img)){const c=make();c.getContext('2d').drawImage(img,0,0,256,256);bodyData.set(img,pixels(c));}return bodyData.get(img);};
  const alpha=(data,x,y)=>x<0||y<0||x>=256||y>=256?0:data[(Math.round(y)*256+Math.round(x))*4+3]||0;
  const hashAlpha=data=>{let hash=2166136261;for(let i=3;i<data.length;i+=4)hash=Math.imul(hash^data[i],16777619);return (hash>>>0).toString(16).padStart(8,'0');};
  const finite=value=>typeof value==='number'?Number.isFinite(value):Array.isArray(value)?value.every(finite):value&&typeof value==='object'?Object.values(value).every(finite):true;
  async function geometry(state,thumbs){
   const layers=raster.layersFor(state),imgs=await Promise.all(layers.map(l=>raster.loadImage(raster.partSrc(l.group,l.key,thumbs))));
   const body=imgs[layers.findIndex(l=>l.group==='body')];let surface=surfaceApi.bodySurface(body,state.body);
   const hi=layers.findIndex(l=>l.group==='hair'),ht=hi<0?null:surfaceApi.surfaceTransform(layers[hi],imgs[hi],surface,state);
   if(ht)surface=surfaceApi.withHairSurface(surface,imgs[hi],state.hair,ht);
   const transforms=layers.map((l,i)=>i===hi?ht:l.group==='body'?l.transform:surfaceApi.surfaceTransform(l,imgs[i],surface,state));
   return {layers,imgs,body,surface,transforms};
  }
  window.auditAttachmentCase=async(entry,options)=>{
   const state=raster.drawableState(entry.state),hash=stateApi.encodeState(state),decoded=stateApi.decodeState(hash);
   for(const key of Object.keys(state))if(JSON.stringify(state[key])!==JSON.stringify(decoded[key]))throw Error(`Share mismatch ${entry.id}/${key}`);
   const begun=performance.now(),g=await geometry(state,options.thumbs),findings=[],metrics={};
   const bp=bodyPixels(g.body);
   for(let i=0;i<g.layers.length;i++){
    const layer=g.layers[i],t=g.transforms[i];
    if(!finite(t)||!(t.scale>0))findings.push({check:'finite-positive-transform',group:layer.group,key:layer.key});
    if(t.root){
     const c=make(),ctx=c.getContext('2d');ctx.scale(.25,.25);surfaceApi.drawTransformed(ctx,g.imgs[i],layer.group,layer.key,t);const ap=pixels(c);
     const [rx,ry]=t.root.map(v=>v/4);let overlap=0,limbPixels=0;
     for(let y=Math.max(0,Math.floor(ry-18));y<=Math.min(255,Math.ceil(ry+18));y++)for(let x=Math.max(0,Math.floor(rx-18));x<=Math.min(255,Math.ceil(rx+18));x++)if(Math.hypot(x-rx,y-ry)<=18){if(alpha(ap,x,y)>180){limbPixels++;if(alpha(bp,x,y)>180)overlap++;}}
     const bodyAlpha=alpha(bp,rx,ry);metrics[`${layer.group}/${layer.key}`]={root:t.root,bodyAlpha,limbPixelsNearRoot:limbPixels,overlapPixelsNearRoot:overlap};
     if(bodyAlpha<128||overlap<2)findings.push({check:'arm-body-alpha-contact',group:layer.group,key:layer.key,bodyAlpha,overlapPixels:overlap,root:t.root});
    }
    if(t.temples){
     const points=t.temples.map(arm=>surfaceApi.fittedPoint(layer.group,layer.key,t,arm.end));
     const samples=points.map(([x,y],side)=>({point:[x,y],inwardBodyAlpha:alpha(bp,x/4+(side?-2:2),y/4)}));metrics[`${layer.group}/${layer.key}`]={temples:samples};
     if(samples.some(p=>p.inwardBodyAlpha<128))findings.push({check:'temple-body-alpha-contact',group:layer.group,key:layer.key,samples});
    }
    if(layer.group==='extra'&&layer.key==='earbuds'){
     const points=[[486,432],[538,432]].map((p,side)=>{const at=surfaceApi.fittedPoint('extra','earbuds',t,p);at[0]+=(side?1:-1)*t.spread;return at;});
     const samples=points.map(point=>({point,bodyAlpha:alpha(bp,point[0]/4,point[1]/4)}));metrics.earbuds=samples;
     if(samples.some(p=>p.bodyAlpha<128))findings.push({check:'earbud-insertion-alpha',samples});
    }
    if(layer.group==='hat'&&layer.key==='halo'){
     const box=PARTS.hat.halo,bottom=surfaceApi.fittedPoint('hat','halo',t,[(box[0]+box[2])/2,box[3]])[1];let receiverTop=g.surface.headTop??g.surface.crownY;
     const hp=g.layers.findIndex(l=>l.group==='extra'&&l.key==='headphones');if(hp>=0){const b=PARTS.extra.headphones;receiverTop=Math.min(receiverTop,surfaceApi.fittedPoint('extra','headphones',g.transforms[hp],[(b[0]+b[2])/2,b[1]])[1]);}
     metrics.haloClearance=receiverTop-bottom;if(metrics.haloClearance<16)findings.push({check:'halo-clearance',clearance:metrics.haloClearance});
    }
    if(layer.group==='hat'&&layer.key==='flowerCrown'){
     // Independent landmarks on the inward rear twig ends. These are source
     // artwork witnesses, not a copy of FIT.wrap's clipping path.
     const witnesses=[[426,319],[448,327],[596,319],[576,324]];
     const pieces=splitWearable(g.imgs[i],'hat','flowerCrown',state),c=make(),ctx=c.getContext('2d');ctx.drawImage(pieces.front,0,0,256,256);const fp=pixels(c);
     const source=make();source.getContext('2d').drawImage(g.imgs[i],0,0,256,256);const sp=pixels(source);
     metrics.rearTwigWitnesses=witnesses.map(point=>({sourcePoint:point,originalAlpha:alpha(sp,point[0]/4,point[1]/4),frontAlpha:alpha(fp,point[0]/4,point[1]/4)}));
     for(const witness of metrics.rearTwigWitnesses)if(witness.originalAlpha>180&&witness.frontAlpha>32)findings.push({check:'rear-twig-retained-in-front-piece',...witness});
    }
   }
   const canvas=await raster.renderPotato(state,options),data=pixels(canvas);let opaque=0,outside=0,edge=0;
   for(let y=0;y<options.size;y++)for(let x=0;x<options.size;x++)if(data[(y*options.size+x)*4+3]>180){opaque++;if(Math.hypot(x-options.size/2,y-options.size/2)>options.size*.496)outside++;if(!x||!y||x===options.size-1||y===options.size-1)edge++;}
   metrics.crop={opaque,outsideCircle:outside,edge};if(outside>Math.max(8,options.size**2*.00015)||edge||opaque<100)findings.push({check:'opaque-crop-bounds',...metrics.crop});
   metrics.alphaSignature=hashAlpha(data);
   if(entry.materialSet){
    const first=materialAlphas.get(entry.materialSet);if(first){let changed=0,maxDelta=0;for(let i=3;i<data.length;i+=4){const delta=Math.abs(data[i]-first.data[i]);maxDelta=Math.max(maxDelta,delta);if(delta>2)changed++;}metrics.materialAlpha={reference:first.material,changedPixels:changed,maxDelta};if(changed)findings.push({check:'color-changes-alpha-or-placement',reference:first.material,changedPixels:changed,maxDelta});}
    else materialAlphas.set(entry.materialSet,{material:entry.material,data:new Uint8ClampedArray(data)});
   }
   const ctx=canvas.getContext('2d');ctx.resetTransform();ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#edf6f3';ctx.fillRect(0,0,options.size,options.size);
   return {state,hash,metrics,findings,milliseconds:performance.now()-begun,url:canvas.toDataURL('image/png'),contact:entry.focus==='arms'?[0,300,1024,600]:entry.focus==='torso'?[100,320,824,580]:[120,0,784,640]};
  };
 });
 let completed=0;
 for(const cohort of cohorts){
  const selected=cases.filter(c=>c.cohort===cohort.name);if(!selected.length)continue;
  const frames=[];
  for(let start=0;start<selected.length;start+=6){
   const batch=selected.slice(start,start+6),begun=Date.now();
   const results=await page.evaluate(async({batch,options})=>{const out=[];for(const entry of batch)out.push(await window.auditAttachmentCase(entry,options));return out;},{batch,options:renderOptions});
   for(let i=0;i<results.length;i++){
    const {url,...result}=results[i],entry=batch[i],png=Buffer.from(url.split(',')[1],'base64');
    const file=`proof-${safe(entry.id)}.png`;
    if(mode==='reported'||size===1024||result.findings.length)await writeFile(join(output,file),png);
    report.cases.push({...entry,...result,...(mode==='reported'||size===1024||result.findings.length?{file}:{})});
    report.findings.push(...result.findings.map(f=>({id:entry.id,...f})));
    frames.push({...entry,...result,png});completed++;
   }
   const elapsed=Date.now()-begun;report.timing.push({cohort:cohort.name,cases:batch.length,milliseconds:elapsed});
   const mean=report.timing.reduce((n,t)=>n+t.milliseconds,0)/completed;
   await checkpoint();console.log(JSON.stringify({mode,completed,total:cases.length,batchMilliseconds:elapsed,estimatedRemainingSeconds:Math.round((cases.length-completed)*mean/1000),findings:report.findings.length}));
  }
  if(mode==='inventory'){
   await sheet(`${cohort.name}-context-contacts`,frames,9);
   const shapeFrames=bodies.map((body,b)=>frames.find(f=>f.state.body===body&&f.state.skin===skins[(b+groups.indexOf(cohort.group))%skins.length]));
   const skinFrames=skins.map((skin,s)=>frames.find(f=>f.state.skin===skin&&f.state.body===bodies[s%bodies.length]));
   await sheet(`${cohort.name}-six-shapes`,shapeFrames.filter(Boolean),6,'whole');
   await sheet(`${cohort.name}-nine-skins`,skinFrames.filter(Boolean),9,'whole');
  }else for(let start=0;start<frames.length;start+=36){await sheet(`${cohort.name}-contacts-${start/36+1}`,frames.slice(start,start+36),6);await sheet(`${cohort.name}-whole-${start/36+1}`,frames.slice(start,start+36),6,'whole');}
  await checkpoint();
 }
 report.status=report.errors.length||report.findings.length?'findings':'complete';report.completed=new Date().toISOString();
 report.finishedSourceDigest=await digestSources();report.sourceFilesUnchangedDuringRun=report.finishedSourceDigest===report.sourceDigest;
 report.changedAssetFiles=[];for(const asset of report.assetFiles){const now=createHash('sha256').update(await readFile(join(root,asset.file))).digest('hex');if(now!==asset.sha256)report.changedAssetFiles.push({file:asset.file,before:asset.sha256,after:now});}
 if(report.errors.length||report.findings.length)process.exitCode=1;
 console.log(JSON.stringify({mode,status:report.status,cases:report.cases.length,findings:report.findings.length,errors:report.errors,sourceDigest:report.sourceDigest}));
}catch(error){report.status='error';report.errors.push(String(error?.stack||error));throw error;}
finally{await checkpoint();await browser?.close();server.kill();}
