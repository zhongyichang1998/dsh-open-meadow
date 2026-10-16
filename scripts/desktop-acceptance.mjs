import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {withDesktop,openSettings} from './desktop-session.mjs';
import {developmentModule} from './playwright.mjs';
await mkdir('artifacts/screenshots-v3',{recursive:true});const checks=[],errors=[];let motionPixels=0;const regionalMotion={};
const check=async(name,fn)=>{await fn();checks.push(name);console.log('✓ 原生客户端：',name);};
const stats=page=>page.locator('#open-meadow-scene').evaluate(el=>el.contentWindow.OpenMeadowRenderer.getStats());
await withDesktop(async page=>{
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().startsWith('[海风与草甸]'))errors.push(m.text());});
 await page.waitForFunction(()=>document.querySelector('#open-meadow-scene')?.contentWindow?.OpenMeadowRenderer?.getStats().cloudReady,{},{timeout:30000});
 const settings=page.locator('#open-meadow-settings');
 await check('主界面没有浮动叶片入口',async()=>{assert.equal(await page.locator('#open-meadow-launcher').count(),0);assert.equal(await page.locator('#open-meadow-panel').count(),0);});
 await openSettings(page);
 await check('主题选项完整嵌入原生通用设置，全文为中文',async()=>{assert.ok(await settings.isVisible());assert.equal(await settings.count(),1);assert.doesNotMatch(await settings.innerText(),/[A-Za-z]/);});
 await check('旧版默认遮罩迁移为新的背景可见度且保留风力',async()=>{
  await page.evaluate(()=>localStorage.setItem('open-meadow.settings.v1',JSON.stringify({glass:70,enabled:true,animation:true,wind:'windy',quality:'balanced',daylight:'noon'})));
  await page.reload();await page.waitForSelector('#open-meadow-ui-style',{state:'attached'});await openSettings(page);
  assert.equal(await settings.locator('[name="background"]').inputValue(),'70');assert.ok(await settings.locator('[name="wind"][value="windy"]').isChecked());
 });
 await settings.locator('[data-reset]').click();
 await check('背景不再被整窗模糊；默认浅色界面只保留三成遮罩',async()=>{
  await page.emulateMedia({colorScheme:'light'});await page.waitForTimeout(150);
  const style=await page.evaluate(()=>{const el=document.querySelector('#root div:has(> [data-shell-overlay])');const s=getComputedStyle(el);return{background:s.backgroundColor,blur:s.backdropFilter};});
  assert.match(style.background,/0.3\)/);assert.equal(style.blur,'none');
 });
 await check('可见度滑块方向正确并可持久保存',async()=>{
  await settings.locator('[name="background"]').evaluate(el=>{el.value=85;el.dispatchEvent(new Event('input',{bubbles:true}));});
  const bg=await page.evaluate(()=>getComputedStyle(document.querySelector('#root div:has(> [data-shell-overlay])')).backgroundColor);assert.match(bg,/0.15\)/);
  await page.reload();await page.waitForSelector('#open-meadow-ui-style',{state:'attached'});await openSettings(page);assert.equal(await settings.locator('[name="background"]').inputValue(),'85');
 });
 await check('关闭主题后原生设置项仍可使用并能重新启用',async()=>{
  await settings.locator('[name="enabled"]').uncheck();assert.equal(await page.locator('#open-meadow-scene').count(),0);assert.ok(await settings.isVisible());
  await settings.locator('[name="enabled"]').check();await page.waitForFunction(()=>document.querySelector('#open-meadow-scene')?.contentWindow?.OpenMeadowRenderer?.getStats().cloudReady);
 });
 await check('关闭动态与减少动态效果都会停止渲染循环',async()=>{
  await settings.locator('[name="animation"]').uncheck();await page.waitForTimeout(100);let a=await stats(page);await page.waitForTimeout(350);assert.equal((await stats(page)).frames,a.frames);
  await settings.locator('[name="animation"]').check();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);a=await stats(page);await page.waitForTimeout(350);assert.equal((await stats(page)).frames,a.frames);await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await settings.locator('[data-reset]').click();
 for(const mode of ['light','dark']){
  await page.emulateMedia({colorScheme:mode});await page.waitForTimeout(150);await openSettings(page);
  assert.equal(await page.evaluate(()=>document.body.hasAttribute('data-ds-dark-theme')),mode==='dark');
  await page.screenshot({path:resolve(`artifacts/screenshots-v3/desktop-${mode}-settings.png`)});
  await page.keyboard.press('Escape');await page.waitForTimeout(150);
  await page.screenshot({path:resolve(`artifacts/screenshots-v3/desktop-${mode}-workspace.png`)});
 }
 checks.push('深浅色模式下原生设置和主界面截图正常');console.log('✓ 原生客户端：深浅色模式截图');
 await page.emulateMedia({colorScheme:'light'});
 await check('云、海水、花草分别运动，船、灯塔与前景岩石保持固定',async()=>{
  const scene=page.frames().find(f=>f.url().includes('/open-meadow/scene.html'));
  const a=await scene.locator('body').screenshot({path:resolve('artifacts/screenshots-v3/desktop-motion-t0.png'),scale:'css'});const before=await stats(page);
  await page.waitForTimeout(3000);
  const b=await scene.locator('body').screenshot({path:resolve('artifacts/screenshots-v3/desktop-motion-t3.png'),scale:'css'});assert.ok((await stats(page)).frames>before.frames+20);
  const {PNG}=developmentModule('pngjs');const aa=PNG.sync.read(a),bb=PNG.sync.read(b);
  for(let i=0;i<aa.data.length;i+=4)if(Math.abs(aa.data[i]-bb.data[i])+Math.abs(aa.data[i+1]-bb.data[i+1])+Math.abs(aa.data[i+2]-bb.data[i+2])>12)motionPixels++;
  assert.ok(motionPixels>1000,`仅 ${motionPixels} 个像素变化`);
  const scale=Math.max(aa.width/2560,aa.height/1440),ox=(aa.width-2560*scale)*.6,oy=(aa.height-1440*scale)*.5;
  const regions={water:[.035,.555,.27,.685],flowers:[.72,.79,.88,.96],grass:[.92,.68,.99,.94],boat:[.182,.764,.314,.83],lighthouse:[.818,.32,.863,.427],rock:[.495,.867,.647,.974]};
  for(const[name,[x0,y0,x1,y1]]of Object.entries(regions)){
   let changed=0,total=0,sum=0;
   for(let y=Math.max(0,Math.ceil(oy+y0*1440*scale));y<Math.min(aa.height,oy+y1*1440*scale);y++)for(let x=Math.max(0,Math.ceil(ox+x0*2560*scale));x<Math.min(aa.width,ox+x1*2560*scale);x++){
    const i=(y*aa.width+x)*4;let d=0;for(let j=0;j<3;j++){const v=aa.data[i+j]-bb.data[i+j];sum+=v*v;d+=Math.abs(v);}total++;if(d>12)changed++;
   }
   regionalMotion[name]={changed,total,rms:Math.sqrt(sum/(total*3))};
   if(['water','flowers','grass'].includes(name))assert.ok(changed>80,`${name} 实时运动不明显: ${changed}`);else assert.equal(changed,0,`${name} 应保持固定`);
  }
  console.log('原生画面分区：',JSON.stringify(regionalMotion));
  const windChecks=[];
  for(const wind of ['calm','breeze','windy']){
   await openSettings(page);await settings.locator(`[name="wind"][value="${wind}"]`).check();await page.keyboard.press('Escape');
   await page.waitForFunction(w=>document.querySelector('#open-meadow-scene')?.contentWindow?.OpenMeadowRenderer?.getStats().wind===w,wind);
   windChecks.push((await stats(page)).windParameters);
  }
  assert.ok(windChecks[0].grass<windChecks[1].grass&&windChecks[1].grass<windChecks[2].grass);
  assert.ok(windChecks[0].water<windChecks[1].water&&windChecks[1].water<windChecks[2].water);
  await openSettings(page);await settings.locator('[data-reset]').click();await page.keyboard.press('Escape');
 });
 await check('原生设置可反复关闭与重开且不重复挂载',async()=>{for(let i=0;i<3;i++){await openSettings(page);assert.equal(await settings.count(),1);await page.keyboard.press('Escape');}assert.equal(await page.locator('#open-meadow-scene').count(),1);});
 await check('原生插件管理器停用会清理样式和设置入口，再启用正常',async()=>{
  await page.getByRole('button',{name:'插件',exact:true}).click();const card=page.locator('[data-plugin-package="dsh-open-meadow"]');await card.waitFor();await card.getByRole('switch').click();
  await page.waitForFunction(()=>!document.querySelector('#open-meadow-ui-style'));assert.equal(await page.locator('[id^="open-meadow-"]').count(),0);
  await page.waitForFunction(()=>{const b=document.querySelector('[data-plugin-package=\"dsh-open-meadow\"] [role=\"switch\"]');return b?.getAttribute('aria-checked')==='false'&&!b.disabled;});await card.getByRole('switch').click();await page.waitForSelector('#open-meadow-ui-style',{state:'attached'});await page.getByRole('button',{name:'新建会话',exact:true}).click();await openSettings(page);assert.equal(await settings.count(),1);
 });
 await settings.locator('[name="background"]').evaluate(el=>{el.value=82;el.dispatchEvent(new Event('input',{bubbles:true}));});await settings.locator('[name="enabled"]').uncheck();
});
await withDesktop(async page=>{
 await check('独立进程重启保留可见度及禁用状态，设置入口可用',async()=>{
  assert.equal(await page.locator('#open-meadow-scene').count(),0);await openSettings(page);const settings=page.locator('#open-meadow-settings');
  assert.equal(await settings.locator('[name="background"]').inputValue(),'82');assert.ok(!(await settings.locator('[name="enabled"]').isChecked()));
  await settings.locator('[data-reset]').click();await page.waitForFunction(()=>document.querySelector('#open-meadow-scene')?.contentWindow?.OpenMeadowRenderer?.getStats().cloudReady);await page.keyboard.press('Escape');
 });
});
assert.deepEqual(errors,[]);
await writeFile('artifacts/desktop-test-report-v3.json',JSON.stringify({version:'1.0.0-preview.3',environment:'真实官方 macOS DSH 0.2.0-rc.2，两个独立进程，新的隔离 profile 与 userData，未登录或提供凭据',checks,errors,motionPixelsOverThreeSeconds:motionPixels,regionalMotion,settingsPath:'设置 → 通用设置 → 海风与草甸'},null,2));
console.log('真实客户端检查通过：',checks.length);
