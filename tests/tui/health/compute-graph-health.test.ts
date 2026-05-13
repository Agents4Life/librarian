import test from "node:test";
import assert from "node:assert/strict";

import { buildIndex, createQueryApi } from "../../../src/indexer/index.js";
import { FileProposalStore } from "../../../src/proposals/proposal-store.js";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { computeGraphHealth } from "../../../src/tui/health/compute-graph-health.js";

const createVault = async (files: Record<string, string>) => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), "librarian-health-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(vaultPath, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }
  const index = await buildIndex(vaultPath);
  const queryApi = createQueryApi(index);
  const store = new FileProposalStore(vaultPath);
  return { vaultPath, queryApi, store };
};

const richNote = (title: string, tags: string[], links: string[]) => {
  const tagLine = tags.join(" ");
  const linkBlock = links.map((l) => `- [[${l}]]`).join("\n");
  const body = Array.from({ length: 12 }, (_, i) => `Paragraph ${i + 1} of ${title} with enough words to exceed fifty word count threshold.`).join("\n\n");
  return `---\ntags: [${tagLine}]\n---\n\n# ${title}\n\n${body}\n\n## Related\n\n${linkBlock}\n`;
};

test("computeGraphHealth returns healthy for a connected wiki", async () => {
  const { queryApi, store } = await createVault({
    "wiki/conceptos/architecture.md": richNote("architecture", ["arch"], ["clean-code"]),
    "wiki/conceptos/clean-code.md": richNote("clean-code", ["craft"], ["architecture"]),
  });

  const result = await computeGraphHealth(queryApi, store);

  assert.equal(result.status, "healthy");
  assert.equal(result.totalWikiNotes, 2);
  assert.equal(result.orphanNotes, 0);
  assert.equal(result.brokenLinks, 0);
  assert.equal(result.pendingProposals, 0);
});

test("computeGraphHealth returns warning when orphans exist but low incompleteness", async () => {
  const { queryApi, store } = await createVault({
    "wiki/conceptos/architecture.md": richNote("architecture", ["arch"], ["clean-code"]),
    "wiki/conceptos/clean-code.md": richNote("clean-code", ["craft"], ["architecture"]),
    "wiki/conceptos/orphan.md": richNote("orphan", ["lonely"], []),
  });

  const result = await computeGraphHealth(queryApi, store);

  assert.equal(result.status, "warning");
  assert.ok(result.orphanNotes > 0);
});

test("computeGraphHealth returns critical when orphans and high incompleteness", async () => {
  const files: Record<string, string> = {};
  for (let i = 0; i < 10; i++) {
    files[`wiki/notes/note-${i}.md`] = `# Note ${i}\n`;
  }
  const { queryApi, store } = await createVault(files);

  const result = await computeGraphHealth(queryApi, store);

  assert.equal(result.status, "critical");
  assert.ok(result.orphanNotes > 0);
  assert.ok(result.incompleteNotes > result.totalWikiNotes * 0.5);
});

test("computeGraphHealth counts broken links", async () => {
  const { queryApi, store } = await createVault({
    "wiki/conceptos/a.md": richNote("A", ["test"], ["Nonexistent Page"]),
  });

  const result = await computeGraphHealth(queryApi, store);

  assert.equal(result.brokenLinks, 1);
});

test("computeGraphHealth counts raw backlog and proposals", async () => {
  const { queryApi, store } = await createVault({
    "raw/idea.md": "# Idea\n\nSome raw content.\n",
    "wiki/conceptos/existing.md": richNote("Existing", ["test"], []),
  });

  await store.create({
    sourcePath: "raw/idea.md",
    proposal: {
      diff_id: "d1",
      source: "raw/idea.md",
      target: "wiki/conceptos/idea.md",
      type: "create",
      status: "pending_approval",
      preview: "# Idea\n\nContent.",
      category: "conceptos",
      tags: [],
      summary: "test",
      suggestedLinks: [],
      duplicate: "none",
    },
  });

  const result = await computeGraphHealth(queryApi, store);

  assert.ok(result.rawBacklog >= 1);
  assert.equal(result.pendingProposals, 1);
  assert.equal(result.approvedProposals, 0);
  assert.equal(result.appliedProposals, 0);
});
