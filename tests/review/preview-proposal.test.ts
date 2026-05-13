import test from "node:test";
import assert from "node:assert/strict";

import { computePreview } from "../../src/review/preview-proposal.js";
import type { StoredProposal } from "../../src/proposals/types.js";
import type { CurationProposal } from "../../src/types.js";

const stubStoredProposal = (overrides?: Partial<CurationProposal>): StoredProposal => ({
  id: "test-id",
  status: "pending",
  createdAt: "2026-05-13T00:00:00.000Z",
  updatedAt: "2026-05-13T00:00:00.000Z",
  sourcePath: "raw/test.md",
  proposal: {
    diff_id: "test-diff",
    source: "raw/test.md",
    target: "wiki/conceptos/test.md",
    type: "create",
    status: "pending_approval",
    preview: "---\n---\n# Test",
    category: "conceptos",
    tags: [],
    summary: "",
    suggestedLinks: [],
    duplicate: "none",
    ...overrides,
  },
  diagnostics: {
    warnings: [],
    relatedPaths: [],
    duplicateCandidates: [],
  },
});

test("computePreview returns create operation for create type", () => {
  const proposal = stubStoredProposal({ type: "create" });
  const preview = computePreview(proposal);

  assert.equal(preview.operation, "create");
  assert.equal(preview.targetPath, "wiki/conceptos/test.md");
  assert.equal(preview.contentPreview, "---\n---\n# Test");
  assert.equal(preview.id, "test-id");
});

test("computePreview returns update operation for update type", () => {
  const proposal = stubStoredProposal({ type: "update" });
  const preview = computePreview(proposal);

  assert.equal(preview.operation, "update");
});

test("computePreview returns create for skip type (fallback)", () => {
  const proposal = stubStoredProposal({ type: "skip" });
  const preview = computePreview(proposal);

  assert.equal(preview.operation, "create");
});
