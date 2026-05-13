import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { loadIndexMetadata, saveIndexMetadata, detectStaleness, emptyMetadata } from "../../src/indexer/index-metadata.js";
import { buildIndex } from "../../src/indexer/builder.js";
import { saveIndex, loadIndex } from "../../src/indexer/store.js";

const createTestVault = async () => {
  const tmpDir = path.join(
    process.env.TMPDIR ?? "/tmp",
    `librarian-index-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(tmpDir, { recursive: true });
  return tmpDir;
};

const populateVault = async (vaultPath: string) => {
  const wikiDir = path.join(vaultPath, "wiki", "conceptos");
  await mkdir(wikiDir, { recursive: true });

  await writeFile(
    path.join(wikiDir, "foo.md"),
    "---\ntags: [test]\n---\n\n# Foo\n\nContent about foo.\n",
    "utf8",
  );

  await writeFile(
    path.join(wikiDir, "bar.md"),
    "---\ntags: [test]\n---\n\n# Bar\n\nContent about bar. See also [[Foo]].\n",
    "utf8",
  );
};

test("index rebuild creates metadata with fresh status", async () => {
  const vaultPath = await createTestVault();
  await populateVault(vaultPath);

  const index = await buildIndex(vaultPath);
  await saveIndex(vaultPath, index);

  const meta = emptyMetadata();
  meta.status = "fresh";
  meta.builtAt = new Date().toISOString();
  await saveIndexMetadata(vaultPath, meta);

  const loaded = await loadIndexMetadata(vaultPath);
  assert.ok(loaded);
  assert.equal(loaded.status, "fresh");
  assert.ok(loaded.builtAt);
});

test("loadIndexMetadata returns null when no metadata exists", async () => {
  const vaultPath = await createTestVault();
  const loaded = await loadIndexMetadata(vaultPath);
  assert.equal(loaded, null);
});

test("detectStaleness returns false for unchanged vault", async () => {
  const vaultPath = await createTestVault();
  await populateVault(vaultPath);

  const { stat } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  const { readFile } = await import("node:fs/promises");

  const fooPath = path.join(vaultPath, "wiki", "conceptos", "foo.md");
  const fooStat = await stat(fooPath);
  const fooHash = createHash("sha256").update(await readFile(fooPath)).digest("hex");

  const meta = emptyMetadata();
  meta.status = "fresh";
  meta.indexedFiles = {
    "wiki/conceptos/foo.md": {
      mtimeMs: fooStat.mtimeMs,
      size: fooStat.size,
      hash: fooHash,
    },
  };

  const stale = await detectStaleness(vaultPath, meta);
  assert.equal(stale, false);
});

test("detectStaleness returns true when file content changes", async () => {
  const vaultPath = await createTestVault();
  await populateVault(vaultPath);

  const meta = emptyMetadata();
  meta.status = "fresh";
  meta.indexedFiles = {
    "wiki/conceptos/foo.md": {
      mtimeMs: 0,
      size: 0,
      hash: "wrong-hash",
    },
  };

  const stale = await detectStaleness(vaultPath, meta);
  assert.equal(stale, true);
});

test("detectStaleness returns true when file is deleted", async () => {
  const vaultPath = await createTestVault();
  await populateVault(vaultPath);

  const meta = emptyMetadata();
  meta.status = "fresh";
  meta.indexedFiles = {
    "wiki/conceptos/nonexistent.md": {
      mtimeMs: 123,
      size: 100,
      hash: "abc",
    },
  };

  const stale = await detectStaleness(vaultPath, meta);
  assert.equal(stale, true);
});

test("full rebuild cycle builds index and metadata", async () => {
  const vaultPath = await createTestVault();
  await populateVault(vaultPath);

  const index = await buildIndex(vaultPath);
  await saveIndex(vaultPath, index);

  const { stat } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  const { readFile } = await import("node:fs/promises");

  const fooPath = path.join(vaultPath, "wiki", "conceptos", "foo.md");
  const fooStat = await stat(fooPath);
  const fooHash = createHash("sha256").update(await readFile(fooPath)).digest("hex");

  const barPath = path.join(vaultPath, "wiki", "conceptos", "bar.md");
  const barStat = await stat(barPath);
  const barHash = createHash("sha256").update(await readFile(barPath)).digest("hex");

  const meta = emptyMetadata();
  const now = new Date().toISOString();
  meta.status = "fresh";
  meta.builtAt = now;
  meta.invalidatedAt = null;
  meta.indexedFiles = {
    "wiki/conceptos/foo.md": { mtimeMs: fooStat.mtimeMs, size: fooStat.size, hash: fooHash },
    "wiki/conceptos/bar.md": { mtimeMs: barStat.mtimeMs, size: barStat.size, hash: barHash },
  };
  meta.caches = {
    semantic: { builtAt: now, status: "fresh" },
    wikilinks: { builtAt: now, status: "fresh" },
    backlinks: { builtAt: now, status: "fresh" },
    orphans: { builtAt: now, status: "fresh" },
  };
  meta.stats = { totalFiles: 2, totalSize: fooStat.size + barStat.size };

  await saveIndexMetadata(vaultPath, meta);

  const loaded = await loadIndexMetadata(vaultPath);
  assert.ok(loaded);
  assert.equal(loaded.status, "fresh");
  assert.equal(loaded.stats.totalFiles, 2);
  assert.ok("wiki/conceptos/foo.md" in loaded.indexedFiles);
  assert.ok("wiki/conceptos/bar.md" in loaded.indexedFiles);

  const isStale = await detectStaleness(vaultPath, loaded);
  assert.equal(isStale, false);
});

test("stale detection after content modification", async () => {
  const vaultPath = await createTestVault();
  await populateVault(vaultPath);

  const { stat } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  const { readFile } = await import("node:fs/promises");

  const fooPath = path.join(vaultPath, "wiki", "conceptos", "foo.md");
  const fooStat = await stat(fooPath);
  const fooHash = createHash("sha256").update(await readFile(fooPath)).digest("hex");

  const meta = emptyMetadata();
  meta.status = "fresh";
  meta.indexedFiles = {
    "wiki/conceptos/foo.md": { mtimeMs: fooStat.mtimeMs, size: fooStat.size, hash: fooHash },
  };
  await saveIndexMetadata(vaultPath, meta);

  await new Promise((resolve) => setTimeout(resolve, 50));
  await writeFile(fooPath, "---\ntags: [modified]\n---\n\n# Foo\n\nModified content.\n", "utf8");

  const isStale = await detectStaleness(vaultPath, meta);
  assert.equal(isStale, true);
});
