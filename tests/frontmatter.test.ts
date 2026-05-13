import test from "node:test";
import assert from "node:assert/strict";

import { createFrontmatterTool } from "../src/tools/frontmatter.tool.js";
import { createTestContext } from "./helpers/create-test-context.js";

test("frontmatter tool reads metadata from a note", async () => {
  const ctx = await createTestContext({
    "note.md": ["---", "title: Test Note", "librarian:", "  processed: true", "  status: active", "---", "", "Body"].join("\n"),
  });
  const tool = createFrontmatterTool(ctx);

  const result = await tool.readFrontmatter("note.md");

  assert.equal(result.data.title, "Test Note");
  assert.equal(result.librarian?.processed, true);
  assert.equal(result.librarian?.status, "active");
});

test("frontmatter tool counts wiki pages and statuses", async () => {
  const ctx = await createTestContext({
    "wiki/alpha.md": ["---", "librarian:", "  status: active", "---", "", "Alpha"].join("\n"),
    "raw/beta.md": ["---", "librarian:", "  status: review", "---", "", "Beta"].join("\n"),
  });
  const tool = createFrontmatterTool(ctx);

  const result = await tool.getStats();

  assert.equal(result.total_files, 2);
  assert.equal(result.by_section.wiki, 1);
  assert.equal(result.by_section.raw, 1);
  assert.equal(result.by_status.active, 1);
  assert.equal(result.by_status.review, 1);
});

test("frontmatter health checks only wiki pages", async () => {
  const ctx = await createTestContext({
    "wiki/conceptos/empty.md": "# Empty\n",
    "daily/2026-05-12.md": "# Daily\n",
    "templates/daily-template.md": "# Template\n",
    "1-proyectos/launch.md": "# Launch\n",
  });
  const tool = createFrontmatterTool(ctx);

  const incomplete = await tool.listIncompleteNotes();
  const stale = await tool.listStaleNotes(0);

  assert.deepEqual(incomplete.notes.map((note) => note.file), ["wiki/conceptos/empty.md"]);
  assert.deepEqual(stale.notes.map((note) => note.file), ["wiki/conceptos/empty.md"]);
});
