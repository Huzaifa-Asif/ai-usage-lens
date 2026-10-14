import { createHash } from "node:crypto";

const CLIENTS = new Set(["codex", "claude", "cursor"]);
const ACTIONS = new Set(["install", "update", "remove"]);
const MODES = new Set(["copy"]);

const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(stable(value))).digest("hex");
const text = (value, field) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`invalid_${field}`);
  return value.trim();
};
const opaqueId = (value, field) => {
  const result = text(value, field);
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(result)) throw new Error(`invalid_${field}`);
  return result;
};
const slug = value => {
  const result = text(value, "slug").toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) throw new Error("invalid_slug");
  return result;
};

export function createInstallPlan({ item, version, targets, expectedBindings = {}, action = "install", mode = "copy", now = new Date(), ttlMs = 15 * 60_000 } = {}) {
  if (!ACTIONS.has(action)) throw new Error("unsupported_action");
  if (!MODES.has(mode)) throw new Error("unsupported_mode");
  if (!Array.isArray(targets) || targets.length === 0) throw new Error("targets_required");
  const itemId = text(item?.id, "item_id"), itemSlug = slug(item?.slug), versionId = text(version?.id, "version_id");
  if (typeof version?.content !== "string" || !version.content.trim()) throw new Error("invalid_content");
  const contentDigest = digest(version.content);
  const selectedClients = new Set();
  const destinations = new Map();
  for (const target of targets) {
    const id = opaqueId(target?.id, "target_id"), client = text(target?.client, "client").toLowerCase();
    if (!CLIENTS.has(client)) throw new Error("unsupported_client");
    const rootId = opaqueId(target?.rootId, "root_id");
    const consumers = [...new Set([client, ...(target.effectiveConsumers || [])].map(value => text(value, "consumer").toLowerCase()))].sort();
    if (consumers.some(value => !CLIENTS.has(value))) throw new Error("unsupported_consumer");
    selectedClients.add(client);
    const key = `${rootId}:${itemSlug}`;
    let expectedBinding = null;
    if (action !== "install") {
      const expected = expectedBindings[rootId];
      if (!expected || opaqueId(expected.itemId, "expected_item_id") !== itemId || typeof expected.contentDigest !== "string" || !/^[a-f0-9]{64}$/.test(expected.contentDigest)) throw new Error("expected_binding_required");
      expectedBinding = { itemId, versionId: opaqueId(expected.versionId, "expected_version_id"), contentDigest: expected.contentDigest };
    }
    const destination = destinations.get(key) || { rootId, relativePath: `${itemSlug}/SKILL.md`, targetIds: [], selectedClients: [], effectiveConsumers: [], expectedBinding };
    if (JSON.stringify(destination.expectedBinding) !== JSON.stringify(expectedBinding)) throw new Error("conflicting_expected_binding");
    destination.targetIds.push(id);
    destination.selectedClients.push(client);
    destination.effectiveConsumers.push(...consumers);
    destination.targetIds = [...new Set(destination.targetIds)].sort();
    destination.selectedClients = [...new Set(destination.selectedClients)].sort();
    destination.effectiveConsumers = [...new Set(destination.effectiveConsumers)].sort();
    destinations.set(key, destination);
  }
  const normalizedDestinations = [...destinations.values()].sort((a, b) => `${a.rootId}:${a.relativePath}`.localeCompare(`${b.rootId}:${b.relativePath}`));
  const disclosures = normalizedDestinations.flatMap(destination => destination.effectiveConsumers
    .filter(consumer => !selectedClients.has(consumer))
    .map(consumer => ({ code: "unselected_effective_consumer", rootId: destination.rootId, relativePath: destination.relativePath, consumer })));
  const issuedAt = new Date(now).toISOString(), expiresAt = new Date(new Date(now).getTime() + ttlMs).toISOString();
  const core = { schemaVersion: "ai-usage-lens/install-plan-v1", itemId, itemSlug, versionId, contentDigest, content: version.content, action, mode, issuedAt, expiresAt, destinations: normalizedDestinations, disclosures };
  return { ...core, planDigest: digest(core) };
}

export function approveInstallPlan(plan, { actorId, acknowledgedDisclosures = [], now = new Date() } = {}) {
  verifyInstallPlan(plan);
  if (new Date(plan.expiresAt).getTime() <= new Date(now).getTime()) throw new Error("plan_expired");
  const required = plan.disclosures.map(value => `${value.code}:${value.rootId}:${value.relativePath}:${value.consumer}`).sort();
  const acknowledged = [...new Set(acknowledgedDisclosures)].sort();
  if (required.some(value => !acknowledged.includes(value))) throw new Error("disclosure_acknowledgement_required");
  return { schemaVersion: "ai-usage-lens/install-approval-v1", planDigest: plan.planDigest, actorId: text(actorId, "actor_id"), approvedAt: new Date(now).toISOString(), acknowledgedDisclosures: acknowledged };
}

export function disclosureKeys(plan) {
  return plan.disclosures.map(value => `${value.code}:${value.rootId}:${value.relativePath}:${value.consumer}`).sort();
}

export function verifyInstallPlan(plan) {
  if (!plan?.planDigest || digest(Object.fromEntries(Object.entries(plan).filter(([key]) => key !== "planDigest"))) !== plan.planDigest || digest(plan.content) !== plan.contentDigest) throw new Error("plan_tampered");
  return true;
}

export const contentDigest = digest;
