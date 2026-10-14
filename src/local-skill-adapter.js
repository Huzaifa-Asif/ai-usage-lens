import { lstat, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { contentDigest, disclosureKeys, verifyInstallPlan } from "./delivery-plans.js";

const inside = (base, target) => {
  const rel = relative(base, target);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
};
const safeId = value => {
  if (typeof value !== "string" || !/^[a-zA-Z0-9._-]+$/.test(value)) throw new Error("invalid_operation_id");
  return value;
};
const safeRootId = value => {
  if (typeof value !== "string" || !/^[a-zA-Z0-9._-]{1,128}$/.test(value)) throw new Error("invalid_root_id");
  return value;
};
async function exists(path) { try { return await stat(path); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
async function rejectSymlinks(base, target) {
  let current = base;
  for (const part of relative(base, target).split(sep).filter(Boolean)) {
    current = join(current, part);
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error("symlink_path_rejected"); }
    catch (error) { if (error.code !== "ENOENT") throw error; break; }
  }
}
async function atomicWrite(path, bytes) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.ai-usage-lens-${process.pid}-${Date.now()}.tmp`);
  await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
  await rename(temporary, path);
}
const receiptDigest = receipt => createHash("sha256").update(JSON.stringify(Object.fromEntries(Object.entries(receipt || {}).filter(([key]) => key !== "replayed")))).digest("hex");
const validTime = value => Number.isFinite(new Date(value).getTime());
const validateApproval = (plan, approval) => {
  if (approval?.schemaVersion !== "ai-usage-lens/install-approval-v1" || approval.planDigest !== plan.planDigest || !validTime(approval.approvedAt)) throw new Error("approval_mismatch");
  safeId(approval.actorId);
  const expected = disclosureKeys(plan), actual = [...new Set(approval.acknowledgedDisclosures || [])].sort();
  if (expected.length !== actual.length || expected.some((value, index) => value !== actual[index])) throw new Error("approval_mismatch");
};
async function boundedBackup(path, base, journalRoot) {
  if (typeof path !== "string") throw new Error("invalid_receipt");
  const resolved = resolve(path);
  if (!inside(base, resolved) || !inside(journalRoot, resolved)) throw new Error("backup_outside_allowed_base");
  await rejectSymlinks(base, resolved);
  const info = await lstat(resolved);
  if (info.isSymbolicLink() || !info.isFile()) throw new Error("invalid_backup");
  return readFile(resolved, "utf8");
}

export async function discoverClientTargets({ candidates = [], allowedBase } = {}) {
  const base = resolve(allowedBase), targets = [], roots = {};
  for (const candidate of candidates) {
    if (!candidate || typeof candidate.id !== "string" || !/^[a-zA-Z0-9._-]+$/.test(candidate.id)) throw new Error("invalid_target_id");
    if (!new Set(["codex", "claude", "cursor"]).has(candidate.client)) throw new Error("unsupported_client");
    const root = resolve(candidate.root);
    if (!inside(base, root)) throw new Error("root_outside_allowed_base");
    const info = await exists(root); if (!info?.isDirectory()) continue;
    await rejectSymlinks(base, root);
    const normalized = root.split(sep).join("/");
    const effectiveConsumers = normalized.endsWith("/.agents/skills") ? ["codex", "cursor"] : normalized.endsWith("/.claude/skills") ? ["claude", "cursor"] : [candidate.client];
    targets.push({ id: candidate.id, client: candidate.client, rootId: candidate.id, scope: candidate.scope || "personal", effectiveConsumers, status: "discovered_unverified" });
    roots[candidate.id] = root;
  }
  return { targets, roots };
}

export async function applyInstallPlan({ plan, approval, roots, allowedBase, journalDir, operationId, now = new Date() } = {}) {
  safeId(operationId);
  verifyInstallPlan(plan);
  validateApproval(plan, approval);
  if (new Date(plan.expiresAt).getTime() <= new Date(now).getTime()) throw new Error("plan_expired");
  const base = resolve(allowedBase), journalRoot = resolve(journalDir);
  if (!inside(base, journalRoot)) throw new Error("journal_outside_allowed_base");
  await rejectSymlinks(base, journalRoot);
  await mkdir(journalRoot, { recursive: true });
  await rejectSymlinks(base, journalRoot);
  const receiptPath = join(journalRoot, `${operationId}.json`);
  if (await exists(receiptPath)) {
    const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
    if (receipt.planDigest !== plan.planDigest) throw new Error("idempotency_key_reused");
    return { ...receipt, replayed: true };
  }
  const results = [];
  for (const destination of plan.destinations) {
    safeRootId(destination.rootId);
    const root = roots?.[destination.rootId];
    if (!root) { results.push({ rootId: destination.rootId, state: "offline" }); continue; }
    const resolvedRoot = resolve(root);
    if (!inside(base, resolvedRoot)) { results.push({ rootId: destination.rootId, state: "policy_blocked", error: "root_outside_allowed_base" }); continue; }
    const target = resolve(resolvedRoot, destination.relativePath);
    if (!inside(resolvedRoot, target)) { results.push({ rootId: destination.rootId, state: "policy_blocked", error: "path_escape" }); continue; }
    await rejectSymlinks(base, target);
    const current = await exists(target) ? await readFile(target, "utf8") : null;
    const marker = join(dirname(target), ".ai-usage-lens-managed.json");
    const ownership = await exists(marker) ? JSON.parse(await readFile(marker, "utf8")) : null;
    const expected = destination.expectedBinding;
    if (plan.action !== "install" && (!ownership || ownership.itemId !== expected?.itemId || ownership.versionId !== expected?.versionId || ownership.contentDigest !== expected?.contentDigest || !current || contentDigest(current) !== expected.contentDigest)) { results.push({ rootId: destination.rootId, state: "conflict", error: "reviewed_state_changed" }); continue; }
    if (plan.action === "remove") {
      const quarantine = join(journalRoot, `${operationId}-${destination.rootId}.bak`), markerQuarantine = join(journalRoot, `${operationId}-${destination.rootId}.marker.bak`);
      await atomicWrite(quarantine, current); await atomicWrite(markerQuarantine, await readFile(marker, "utf8"));
      await rm(target);
      await rm(marker, { force: true });
      results.push({ rootId: destination.rootId, relativePath: destination.relativePath, state: "files_verified", action: "removed", quarantine, markerQuarantine, beforeDigest: contentDigest(current) });
      continue;
    }
    if (plan.action === "install" && current) {
      if (ownership?.itemId === plan.itemId && ownership.contentDigest === contentDigest(current) && contentDigest(current) === plan.contentDigest) { results.push({ rootId: destination.rootId, relativePath: destination.relativePath, state: "files_verified", action: "noop", afterDigest: plan.contentDigest }); continue; }
      results.push({ rootId: destination.rootId, state: "conflict", error: "target_already_exists" }); continue;
    }
    if (plan.action === "update" && !current) { results.push({ rootId: destination.rootId, state: "conflict", error: "managed_target_missing" }); continue; }
    if (current && (!ownership || ownership.contentDigest !== contentDigest(current))) { results.push({ rootId: destination.rootId, state: "conflict", error: "modified_or_unmanaged" }); continue; }
    if (current && contentDigest(current) === plan.contentDigest) { results.push({ rootId: destination.rootId, relativePath: destination.relativePath, state: "files_verified", action: "noop", afterDigest: plan.contentDigest }); continue; }
    let quarantine = null, markerQuarantine = null;
    if (current) { quarantine = join(journalRoot, `${operationId}-${destination.rootId}.bak`); markerQuarantine = join(journalRoot, `${operationId}-${destination.rootId}.marker.bak`); await atomicWrite(quarantine, current); await atomicWrite(markerQuarantine, await readFile(marker, "utf8")); }
    await atomicWrite(target, plan.content);
    await atomicWrite(marker, JSON.stringify({ schemaVersion: "ai-usage-lens/managed-skill-v1", itemId: plan.itemId, versionId: plan.versionId, contentDigest: plan.contentDigest, planDigest: plan.planDigest }) + "\n");
    results.push({ rootId: destination.rootId, relativePath: destination.relativePath, state: "files_verified", action: current ? "updated" : "installed", quarantine, markerQuarantine, afterDigest: plan.contentDigest, activation: "pending_client_confirmation" });
  }
  const receipt = { schemaVersion: "ai-usage-lens/operation-receipt-v1", operationId, planDigest: plan.planDigest, journalRoot, completedAt: new Date(now).toISOString(), results, replayed: false };
  await atomicWrite(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
  return receipt;
}

export function approveRollback(receipt, { actorId, now = new Date() } = {}) {
  safeId(receipt?.operationId); safeId(actorId);
  if (typeof receipt?.planDigest !== "string" || !receipt.planDigest || typeof receipt?.journalRoot !== "string") throw new Error("invalid_receipt");
  return { schemaVersion: "ai-usage-lens/rollback-approval-v1", operationId: receipt.operationId, planDigest: receipt.planDigest, receiptDigest: receiptDigest(receipt), actorId, approvedAt: new Date(now).toISOString() };
}

export async function rollbackInstallOperation({ receipt, approval, roots, allowedBase } = {}) {
  if (approval?.schemaVersion !== "ai-usage-lens/rollback-approval-v1" || approval.operationId !== receipt?.operationId || approval.planDigest !== receipt?.planDigest || approval.receiptDigest !== receiptDigest(receipt) || !validTime(approval.approvedAt)) throw new Error("rollback_approval_mismatch");
  safeId(approval.actorId);
  const base = resolve(allowedBase), journalRoot = resolve(receipt.journalRoot), results = [];
  if (!inside(base, journalRoot)) throw new Error("journal_outside_allowed_base");
  await rejectSymlinks(base, journalRoot);
  for (const result of receipt?.results || []) {
    if (result.state !== "files_verified" || !["installed", "updated", "removed"].includes(result.action)) continue;
    safeRootId(result.rootId);
    const root = roots?.[result.rootId]; if (!root) { results.push({ rootId: result.rootId, state: "offline" }); continue; }
    const resolvedRoot = resolve(root); if (!inside(base, resolvedRoot)) throw new Error("root_outside_allowed_base");
    const target = resolve(resolvedRoot, result.relativePath), marker = join(dirname(target), ".ai-usage-lens-managed.json");
    if (!inside(resolvedRoot, target)) throw new Error("path_escape");
    await rejectSymlinks(base, target);
    if (result.action === "removed") {
      if (await exists(target) || await exists(marker)) { results.push({ rootId: result.rootId, state: "conflict", error: "destination_recreated" }); continue; }
      await atomicWrite(target, await boundedBackup(result.quarantine, base, journalRoot));
      await atomicWrite(marker, await boundedBackup(result.markerQuarantine, base, journalRoot));
      results.push({ rootId: result.rootId, state: "rolled_back" }); continue;
    }
    if (!(await exists(marker)) || !(await exists(target))) { results.push({ rootId: result.rootId, state: "conflict", error: "ownership_marker_missing" }); continue; }
    const ownership = JSON.parse(await readFile(marker, "utf8"));
    if (ownership.planDigest !== receipt.planDigest) { results.push({ rootId: result.rootId, state: "conflict", error: "ownership_changed" }); continue; }
    const current = await readFile(target, "utf8");
    if (contentDigest(current) !== result.afterDigest) { results.push({ rootId: result.rootId, state: "conflict", error: "modified_after_install" }); continue; }
    if (result.quarantine) { await atomicWrite(target, await boundedBackup(result.quarantine, base, journalRoot)); await atomicWrite(marker, await boundedBackup(result.markerQuarantine, base, journalRoot)); } else { await rm(target); await rm(marker, { force: true }); }
    results.push({ rootId: result.rootId, state: "rolled_back" });
  }
  return { schemaVersion: "ai-usage-lens/rollback-receipt-v1", sourceOperationId: receipt.operationId, results };
}
