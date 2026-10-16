import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,developmentModule} from './playwright.mjs';
import {serve} from './server.mjs';
const {PNG}=developmentModule('pngjs');
const server=await serve(),browser=await chromium.launch({headless:true,args:['--disable-background-networking']});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const directory='artifacts/screenshots-v3';await mkdir(directory,{recursive:true});
const regions={water:[.035,.555,.27,.685],flowers:[.72,.79,.88,.96],grass:[.92,.68,.99,.94],boat:[.182,.764,.314,.83],lighthouse:[.818,.32,.863,.427],rock:[.495,.867,.647,.974]};
function delta(a,b,region){const[x0,y0,x1,y1]=region;let sum=0,count=0,changed=0;
 for(let y=Math.round(y0*a.height);y<y1*a.height;y++)for(let x=Math.round(x0*a.width);x<x1*a.width;x++){
  const i=(y*a.width+x)*4;let d=0;for(let j=0;j<3;j++){sum+=(a.data[i+j]-b.data[i+j])**2;d+=Math.abs(a.data[i+j]-b.data[i+j]);count++;}if(d>12)changed++;
 }return{rms:Math.sqrt(sum/count),changed};}
try{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(server.url+'/open-meadow/scene.html');
 await page.waitForFunction(()=>{const s=window.OpenMeadowRenderer?.getStats();return s?.plateReady&&s.cloudReady;});
 const samples={};
 for(const wind of ['calm','breeze','windy']){
  samples[wind]=[];
  for(let i=0;i<=10;i++){
   const data=await page.evaluate(async({time,wind})=>{
    const {sampleMotion}=await import('./renderer.js');return sampleMotion(time,wind);
   },{time:i*.4,wind});
   const buffer=Buffer.from(data.split(',')[1],'base64');samples[wind].push(PNG.sync.read(buffer));
   if([0,3,6,10].includes(i))await writeFile(`${directory}/scene-${wind}-${i}.png`,buffer);
  }
 }
 const energies={};for(const wind of Object.keys(samples)){
  energies[wind]={};for(const[region,rect]of Object.entries(regions)){
   const ds=samples[wind].slice(1).map((p,i)=>delta(samples[wind][i],p,rect));
   energies[wind][region]={meanRms:ds.reduce((s,d)=>s+d.rms,0)/ds.length,meanChangedPixels:ds.reduce((s,d)=>s+d.changed,0)/ds.length};
  }
 }
 console.log(JSON.stringify(energies,null,2));
 for(const region of ['water','flowers','grass']){
  assert.ok(energies.breeze[region].meanRms>1,`${region}: 微风可见变化不足`);
  assert.ok(energies.windy[region].meanRms>energies.calm[region].meanRms*2,`${region}: 强风与静风区别不足`);
 }
 for(const region of ['boat','lighthouse','rock'])for(const wind of Object.keys(samples))assert.equal(energies[wind][region].meanRms,0,`${wind} ${region} 应固定`);
 // Four-second live simulation: no sampling API is involved in this check.
 await page.emulateMedia({reducedMotion:'no-preference'});const before=await page.evaluate(()=>window.OpenMeadowRenderer.getStats());
 const a=PNG.sync.read(await page.screenshot());await page.waitForTimeout(4000);const b=PNG.sync.read(await page.screenshot());
 const live={};for(const[region,rect]of Object.entries(regions))live[region]=delta(a,b,rect);
 for(const region of ['water','flowers','grass'])assert.ok(live[region].changed>100,`${region}: 实时像素变化不足`);
 const after=await page.evaluate(()=>window.OpenMeadowRenderer.getStats());assert.ok(after.frames-before.frames>40);assert.ok(after.drawMeanMs<25);
 await writeFile('artifacts/motion-test-report-v3.json',JSON.stringify({version:'1.0.0-preview.3',environment:'Chromium, 1280×720, original painted water/grass regions sampled independently',regions,energies,live,performance:after,framesOverFourSeconds:after.frames-before.frames},null,2)+'\n');
 console.log('海水、花草和风力分区验证通过。平均绘制',after.drawMeanMs.toFixed(2),'ms');
}finally{await browser.close();await server.close();}
