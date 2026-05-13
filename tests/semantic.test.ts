import test from "node:test";
import assert from "node:assert/strict";

import { createSemanticTool } from "../src/tools/semantic.tool.js";
import { createTestContext } from "./helpers/create-test-context.js";

test("semantic tool ranks more relevant wiki pages higher", async () => {
  const ctx = await createTestContext({
    "wiki/conceptos/clean-architecture.md": ["---", "tags: [clean, architecture, business]", "---", "", "# Clean Architecture", "", "Separates policies from details and protects business rules."].join("\n"),
    "wiki/conceptos/architecture-notes.md": ["---", "tags: [architecture, notes]", "---", "", "# Architecture Notes", "", "Mention policies and details."].join("\n"),
    "wiki/conceptos/random.md": ["---", "tags: [bananas, weather]", "---", "", "# Random", "", "Bananas and weather and music."].join("\n"),
  });
  const tool = createSemanticTool(ctx);

  const result = await tool.searchSemantic("business rules architecture", { topK: 2, minScore: 0.1 });

  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].score > result.results[1].score, true);
});

test("semantic tool indexes only wiki files", async () => {
  const ctx = await createTestContext({
    "wiki/conceptos/clean-architecture.md": "Clean Architecture.\n",
    "raw/note.md": "Raw note.\n",
  });
  const tool = createSemanticTool(ctx);

  const indexed = await tool.indexFile("wiki/conceptos/clean-architecture.md");
  const skipped = await tool.indexFile("raw/note.md");

  assert.equal(indexed.status, "indexed");
  assert.equal(skipped.status, "skipped");
});
