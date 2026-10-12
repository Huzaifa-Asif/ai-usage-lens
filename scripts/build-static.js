import {mkdir,copyFile,cp,rm,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),output=root+'dist-hosted';
await rm(output,{recursive:true,force:true});await mkdir(output+'/src',{recursive:true});
await cp(root+'public',output,{recursive:true});
const app=await readFile(output+'/app.js','utf8');
await writeFile(output+'/app.js',app.replace("const localCompanion=['127.0.0.1','localhost','[::1]'].includes(location.hostname);","const localCompanion=false; // Static edition never invokes local collectors."));
for(const file of ['core.js','connection-state.js','presentation.js','collection-client.js'])await copyFile(root+'src/'+file,output+'/src/'+file);
console.log('Static hosting output: dist-hosted (no collectors, server, credentials, or account data)');
