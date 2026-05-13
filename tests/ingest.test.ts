import test from "node:test";
import assert from "node:assert/strict";

import { inspectRawInbox } from "../src/ingest.js";
import { createTestContext } from "./helpers/create-test-context.js";

test("raw inbox lists only unprocessed notes", async () => {
  const ctx = await createTestContext({
    "raw/idea.md": ["---", "librarian:", "  processed: false", "---", "", "Idea"].join("\n"),
    "raw/done.md": ["---", "librarian:", "  processed: true", "---", "", "Done"].join("\n"),
  });

  const result = await inspectRawInbox(ctx.vaultPath, ctx.queryApi);

  assert.equal(result.notes.length, 1);
  assert.equal(result.notes[0].file, "raw/idea.md");
  assert.equal(result.notes[0].processed, false);
  assert.equal(result.notes[0].recommendation, "curate");
});

test("raw inbox marks daily notes as report", async () => {
  const ctx = await createTestContext({
    "raw/daily-note.md": ["---", "librarian:", "  processed: false", "---", "", "Daily note"].join("\n"),
  });

  const result = await inspectRawInbox(ctx.vaultPath, ctx.queryApi);

  assert.equal(result.notes[0].recommendation, "report");
});
