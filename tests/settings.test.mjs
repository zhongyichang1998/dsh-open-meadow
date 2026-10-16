import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,normalize,themeTokens,QUALITY} from '../src/settings.js';
test('invalid storage is safe, background visibility has meaningful bounds',()=>{
 for(const raw of [null,undefined,[],23,'broken',{wind:'hurricane',quality:'ultra',background:NaN}])assert.deepEqual(normalize(raw),DEFAULTS);
 assert.equal(normalize({background:-1}).background,10);assert.equal(normalize({background:200}).background,95);assert.equal(normalize({background:70.9}).background,71);
 assert.equal(normalize({enabled:false}).enabled,false);assert.equal(normalize({animation:false}).animation,false);
 assert.equal(normalize({unknown:true}).unknown,undefined);
});
test('legacy default upgrades to clear background; explicit old custom opacity is converted',()=>{
 assert.equal(normalize({glass:70}).background,70);assert.equal(normalize({glass:44,wind:'windy',enabled:false}).background,56);
 assert.equal(normalize({glass:44,wind:'windy',enabled:false}).enabled,false);
 assert.equal(normalize({background:85,glass:90}).background,85);assert.equal(normalize({glass:70}).version,2);
});
test('default 70% background reveals scenery while code and overlays remain readable',()=>{
 const tokens=themeTokens(70);assert.match(tokens['--dsw-alias-bg-base'].light,/0.3\)/);assert.match(tokens['--dsw-alias-bg-base'].dark,/0.5\)/);
 assert.match(tokens['--dsw-alias-bg-overlay'].dark,/0.98\)/);assert.match(tokens['--dsw-alias-bg-layer-2'].light,/0.97\)/);
 const low=themeTokens(10),high=themeTokens(95);assert.match(low['--dsw-alias-bg-base'].light,/0.9\)/);assert.match(high['--dsw-alias-bg-base'].light,/0.05\)/);
});
test('quality budgets remain bounded',()=>{assert.ok(QUALITY.eco.fps<QUALITY.balanced.fps);assert.ok(QUALITY.high.fps<=30&&QUALITY.high.dpr<=1.5);assert.ok(QUALITY.eco.blades<QUALITY.high.blades);});
