import test from "node:test";
import assert from "node:assert/strict";

import { createWikilinksTool } from "../src/tools/wikilinks.tool.js";
import { createTestContext } from "./helpers/create-test-context.js";

test("wikilinks tool reports orphan notes and graph stats", async () => {
  const ctx = await createTestContext({
    "wiki/alpha.md": "Alpha links [[beta]].\n",
    "wiki/beta.md": "Beta is isolated.\n",
    "wiki/gamma.md": "Gamma is isolated too.\n",
  });
  const tool = createWikilinksTool(ctx);

  const orphans = await tool.getOrphanNotes();
  const stats = await tool.getGraphStats();

  assert.deepEqual(
    orphans.notes.map((note) => note.file).sort(),
    ["wiki/gamma.md"],
  );
  assert.equal(stats.total_nodes, 3);
  assert.ok(stats.total_edges >= 1);
  assert.ok(stats.orphans >= 1);
});

test("wikilinks graph only includes wiki pages", async () => {
  const ctx = await createTestContext({
    "wiki/alpha.md": "Alpha links [[beta|Beta Alias]].\n",
    "wiki/beta.md": "Beta.\n",
    "daily/2026-05-12.md": "Daily links [[alpha]].\n",
    "templates/daily-template.md": "Template.\n",
  });
  const tool = createWikilinksTool(ctx);

  const stats = await tool.getGraphStats();

  // daily/ and templates/ are outside INDEX_ROOTS so only wiki pages count
  assert.equal(stats.total_nodes, 2);
  assert.ok(stats.total_edges >= 1);
});

test("wikilinks tool finds the shortest path between notes", async () => {
  const ctx = await createTestContext({
    "wiki/alpha.md": "Alpha links [[beta]].\n",
    "wiki/beta.md": "Beta links [[gamma]].\n",
    "wiki/gamma.md": "Gamma.\n",
  });
  const tool = createWikilinksTool(ctx);

  const result = await tool.findPath("alpha", "gamma");

  assert.equal(result.found, true);
  assert.deepEqual(result.path, ["alpha", "beta", "gamma"]);
  assert.equal(result.length, 2);
});
