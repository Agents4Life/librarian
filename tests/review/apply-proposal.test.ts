import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { FileProposalStore } from "../../src/proposals/proposal-store.js";
import { applyProposalToVault } from "../../src/review/apply-proposal.js";
import type { StoredProposal } from "../../src/proposals/types.js";
import type { CurationProposal } from "../../src/types.js";

const stubProposal = (overrides?: Partial<CurationProposal>): CurationProposal => ({
  diff_id: `test-${Date.now()}`,
  source: "raw/test.md",
  target: "wiki/conceptos/test.md",
  type: "create",
  status: "pending_approval",
  preview: "---\nlibrarian:\n  processed: false\n---\n\n# Test\n\nContent here.",
  category: "conceptos",
  tags: ["test"],
  summary: "Test note",
  suggestedLinks: [],
  duplicate: "none",
  ...overrides,
});

const createTestVault = async () => {
  const tmpDir = path.join(
    process.env.TMPDIR ?? "/tmp",
    `librarian-apply-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(tmpDir, { recursive: true });
  return tmpDir;
};

test("applyProposalToVault writes target file to vault", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "wiki/conceptos/test.md" }),
  });

  await applyProposalToVault(vaultPath, created);

  const targetPath = path.join(vaultPath, "wiki", "conceptos", "test.md");
  const content = await readFile(targetPath, "utf8");
  assert.ok(content.includes("# Test"));
});

test("applyProposalToVault registers source in ledger", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "wiki/conceptos/test.md" }),
  });

  await applyProposalToVault(vaultPath, created);

  const ledgerPath = path.join(vaultPath, "state", "processed.json");
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  assert.ok("raw/test.md" in ledger.processed);
  assert.equal(ledger.processed["raw/test.md"].proposalId, created.id);
  assert.equal(ledger.processed["raw/test.md"].targetPath, "wiki/conceptos/test.md");
});

test("applyProposalToVault does NOT modify raw/ files", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const rawPath = path.join(vaultPath, "raw", "test.md");
  await mkdir(path.dirname(rawPath), { recursive: true });
  const { writeFile } = await import("node:fs/promises");
  await writeFile(rawPath, "original content", "utf8");

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "wiki/conceptos/test.md" }),
  });

  await applyProposalToVault(vaultPath, created);

  const rawContent = await readFile(rawPath, "utf8");
  assert.equal(rawContent, "original content");
});

test("applyProposalToVault creates nested directories for target", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const created = await store.create({
    sourcePath: "raw/deep.md",
    proposal: stubProposal({
      source: "raw/deep.md",
      target: "wiki/synthesis/deep/sub/topic.md",
    }),
  });

  await applyProposalToVault(vaultPath, created);

  const targetPath = path.join(vaultPath, "wiki", "synthesis", "deep", "sub", "topic.md");
  const content = await readFile(targetPath, "utf8");
  assert.ok(content.length > 0);
});

test("applyProposalToVault rejects path traversal with ..", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "../../etc/passwd" }),
  });

  await assert.rejects(
    () => applyProposalToVault(vaultPath, created),
    { message: /Path traversal detected/ },
  );
});

test("applyProposalToVault rejects absolute target path", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "/etc/passwd" }),
  });

  await assert.rejects(
    () => applyProposalToVault(vaultPath, created),
    { message: /Path traversal detected/ },
  );
});
