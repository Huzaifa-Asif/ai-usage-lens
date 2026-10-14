import {open} from 'node:fs/promises';
import {constants} from 'node:fs';
export const MAX_JSON_BYTES=10_000_000;
export async function readJsonFile(path,{maxBytes=MAX_JSON_BYTES}={}){
 let file;
 try{
  file=await open(path,constants.O_RDONLY | (constants.O_NONBLOCK || 0));const info=await file.stat();
  if(!info.isFile())throw new Error('input_not_regular_file');
  if(info.size>maxBytes)throw new Error('input_too_large');
  const chunks=[];let size=0;
  for await(const chunk of file.createReadStream({autoClose:false})){size+=chunk.length;if(size>maxBytes)throw new Error('input_too_large');chunks.push(chunk);}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)))}catch{throw new Error('invalid_json')}
 }catch(error){if(['input_too_large','input_not_regular_file','invalid_json'].includes(error.message))throw error;throw new Error('input_unavailable');}
 finally{await file?.close();}
}
