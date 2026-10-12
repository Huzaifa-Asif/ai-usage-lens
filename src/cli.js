#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { normalizeLedger, normalizePrices, analyze, suggestions, LedgerError } from "./core.js";
const [ledgerPath, pricePath] = process.argv.slice(2);
if (!ledgerPath || !pricePath) { console.error("Usage: npm run cli -- <ledger.json> <prices.json>"); process.exit(2); }
try {
  const [l,p] = await Promise.all([readFile(ledgerPath,"utf8"), readFile(pricePath,"utf8")]);
  let ledgerRaw,priceRaw;try{ledgerRaw=JSON.parse(l);priceRaw=JSON.parse(p)}catch{throw new Error("Invalid JSON")}
  const result = analyze(normalizeLedger(ledgerRaw), normalizePrices(priceRaw));
  console.log(JSON.stringify({ total: result.total, threads: result.threads.map(({records,...x})=>x), suggestions: suggestions(result) }, null, 2));
} catch (e) { console.error(e instanceof LedgerError ? `${e.message}:\n- ${e.issues.join("\n- ")}` : e.message); process.exit(1); }
