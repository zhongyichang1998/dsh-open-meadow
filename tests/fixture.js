 'use strict';
const layers=new Map();let current=null;
const tokenStyle=document.createElement('style');document.head.append(tokenStyle);
function paint(){const tokens={};for(const layer of layers.values())Object.assign(tokens,layer.tokens);tokenStyle.textContent='body{'+Object.entries(tokens).map(([k,v])=>`${k}:${v.light}`).join(';')+'}body[data-ds-dark-theme]{'+Object.entries(tokens).map(([k,v])=>`${k}:${v.dark}`).join(';')+'}';}
// Deliberately small React/slots adapter for the browser fixture, NOT native DSH.
const h=(tag,props,...children)=>({tag,props:props||{},children});
function render(element){
 if(typeof element==='string')return document.createTextNode(element);
 const node=document.createElement(element.tag);
 for(const [key,value]of Object.entries(element.props)){if(key==='ref')continue;node.setAttribute(key,value);}
 for(const child of element.children)node.append(render(child));
 element.props.ref?.(node);return node;
}
window.__ModuleLoader__={load({factory}){
 const plugin=factory(id=>{if(id==='react')return{createElement:h};throw new Error('Unexpected module '+id);});
 const effects=[];
 const ctx={theme:{overrideTokens(source,tokens){const layer={tokens};layers.set(source,layer);paint();return()=>{if(layers.get(source)===layer){layers.delete(source);paint();}};}},slots:{
  inject(name,fn){return fn();},register(options,component){const node=render(component());document.querySelector('#fixture-settings-slot').append(node);return()=>node.remove();},
 },effect(fn){const dispose=fn();effects.push(dispose);}};
 plugin.apply(ctx);current=()=>effects.reverse().forEach(fn=>fn?.());
 window.fixtureStop=()=>{current?.();current=null;};window.fixtureStart=()=>plugin.apply(ctx);
}};
window.fixtureLayers=()=>layers.size;
document.querySelector('#dark-toggle').onclick=()=>document.body.toggleAttribute('data-ds-dark-theme');
document.querySelector('#settings-trigger').onclick=()=>document.querySelector('#fixture-settings').hidden=false;
const close=()=>{document.querySelector('#fixture-settings').hidden=true;document.querySelector('#settings-trigger').focus();};
document.querySelector('#close-settings').onclick=close;
document.addEventListener('keydown',e=>{if(e.key==='Escape')close();if((e.metaKey||e.ctrlKey)&&e.key===','){e.preventDefault();document.querySelector('#fixture-settings').hidden=false;}});
document.querySelector('#toggle-sidebar').onclick=()=>document.querySelector('.sidebar').classList.toggle('collapsed');
document.querySelector('#view-scene').onclick=()=>{document.querySelector('#root').hidden=true;};
