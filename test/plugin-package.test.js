import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,cp,rm,stat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {readJsonFile} from '../src/file-io.js';

test('CLI file reads are bounded and errors do not expose contents or paths',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'lens files '));
 try{
  const file=join(dir,'input.json');await writeFile(file,'{"value":1}');
  assert.deepEqual(await readJsonFile(file),{value:1});
  await assert.rejects(readJsonFile(file,{maxBytes:2}),/^Error: input_too_large$/);
  await writeFile(file,'SECRET malformed');await assert.rejects(readJsonFile(file),/^Error: invalid_json$/);
  await writeFile(file,Buffer.from([123,34,120,34,58,34,255,34,125]));await assert.rejects(readJsonFile(file),/^Error: invalid_json$/);
  await assert.rejects(readJsonFile(dir),/^Error: input_not_regular_file$/);
  await assert.rejects(readJsonFile(join(dir,'SECRET')),/^Error: input_unavailable$/);
  if(process.platform!=='win32'){
   const fifo=join(dir,'fifo');execFileSync('mkfifo',[fifo]);
   const probe=execFileSync(process.execPath,['--input-type=module','-e',`import {readJsonFile} from ${JSON.stringify(new URL('../src/file-io.js',import.meta.url).href)}; try {await readJsonFile(process.argv[1]);process.exit(2)} catch(e){console.log(e.message)}`,fifo],{encoding:'utf8',timeout:2000});
   assert.equal(probe.trim(),'input_not_regular_file');
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('portable skills-only package works after extraction into a path with spaces',async()=>{
 execFileSync(process.execPath,['scripts/build-plugin.js']);
 const dir=await mkdtemp(join(tmpdir(),'lens extracted '));
 try{
  await cp('dist-plugin',dir,{recursive:true});
  const manifest=JSON.parse(await readFile(join(dir,'plugin.json'),'utf8'));
  assert.equal(manifest.name,'ai-usage-lens');assert.equal(manifest.version,'0.3.0');
  assert.equal(JSON.parse(await readFile(join(dir,'package.json'),'utf8')).type,'module');
  assert.ok(manifest.extensions['com.openai'].interface.shortDescription.length<=30);
  const icon=await readFile(join(dir,manifest.extensions['com.openai'].interface.logo),'utf8');
  assert.match(icon,/<svg[^>]*width="64"[^>]*height="64"/);
  assert.doesNotMatch(icon,/<script|(?:xlink:)?href\s*=|url\(/i);
  assert.equal(manifest.mcpServers,undefined);assert.equal(manifest.hooks,undefined);
  const market=JSON.parse(await readFile(join(dir,'.agents/plugins/marketplace.json'),'utf8'));
  assert.equal(market.plugins[0].source.path,'./');
  const skill=await readFile(join(dir,'skills/token-lens/SKILL.md'),'utf8');
  assert.match(skill,/^---\nname: token-lens\ndescription: .+\n---/);
  assert.match(skill,/manual/i);assert.match(skill,/untrusted/i);
  await assert.rejects(stat(join(dir,'src/server.js')));await assert.rejects(stat(join(dir,'src/codex-collector.js')));
  const result=JSON.parse(execFileSync(process.execPath,[join(dir,'src/cli.js'),join(dir,'examples/ledger.json'),join(dir,'examples/prices.json')],{encoding:'utf8'}));
  assert.equal(result.total.tokens.knownTotal,1200);
  assert.equal(result.total.costs.USD,0.00288);
  assert.equal(result.total.records,undefined);
  assert.equal(result.appliedRates[0].provenance,'example-only; replace before use');
  assert.equal(result.appliedRates[0].effectiveFrom,'2026-10-01');
  assert.equal(result.omitted.threads,0);
  const ledger=JSON.parse(await readFile(join(dir,'examples/ledger.json'),'utf8'));
  ledger.records=Array.from({length:101},(_,i)=>({...ledger.records[0],id:`request-${i}`,threadId:`thread-${i}`}));
  const many=join(dir,'many.json');await writeFile(many,JSON.stringify(ledger));
  const bounded=JSON.parse(execFileSync(process.execPath,[join(dir,'src/cli.js'),many,join(dir,'examples/prices.json')],{encoding:'utf8'}));
  assert.equal(bounded.total.tokens.knownTotal,121200);assert.equal(bounded.threads.length,100);assert.equal(bounded.omitted.threads,1);
  assert.equal(bounded.appliedRates.length,1);assert.ok(JSON.stringify(bounded).length<100000);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('client builds add only native manifests and integrity metadata',async()=>{
 execFileSync(process.execPath,['scripts/build-client-packages.js']);
 const regularFiles=async dir=>{
  const found=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
   const path=join(dir,entry.name);
   if(entry.isDirectory())found.push(...await regularFiles(path));
   else if(entry.isFile())found.push(path);
   else assert.fail(`unexpected package entry: ${path}`);
  }
  return found;
 };
 for(const client of ['codex','claude','cursor']){
  const dir=join('dist-clients',client,'ai-usage-lens');
  const portable=JSON.parse(await readFile(join(dir,'plugin.json'),'utf8'));
  assert.equal(portable.name,'ai-usage-lens');
  const checks=JSON.parse(await readFile(join(dir,'checksums.json'),'utf8'));
  assert.equal(checks.algorithm,'sha256');
  assert.ok(checks.files.some(file=>file.path==='skills/token-lens/SKILL.md'));
  assert.ok(checks.files.some(file=>file.path==='docs/CLIENT_PACKAGES.md'));
  assert.ok(checks.files.every(file=>/^[a-f0-9]{64}$/.test(file.sha256)&&file.bytes>0));
  const files=(await regularFiles(dir)).map(path=>relative(dir,path).split('\\').join('/')).filter(path=>path!=='checksums.json').sort();
  assert.deepEqual(checks.files.map(file=>file.path).sort(),files);
  for(const file of checks.files){
   const data=await readFile(join(dir,file.path));
   assert.equal(file.bytes,data.length);
   assert.equal(file.sha256,createHash('sha256').update(data).digest('hex'));
  }
  await assert.rejects(stat(join(dir,'mcp.json')));
  await assert.rejects(stat(join(dir,'.mcp.json')));
  await assert.rejects(stat(join(dir,'hooks')));
 }
 const codex=JSON.parse(await readFile('dist-clients/codex/ai-usage-lens/.codex-plugin/plugin.json','utf8'));
 assert.equal(codex.skills,'./skills/');
 const claude=JSON.parse(await readFile('dist-clients/claude/ai-usage-lens/.claude-plugin/plugin.json','utf8'));
 assert.equal(claude.name,'ai-usage-lens');
 await assert.rejects(stat('dist-clients/cursor/ai-usage-lens/.cursor-plugin'));
});
