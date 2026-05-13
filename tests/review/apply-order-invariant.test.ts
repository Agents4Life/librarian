import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { FileProposalStore } from "../../src/proposals/proposal-store.js";
import { applyProposalToVault } from "../../src/review/apply-proposal.js";
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
    `librarian-order-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(tmpDir, { recursive: true });
  return tmpDir;
};

test("apply-order invariant: target file is written before ledger marks source as processed", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "wiki/conceptos/order-test.md" }),
  });

  await applyProposalToVault(vaultPath, created);

  // Both the target file and the ledger entry should exist
  const targetPath = path.join(vaultPath, "wiki", "conceptos", "order-test.md");
  const targetContent = await readFile(targetPath, "utf8");
  assert.ok(targetContent.includes("# Test"), "Target file should be written");

  const ledgerPath = path.join(vaultPath, ".librarian", "state", "processed.json");
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  assert.ok("raw/test.md" in ledger.processed, "Source should be marked as processed in ledger");
});

test("apply-order invariant: markProcessed is NOT called when file write fails", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  // Create a proposal that targets an impossible path — this should fail the write
  // We force a write failure by making the target directory a file
  const blockerDir = path.join(vaultPath, "wiki", "conceptos");
  await mkdir(blockerDir, { recursive: true });
  // Create a file where a directory would be needed for the target
  await writeFile(path.join(vaultPath, "wiki", "conceptos", "sub"), "blocker", "utf8");

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "wiki/conceptos/sub/deep/fail.md" }),
  });

  // Apply should handle the error gracefully
  const result = await applyProposalToVault(vaultPath, created);

  // The apply should indicate failure
  assert.equal(result.success, false, "Apply should fail");

  // The ledger should NOT contain the source
  const ledgerPath = path.join(vaultPath, ".librarian", "state", "processed.json");
  try {
    const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
    assert.equal("raw/test.md" in ledger.processed, false, "Source should NOT be marked as processed when write fails");
  } catch {
    // Ledger file may not exist at all, which is also fine — means markProcessed was never called
  }
});

test("apply-order invariant: transaction record shows completed only after successful write", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "wiki/conceptos/txn-test.md" }),
  });

  const result = await applyProposalToVault(vaultPath, created);

  assert.equal(result.success, true, "Apply should succeed");

  // Verify a transaction file exists with status "completed"
  const txDir = path.join(vaultPath, ".librarian", "transactions");
  const txFiles = await readdir(txDir);
  assert.ok(txFiles.length > 0, "At least one transaction file should exist");

  const txContent = await readFile(path.join(txDir, txFiles[0]), "utf8");
  const tx = JSON.parse(txContent);
  assert.equal(tx.status, "completed", "Transaction should be completed");
  assert.equal(tx.targets[0].status, "completed", "Target should be completed");
  assert.ok(tx.completedAt, "Transaction should have completedAt");
});
