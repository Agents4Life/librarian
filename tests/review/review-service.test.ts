import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { FileProposalStore } from "../../src/proposals/proposal-store.js";
import { ReviewService } from "../../src/review/review-service.js";
import type { CreateProposalInput } from "../../src/proposals/types.js";
import type { CurationProposal } from "../../src/types.js";
import { TransitionError } from "../../src/review/types.js";

const stubProposal = (overrides?: Partial<CurationProposal>): CurationProposal => ({
  diff_id: `test-${Date.now()}`,
  source: "raw/test.md",
  target: "wiki/conceptos/test.md",
  type: "create",
  status: "pending_approval",
  preview: "# Test\n\nContent here.",
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
    `librarian-review-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(tmpDir, { recursive: true });
  return tmpDir;
};

const setupService = async () => {
  const vaultPath = await createTestVault();
  const store = new FileProposalStore(vaultPath);
  const service = new ReviewService(store, vaultPath);
  return { vaultPath, store, service };
};

test("ReviewService approve transitions pending → approved with review", async () => {
  const { service, store } = await setupService();

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal(),
  });

  const approved = await service.approve(created.id);

  assert.equal(approved.status, "approved");
  assert.ok(approved.review);
  assert.equal(approved.review.decision, "approved");
  assert.ok(approved.review.reviewedAt);
});

test("ReviewService reject transitions pending → rejected with reason", async () => {
  const { service, store } = await setupService();

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal(),
  });

  const rejected = await service.reject(created.id, "duplicate");

  assert.equal(rejected.status, "rejected");
  assert.ok(rejected.review);
  assert.equal(rejected.review.decision, "rejected");
  assert.equal(rejected.review.reason, "duplicate");
});

test("ReviewService reject without reason still works", async () => {
  const { service, store } = await setupService();

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal(),
  });

  const rejected = await service.reject(created.id);

  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.review?.reason, undefined);
});

test("ReviewService apply writes target and marks applied", async () => {
  const { vaultPath, service, store } = await setupService();

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "wiki/conceptos/test.md" }),
  });

  await service.approve(created.id);
  const applied = await service.apply(created.id);

  assert.equal(applied.status, "applied");
  assert.ok(applied.appliedAt);

  const targetPath = path.join(vaultPath, "wiki", "conceptos", "test.md");
  const content = await readFile(targetPath, "utf8");
  assert.ok(content.includes("# Test"));

  const ledgerPath = path.join(vaultPath, "state", "processed.json");
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  assert.ok("raw/test.md" in ledger.processed);
  assert.equal(ledger.processed["raw/test.md"].proposalId, created.id);
});

test("ReviewService apply rejects from pending", async () => {
  const { service, store } = await setupService();

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal(),
  });

  await assert.rejects(
    () => service.apply(created.id),
    (err: unknown) => err instanceof TransitionError,
  );
});

test("ReviewService apply rejects from rejected", async () => {
  const { service, store } = await setupService();

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal(),
  });

  await service.reject(created.id);

  await assert.rejects(
    () => service.apply(created.id),
    (err: unknown) => err instanceof TransitionError,
  );
});

test("ReviewService approve rejects from already approved", async () => {
  const { service, store } = await setupService();

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal(),
  });

  await service.approve(created.id);

  await assert.rejects(
    () => service.approve(created.id),
    (err: unknown) => err instanceof TransitionError,
  );
});

test("ReviewService approve rejects from applied", async () => {
  const { vaultPath, service, store } = await setupService();

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal({ target: "wiki/conceptos/test.md" }),
  });

  await service.approve(created.id);
  await service.apply(created.id);

  await assert.rejects(
    () => service.approve(created.id),
    (err: unknown) => err instanceof TransitionError,
  );
});

test("ReviewService get returns proposal", async () => {
  const { service, store } = await setupService();

  const created = await store.create({
    sourcePath: "raw/test.md",
    proposal: stubProposal(),
  });

  const fetched = await service.get(created.id);
  assert.deepEqual(fetched?.id, created.id);
});

test("ReviewService get returns null for missing", async () => {
  const { service } = await setupService();

  const result = await service.get("nonexistent");
  assert.equal(result, null);
});

test("ReviewService list returns all proposals", async () => {
  const { service, store } = await setupService();

  await store.create({ sourcePath: "raw/a.md", proposal: stubProposal({ source: "raw/a.md" }) });
  await store.create({ sourcePath: "raw/b.md", proposal: stubProposal({ source: "raw/b.md" }) });

  const all = await service.list();
  assert.equal(all.length, 2);
});
