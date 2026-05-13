import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { appendWikiLog, ensureWikiStructure, updateWikiIndex } from "../src/wiki-maintenance.js";
import { createTestContext } from "./helpers/create-test-context.js";

test("wiki maintenance creates the expected wiki structure", async () => {
  const ctx = await createTestContext({});

  const result = await ensureWikiStructure(ctx.vaultPath);

  assert.deepEqual(result.created.sort(), [
    path.join("reports"),
    path.join("wiki"),
    path.join("wiki", "conceptos"),
    path.join("wiki", "entidades"),
    path.join("wiki", "sources"),
    path.join("wiki", "synthesis"),
  ].sort());
});

test("wiki maintenance regenerates wiki index from category pages", async () => {
  const ctx = await createTestContext({
    "wiki/conceptos/architecture.md": "# Architecture\n",
    "wiki/entidades/ollama.md": "# Ollama\n",
  });

  const result = await updateWikiIndex(ctx);
  const index = await readFile(path.join(ctx.vaultPath, "wiki", "index.md"), "utf8");

  assert.equal(result.file, path.join("wiki", "index.md"));
  assert.match(index, /# Wiki Index/);
  assert.match(index, /## conceptos/);
  assert.match(index, /\[\[conceptos\/architecture\|architecture\]\]/);
  assert.match(index, /## entidades/);
  assert.match(index, /\[\[entidades\/ollama\|ollama\]\]/);
  assert.doesNotMatch(index, /log/);
});

test("wiki maintenance appends processing events to wiki log", async () => {
  const ctx = await createTestContext({});

  await appendWikiLog(ctx.vaultPath, {
    action: "created",
    source: path.join("raw", "architecture.md"),
    target: path.join("wiki", "conceptos", "architecture.md"),
  });
  await appendWikiLog(ctx.vaultPath, {
    action: "skipped",
    reason: "exact_match",
    source: path.join("raw", "architecture.md"),
    target: path.join("wiki", "conceptos", "architecture.md"),
  });

  const log = await readFile(path.join(ctx.vaultPath, "wiki", "log.md"), "utf8");

  assert.match(log, /# Wiki Log/);
  assert.match(log, /created/);
  assert.match(log, /raw\/architecture\.md -> wiki\/conceptos\/architecture\.md/);
  assert.match(log, /skipped/);
  assert.match(log, /reason: exact_match/);
});
