export const DEFAULTS = Object.freeze({version:2, enabled:true, animation:true, wind:'breeze', daylight:'noon', background:70, quality:'balanced'});
export const STORAGE_KEY = 'open-meadow.settings.v1';
export const QUALITY = Object.freeze({
  eco: {fps:15, dpr:1, blades:48, ripples:14},
  balanced: {fps:24, dpr:1.25, blades:90, ripples:26},
  high: {fps:30, dpr:1.5, blades:140, ripples:40},
});
export function normalize(raw={}) {
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) raw={};
  const pick=(key,values)=>values.includes(raw[key])?raw[key]:DEFAULTS[key];
  let background=DEFAULTS.background;
  if(typeof raw.background==='number' && Number.isFinite(raw.background)) background=raw.background;
  // Migrate preview.1: its default 70% opaque becomes the new visible default.
  // Explicit non-default opacity choices retain their visual meaning.
  else if(typeof raw.glass==='number' && Number.isFinite(raw.glass) && raw.glass!==70) background=100-raw.glass;
  return {version:2, enabled:raw.enabled!==false, animation:raw.animation!==false,
    wind:pick('wind',['calm','breeze','windy']), daylight:pick('daylight',['morning','noon','sunset']),
    background:Math.round(Math.max(10,Math.min(95,background))), quality:pick('quality',['eco','balanced','high'])};
}
export function themeTokens(background) {
  const alpha=Number((1-normalize({background}).background/100).toFixed(2));
  const pair=(light,dark)=>({light:`rgba(248,251,247,${light})`,dark:`rgba(19,29,31,${dark})`});
  return {
    '--dsw-alias-bg-base':pair(alpha,Math.max(.5,alpha)),
    '--dsw-specific-sidebar-fill':pair(alpha,Math.max(.5,alpha)),
    '--dsw-alias-bg-layer-1':pair(.96,.96),
    '--dsw-alias-bg-layer-2':pair(.97,.97),
    '--dsw-alias-bg-layer-3':pair(.98,.98),
    '--dsw-alias-bg-module-platform':pair(.96,.96),
    '--dsw-alias-bg-overlay':pair(.98,.98),
    '--dsw-specific-selector':pair(.96,.96),
  };
}
