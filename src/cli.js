#!/usr/bin/env node
import {readJsonFile} from './file-io.js';
import { normalizeLedger, normalizePrices, analyze, suggestions, LedgerError } from "./core.js";
const [ledgerPath, pricePath] = process.argv.slice(2);
if (!ledgerPath || !pricePath) { console.error("Usage: npm run cli -- <ledger.json> <prices.json>"); process.exit(2); }
try {
  const [ledgerRaw,priceRaw]=await Promise.all([readJsonFile(ledgerPath),readJsonFile(pricePath)]);
  const result = analyze(normalizeLedger(ledgerRaw), normalizePrices(priceRaw));
  const {records,...total}=result.total;
  const rateMap=new Map();
  for(const record of records)if(record.cost?.rate){const rate=record.cost.rate;rateMap.set(JSON.stringify(rate),rate);}
  const rates=[...rateMap.values()],tips=suggestions(result),limit=100;
  console.log(JSON.stringify({ total, threads: result.threads.slice(0,limit).map(({records,...x})=>x), appliedRates:rates.slice(0,limit), suggestions:tips.slice(0,limit), omitted:{threads:Math.max(0,result.threads.length-limit),appliedRates:Math.max(0,rates.length-limit),suggestions:Math.max(0,tips.length-limit)} }, null, 2));
} catch (e) { console.error(e instanceof LedgerError ? `${e.message}:\n- ${e.issues.join("\n- ")}` : e.message); process.exit(1); }
