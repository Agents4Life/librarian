import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { proposeWikiCurations, proposeWikiPage } from "../src/curation.js";
import { createTestContext } from "./helpers/create-test-context.js";

/** Mock LLM client that returns canned JSON without touching Ollama */
const mockLlmClient = {
  chat: async () => ({
    content: JSON.stringify({
      category: "conceptos",
      tags: ["architecture"],
      summary: "A software architecture pattern.",
      suggestedLinks: [],
    }),
    model: "mock",
    raw: {},
  }),
  healthcheck: async () => ({ status: "ready" as const, model: "mock" }),
};

test("curation proposes a new wiki page from a raw note", async () => {
  const ctx = await createTestContext({
    "raw/architecture.md": ["---", "librarian:", "  processed: false", "---", "", "Architecture note."].join("\n"),
  });

  const proposal = await proposeWikiPage(
    ctx.vaultPath,
    path.join("raw", "architecture.md"),
    [],
    true,
    ctx.queryApi,
    undefined,
    mockLlmClient,
  );

  assert.equal(proposal.status, "pending_approval");
  assert.equal(proposal.type, "create");
  assert.equal(proposal.target, path.join("wiki", "conceptos", "architecture.md"));
  assert.match(proposal.preview, /source: raw\/architecture\.md/);
});

test("curation skips a duplicate when wiki page already exists", async () => {
  const ctx = await createTestContext({
    "raw/architecture.md": ["---", "librarian:", "  processed: false", "---", "", "New detail."].join("\n"),
    "wiki/conceptos/architecture.md": ["# Architecture", "", "## Notes", "Existing note."].join("\n"),
  });

  const proposal = await proposeWikiPage(
    ctx.vaultPath,
    path.join("raw", "architecture.md"),
    [],
    true,
    ctx.queryApi,
    undefined,
    mockLlmClient,
  );

  assert.equal(proposal.status, "pending_approval");
  assert.equal(proposal.type, "skip");
  assert.equal(proposal.duplicate, "exact_match");
  assert.equal(proposal.duplicateOf, path.join("wiki", "conceptos", "architecture.md"));
});

test("curation returns proposals only for curate-worthy notes", async () => {
  const ctx = await createTestContext({
    "raw/idea.md": ["---", "librarian:", "  processed: false", "---", "", "Idea note."].join("\n"),
    "raw/daily-note.md": ["---", "librarian:", "  processed: false", "---", "", "Daily note."].join("\n"),
  });

  const result = await proposeWikiCurations(ctx.vaultPath, 10, ctx.queryApi, undefined, mockLlmClient);

  assert.equal(result.inbox.notes.length, 2);
  assert.equal(result.proposals.length, 1);
  assert.equal(result.proposals[0].type, "create");
});
