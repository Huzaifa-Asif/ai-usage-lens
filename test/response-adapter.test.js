import test from "node:test";
import assert from "node:assert/strict";
import { adaptResponses } from "../src/core.js";
test("Responses adapter maps cached and reasoning detail fields",()=>{
 const l=adaptResponses({id:"resp_1",created_at:1790812800,model:"m",metadata:{thread_id:"t",message_id:"msg"},usage:{input_tokens:12,input_tokens_details:{cached_tokens:5},output_tokens:8,output_tokens_details:{reasoning_tokens:3}}});
 assert.deepEqual(l.records[0].usage,{inputTokens:12,cachedInputTokens:5,cacheWriteInputTokens:null,outputTokens:8,reasoningTokens:3});
});
