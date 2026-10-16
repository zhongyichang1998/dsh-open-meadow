import {mkdtemp,mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const pkg=JSON.parse(await readFile('package.json','utf8'));
const stage=await mkdtemp(join(tmpdir(),'open-meadow-pack-'));
const output=resolve(`artifacts/${pkg.name}-${pkg.version}.tgz`);
try {
 await mkdir(join(stage,'package'));
 for (const file of ['package.json',...pkg.files]) await cp(resolve(file),join(stage,'package',file),{recursive:true});
 execFileSync('/usr/bin/tar',['-czf',output,'--exclude=.DS_Store','--exclude=._*','-C',stage,'package'],{env:{...process.env,COPYFILE_DISABLE:'1'}});
 const body=await readFile(output);
 await writeFile(output+'.sha256',`${createHash('sha256').update(body).digest('hex')}  ${pkg.name}-${pkg.version}.tgz\n`);
 console.log(`Installable npm-format tarball: ${output} (${body.length} bytes)`);
} finally {await rm(stage,{recursive:true,force:true});}
