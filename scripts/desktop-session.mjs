import {spawn} from 'node:child_process';
import {readFile,rm,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from './playwright.mjs';
export async function withDesktop(work){
 const userData=resolve('.qa/v2-electron-user-data');await mkdir(userData,{recursive:true});await rm(`${userData}/DevToolsActivePort`,{force:true});
 const child=spawn('/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness',[`--user-data-dir=${userData}`,'--remote-debugging-port=0'],{env:{...process.env,DSH_HOME:resolve('.qa/v2-dsh')},stdio:['ignore','pipe','pipe']});
 let browser,log='';child.stdout.on('data',b=>{log+=b;});child.stderr.on('data',b=>{log+=b;});
 try{
  let port;for(let i=0;i<60;i++){try{port=String(await readFile(`${userData}/DevToolsActivePort`)).split('\n')[0];break;}catch{await delay(200);}}
  if(!port)throw new Error('隔离客户端未开放测试端口');browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{timeout:10000});
  let page;for(let i=0;i<60;i++){page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()==='dsh-app://app/');if(page)break;await delay(200);}
  if(!page)throw new Error('原生工作区未出现');page.setDefaultTimeout(20000);await page.waitForSelector('#open-meadow-ui-style',{state:'attached',timeout:30000});
  await work(page);
 }finally{
  if(browser)await browser.close().catch(()=>{});const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([exited,delay(5000)]);
  if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await exited;}
  await writeFile('artifacts/desktop-acceptance-v2.log',log.replace(/token=[A-Za-z0-9_-]+/g,'token=[redacted-test-token]'));
 }
}
export async function openSettings(page){
 const modal=page.locator('[data-shortcut-modal="settings"]');
 if(!await modal.isVisible()){
  const expand=page.getByRole('button',{name:'打开侧边栏',exact:true});if(await expand.count())await expand.last().click();
  await page.getByRole('button',{name:'账号菜单',exact:true}).click();await page.getByText('设置',{exact:true}).click();
 }
 await page.locator('#open-meadow-settings').waitFor();await page.locator('#open-meadow-settings').scrollIntoViewIfNeeded();
}
