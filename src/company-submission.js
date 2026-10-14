import { createHash } from "node:crypto";

const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const ROLES = new Set(["reader", "contributor", "reviewer", "publisher", "tenant_admin"]);
const id = (value, field) => { if (typeof value !== "string" || !/^[a-zA-Z0-9._-]{1,128}$/.test(value)) throw new Error(`invalid_${field}`); return value; };

export function createCompanySubmission({ item, version, actor, company, audience, now = new Date() } = {}) {
  id(item?.id, "item_id"); id(item?.ownerUserId, "owner_user_id"); id(actor?.userId, "actor_user_id"); id(actor?.tenantId, "actor_tenant_id"); id(company?.tenantId, "company_tenant_id"); id(company?.libraryId, "library_id");
  if (item?.visibility !== "private" || item?.ownerUserId !== actor?.userId) throw new Error("personal_item_access_denied");
  if (!ROLES.has(actor?.role) || !["contributor", "reviewer", "publisher", "tenant_admin"].includes(actor.role)) throw new Error("submission_role_required");
  if (actor?.tenantId !== company?.tenantId || actor?.membershipStatus !== "active") throw new Error("active_membership_required");
  if (!Array.isArray(audience) || audience.length === 0 || audience.some(value => typeof value !== "string" || !value.trim())) throw new Error("audience_required");
  id(version?.id, "version_id");
  if (!Array.isArray(version?.files) || version.files.length === 0) throw new Error("invalid_version_snapshot");
  const files = version.files.map(file => {
    if (typeof file?.path !== "string" || !/^[a-zA-Z0-9._/-]+$/.test(file.path) || file.path.startsWith("/") || file.path.split("/").includes("..") || typeof file?.content !== "string") throw new Error("invalid_version_snapshot");
    const digest = createHash("sha256").update(file.content).digest("hex");
    if (file.digest !== digest) throw new Error("invalid_version_snapshot");
    return { path: file.path, content: file.content, digest };
  }).sort((a, b) => a.path.localeCompare(b.path));
  const snapshot = { sourceItemId: item.id, sourceVersionId: version.id, files, manifestDigest: createHash("sha256").update(JSON.stringify(files.map(({ path, digest }) => ({ path, digest })))).digest("hex") };
  const core = { schemaVersion: "ai-usage-lens/company-submission-v1", tenantId: company.tenantId, libraryId: company.libraryId, submitterUserId: actor.userId, audience: [...new Set(audience)].sort(), snapshot, state: "submitted", submittedAt: new Date(now).toISOString(), disclosure: "This frozen fork excludes source conversations, local paths, usage history, and unselected files." };
  return { ...core, submissionDigest: hash(core) };
}

export function reviewCompanySubmission(submission, reviewer, decision, { separationOfDuties = true, now = new Date() } = {}) {
  id(reviewer?.userId, "reviewer_user_id"); id(reviewer?.tenantId, "reviewer_tenant_id");
  const core = Object.fromEntries(Object.entries(submission || {}).filter(([key]) => key !== "submissionDigest"));
  if (!submission?.submissionDigest || hash(core) !== submission.submissionDigest || submission.state !== "submitted") throw new Error("invalid_submission");
  if (reviewer?.tenantId !== submission.tenantId || reviewer?.membershipStatus !== "active") throw new Error("active_membership_required");
  if (!["reviewer", "publisher", "tenant_admin"].includes(reviewer?.role)) throw new Error("reviewer_role_required");
  if (separationOfDuties && reviewer.userId === submission.submitterUserId) throw new Error("self_review_forbidden");
  if (!new Set(["changes_requested", "approved"]).has(decision)) throw new Error("invalid_review_decision");
  return { submissionDigest: submission.submissionDigest, reviewerUserId: reviewer.userId, decision, reviewedAt: new Date(now).toISOString(), publicationState: decision === "approved" ? "approved_not_published" : "changes_requested" };
}
