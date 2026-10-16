import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {serveAsset} from '../plugin/index.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function serve(port=0) {
 const server=createServer(async(req,res)=>{
  try {
   const path=new URL(req.url,'http://local.invalid').pathname;
   if(path==='/open-meadow' || path.startsWith('/open-meadow/')) return await serveAsset(req,res);
   const paths={'/':'tests/fixture.html','/fixture.html':'tests/fixture.html','/fixture.js':'tests/fixture.js','/fixture.css':'tests/fixture.css','/plugin/client.js':'plugin/client.js'};
   if(!paths[path]) {res.writeHead(404);res.end();return;}
   const file=resolve(root,paths[path]),body=await readFile(file);
   res.writeHead(200,{'content-type':{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'}[extname(file)],'cache-control':'no-store'});res.end(body);
  } catch(error) {res.writeHead(500);res.end('Preview asset error');console.error(error);}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 return {url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}
