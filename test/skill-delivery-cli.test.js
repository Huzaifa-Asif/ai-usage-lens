import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

const exec = promisify(execFile);
const cli = join(process.cwd(), "src", "skill-delivery-cli.js");
const run = async args => JSON.parse((await exec(process.execPath, [cli, ...args], { cwd: process.cwd() })).stdout);

test("delivery CLI supports discover, safe preview, explicit consent, verification and rollback", async () => {
  const base = await mkdtemp(join(tmpdir(), "lens-delivery-cli-"));
  try {
    const root = join(base, "profile", ".agents", "skills"), journal = join(base, "journal"), draft = join(base, "draft.md"), configPath = join(base, "config.json"), planPath = join(base, "plan.json"), receiptPath = join(base, "receipt.json");
    await mkdir(root, { recursive: true });
    const content = "---\nname: context-hygiene\ndescription: Synthetic local skill.\n---\n\n# Context hygiene\n";
    await writeFile(draft, content);
    await writeFile(configPath, JSON.stringify({ allowedBase: base, journalDir: journal, item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v1", contentFile: draft }, targets: [{ id: "codex-personal", client: "codex", root, scope: "personal" }] }));

    const discovered = await run(["discover", "--config", configPath]);
    assert.deepEqual(discovered.targets[0].effectiveConsumers, ["codex", "cursor"]);
    const preview = await run(["preview", "--config", configPath, "--out", planPath]);
    assert.equal(preview.preview.results[0].proposedAction, "install");
    assert.equal(preview.preview.results[0].afterBytes, Buffer.byteLength(content));
    assert.doesNotMatch(JSON.stringify(preview), /# Context hygiene/);
    assert.equal((await stat(planPath)).mode & 0o777, 0o600);
    const plan = JSON.parse(await readFile(planPath, "utf8"));
    await assert.rejects(run(["apply", "--config", configPath, "--plan", planPath, "--out", receiptPath, "--actor", "owner", "--operation", "op-1", "--confirm-plan", "wrong"]));
    const remapped = join(base, "other", ".agents", "skills"); await mkdir(remapped, { recursive: true });
    await writeFile(configPath, JSON.stringify({ allowedBase: base, journalDir: journal, item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v1", contentFile: draft }, targets: [{ id: "codex-personal", client: "codex", root: remapped, scope: "personal" }] }));
    await assert.rejects(run(["apply", "--config", configPath, "--plan", planPath, "--out", receiptPath, "--actor", "owner", "--operation", "op-1", "--confirm-plan", plan.planDigest, "--ack", preview.requiredAcknowledgements[0]]), /reviewed_root_changed/);
    await writeFile(configPath, JSON.stringify({ allowedBase: base, journalDir: journal, item: { id: "item-1", slug: "context-hygiene" }, version: { id: "v1", contentFile: draft }, targets: [{ id: "codex-personal", client: "codex", root, scope: "personal" }] }));
    const occupied = join(base, "occupied.json"); await writeFile(occupied, "reserved");
    await assert.rejects(run(["apply", "--config", configPath, "--plan", planPath, "--out", occupied, "--actor", "owner", "--operation", "op-occupied", "--confirm-plan", plan.planDigest, "--ack", preview.requiredAcknowledgements[0]]));
    await assert.rejects(readFile(join(root, "context-hygiene", "SKILL.md"), "utf8"), /ENOENT/);
    const applied = await run(["apply", "--config", configPath, "--plan", planPath, "--out", receiptPath, "--actor", "owner", "--operation", "op-1", "--confirm-plan", plan.planDigest, "--ack", preview.requiredAcknowledgements[0]]);
    assert.equal(applied.results[0].action, "installed");
    assert.equal((await run(["verify", "--config", configPath, "--receipt", receiptPath])).verified, true);
    const originalReceipt = await readFile(receiptPath, "utf8"), forged = JSON.parse(originalReceipt); forged.results[0].relativePath = "other/SKILL.md"; await writeFile(receiptPath, JSON.stringify(forged));
    await assert.rejects(run(["verify", "--config", configPath, "--receipt", receiptPath]), /receipt_journal_mismatch/);
    await writeFile(receiptPath, originalReceipt);
    const rolledBack = await run(["rollback", "--config", configPath, "--receipt", receiptPath, "--actor", "owner", "--confirm-operation", "op-1", "--confirm-plan", plan.planDigest, "--confirm-receipt", applied.receiptDigest]);
    assert.equal(rolledBack.results[0].state, "rolled_back");
    await assert.rejects(readFile(join(root, "context-hygiene", "SKILL.md"), "utf8"), /ENOENT/);
  } finally { await rm(base, { recursive: true, force: true }); }
});

test("delivery CLI rejects unsupported roots and content outside its explicit boundary", async () => {
  const base = await mkdtemp(join(tmpdir(), "lens-delivery-cli-policy-")), outside = await mkdtemp(join(tmpdir(), "lens-delivery-cli-outside-"));
  try {
    const wrongRoot = join(base, "skills"), configPath = join(base, "config.json"), draft = join(outside, "draft.md");
    await mkdir(wrongRoot); await writeFile(draft, "safe draft");
    await writeFile(configPath, JSON.stringify({ allowedBase: base, journalDir: join(base, "journal"), item: { id: "item-1", slug: "safe" }, version: { id: "v1", contentFile: draft }, targets: [{ id: "codex", client: "codex", root: wrongRoot }] }));
    await assert.rejects(run(["discover", "--config", configPath]), /unsupported_client_root/);
    const supported = join(base, ".cursor", "skills"); await mkdir(supported, { recursive: true });
    await writeFile(configPath, JSON.stringify({ allowedBase: base, journalDir: join(base, "journal"), item: { id: "item-1", slug: "safe" }, version: { id: "v1", contentFile: draft }, targets: [{ id: "cursor", client: "cursor", root: supported }] }));
    await assert.rejects(run(["preview", "--config", configPath, "--out", join(base, "plan.json")]), /content_outside_allowed_base/);
    const linkedDraft = join(base, "linked-draft.md"); await symlink(draft, linkedDraft);
    await writeFile(configPath, JSON.stringify({ allowedBase: base, journalDir: join(base, "journal"), item: { id: "item-1", slug: "safe" }, version: { id: "v1", contentFile: linkedDraft }, targets: [{ id: "cursor", client: "cursor", root: supported }] }));
    await assert.rejects(run(["preview", "--config", configPath, "--out", join(base, "linked-plan.json")]), /symlink_path_rejected/);
  } finally { await rm(base, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
});
