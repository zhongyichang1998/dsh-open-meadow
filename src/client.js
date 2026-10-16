import {DEFAULTS,normalize,STORAGE_KEY,themeTokens} from './settings.js';
import {createElement as h} from 'react';
const INSTANCE=Symbol.for('dsh.open-meadow.controller');
const LOCK='__DSH_BACKGROUND_THEME__';
export const name='dsh-open-meadow-client';
export const inject=['theme','slots'];

export function createController(ctx) {
  let state={...DEFAULTS},disposed=false,mounted=false,started=false;
  let frame=null,tokenDispose=null,slotDispose=null,observer=null,ui=null,styles=null,runtimeStyle=null,conflict='';
  const listeners=[],lock={owner:'dsh-open-meadow'};
  const on=(target,type,fn)=>{target.addEventListener(type,fn);listeners.push(()=>target.removeEventListener(type,fn));};
  const post=()=>frame?.contentWindow?.postMessage({type:'open-meadow:update',settings:state,visible:!document.hidden},location.origin==='null'?'*':location.origin);
  function read() {
    try {
      const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');state=normalize(raw);
      if(raw?.version!==2) localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    }catch{state={...DEFAULTS};}
  }
  function notice(text){if(ui)ui.querySelector('[data-notice]').textContent=text;}
  function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));notice('设置已自动保存');}catch{notice('当前存储不可用，设置仅在本次窗口生效。');}}
  function detectConflict(){
    if(document.getElementById('__open-sea-skin__')||document.getElementById('__open-sea-skin-glass__'))return '检测到另一款海洋背景主题，请先在对方设置中停用背景。';
    if(window[LOCK]&&window[LOCK]!==lock)return '另一个背景主题正在运行，请先停用该主题。';
    return '';
  }
  function unmountSurface(){
    frame?.remove();frame=null;tokenDispose?.();tokenDispose=null;runtimeStyle?.remove();runtimeStyle=null;
    if(mounted)document.body.removeAttribute('data-open-meadow');
    if(window[LOCK]===lock)delete window[LOCK];mounted=false;
  }
  function updateTokens(){
    if(runtimeStyle)runtimeStyle.textContent=SHELL_CSS+`\nbody[data-open-meadow]{--open-meadow-surface:${(1-state.background/100).toFixed(2)}}`;
    if(tokenDispose)return;
    const tokens=themeTokens(DEFAULTS.background);
    for(const key of ['--dsw-alias-bg-base','--dsw-specific-sidebar-fill'])tokens[key]={
      light:'rgba(248,251,247,var(--open-meadow-surface,.3))',
      dark:'rgba(19,29,31,max(.5,var(--open-meadow-surface,.3)))',
    };
    tokenDispose=ctx.theme.overrideTokens('dsh-open-meadow',tokens);
  }
  function sync(){
    if(!ui)return;
    for(const key of ['enabled','animation'])ui.querySelector(`[name="${key}"]`).checked=state[key];
    for(const key of ['wind','daylight','quality'])for(const el of ui.querySelectorAll(`[name="${key}"]`))el.checked=state[key]===el.value;
    ui.querySelector('[name="background"]').value=state.background;ui.querySelector('output').textContent=`${state.background}%`;
    const status=ui.querySelector('[data-conflict]');status.hidden=!conflict;if(status.textContent!==conflict)status.textContent=conflict;
  }
  function reconcile(){
    if(disposed)return;conflict=detectConflict();
    if(!state.enabled||conflict){unmountSurface();sync();return;}
    if(!mounted){
      window[LOCK]=lock;document.body.setAttribute('data-open-meadow','');
      frame=document.createElement('iframe');frame.id='open-meadow-scene';frame.src='/open-meadow/scene.html';frame.title='海风与草甸背景';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
      frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;z-index:0;pointer-events:none;';
      frame.addEventListener('load',post);document.body.prepend(frame);
      runtimeStyle=document.createElement('style');runtimeStyle.id='open-meadow-shell';document.head.append(runtimeStyle);
      mounted=true;updateTokens();
    }
    post();sync();
  }
  function change(patch){state=normalize({...state,...patch});if(mounted&&patch.background!==undefined)updateTokens();reconcile();save();}
  function mountUi(){
    styles=document.createElement('link');styles.id='open-meadow-ui-style';styles.rel='stylesheet';styles.href='/open-meadow/ui.css';document.head.append(styles);
    ui=document.createElement('section');ui.id='open-meadow-settings';ui.setAttribute('role','group');ui.setAttribute('aria-label','海风与草甸主题');
    const segment=(name,title,choices)=>`<fieldset><legend>${title}</legend><div class="om-segments">${choices.map(([value,label])=>`<label><input type="radio" name="${name}" value="${value}"><span>${label}</span></label>`).join('')}</div></fieldset>`;
    ui.innerHTML=`<header><h3>海风与草甸</h3><p>让海风和草甸陪你工作</p></header>
      <div class="om-switches"><div class="om-switch"><label for="om-enabled">启用主题</label><input id="om-enabled" name="enabled" type="checkbox" role="switch"></div>
      <div class="om-switch"><label for="om-animation">动态效果</label><input id="om-animation" name="animation" type="checkbox" role="switch"></div></div>
      <div class="om-visibility"><div><label for="om-background">背景可见度</label><output for="om-background">70%</output></div><input id="om-background" name="background" type="range" min="10" max="95" step="1"><p>越高，海景越清晰。输入框与代码区域保留底色；深色模式适度加深遮罩，方便阅读。</p></div>
      <div class="om-options">${segment('wind','风力',[['calm','静风'],['breeze','微风'],['windy','强风']])}
      ${segment('daylight','日光',[['morning','清晨'],['noon','正午'],['sunset','日落']])}
      ${segment('quality','画质',[['eco','节能'],['balanced','均衡'],['high','精细']])}</div><p>风力控制前景花草的摆幅、海面波动与浪花速度，也会改变云的移动速度。静风保留轻微海浪；关闭动态效果可完全静止。</p>
      <p data-conflict role="status" class="om-conflict" hidden></p><footer><span data-notice aria-live="polite">设置仅保存在本机</span><button type="button" data-reset>恢复默认</button></footer>`;
    sync();
    const attach=node=>{if(node&&!disposed)node.append(ui);};
    function SettingsRow(){return h('div',{'data-open-meadow-settings-host':'',ref:attach});}
    slotDispose=ctx.slots.inject('settings.general.item',()=>ctx.slots.register({name:'settings.general.item',id:'open-meadow',order:12},SettingsRow));
    on(ui,'change',event=>{const el=event.target;if(el.name&&el.name!=='background')change({[el.name]:el.type==='checkbox'?el.checked:el.value});});
    on(ui.querySelector('[name="background"]'),'input',event=>change({background:Number(event.target.value)}));
    on(ui.querySelector('[data-reset]'),'click',()=>change({...DEFAULTS}));
    on(window,'message',event=>{if(event.source===frame?.contentWindow&&event.origin===location.origin&&event.data?.type==='open-meadow:ready')post();});
    on(document,'visibilitychange',post);
    on(window,'storage',event=>{if(event.key===STORAGE_KEY){read();reconcile();if(mounted)updateTokens();}});
    observer=new MutationObserver(()=>{if(detectConflict()!==conflict)reconcile();});observer.observe(document.body,{childList:true,subtree:true});
  }
  async function start(){
    if(started||disposed)return;started=true;
    if(!document.body)await new Promise(resolve=>{const ready=()=>resolve();document.addEventListener('DOMContentLoaded',ready,{once:true});listeners.push(()=>{document.removeEventListener('DOMContentLoaded',ready);resolve();});});
    if(disposed)return;read();mountUi();reconcile();
  }
  function stop(){
    if(disposed)return;disposed=true;observer?.disconnect();listeners.splice(0).reverse().forEach(fn=>fn());
    if(typeof slotDispose==='function')slotDispose();slotDispose=null;
    unmountSurface();ui?.remove();styles?.remove();if(window[INSTANCE]===controller)delete window[INSTANCE];
  }
  const controller={start,stop,getState:()=>({...state})};return controller;
}
// Shell markers studied in Open Sea Skin v1.2.5; see MIT notices.
const SHELL_CSS=`
body[data-open-meadow]{background:transparent!important}
body[data-open-meadow] #root{position:relative;z-index:1;background:transparent!important;isolation:isolate}
html[data-platform="darwin"] body[data-open-meadow] #root div:has(> [data-shell-overlay]){background:var(--dsw-alias-bg-base)!important}
html[data-platform="darwin"] body[data-open-meadow] #root div:has(> [data-shell-overlay]) > :is(:first-child,:nth-child(2),[data-rightbar-col]),
html[data-platform="darwin"] body[data-open-meadow] #root div:has(> [data-shell-overlay]) > :nth-child(2) [data-phase],
html[data-platform="darwin"] body[data-open-meadow] #root [data-rightbar-col] [data-dockkit-host="dock"] > [data-dockkit-content]{background:transparent!important}
body[data-open-meadow] [data-shortcut-modal="settings"]{background:rgba(249,251,248,.98)!important}
body[data-open-meadow][data-ds-dark-theme] [data-shortcut-modal="settings"]{background:rgba(23,31,33,.98)!important}
`;
export function apply(ctx){
  window[INSTANCE]?.stop();const controller=createController(ctx);window[INSTANCE]=controller;
  ctx.effect(()=>()=>controller.stop(),'海风与草甸：客户端生命周期');
  void controller.start().catch(error=>{controller.stop();console.warn('[海风与草甸] 主题启动失败：',error);});
}
