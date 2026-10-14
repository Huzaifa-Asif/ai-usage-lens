const PATHS=new Set(['/api/collect/codex','/api/collect/admin','/api/collect/cursor']);
const cancelled=()=>Object.assign(new Error('cancelled'),{name:'AbortError'});

/** One in-flight collection; cancelled/stale responses never reach the renderer. */
export function createCollectionClient({fetchImpl=globalThis.fetch,timeoutMs=12000}={}){
 let active=null;
 return {
  cancel(path){if(!active||(path&&path!==active.path))return false;active.controller.abort();return true;},
  get activePath(){return active?.path??null;},
  get busy(){return active!==null;},
  async collect(path){
   if(!PATHS.has(path))throw new Error('request_rejected');
   if(active)throw new Error('collection_in_progress');
   const request={controller:new AbortController(),timedOut:false,path};active=request;
   const abortError=()=>request.timedOut?new Error('timeout'):cancelled();
   const timer=setTimeout(()=>{request.timedOut=true;request.controller.abort();},timeoutMs);
   try{
    const response=await fetchImpl(path,{method:'POST',headers:{Accept:'application/json'},signal:request.controller.signal});
    if(request.controller.signal.aborted)throw abortError();
    const body=await response.json();
    if(request.controller.signal.aborted)throw abortError();
    if(!response.ok)throw new Error(body.error||'collection_failed');
    return body;
   }catch(error){if(request.controller.signal.aborted)throw abortError();throw error;}
   finally{clearTimeout(timer);if(active===request)active=null;}
  }
 };
}
