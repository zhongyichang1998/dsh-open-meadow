import {DEFAULTS, normalize, QUALITY} from './settings.js';

// One visible 2D canvas. Local water/foliage layers move; rocks, boat and lighthouse stay fixed.
const canvas = document.querySelector('#motion');
const ctx = canvas.getContext('2d', {alpha: true});
const plate = document.querySelector('#plate');
const cloud = new Image();
cloud.src = 'cloud.png';
let state = {...DEFAULTS}, visible = true, disposed = false;
let timer = 0, frame = 0, clock = 0, lastTime = 0, width = 0, height = 0, dpr = 1;
let frames = 0, totalDrawMs = 0, maxDrawMs = 0, sampleCount = 0, lastDuration = 0;
let resizePending = false;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const cleanup = [];
const on = (target, type, fn) => {target.addEventListener(type, fn); cleanup.push(() => target.removeEventListener(type, fn));};
function random(seed) { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
// Shared wind drives foliage bend, water texture displacement, crest travel and clouds.
// Static offsets in the artwork are never changed outside the soft region masks.
const WIND = Object.freeze({
  calm: {grass: .12, water: .25, speed: .40, foam: .16, cloud: .65},
  breeze: {grass: 1, water: 1, speed: 1, foam: .44, cloud: 1},
  windy: {grass: 1.95, water: 1.8, speed: 1.65, foam: .64, cloud: 1.5},
});
const layer = () => {const c = document.createElement('canvas'); c.width = 1280; c.height = 720; return c;};
const waterLayer = layer(), waterMask = layer();
const waterCtx = waterLayer.getContext('2d'), maskCtx = waterMask.getContext('2d');
const seaBoundary = [[0,.476],[.51,.476],[.51,.50],[.59,.535],[.725,.553],[.715,.575],[.625,.625],[.44,.692],[.22,.77],[0,.825]];
function polygon(c, points) {
  c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x*1280,y*720) : c.moveTo(x*1280,y*720)); c.closePath();
}
// Feather only local water. Holes protect painted offshore rocks and shoreline boulders.
maskCtx.filter = 'blur(3px)'; polygon(maskCtx,seaBoundary); maskCtx.fillStyle = '#fff'; maskCtx.fill();
maskCtx.globalCompositeOperation = 'destination-out';
for (const [x,y,rx,ry] of [[.389,.519,.071,.014],[.531,.519,.064,.026],[.62,.526,.074,.031],[.652,.615,.052,.028],[.691,.578,.024,.015]]) {
  maskCtx.beginPath(); maskCtx.ellipse(x*1280,y*720,rx*1280,ry*720,0,0,Math.PI*2); maskCtx.fill();
}
maskCtx.fillRect(.165*1280,.742*720,.18*1280,.12*720);
// Separate standing clumps. The masks avoid the large foreground rock and beach.
const foliage = [
  {x:.675,y:.752,w:.245,h:.268,phase:.2,bend:21},
  {x:.881,y:.602,w:.140,h:.418,phase:1.1,bend:24},
  {x:.330,y:.899,w:.112,h:.121,phase:2.0,bend:15},
].map(p => {
  const c = document.createElement('canvas'); c.width=Math.ceil(p.w*2560); c.height=Math.ceil(p.h*1440);
  const mask = document.createElement('canvas'); mask.width=c.width; mask.height=c.height;
  const m=mask.getContext('2d');
  const gx=m.createLinearGradient(0,0,c.width,0); gx.addColorStop(0,'transparent');gx.addColorStop(.16,'#fff');gx.addColorStop(.84,'#fff');gx.addColorStop(1,'transparent');m.fillStyle=gx;m.fillRect(0,0,c.width,c.height);
  m.globalCompositeOperation='destination-in';const gy=m.createLinearGradient(0,0,0,c.height);gy.addColorStop(0,'transparent');gy.addColorStop(.15,'#fff');gy.addColorStop(.82,'#fff');gy.addColorStop(1,'transparent');m.fillStyle=gy;m.fillRect(0,0,c.width,c.height);
  return {...p,canvas:c,context:c.getContext('2d'),mask};
});

