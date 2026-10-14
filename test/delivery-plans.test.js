import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { approveInstallPlan, contentDigest, createInstallPlan, disclosureKeys } from "../src/delivery-plans.js";
import { applyInstallPlan, approveRollback, discoverClientTargets, rollbackInstallOperation } from "../src/local-skill-adapter.js";

const content = "---\nname: context-hygiene\ndescription: Synthetic test skill.\n---\n\n# Context hygiene\n";
const targets = [
  { id: "codex-personal", client: "codex", rootId: "shared-agents", effectiveConsumers: ["codex", "cursor"] },
  { id: "cursor-personal", client: "cursor", rootId: "shared-agents", effectiveConsumers: ["cursor", "codex"] },
  { id: "claude-personal", client: "claude", rootId: "claude", effectiveConsumers: ["claude"] },
];
const expectedBindings = (versionId, value) => Object.fromEntries(["shared-agents", "claude"].map(rootId => [rootId, { itemId: "item-1", versionId, contentDigest: contentDigest(value) }]));

test("install plan deduplicates overlapping roots and binds approval to disclosures", () => {
  const plan = createInstallPlan({ item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v1", content }, targets, now: "2026-10-14T00:00:00Z" });
  assert.equal(plan.destinations.length, 2);
  assert.deepEqual(plan.destinations.find(value => value.rootId === "shared-agents").selectedClients, ["codex", "cursor"]);
  assert.deepEqual(plan.disclosures, []);
  assert.equal(approveInstallPlan(plan, { actorId: "user-1", now: "2026-10-14T00:01:00Z" }).planDigest, plan.planDigest);

  const codexOnly = createInstallPlan({ item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v1", content }, targets: targets.slice(0, 1), now: "2026-10-14T00:00:00Z" });
  assert.deepEqual(codexOnly.disclosures.map(value => value.consumer), ["cursor"]);
  assert.throws(() => approveInstallPlan(codexOnly, { actorId: "user-1", now: "2026-10-14T00:01:00Z" }), /disclosure_acknowledgement_required/);
  assert.equal(approveInstallPlan(codexOnly, { actorId: "user-1", acknowledgedDisclosures: disclosureKeys(codexOnly), now: "2026-10-14T00:01:00Z" }).planDigest, codexOnly.planDigest);
});

test("tampered and expired plans are rejected", () => {
  const plan = createInstallPlan({ item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v1", content }, targets: targets.slice(2), now: "2026-10-14T00:00:00Z", ttlMs: 1000 });
  assert.throws(() => approveInstallPlan({ ...plan, content: `${content}tampered` }, { actorId: "user-1", now: "2026-10-14T00:00:00Z" }), /plan_tampered/);
  assert.throws(() => approveInstallPlan(plan, { actorId: "user-1", now: "2026-10-14T00:00:02Z" }), /plan_expired/);
  assert.throws(() => createInstallPlan({ item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v1", content }, targets: [{ id: "bad", client: "cursor", rootId: "../../escape" }] }), /invalid_root_id/);
  assert.throws(() => createInstallPlan({ item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v2", content }, targets: targets.slice(2), action: "update" }), /expected_binding_required/);
});

test("companion discovers multiple explicitly supplied Cursor roots without scanning outside its grant", async () => {
  const base = await mkdtemp(join(tmpdir(), "lens-synthetic-discovery-"));
  try {
    const personal = join(base, "home", ".cursor", "skills"), project = join(base, "work", "repo", ".cursor", "skills"), shared = join(base, "work", "repo", ".agents", "skills");
    await Promise.all([mkdir(personal, { recursive: true }), mkdir(project, { recursive: true }), mkdir(shared, { recursive: true })]);
    const found = await discoverClientTargets({ allowedBase: base, candidates: [
      { id: "cursor-personal", client: "cursor", root: personal, scope: "personal" },
      { id: "cursor-project", client: "cursor", root: project, scope: "project" },
      { id: "shared-project", client: "cursor", root: shared, scope: "project" },
      { id: "missing", client: "cursor", root: join(base, "missing"), scope: "project" },
    ] });
    assert.deepEqual(found.targets.map(value => value.id), ["cursor-personal", "cursor-project", "shared-project"]);
    assert.deepEqual(found.targets[2].effectiveConsumers, ["codex", "cursor"]);
    await assert.rejects(discoverClientTargets({ allowedBase: base, candidates: [{ id: "escape", client: "cursor", root: join(base, "..", "outside") }] }), /root_outside_allowed_base/);
  } finally { await rm(base, { recursive: true, force: true }); }
});

test("companion applies approved plans only inside explicit roots, verifies bytes, replays safely, and rolls back", async () => {
  const base = await mkdtemp(join(tmpdir(), "lens-synthetic-clients-"));
  try {
    const roots = { "shared-agents": join(base, "home", ".agents", "skills"), claude: join(base, "home", ".claude", "skills") };
    await mkdir(roots["shared-agents"], { recursive: true }); await mkdir(roots.claude, { recursive: true });
    const plan = createInstallPlan({ item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v1", content }, targets, now: "2026-10-14T00:00:00Z", ttlMs: 60_000 });
    const approval = approveInstallPlan(plan, { actorId: "user-1", now: "2026-10-14T00:00:01Z" });
    const options = { plan, approval, roots, allowedBase: base, journalDir: join(base, "journal"), operationId: "op-1", now: "2026-10-14T00:00:02Z" };
    const receipt = await applyInstallPlan(options);
    assert.deepEqual(receipt.results.map(value => value.action), ["installed", "installed"]);
    assert.equal(await readFile(join(roots["shared-agents"], "context-hygiene", "SKILL.md"), "utf8"), content);
    assert.equal((await applyInstallPlan(options)).replayed, true);
    await assert.rejects(applyInstallPlan({ ...options, approval: { planDigest: plan.planDigest }, operationId: "op-forged" }), /approval_mismatch/);
    await assert.rejects(applyInstallPlan({ ...options, plan: { ...plan, content: `${content}tampered` }, operationId: "op-tampered" }), /plan_tampered/);
    const updatedContent = `${content}\nUpdated safely.\n`, updatePlan = createInstallPlan({ item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v2", content: updatedContent }, targets, expectedBindings: expectedBindings("v1", content), action: "update", now: "2026-10-14T00:00:03Z", ttlMs: 60_000 });
    const updateApproval = approveInstallPlan(updatePlan, { actorId: "user-1", now: "2026-10-14T00:00:04Z" });
    const updateReceipt = await applyInstallPlan({ plan: updatePlan, approval: updateApproval, roots, allowedBase: base, journalDir: join(base, "journal"), operationId: "op-2", now: "2026-10-14T00:00:05Z" });
    assert.deepEqual(updateReceipt.results.map(value => value.action), ["updated", "updated"]);
    const staleContent = `${content}\nStale update.\n`, stalePlan = createInstallPlan({ item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v-stale", content: staleContent }, targets, expectedBindings: expectedBindings("v1", content), action: "update", now: "2026-10-14T00:00:03Z", ttlMs: 60_000 });
    const staleReceipt = await applyInstallPlan({ plan: stalePlan, approval: approveInstallPlan(stalePlan, { actorId: "user-1", now: "2026-10-14T00:00:04Z" }), roots, allowedBase: base, journalDir: join(base, "journal"), operationId: "op-stale", now: "2026-10-14T00:00:05Z" });
    assert.deepEqual(staleReceipt.results.map(value => value.error), ["reviewed_state_changed", "reviewed_state_changed"]);
    const updateRollback = await rollbackInstallOperation({ receipt: updateReceipt, approval: approveRollback(updateReceipt, { actorId: "user-1" }), roots, allowedBase: base });
    assert.deepEqual(updateRollback.results.map(value => value.state), ["rolled_back", "rolled_back"]);
    assert.equal(await readFile(join(roots["shared-agents"], "context-hygiene", "SKILL.md"), "utf8"), content);
    const removePlan = createInstallPlan({ item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v1", content }, targets, expectedBindings: expectedBindings("v1", content), action: "remove", now: "2026-10-14T00:00:06Z", ttlMs: 60_000 });
    const removeReceipt = await applyInstallPlan({ plan: removePlan, approval: approveInstallPlan(removePlan, { actorId: "user-1", now: "2026-10-14T00:00:07Z" }), roots, allowedBase: base, journalDir: join(base, "journal"), operationId: "op-remove", now: "2026-10-14T00:00:08Z" });
    assert.deepEqual(removeReceipt.results.map(value => value.action), ["removed", "removed"]);
    const escapedReceipt = { ...removeReceipt, results: removeReceipt.results.map((value, index) => index ? value : { ...value, quarantine: "/tmp/outside.bak" }) };
    await assert.rejects(rollbackInstallOperation({ receipt: escapedReceipt, approval: approveRollback(escapedReceipt, { actorId: "user-1" }), roots, allowedBase: base }), /backup_outside_allowed_base/);
    const removeRollback = await rollbackInstallOperation({ receipt: removeReceipt, approval: approveRollback(removeReceipt, { actorId: "user-1" }), roots, allowedBase: base });
    assert.deepEqual(removeRollback.results.map(value => value.state), ["rolled_back", "rolled_back"]);
    await assert.rejects(rollbackInstallOperation({ receipt, approval: approveRollback(updateReceipt, { actorId: "user-1" }), roots, allowedBase: base }), /rollback_approval_mismatch/);
    const rollback = await rollbackInstallOperation({ receipt, approval: approveRollback(receipt, { actorId: "user-1" }), roots, allowedBase: base });
    assert.deepEqual(rollback.results.map(value => value.state), ["rolled_back", "rolled_back"]);
  } finally { await rm(base, { recursive: true, force: true }); }
});

test("companion preserves unmanaged and locally edited skills", async () => {
  const base = await mkdtemp(join(tmpdir(), "lens-synthetic-conflict-"));
  try {
    const root = join(base, "cursor", "skills"), target = join(root, "context-hygiene", "SKILL.md");
    await mkdir(join(root, "context-hygiene"), { recursive: true }); await writeFile(target, "user-owned\n");
    const plan = createInstallPlan({ item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v1", content }, targets: [{ id: "cursor", client: "cursor", rootId: "cursor", effectiveConsumers: ["cursor"] }], now: "2026-10-14T00:00:00Z" });
    const approval = approveInstallPlan(plan, { actorId: "user-1", now: "2026-10-14T00:00:01Z" });
    const receipt = await applyInstallPlan({ plan, approval, roots: { cursor: root }, allowedBase: base, journalDir: join(base, "journal"), operationId: "conflict", now: "2026-10-14T00:00:02Z" });
    assert.equal(receipt.results[0].state, "conflict");
    assert.equal(await readFile(target, "utf8"), "user-owned\n");
  } finally { await rm(base, { recursive: true, force: true }); }
});

test("companion rejects a symlinked journal root before receipts or backups are written", async () => {
  const base = await mkdtemp(join(tmpdir(), "lens-synthetic-journal-")), outside = await mkdtemp(join(tmpdir(), "lens-outside-journal-"));
  try {
    const root = join(base, "skills"); await mkdir(root); await symlink(outside, join(base, "journal-link"));
    const plan = createInstallPlan({ item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v1", content }, targets: [{ id: "cursor", client: "cursor", rootId: "cursor", effectiveConsumers: ["cursor"] }], now: "2026-10-14T00:00:00Z" });
    const approval = approveInstallPlan(plan, { actorId: "user-1", now: "2026-10-14T00:00:01Z" });
    await assert.rejects(applyInstallPlan({ plan, approval, roots: { cursor: root }, allowedBase: base, journalDir: join(base, "journal-link"), operationId: "escape", now: "2026-10-14T00:00:02Z" }), /symlink_path_rejected/);
  } finally { await rm(base, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
});
