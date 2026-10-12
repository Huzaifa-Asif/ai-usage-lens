import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import {createServer} from '../src/server.js';import {createCollectionClient} from '../src/collection-client.js';
test('HTTP cancel reaches backend signal; retry returns synthetic data',async t=>{
 let resolveStarted,resolveAborted;
 const started=new Promise(r=>resolveStarted=r),aborted=new Promise(r=>resolveAborted=r);let calls=0;
 const server=createServer({env:{},codexCollector:async options=>{calls++;if(calls===1){resolveStarted();await new Promise(r=>options.signal.addEventListener('abort',r,{once:true}));resolveAborted();throw Object.assign(new Error('cancelled'),{code:'cancelled'});}return {synthetic:true,quotaSnapshot:{windows:[]}}}});
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})}catch(error){if(error.code==='EPERM'||error.code==='EACCES'){t.skip(`Loopback listening blocked: ${error.code}`);return}throw error;}
 const origin=`http://127.0.0.1:${server.address().port}`;
 const client=createCollectionClient({fetchImpl:(path,options)=>fetch(origin+path,{...options,headers:{...options.headers,Origin:origin}})});
 try{
  const pending=client.collect('/api/collect/codex');await started;client.cancel();await assert.rejects(pending,e=>e.name==='AbortError');
  await Promise.race([aborted,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('backend did not abort')),1000);timer.unref()})]);
  assert.deepEqual(await client.collect('/api/collect/codex'),{synthetic:true,quotaSnapshot:{windows:[]}});
 }finally{server.closeAllConnections();const closed=once(server,'close');server.close();await closed;}
});
