#!/usr/bin/env node
import {writeFile} from "node:fs/promises";import {resolve} from "node:path";import {collectAdminAggregates,AdminApiError,adminConfigState} from "./admin-api.js";
const args=process.argv.slice(2),value=f=>{const i=args.indexOf(f);return i>=0?args[i+1]:undefined};
if(args.includes("--check-config")){console.log(adminConfigState(process.env));process.exit(0)}
if(!args.includes("--live")||!value("--output")||!value("--start-time")){console.error("Usage: OPENAI_ADMIN_KEY=... npm run collect:admin -- --check-config | --live --start-time UNIX --output admin-capture.json [--end-time UNIX]");console.error("Requires an organization Admin API key in the environment; keys never enter the browser or output.");process.exit(2)}
const output=resolve(value("--output")),startTime=Number(value("--start-time")),end=value("--end-time"),apiKey=process.env.OPENAI_ADMIN_KEY;
try{const capture=await collectAdminAggregates({apiKey,startTime,endTime:end===undefined?undefined:Number(end)});const json=JSON.stringify(capture,null,2);if(Buffer.byteLength(json)>5_000_000)throw new AdminApiError("capture_too_large");await writeFile(output,`${json}\n`,{encoding:"utf8",mode:0o600,flag:"wx"});console.log(output)}catch(e){console.error(`Collection failed: ${e instanceof AdminApiError?e.code:"collector_error"}`);process.exit(1)}
