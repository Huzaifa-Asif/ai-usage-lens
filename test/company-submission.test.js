import test from "node:test";
import assert from "node:assert/strict";
import { createCompanySubmission, reviewCompanySubmission } from "../src/company-submission.js";

const item = { id: "personal-1", ownerUserId: "author", visibility: "private" };
const skillContent = "---\nname: synthetic\n---\n", skillDigest = "ce029de98e46852225d1f41c3a2b519558bbcf8302e3bf8e83972bd7d6771256";
const version = { id: "v4", files: [{ path: "SKILL.md", content: skillContent, digest: skillDigest }] };
const company = { tenantId: "tenant-1", libraryId: "company-library" };
const author = { userId: "author", tenantId: "tenant-1", role: "contributor", membershipStatus: "active" };

test("company submission is a frozen, privacy-scoped fork", () => {
  const submission = createCompanySubmission({ item, version, actor: author, company, audience: ["engineering"], now: "2026-10-14T00:00:00Z" });
  assert.equal(submission.state, "submitted");
  assert.deepEqual(submission.snapshot.files, [{ path: "SKILL.md", content: skillContent, digest: skillDigest }]);
  assert.match(submission.disclosure, /excludes source conversations, local paths, usage history/);
  assert.equal(reviewCompanySubmission(submission, { userId: "reviewer", tenantId: "tenant-1", role: "reviewer", membershipStatus: "active" }, "approved").publicationState, "approved_not_published");
});

test("membership, roles, ownership and separation of duties are enforced", () => {
  assert.throws(() => createCompanySubmission({ item, version, actor: { ...author, membershipStatus: "removed" }, company, audience: ["engineering"] }), /active_membership_required/);
  assert.throws(() => createCompanySubmission({ item: { ...item, ownerUserId: "other" }, version, actor: author, company, audience: ["engineering"] }), /personal_item_access_denied/);
  assert.throws(() => createCompanySubmission({ item, version: { ...version, files: [{ ...version.files[0], digest: "wrong" }] }, actor: author, company, audience: ["engineering"] }), /invalid_version_snapshot/);
  assert.throws(() => createCompanySubmission({ item, version, actor: { ...author, userId: undefined }, company, audience: ["engineering"] }), /invalid_actor_user_id/);
  const submission = createCompanySubmission({ item, version, actor: { ...author, role: "reviewer" }, company, audience: ["engineering"] });
  assert.throws(() => reviewCompanySubmission({ ...submission, audience: ["everyone"] }, { userId: "reviewer", tenantId: "tenant-1", role: "reviewer", membershipStatus: "active" }, "approved"), /invalid_submission/);
  assert.throws(() => reviewCompanySubmission(submission, { userId: "author", tenantId: "tenant-1", role: "reviewer", membershipStatus: "active" }, "approved"), /self_review_forbidden/);
  assert.throws(() => reviewCompanySubmission(submission, { tenantId: "tenant-1", role: "reviewer", membershipStatus: "active" }, "approved"), /invalid_reviewer_user_id/);
  assert.throws(() => reviewCompanySubmission(submission, { userId: "reader", tenantId: "tenant-1", role: "reader", membershipStatus: "active" }, "approved"), /reviewer_role_required/);
});
