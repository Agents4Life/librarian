import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { buildIndex } from "../../src/indexer/builder.js";
import { createQueryApi } from "../../src/indexer/query.js";

const createTestVault = async () => {
  const tmpDir = path.join(
    process.env.TMPDIR ?? "/tmp",
    `librarian-orphans-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(tmpDir, { recursive: true });
  return tmpDir;
};

test("getOrphans excludes temp files", async () => {
  const vaultPath = await createTestVault();
  const wikiDir = path.join(vaultPath, "wiki", "conceptos");
  await mkdir(wikiDir, { recursive: true });

  await writeFile(path.join(wikiDir, "real-orphan.md"), "# Real Orphan\n\nNo links here.\n", "utf8");
  await writeFile(path.join(wikiDir, "temp-file.tmp_op_123.md"), "# Temp File\n\nShould not appear.\n", "utf8");

  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const orphans = query.getOrphans();
  assert.equal(orphans.length, 1);
  assert.ok(orphans[0].path.includes("real-orphan"));
});

test("getOrphans excludes .librarian files", async () => {
  const vaultPath = await createTestVault();

  const wikiDir = path.join(vaultPath, "wiki", "conceptos");
  await mkdir(wikiDir, { recursive: true });
  await writeFile(path.join(wikiDir, "real-orphan.md"), "# Real Orphan\n\nNo links.\n", "utf8");

  const libDir = path.join(vaultPath, ".librarian", "proposals");
  await mkdir(libDir, { recursive: true });
  await writeFile(path.join(libDir, "prop-123.json"), "{}", "utf8");

  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const orphans = query.getOrphans();
  const orphanPaths = orphans.map((o) => o.path);
  assert.ok(!orphanPaths.some((p) => p.includes(".librarian")));
});

test("getOrphans excludes reviews section", async () => {
  const vaultPath = await createTestVault();

  const wikiDir = path.join(vaultPath, "wiki", "conceptos");
  await mkdir(wikiDir, { recursive: true });
  await writeFile(path.join(wikiDir, "real-orphan.md"), "# Real Orphan\n\nNo links.\n", "utf8");

  const reviewsDir = path.join(vaultPath, "reviews");
  await mkdir(reviewsDir, { recursive: true });
  await writeFile(path.join(reviewsDir, "review-123.md"), "# Review\n\nA review file.\n", "utf8");

  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const orphans = query.getOrphans();
  const orphanPaths = orphans.map((o) => o.path);
  assert.ok(!orphanPaths.some((p) => p.includes("reviews")));
});

test("getOrphans includes real wiki orphans", async () => {
  const vaultPath = await createTestVault();

  const wikiDir = path.join(vaultPath, "wiki", "conceptos");
  await mkdir(wikiDir, { recursive: true });
  await writeFile(path.join(wikiDir, "orphan.md"), "# Orphan\n\nNo links.\n", "utf8");
  await writeFile(path.join(wikiDir, "connected-a.md"), "# Connected A\n\nSee [[Connected B]].\n", "utf8");
  await writeFile(path.join(wikiDir, "connected-b.md"), "# Connected B\n\nSee [[Connected A]].\n", "utf8");

  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const orphans = query.getOrphans();
  const orphanPaths = orphans.map((o) => o.path);
  assert.ok(orphanPaths.some((p) => p.includes("orphan.md")), "orphan.md should be in orphans");
  assert.ok(!orphanPaths.some((p) => p.includes("connected-a.md")), "connected-a should not be orphan");
  assert.ok(!orphanPaths.some((p) => p.includes("connected-b.md")), "connected-b should not be orphan");
});

test("getOrphans excludes memory section", async () => {
  const vaultPath = await createTestVault();

  const wikiDir = path.join(vaultPath, "wiki", "conceptos");
  await mkdir(wikiDir, { recursive: true });
  await writeFile(path.join(wikiDir, "real-orphan.md"), "# Real Orphan\n\nNo links.\n", "utf8");

  const memDir = path.join(vaultPath, "memory");
  await mkdir(memDir, { recursive: true });
  await writeFile(path.join(memDir, "session.md"), "# Session\n\nAgent memory.\n", "utf8");

  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const orphans = query.getOrphans();
  const orphanPaths = orphans.map((o) => o.path);
  assert.ok(!orphanPaths.some((p) => p.includes("memory")));
});
