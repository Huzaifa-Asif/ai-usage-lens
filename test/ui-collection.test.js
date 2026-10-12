import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import * as core from '../src/core.js';import * as presentation from '../src/presentation.js';import * as connection from '../src/connection-state.js';import {createCollectionClient} from '../src/collection-client.js';

async function ui(fetchImpl){
 const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{disabled:false,hidden:true,value:id==='output-mode'?'checklist':'',textContent:'',innerHTML:'',handlers:{},addEventListener(type,callback){this.handlers[type]=callback;}});return elements.get(id);};
 const document={querySelector:s=>element(s.slice(1)),getElementById:element,querySelectorAll:()=>[]};
 const dependencies={...core,...presentation,...connection,createCollectionClient:options=>createCollectionClient({...options,fetchImpl})};
 const source=(await readFile('public/app.js','utf8')).replace(/^import .*;\n/gm,'');
 new Function('document','localStorage','location','navigator','fetch',...Object.keys(dependencies),source)(document,{getItem:()=>null,removeItem(){},setItem(){}},{hostname:'127.0.0.1'},{},fetchImpl,...Object.values(dependencies));
 return {element,click:id=>element(id).handlers.click()};
}
test('Codex cancel control owns Codex and cancelled result cannot refill the UI',async()=>{
 let resolve,signal;const app=await ui((_p,o)=>{signal=o.signal;return new Promise(r=>resolve=r)});
 app.click('connect');app.click('authorize');const pending=app.click('direct-codex');
 assert.equal(app.element('cancel-admin').disabled,true);app.click('cancel-admin');assert.equal(signal.aborted,false);
 app.click('cancel-command');assert.equal(signal.aborted,true);assert.equal(app.element('connection-status').textContent,'Cancelled');
 resolve({ok:true,json:async()=>({privateData:'late'})});await pending;
 assert.equal(app.element('connection-status').textContent,'Cancelled');assert.equal(app.element('account-activity').innerHTML,'');assert.equal(app.element('direct-codex').disabled,false);
});
test('Admin cancel control owns Admin and other cancel cannot change its result',async()=>{
 let resolve,signal;const app=await ui((_p,o)=>{signal=o.signal;return new Promise(r=>resolve=r)});
 const pending=app.click('direct-admin');assert.equal(app.element('cancel-command').disabled,true);app.click('cancel-command');assert.equal(signal.aborted,false);
 app.click('cancel-admin');assert.equal(signal.aborted,true);resolve({ok:true,json:async()=>({usageBuckets:[{}],costBuckets:[{}]})});await pending;
 assert.match(app.element('admin-summary').textContent,/Admin collection cancelled/);assert.equal(app.element('admin-json').textContent,'');
});
test('disconnect cancels an in-flight read and leaves cleared data intact',async()=>{
 let resolve;const app=await ui(()=>new Promise(r=>resolve=r));app.click('connect');app.click('authorize');const pending=app.click('direct-codex');app.click('disconnect');
 resolve({ok:true,json:async()=>({privateData:'late'})});await pending;
 assert.equal(app.element('account-activity').textContent,'Account view cleared.');assert.equal(app.element('connection-status').textContent,'Not connected');
});