function running() { return !disposed && Boolean(ctx) && state.animation && visible && !document.hidden && !motion.matches; }
function stopLoop() {clearTimeout(timer); cancelAnimationFrame(frame); timer = frame = 0; lastTime = 0;}
function resize() {
  width = innerWidth; height = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, QUALITY[state.quality].dpr);
  // A 4K external display also receives a conservative backing-store budget.
  dpr = Math.min(dpr, Math.sqrt(3_800_000 / Math.max(1, width * height)));
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  if (!running()) draw();
}
function clouds(t) {
  if (!cloud.complete || !cloud.naturalWidth) return;
  // All clouds stay above y=.31: the original lighthouse starts at y=.32.
  // Repeated instances cross only outside the image; no visible reset.
  const layers = [
    {w: 910, y: 198, x: -230, speed: 4, alpha: .63},
    {w: 1170, y: 0, x: 910, speed: 9, alpha: .96},
    {w: 1030, y: 70, x: -550, speed: 7, alpha: .91},
  ];
  for (const layer of layers) {
    const h = layer.w * cloud.naturalHeight / cloud.naturalWidth;
    const period = 2560 + layer.w + 120;
    const position = ((layer.x + t * layer.speed * WIND[state.wind].cloud + layer.w + 60) % period) - layer.w - 60;
    ctx.globalAlpha = layer.alpha;
    ctx.drawImage(cloud, position, layer.y, layer.w, h);
    ctx.drawImage(cloud, position - period, layer.y, layer.w, h);
    ctx.drawImage(cloud, position + period, layer.y, layer.w, h);
  }
  ctx.globalAlpha = 1;
}
function ocean(t) {
  if (!plate.complete || !plate.naturalWidth) return;
  const wind=WIND[state.wind], speed=wind.speed, q=state.quality;
  const c=waterCtx; c.setTransform(1,0,0,1,0,0); c.globalCompositeOperation='source-over';c.clearRect(0,0,1280,720);
  const step=q==='eco'?10:6, sy=plate.naturalHeight/1440;
  for(let y=674;y<1200;y+=step){
    const depth=Math.max(0,(y-674)/510);
    const dx=(Math.sin(y*.041-t*1.6*speed)*4.8+Math.sin(y*.017+t*.8*speed)*2)*wind.water*depth;
    const dy=Math.sin(y*.033-t*1.9*speed)*2.7*wind.water*depth;
    c.drawImage(plate,0,(y+dy)*sy,plate.naturalWidth,step*sy,dx*.5,y*.5,1280,step*.5);
  }
  // Broad broken crests visibly travel towards the beach, not blinking fixed lines.
  c.setTransform(.5,0,0,.5,0,0);
  for(let i=0;i<QUALITY[q].ripples;i++){
    const x=random(i+20)*1550-80, base=710+random(i+80)*355;
    const phase=(t*.13*speed+random(i+170))%1;
    const y=base+phase*38, fade=Math.sin(phase*Math.PI), perspective=(base-670)/400;
    c.strokeStyle=`rgba(239,255,244,${wind.foam*fade*(.28+perspective*.6)})`;
    c.lineWidth=1.2+perspective*3.2;c.lineCap='round';
    c.setLineDash([12+random(i+46)*24,6+random(i+14)*15]);c.lineDashOffset=-t*9*speed;
    const length=90+perspective*160;c.beginPath();c.moveTo(x,y);
    c.bezierCurveTo(x+length*.3,y-6,x+length*.65,y+3,x+length,y-6);c.stroke();
  }
  c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='destination-in';c.drawImage(waterMask,0,0);c.globalCompositeOperation='source-over';
  ctx.drawImage(waterLayer,0,0,2560,1440);
}
function meadow(t) {
  if (!plate.complete || !plate.naturalWidth) return;
  const wind=WIND[state.wind], sourceX=plate.naturalWidth/2560, sourceY=plate.naturalHeight/1440;
  // Small row shears bend the original painted stems/flowers, with roots fixed.
  // Each clump has a different gust phase; no full-landscape translation or warp.
  for(const p of foliage){
    const c=p.context,w=p.canvas.width,h=p.canvas.height,step=state.quality==='eco'?8:4;
    c.globalCompositeOperation='source-over';c.clearRect(0,0,w,h);
    for(let y=0;y<h;y+=step){
      const rooted=1-y/h, envelope=Math.sin(rooted*Math.PI*.92)*rooted;
      const gust=Math.sin(t*1.25*wind.speed+p.phase+rooted*.65)*.78+Math.sin(t*.53*wind.speed+p.phase)*.22;
      const bend=gust*wind.grass*p.bend*envelope;
      c.drawImage(plate,p.x*2560*sourceX,(p.y*1440+y)*sourceY,w*sourceX,Math.min(step,h-y)*sourceY,bend,y,w,Math.min(step,h-y));
    }
    c.globalCompositeOperation='destination-in';c.drawImage(p.mask,0,0);c.globalCompositeOperation='source-over';
    ctx.drawImage(p.canvas,p.x*2560,p.y*1440);
  }
}
function draw(sample = false) {
  if (!ctx || disposed || !width) return;
  const start = performance.now();
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,width,height);
  // Match object-fit:cover and object-position:60% 50% of the plate exactly.
  const scale = Math.max(width / 2560, height / 1440);
  ctx.translate((width - 2560 * scale) * .60,(height - 1440 * scale) * .5);
  ctx.scale(scale,scale);
  clouds(clock);
  ctx.filter=state.daylight==='morning'?'brightness(1.035) saturate(.94)':state.daylight==='sunset'?'brightness(.94) saturate(.87)':'none';
  if (sample || state.animation && !motion.matches) {ocean(clock); meadow(clock);}
  ctx.filter='none';
  const glow = ctx.createRadialGradient(130,170,0,130,170,1700);
  glow.addColorStop(0, `rgba(255,249,211,${.018})`); glow.addColorStop(1,'rgba(255,249,211,0)');
  ctx.fillStyle = glow; ctx.fillRect(0,0,2560,1440);
  lastDuration = performance.now() - start; totalDrawMs += lastDuration; maxDrawMs = Math.max(maxDrawMs,lastDuration); sampleCount++; frames++;
}
function tick(now) {
  frame = 0;
  if (!running()) return;
  if (lastTime) clock += Math.min((now - lastTime) / 1000,.12);
  lastTime = now;
  draw();
  timer = setTimeout(() => {timer = 0; frame = requestAnimationFrame(tick);}, Math.max(0,1000 / QUALITY[state.quality].fps - lastDuration));
}
function reconcile() {
  stopLoop();
  if (running()) frame = requestAnimationFrame(tick);
  else draw();
}
function configure(next) {
  const previousQuality = state.quality;
  state = normalize(next);
  document.body.dataset.daylight = state.daylight;
  if (previousQuality !== state.quality) resize();
  reconcile();
}
on(window, 'message', event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'open-meadow:update') return;
  visible = event.data.visible !== false;
  configure(event.data.settings);
});
on(document, 'visibilitychange', reconcile);
on(motion, 'change', reconcile);
on(window, 'resize', () => {if (!resizePending) {resizePending = true; queueMicrotask(() => {resizePending = false; if (!disposed) resize();});}});
on(plate, 'load', () => {if (!running()) draw();});
on(cloud, 'load', () => {if (!running()) draw();});
on(cloud, 'error', () => {canvas.dataset.cloudError = 'true';});
function dispose() {
  if (disposed) return;
  disposed = true; stopLoop(); cleanup.splice(0).forEach(fn => fn());
  cloud.src = '';waterLayer.width=waterMask.width=0;foliage.forEach(p=>{p.canvas.width=p.mask.width=0;}); canvas.width = canvas.height = 0;
}
on(window, 'pagehide', dispose);
// Own-scene diagnostics only. No host DOM, chats, account state or network reads.
window.OpenMeadowRenderer = Object.freeze({
  getStats: () => ({frames, running: running(), timerActive: Boolean(timer || frame), width, height, dpr,
    canvasPixels: canvas.width * canvas.height, quality: state.quality, motionReduced: motion.matches, wind:state.wind, windParameters:WIND[state.wind], plateReady:plate.complete && plate.naturalWidth>0, cloudReady:cloud.complete && cloud.naturalWidth>0,
    drawMeanMs: sampleCount ? totalDrawMs / sampleCount : 0, drawMaxMs: maxDrawMs, clock}),
});
// Deterministic own-scene image sampling for region-by-region regression checks.
// It cannot access the host and never persists preferences or changes loop state.
export function sampleMotion(seconds, wind) {
  if (!Number.isFinite(seconds) || seconds<0 || seconds>3600 || !Object.hasOwn(WIND,wind)) throw new TypeError('Invalid scene sample');
  const savedClock=clock, savedState=state;
  try {clock=seconds;state={...state,wind};draw(true);
    const sample=document.createElement('canvas');sample.width=canvas.width;sample.height=canvas.height;
    const sc=sample.getContext('2d'),scale=Math.max(width/2560,height/1440);
    sc.setTransform(dpr*scale,0,0,dpr*scale,(width-2560*scale)*.60*dpr,(height-1440*scale)*.5*dpr);
    sc.drawImage(plate,0,0,2560,1440);sc.setTransform(1,0,0,1,0,0);sc.drawImage(canvas,0,0);
    return sample.toDataURL('image/png');}
  finally {clock=savedClock;state=savedState;draw();}
}
resize(); reconcile();
if (parent !== window) parent.postMessage({type:'open-meadow:ready'}, location.origin === 'null' ? '*' : location.origin);
