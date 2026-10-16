import test from 'node:test';
import assert from 'node:assert/strict';
import {apply,serveAsset} from '../plugin/index.js';
async function request(url,method='GET') {
 let status,headers,body;
 await serveAsset({url,method},{writeHead(s,h){status=s;headers=h;},end(b){body=b;}});
 return {status,headers,body};
}
test('local asset route serves package resources and handles HEAD',async()=>{
 const get=await request('/open-meadow/');assert.equal(get.status,200);assert.match(get.body.toString(),/海风与草甸/);
 const head=await request('/open-meadow/coast.webp','HEAD');assert.equal(head.status,200);assert.equal(head.body,undefined);assert.equal(head.headers['content-type'],'image/webp');
 assert.ok(Number(head.headers['content-length'])>1000);
});
test('route refuses writes, traversal, unknown files, malformed URL encodings',async()=>{
 assert.equal((await request('/open-meadow/scene.html','POST')).status,405);
 for(const path of ['/open-meadow/%252e%252e/LICENSE','/open-meadow/../../package.json','/open-meadow/%2e%2e%2fpackage.json','/open-meadow/%5c..%5cpackage.json','/open-meadow/%00coast.webp','/open-meadow/LICENSE','/not-the-route/coast.webp']) assert.notEqual((await request(path)).status,200,path);
 assert.equal((await request('/open-meadow/%E0%A4%A')).status,400);
});
test('Cordis effect releases exactly the route registered by this plugin',()=>{
 let route,cleanup,disposals=0;
 apply({webServer:{register(r){route=r;return()=>disposals++;}},effect(fn){cleanup=fn();}});
 assert.equal(route.path,'/open-meadow');assert.equal(route.handler,serveAsset);
 cleanup();assert.equal(disposals,1);
});
