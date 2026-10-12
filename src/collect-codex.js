#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { collectCodexReadOnly,CollectorError } from "./codex-collector.js";

const argv=process.argv.slice(2);const value=k=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:null};
if(!argv.includes("--live")||!value("--output")){console.error("Usage: node src/collect-codex.js --live --output capture.json [--thread-id ID] [--codex /path/to/codex]");console.error("--live explicitly authorizes two read-only account requests to an already authenticated local Codex App Server.");process.exit(2);}
const executable=value("--codex")||"codex";const output=resolve(value("--output"));const threadId=value("--thread-id")||undefined;
console.error("Account access notice: reading current Codex rate-limit state and token-activity summary. No threads, prompts, login tokens, credentials, or settings are read or changed.");
try{const capture=await collectCodexReadOnly({executable,threadId});const json=JSON.stringify(capture,null,2);if(Buffer.byteLength(json)>2_000_000)throw new CollectorError("capture_too_large");await writeFile(output,`${json}\n`,{encoding:"utf8",mode:0o600,flag:"wx"});console.log(output);}catch(e){console.error(`Collection failed: ${e instanceof CollectorError?e.code:"collector_error"}`);process.exit(1);}
