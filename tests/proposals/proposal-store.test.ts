import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { FileProposalStore } from "../../src/proposals/proposal-store.js";
import type { StoredProposal, CreateProposalInput } from "../../src/proposals/types.js";
import type { CurationProposal } from "../../src/types.js";

const stubProposal = (overrides?: Partial<CurationProposal>): CurationProposal => ({
  diff_id: `test-${Date.now()}`,
  source: "raw/test.md",
  target: "wiki/conceptos/test.md",
  type: "create",
  status: "pending_approval",
  preview: "# Test",
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
    `librarian-test-vault-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(tmpDir, { recursive: true });
  return tmpDir;
};

test("FileProposalStore create persists a proposal to disk", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const input: CreateProposalInput = {
    sourcePath: "raw/test.md",
    proposal: stubProposal(),
  };

  const result = await store.create(input);

  assert.equal(result.status, "pending");
  assert.equal(result.sourcePath, "raw/test.md");
  assert.deepEqual(result.diagnostics.warnings, []);
  assert.deepEqual(result.diagnostics.relatedPaths, []);
  assert.deepEqual(result.diagnostics.duplicateCandidates, []);

  const filePath = path.join(vaultPath, ".librarian", "proposals", `${result.id}.json`);
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as StoredProposal;

  assert.equal(parsed.id, result.id);
  assert.equal(parsed.status, "pending");
});

test("FileProposalStore get returns a stored proposal", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const created = await store.create({
    sourcePath: "raw/idea.md",
    proposal: stubProposal({ source: "raw/idea.md" }),
  });

  const fetched = await store.get(created.id);

  assert.deepEqual(fetched, created);
});

test("FileProposalStore get returns null for missing proposal", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const result = await store.get("nonexistent-id");

  assert.equal(result, null);
});

test("FileProposalStore list returns all proposals sorted by createdAt", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  await store.create({ sourcePath: "raw/a.md", proposal: stubProposal({ source: "raw/a.md" }) });
  await store.create({ sourcePath: "raw/b.md", proposal: stubProposal({ source: "raw/b.md" }) });

  const all = await store.list();

  assert.equal(all.length, 2);
  assert.ok(all[0].createdAt <= all[1].createdAt);
});

test("FileProposalStore list filters by status", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const p1 = await store.create({ sourcePath: "raw/a.md", proposal: stubProposal({ source: "raw/a.md" }) });
  const p2 = await store.create({ sourcePath: "raw/b.md", proposal: stubProposal({ source: "raw/b.md" }) });
  await store.updateStatus(p1.id, "approved");

  const pending = await store.list("pending");
  const approved = await store.list("approved");

  assert.equal(pending.length, 1);
  assert.equal(pending[0].id, p2.id);
  assert.equal(approved.length, 1);
  assert.equal(approved[0].id, p1.id);
});

test("FileProposalStore list returns empty when no proposals exist", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const result = await store.list();

  assert.deepEqual(result, []);
});

test("FileProposalStore updateStatus transitions status and persists", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal(),
  });

  const updated = await store.updateStatus(created.id, "approved");

  assert.equal(updated.status, "approved");
  assert.ok(updated.updatedAt >= created.updatedAt);

  const reloaded = await store.get(created.id);
  assert.equal(reloaded!.status, "approved");
});

test("FileProposalStore updateStatus throws for missing proposal", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  await assert.rejects(
    () => store.updateStatus("nonexistent", "approved"),
    { message: "Proposal not found: nonexistent" },
  );
});
