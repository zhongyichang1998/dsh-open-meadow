import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,developmentModule} from './playwright.mjs';
import {serve} from './server.mjs';
const server=await serve();const browser=await chromium.launch({headless:true,args:['--disable-background-networking']});
await mkdir('artifacts/screenshots-v3',{recursive:true});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2});const page=await context.newPage();
const checks=[],errors=[],requests=new Set();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.add(r.url()));
const check=async(name,fn)=>{await fn();checks.push(name);console.log('✓',name);};
const settings=()=>page.locator('#open-meadow-settings');
const open=async()=>{if(await page.locator('#fixture-settings').isHidden()){if(await page.locator('#settings-trigger').isVisible())await page.locator('#settings-trigger').click();else await page.keyboard.press('Meta+,');}};
const close=async()=>page.keyboard.press('Escape');
const waitScene=async()=>page.waitForFunction(()=>document.querySelector('#open-meadow-scene')?.contentWindow?.OpenMeadowRenderer?.getStats().cloudReady);
const stats=()=>page.locator('#open-meadow-scene').evaluate(el=>el.contentWindow.OpenMeadowRenderer.getStats());
const background=async value=>settings().locator('[name="background"]').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
try{
 await page.addInitScript(()=>{if(!localStorage.getItem('open-meadow.settings.v1'))localStorage.setItem('open-meadow.settings.v1',JSON.stringify({glass:70,enabled:true,animation:true,wind:'breeze',daylight:'noon',quality:'balanced'}));});
 await page.goto(server.url);await waitScene();
 await check('no floating leaf; theme controls are in native settings slot only',async()=>{assert.equal(await page.locator('#open-meadow-launcher').count(),0);assert.ok(await settings().isHidden());await open();assert.ok(await settings().isVisible());});
 await check('all theme UI text is Chinese',async()=>{assert.doesNotMatch(await settings().innerText(),/[A-Za-z]/);assert.equal(await settings().getAttribute('aria-label'),'海风与草甸主题');});
 await check('legacy opaque default migrates to 70% background visibility',async()=>{assert.equal(await settings().locator('[name="background"]').inputValue(),'70');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('open-meadow.settings.v1')).version),2);});
 await check('one 30% shell, no whole-window blur, protected input/code/menu surfaces',async()=>{
  const v=await page.evaluate(()=>{const style=el=>getComputedStyle(document.querySelector(el));return{shell:style('.app-frame').backgroundColor,blur:style('.app-frame').backdropFilter,composer:style('.composer').backgroundColor,code:style('.code').backgroundColor};});
  assert.match(v.shell,/0.3\)/);assert.equal(v.blur,'none');assert.match(v.composer,/0.96\)/);assert.match(v.code,/0.97\)/);
 });
 await check('higher visibility actually reduces the shell opacity',async()=>{
  await background(90);assert.match(await page.locator('.app-frame').evaluate(el=>getComputedStyle(el).backgroundColor),/0.1\)/);
  await background(20);assert.match(await page.locator('.app-frame').evaluate(el=>getComputedStyle(el).backgroundColor),/0.8\)/);
 });
 await check('all settings survive reload without resetting custom choices',async()=>{
  await background(83);await settings().locator('[name="wind"][value="windy"]').check();await settings().locator('[name="daylight"][value="sunset"]').check();await settings().locator('[name="quality"][value="eco"]').check();
  await page.reload();await waitScene();await open();assert.equal(await settings().locator('[name="background"]').inputValue(),'83');assert.ok(await settings().locator('[name="wind"][value="windy"]').isChecked());assert.equal((await stats()).quality,'eco');
 });
 await check('disabled theme still has native settings entry after restart',async()=>{
  await settings().locator('[name="enabled"]').uncheck();assert.equal(await page.locator('#open-meadow-scene').count(),0);assert.equal(await page.evaluate(()=>fixtureLayers()),0);
  await page.reload();await open();assert.ok(await settings().isVisible());assert.ok(!(await settings().locator('[name="enabled"]').isChecked()));
  await settings().locator('[name="enabled"]').check();await waitScene();
 });
 await check('animation stops completely and resumes',async()=>{
  await settings().locator('[name="animation"]').uncheck();await page.waitForTimeout(100);const a=await stats();await page.waitForTimeout(400);assert.equal((await stats()).frames,a.frames);
  await settings().locator('[name="animation"]').check();await page.waitForTimeout(350);assert.ok((await stats()).frames>a.frames);
 });
 await check('reduced-motion and hidden-document pause are preserved',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const a=await stats();await page.waitForTimeout(250);assert.equal((await stats()).frames,a.frames);await page.emulateMedia({reducedMotion:'no-preference'});
  const frame=page.frames().find(f=>f.url().includes('/open-meadow/scene.html'));await frame.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(100);const b=await stats();await page.waitForTimeout(250);assert.equal((await stats()).frames,b.frames);await frame.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 });
 await check('known background conflict suspends only own surface',async()=>{
  await page.evaluate(()=>{const other=document.createElement('div');other.id='__open-sea-skin__';document.body.append(other);});await page.waitForFunction(()=>!document.querySelector('#open-meadow-scene'));
  assert.match(await settings().locator('[data-conflict]').innerText(),/海洋背景/);assert.doesNotMatch(await settings().innerText(),/[A-Za-z]/);await page.evaluate(()=>document.getElementById('__open-sea-skin__').remove());await waitScene();
 });
 await check('reset restores clear defaults; Escape returns to the workspace',async()=>{await settings().locator('[data-reset]').click();assert.equal(await settings().locator('[name="background"]').inputValue(),'70');await close();assert.ok(await settings().isHidden());});
 await check('input stays interactive above scenery',async()=>{await page.locator('textarea').fill('主题输入检查');assert.equal(await page.locator('textarea').inputValue(),'主题输入检查');await page.locator('textarea').fill('');});
 await check('slot lifetime is clean under repeated loads and unload',async()=>{
  for(let i=0;i<5;i++)await page.addScriptTag({url:server.url+'/plugin/client.js'});await waitScene();assert.equal(await settings().count(),1);assert.equal(await page.locator('#open-meadow-scene').count(),1);
  await page.evaluate(()=>fixtureStop());assert.equal(await page.locator('[id^="open-meadow-"]').count(),0);assert.equal(await page.evaluate(()=>fixtureLayers()),0);await page.evaluate(()=>fixtureStart());await waitScene();
 });
 await open();await settings().locator('[name="animation"]').uncheck();
 for(const [width,height,label]of [[1440,900,'16x10'],[2560,1440,'16x9'],[640,780,'compact']]){
  await page.setViewportSize({width,height});for(const dark of [false,true]){await page.evaluate(d=>document.body.toggleAttribute('data-ds-dark-theme',d),dark);await open();await settings().scrollIntoViewIfNeeded();
   await page.screenshot({path:resolve(`artifacts/screenshots-v3/browser-settings-${label}-${dark?'dark':'light'}.png`),scale:'css'});
   const box=await settings().boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);await close();
   await page.screenshot({path:resolve(`artifacts/screenshots-v3/browser-workspace-${label}-${dark?'dark':'light'}.png`),scale:'css'});
  }
 }
 await check('inline controls fit wide and compact native settings layouts',async()=>{});
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>document.body.removeAttribute('data-ds-dark-theme'));await open();await settings().locator('[data-reset]').click();await close();
 const a=await stats();await page.waitForTimeout(2000);const b=await stats();assert.ok(b.clock-a.clock>1.5);assert.ok(b.frames>a.frames+15);
 await check('visible unfocused workspace continues gentle animation',async()=>{});
 const scenePage=await context.newPage();await scenePage.emulateMedia({reducedMotion:'reduce'});await scenePage.goto(server.url+'/open-meadow/scene.html');await scenePage.waitForFunction(()=>window.OpenMeadowRenderer?.getStats().cloudReady);
 const png=await scenePage.screenshot({path:resolve('artifacts/screenshots-v3/scene-static.png'),scale:'css'}),baseline=await readFile('tests/baselines/scene.png');
 const{PNG}=developmentModule('pngjs');const p=PNG.sync.read(png),q=PNG.sync.read(baseline);assert.equal(p.width,q.width);assert.equal(p.height,q.height);let sum=0;for(let i=0;i<p.data.length;i++)sum+=(p.data[i]-q.data[i])**2;const rms=Math.sqrt(sum/p.data.length);assert.ok(rms<.5,`scene RMS ${rms}`);
 await check('static artwork matches the inspected preview-three baseline',async()=>{});
 assert.deepEqual(errors,[]);assert.deepEqual([...requests].filter(u=>!u.startsWith(server.url)),[]);
 await writeFile('artifacts/browser-test-report-v3.json',JSON.stringify({version:'1.0.0-preview.3',checks,errors,staticSceneRms:rms,environment:'Headless Chromium compatibility fixture; actual DSH verified separately',networkRequests:[...requests]},null,2));
 console.log('Passed',checks.length,'browser checks.');
}catch(error){await page.screenshot({path:resolve('artifacts/screenshots-v3/browser-failure.png'),scale:'css'}).catch(()=>{});throw error;}finally{await browser.close();await server.close();}
