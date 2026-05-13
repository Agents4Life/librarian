import test from "node:test";
import assert from "node:assert/strict";

import { generateProposalId } from "../../src/proposals/proposal-id.js";

test("generateProposalId returns a string with ISO timestamp and suffix", () => {
  const id = generateProposalId();

  assert.match(id, /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}-[0-9a-f]{6}$/);
});

test("generateProposalId generates unique ids", () => {
  const ids = new Set<string>();

  for (let i = 0; i < 100; i++) {
    ids.add(generateProposalId());
  }

  assert.equal(ids.size, 100);
});

test("generateProposalId has consistent length", () => {
  const id = generateProposalId();

  assert.ok(id.length >= 28);
});
