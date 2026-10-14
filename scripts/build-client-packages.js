import {cp,copyFile,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,relative} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const portable=join(root,'dist-plugin');
const output=join(root,'dist-clients');

async function filesUnder(dir){
 const found=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isDirectory())found.push(...await filesUnder(path));
  else if(entry.isFile())found.push(path);
  else throw new Error(`unsupported package entry: ${relative(root,path)}`);
 }
 return found;
}

async function checksumManifest(dir){
 const entries=[];
 for(const path of (await filesUnder(dir)).sort()){
  if(path.endsWith('checksums.json'))continue;
  const data=await readFile(path);
  entries.push({path:relative(dir,path).split('\\').join('/'),sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length});
 }
 await writeFile(join(dir,'checksums.json'),JSON.stringify({algorithm:'sha256',files:entries},null,2)+'\n');
}

await rm(output,{recursive:true,force:true});
await import('./build-plugin.js');
for(const client of ['codex','claude','cursor'])await cp(portable,join(output,client,'ai-usage-lens'),{recursive:true});
for(const client of ['codex','claude','cursor'])await copyFile(join(root,'docs/CLIENT_PACKAGES.md'),join(output,client,'ai-usage-lens/docs/CLIENT_PACKAGES.md'));

const codex=join(output,'codex','ai-usage-lens');
await mkdir(join(codex,'.codex-plugin'),{recursive:true});
await copyFile(join(root,'packaging/clients/codex-plugin.json'),join(codex,'.codex-plugin/plugin.json'));

const claude=join(output,'claude','ai-usage-lens');
await mkdir(join(claude,'.claude-plugin'),{recursive:true});
await copyFile(join(root,'packaging/clients/claude-plugin.json'),join(claude,'.claude-plugin/plugin.json'));

for(const client of ['codex','claude','cursor'])await checksumManifest(join(output,client,'ai-usage-lens'));
console.log('Client packages: dist-clients/{codex,claude,cursor}/ai-usage-lens');
