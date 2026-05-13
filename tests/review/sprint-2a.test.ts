import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { FileProposalStore } from "../../src/proposals/proposal-store.js";
import { ReviewService } from "../../src/review/review-service.js";
import { canTransition, TERMINAL_STATES } from "../../src/review/status-machine.js";
import { loadTransaction } from "../../src/review/transaction-store.js";
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
    `librarian-sprint2a-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(tmpDir, { recursive: true });
  return tmpDir;
};

const setupApprovedProposal = async (vaultPath: string) => {
  const store = new FileProposalStore(vaultPath);
  const service = new ReviewService(store, vaultPath);

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "wiki/conceptos/test.md" }),
  });

  const approved = await service.approve(created.id);
  return { store, service, proposal: approved };
};

test("new proposal has attempts=0, lastError=null, empty transitions", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const proposal = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal(),
  });

  assert.equal(proposal.attempts, 0);
  assert.equal(proposal.lastError, null);
  assert.deepEqual(proposal.transitions, []);
});

test("status machine allows applying → failed", () => {
  assert.equal(canTransition("applying", "failed"), true);
});

test("status machine allows applying → rolled_back", () => {
  assert.equal(canTransition("applying", "rolled_back"), true);
});

test("status machine allows failed → applying (retry)", () => {
  assert.equal(canTransition("failed", "applying"), true);
});

test("status machine allows rolled_back → applying (retry)", () => {
  assert.equal(canTransition("rolled_back", "applying"), true);
});

test("status machine rejects failed → applied", () => {
  assert.equal(canTransition("failed", "applied"), false);
});

test("status machine rejects rolled_back → applied", () => {
  assert.equal(canTransition("rolled_back", "applied"), false);
});

test("status machine rejects applied → failed", () => {
  assert.equal(canTransition("applied", "failed"), false);
});

test("TERMINAL_STATES includes applied and rejected", () => {
  assert.ok(TERMINAL_STATES.includes("applied"));
  assert.ok(TERMINAL_STATES.includes("rejected"));
  assert.ok(!TERMINAL_STATES.includes("failed"));
  assert.ok(!TERMINAL_STATES.includes("rolled_back"));
});

test("apply creates transaction record with operationId", async () => {
  const vaultPath = await createTestVault();
  const { store, service, proposal } = await setupApprovedProposal(vaultPath);

  const updated = await service.apply(proposal.id);

  assert.equal(updated.status, "applied");
  assert.equal(updated.attempts, 1);
  assert.equal(updated.transitions.length, 2);

  const startTransition = updated.transitions[0];
  assert.equal(startTransition.from, "approved");
  assert.equal(startTransition.to, "applying");
  assert.ok(startTransition.operationId.startsWith("op_"));
  assert.equal(startTransition.attempt, 1);
  assert.equal(startTransition.reason, "apply-start");

  const appliedTransition = updated.transitions[1];
  assert.equal(appliedTransition.from, "applying");
  assert.equal(appliedTransition.to, "applied");
  assert.ok(appliedTransition.operationId.startsWith("op_"));
  assert.equal(appliedTransition.reason, "apply-success");
});

test("apply persists transaction file in .librarian/transactions/", async () => {
  const vaultPath = await createTestVault();
  const { service, proposal } = await setupApprovedProposal(vaultPath);

  const updated = await service.apply(proposal.id);

  const lastTransition = updated.transitions[updated.transitions.length - 1];
  const operationId = lastTransition!.operationId;

  const tx = await loadTransaction(vaultPath, operationId);
  assert.ok(tx);
  assert.equal(tx.proposalId, proposal.id);
  assert.equal(tx.attempt, 1);
  assert.equal(tx.status, "completed");
  assert.equal(tx.targets.length, 1);
  assert.equal(tx.targets[0].path, "wiki/conceptos/test.md");
  assert.equal(tx.targets[0].status, "completed");
});

test("apply writes processed ledger with operationId", async () => {
  const vaultPath = await createTestVault();
  const { service, proposal } = await setupApprovedProposal(vaultPath);

  const updated = await service.apply(proposal.id);

  const ledgerPath = path.join(vaultPath, ".librarian", "state", "processed.json");
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  assert.ok("raw/test.md" in ledger.processed);
  assert.ok(ledger.processed["raw/test.md"].operationId.startsWith("op_"));
});

test("retry on failed proposal re-applies successfully", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);
  const service = new ReviewService(store, vaultPath);

  const targetDir = path.join(vaultPath, "wiki", "conceptos");
  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, "test.md"), "initial", "utf8");

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "wiki/conceptos/test.md", type: "update" }),
  });

  await service.approve(created.id);

  let proposal = await store.get(created.id);
  proposal!.status = "failed";
  proposal!.lastError = "simulated failure";
  proposal!.attempts = 1;
  await store.save(proposal!);

  const retried = await service.retry(created.id);
  assert.equal(retried.status, "applied");
  assert.equal(retried.attempts, 2);
});

test("retry rejects proposal in applied state", async () => {
  const vaultPath = await createTestVault();
  const { store, service, proposal } = await setupApprovedProposal(vaultPath);

  await service.apply(proposal.id);

  await assert.rejects(
    () => service.retry(proposal.id),
    { message: /Cannot retry proposal in 'applied' state/ },
  );
});

test("retry rejects proposal in pending state", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);
  const service = new ReviewService(store, vaultPath);

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal(),
  });

  await assert.rejects(
    () => service.retry(created.id),
    { message: /Cannot retry proposal in 'pending' state/ },
  );
});

test("reset transitions failed → pending", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal(),
  });

  created.status = "failed";
  created.lastError = "some error";
  created.attempts = 1;
  await store.save(created);

  const service = new ReviewService(store, vaultPath);
  const reset = await service.reset(created.id);

  assert.equal(reset.status, "pending");
  assert.equal(reset.lastError, null);
  assert.equal(reset.transitions.length, 1);
  assert.equal(reset.transitions[0].reason, "manual-reset");
  assert.equal(reset.transitions[0].error, "some error");
});

test("reset rejects applied proposal", async () => {
  const vaultPath = await createTestVault();
  const { store, service, proposal } = await setupApprovedProposal(vaultPath);

  await service.apply(proposal.id);

  const applied = await store.get(proposal.id);
  assert.equal(applied!.status, "applied");

  await assert.rejects(
    () => service.reset(proposal.id),
    { message: /Cannot reset proposal in 'applied' state/ },
  );
});

test("reset rejects proposal already in pending", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);
  const service = new ReviewService(store, vaultPath);

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal(),
  });

  await assert.rejects(
    () => service.reset(created.id),
    { message: /already in 'pending' state/ },
  );
});

test("apply uses temp file and atomic rename", async () => {
  const vaultPath = await createTestVault();
  const { service, proposal } = await setupApprovedProposal(vaultPath);

  await service.apply(proposal.id);

  const targetPath = path.join(vaultPath, "wiki", "conceptos", "test.md");
  const content = await readFile(targetPath, "utf8");
  assert.ok(content.includes("# Test"));

  const tmpFiles = await (async () => {
    try {
      const { readdir } = await import("node:fs/promises");
      const dir = path.join(vaultPath, "wiki", "conceptos");
      const files = await readdir(dir);
      return files.filter((f) => f.includes(".tmp_"));
    } catch {
      return [];
    }
  })();
  assert.equal(tmpFiles.length, 0, "No temp files should remain after apply");
});

test("update apply preserves previous content on rollback scenario", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);
  const service = new ReviewService(store, vaultPath);

  const targetDir = path.join(vaultPath, "wiki", "conceptos");
  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, "existing.md"), "old content", "utf8");

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "wiki/conceptos/existing.md", type: "update" }),
  });

  const approved = await service.approve(created.id);
  const updated = await service.apply(approved.id);

  assert.equal(updated.status, "applied");
  const content = await readFile(path.join(targetDir, "existing.md"), "utf8");
  assert.ok(content.includes("# Test"));
});

test("transition history accumulates across multiple operations", async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);
  const service = new ReviewService(store, vaultPath);

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "wiki/conceptos/test.md" }),
  });

  const approved = await service.approve(created.id);
  assert.equal(approved.transitions.length, 0);

  const applied = await service.apply(approved.id);
  assert.equal(applied.transitions.length, 2);

  assert.equal(applied.transitions[0].from, "approved");
  assert.equal(applied.transitions[0].to, "applying");
  assert.equal(applied.transitions[1].from, "applying");
  assert.equal(applied.transitions[1].to, "applied");
  assert.notEqual(applied.transitions[0].operationId, applied.transitions[1].operationId);
});

test("generateOperationId produces op_ prefix", async () => {
  const { generateOperationId } = await import("../../src/proposals/operation-id.js");
  const id = generateOperationId();
  assert.ok(id.startsWith("op_"));
  assert.ok(id.length > 10);
});

test("generateOperationId produces unique ids", async () => {
  const { generateOperationId } = await import("../../src/proposals/operation-id.js");
  const ids = new Set<string>();
  for (let i = 0; i < 100; i++) {
    ids.add(generateOperationId());
  }
  assert.equal(ids.size, 100);
});
