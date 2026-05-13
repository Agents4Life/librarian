import test from "node:test";
import assert from "node:assert/strict";

import { createWikilinksTool } from "../src/tools/wikilinks.tool.js";
import { createTestContext } from "./helpers/create-test-context.js";

test("wikilinks tool extracts links from a note", async () => {
  const ctx = await createTestContext({
    "note.md": "Link to [[Clean Architecture]] and [[DDD]].\n",
  });
  const tool = createWikilinksTool(ctx);

  const result = await tool.extractWikilinks("note.md");

  assert.deepEqual(
    result.links.map((link) => link.target),
    ["Clean Architecture", "DDD"],
  );
  assert.equal(result.links[0].line, 1);
});

test("wikilinks tool normalizes Obsidian aliases and headings", async () => {
  const ctx = await createTestContext({
    "note.md": "Links [[Clean Architecture|clean arch]] and [[DDD#Tactical Patterns]].\n",
  });
  const tool = createWikilinksTool(ctx);

  const result = await tool.extractWikilinks("note.md");

  assert.deepEqual(
    result.links.map((link) => link.target),
    ["Clean Architecture", "DDD"],
  );
});

test("wikilinks tool normalizes Obsidian path targets to note names", async () => {
  const ctx = await createTestContext({
    "note.md": "Link [[conceptos/Clean Architecture.md|clean arch]].\n",
  });
  const tool = createWikilinksTool(ctx);

  const result = await tool.extractWikilinks("note.md");

  assert.deepEqual(result.links.map((link) => link.target), ["Clean Architecture"]);
});

test("wikilinks tool finds backlinks across markdown files", async () => {
  const ctx = await createTestContext({
    "wiki/alpha.md": "Alpha references [[Clean Architecture]].\n",
    "wiki/beta.md": "Beta references [[DDD]].\n",
  });
  const tool = createWikilinksTool(ctx);

  const result = await tool.getBacklinks("Clean Architecture");

  assert.equal(result.backlinks.length, 1);
  assert.equal(result.backlinks[0].source, "wiki/alpha.md");
  assert.equal(result.backlinks[0].line, 1);
});
