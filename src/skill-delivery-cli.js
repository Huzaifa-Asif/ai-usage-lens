#!/usr/bin/env node
import { parseArgs } from "node:util";
import { lstat, open, readFile, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { approveInstallPlan, contentDigest, createInstallPlan, disclosureKeys, verifyInstallPlan } from "./delivery-plans.js";
import { applyInstallPlan, approveRollback, discoverClientTargets, installReceiptDigest, previewInstallPlan, rollbackInstallOperation, verifyInstallReceipt } from "./local-skill-adapter.js";

const SUPPORTED_SUFFIX = { codex: ".agents/skills", claude: ".claude/skills", cursor: ".cursor/skills" };
const inside = (base, target) => { const rel = relative(base, target); return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel)); };
const json = path => readFile(resolve(path), "utf8").then(JSON.parse);
const save = async (path, value) => writeFile(resolve(path), JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
const fail = message => { const error = new Error(message); error.code = message; throw error; };
const parse = argv => parseArgs({ args: argv, allowPositionals: true, strict: true, options: { config: { type: "string" }, plan: { type: "string" }, receipt: { type: "string" }, out: { type: "string" }, actor: { type: "string" }, operation: { type: "string" }, "confirm-plan": { type: "string" }, "confirm-operation": { type: "string" }, "confirm-receipt": { type: "string" }, ack: { type: "string", multiple: true } } });

async function rejectSymlinks(base, target) {
  let current = base;
  for (const part of relative(base, target).split(sep).filter(Boolean)) {
    current = join(current, part);
    const info = await lstat(current);
    if (info.isSymbolicLink()) fail("symlink_path_rejected");
  }
}

async function safeContent(config) {
  const contentFile = resolve(config.version?.contentFile || "");
  if (!config.version?.contentFile || !inside(config.allowedBase, contentFile)) fail("content_outside_allowed_base");
  await rejectSymlinks(config.allowedBase, contentFile);
  const info = await lstat(contentFile);
  if (!info.isFile() || info.size > 1_000_000) fail("invalid_skill_content_file");
  return readFile(contentFile, "utf8");
}

async function authoritativeReceipt(config, suppliedPath) {
  const supplied = await json(suppliedPath);
  if (typeof supplied?.operationId !== "string" || !/^[a-zA-Z0-9._-]+$/.test(supplied.operationId)) fail("invalid_receipt");
  const journalPath = join(config.journalDir, `${supplied.operationId}.json`);
  await rejectSymlinks(config.allowedBase, journalPath);
  const journal = await json(journalPath);
  if (resolve(journal.journalRoot || "") !== config.journalDir || installReceiptDigest(supplied) !== installReceiptDigest(journal)) fail("receipt_journal_mismatch");
  return journal;
}

async function reservedOutput(path) {
  const resolved = resolve(path), handle = await open(resolved, "wx", 0o600);
  return { resolved, async finish(value) { await handle.writeFile(JSON.stringify(value, null, 2) + "\n"); await handle.close(); }, async abort() { await handle.close(); await unlink(resolved); } };
}

async function configuration(path) {
  const value = await json(path);
  const base = resolve(value.allowedBase || ""), journalDir = resolve(value.journalDir || "");
  if (!value.allowedBase || !value.journalDir || !inside(base, journalDir)) fail("invalid_delivery_boundary");
  if (!Array.isArray(value.targets) || !value.targets.length) fail("targets_required");
  for (const target of value.targets) {
    const suffix = SUPPORTED_SUFFIX[target?.client];
    if (!suffix || !resolve(target.root || "").split(sep).join("/").endsWith(`/${suffix}`)) fail("unsupported_client_root");
  }
  return { ...value, allowedBase: base, journalDir };
}

async function discovery(config) {
  const found = await discoverClientTargets({ candidates: config.targets, allowedBase: config.allowedBase });
  if (!found.targets.length) fail("no_supported_roots_found");
  return found;
}

function publicDiscovery(found) {
  return { targets: found.targets.map(target => ({ ...target, root: found.roots[target.rootId] })) };
}

async function buildPlan(config) {
  const found = await discovery(config);
  const content = await safeContent(config);
  const boundary = { allowedBaseDigest: contentDigest(config.allowedBase), journalRootDigest: contentDigest(config.journalDir) };
  const plan = createInstallPlan({ item: config.item, version: { id: config.version.id, content }, targets: found.targets, expectedBindings: config.expectedBindings || {}, boundary, action: config.action || "install" });
  const preview = await previewInstallPlan({ plan, roots: found.roots, allowedBase: config.allowedBase });
  return { plan, preview, found };
}

async function rootsForPlan(config, plan) {
  verifyInstallPlan(plan);
  if (!plan.boundary || plan.boundary.allowedBaseDigest !== contentDigest(config.allowedBase) || plan.boundary.journalRootDigest !== contentDigest(config.journalDir)) fail("reviewed_boundary_changed");
  const found = await discovery(config), targets = new Map(found.targets.map(value => [value.rootId, value]));
  if (plan.destinations.some(value => !targets.has(value.rootId))) fail("reviewed_target_unavailable");
  if (plan.destinations.some(value => !value.rootPathDigest || targets.get(value.rootId).rootPathDigest !== value.rootPathDigest)) fail("reviewed_root_changed");
  return found;
}

export async function runSkillDelivery(argv = process.argv.slice(2)) {
  const { positionals, values } = parse(argv), command = positionals[0];
  if (!command || !values.config) fail("usage_error");
  const config = await configuration(values.config);
  if (command === "discover") return { command, ...(publicDiscovery(await discovery(config))) };
  if (command === "preview") {
    if (!values.out) fail("output_required");
    const { plan, preview } = await buildPlan(config);
    await save(values.out, plan);
    return { command, planFile: resolve(values.out), planDigest: plan.planDigest, allowedBase: config.allowedBase, journalDir: config.journalDir, requiredAcknowledgements: disclosureKeys(plan), preview };
  }
  if (command === "apply") {
    if (!values.plan || !values.out || !values.actor || !values.operation || !values["confirm-plan"]) fail("apply_arguments_required");
    const plan = await json(values.plan);
    if (values["confirm-plan"] !== plan.planDigest) fail("plan_confirmation_mismatch");
    const found = await rootsForPlan(config, plan), output = await reservedOutput(values.out);
    try {
      const approval = approveInstallPlan(plan, { actorId: values.actor, acknowledgedDisclosures: values.ack || [] });
      const receipt = await applyInstallPlan({ plan, approval, roots: found.roots, allowedBase: config.allowedBase, journalDir: config.journalDir, operationId: values.operation });
      await output.finish(receipt);
      return { command, receiptFile: output.resolved, operationId: receipt.operationId, planDigest: receipt.planDigest, receiptDigest: installReceiptDigest(receipt), results: receipt.results };
    } catch (error) { await output.abort(); throw error; }
  }
  if (command === "verify") {
    if (!values.receipt) fail("receipt_required");
    const receipt = await authoritativeReceipt(config, values.receipt), found = await discovery(config);
    return { command, ...(await verifyInstallReceipt({ receipt, roots: found.roots, allowedBase: config.allowedBase })) };
  }
  if (command === "rollback") {
    if (!values.receipt || !values.actor || !values["confirm-plan"] || !values["confirm-operation"] || !values["confirm-receipt"]) fail("rollback_arguments_required");
    const receipt = await authoritativeReceipt(config, values.receipt);
    if (values["confirm-plan"] !== receipt.planDigest || values["confirm-operation"] !== receipt.operationId || values["confirm-receipt"] !== installReceiptDigest(receipt)) fail("rollback_confirmation_mismatch");
    const found = await discovery(config), approval = approveRollback(receipt, { actorId: values.actor });
    return { command, ...(await rollbackInstallOperation({ receipt, approval, roots: found.roots, allowedBase: config.allowedBase })) };
  }
  fail("unsupported_command");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSkillDelivery().then(value => process.stdout.write(JSON.stringify(value, null, 2) + "\n")).catch(error => { process.stderr.write(JSON.stringify({ error: error.code || error.message || "delivery_failed" }) + "\n"); process.exitCode = 1; });
}
