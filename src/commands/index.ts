import { defaultConfig } from "../config.js";
import { FileProposalStore } from "../proposals/index.js";
import { buildIndex } from "../indexer/builder.js";
import { saveIndex, loadIndex } from "../indexer/store.js";
import {
  emptyMetadata,
  loadIndexMetadata,
  saveIndexMetadata,
  detectStaleness,
  type IndexMetadata,
} from "../indexer/index-metadata.js";
import { stat, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const walkMarkdownFiles = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(dir, entry.name);
      if (entry.name.startsWith(".")) return [];
      if (entry.isDirectory()) return walkMarkdownFiles(resolved);
      if (entry.isFile() && entry.name.endsWith(".md")) return [resolved];
      return [];
    }),
  );
  return nested.flat();
};

const hashFile = async (filePath: string): Promise<string> => {
  const { readFile } = await import("node:fs/promises");
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
};

export const indexRebuild = async (vaultPath?: string) => {
  const vp = vaultPath ?? defaultConfig.vaultPath;

  let meta = await loadIndexMetadata(vp);
  if (!meta) {
    meta = emptyMetadata();
  }

  meta.status = "rebuilding";
  await saveIndexMetadata(vp, meta);

  const index = await buildIndex(vp);
  await saveIndex(vp, index);

  const allFiles = await walkMarkdownFiles(vp);
  const indexedFiles: IndexMetadata["indexedFiles"] = {};
  let totalSize = 0;

  for (const absPath of allFiles) {
    const relative = path.relative(vp, absPath).replace(/\\/g, "/");
    const fileStat = await stat(absPath);
    const hash = await hashFile(absPath);
    indexedFiles[relative] = {
      mtimeMs: fileStat.mtimeMs,
      size: fileStat.size,
      hash,
    };
    totalSize += fileStat.size;
  }

  const now = new Date().toISOString();
  meta.builtAt = now;
  meta.invalidatedAt = null;
  meta.status = "fresh";
  meta.indexedFiles = indexedFiles;
  meta.caches = {
    semantic: { builtAt: now, status: "fresh" },
    wikilinks: { builtAt: now, status: "fresh" },
    backlinks: { builtAt: now, status: "fresh" },
    orphans: { builtAt: now, status: "fresh" },
  };
  meta.stats = { totalFiles: allFiles.length, totalSize };

  await saveIndexMetadata(vp, meta);

  console.log(JSON.stringify({
    ok: true,
    status: "fresh",
    builtAt: now,
    totalFiles: allFiles.length,
    totalSize,
  }, null, 2));
};

export const indexStatus = async (vaultPath?: string) => {
  const vp = vaultPath ?? defaultConfig.vaultPath;

  const meta = await loadIndexMetadata(vp);

  if (!meta) {
    console.log(JSON.stringify({ status: "missing", message: "No index metadata found. Run `librarian index rebuild`." }, null, 2));
    return;
  }

  const isStale = meta.status === "fresh" ? await detectStaleness(vp, meta) : false;

  if (isStale && meta.status === "fresh") {
    meta.status = "stale";
    meta.invalidatedAt = new Date().toISOString();
    await saveIndexMetadata(vp, meta);
  }

  console.log(JSON.stringify({
    status: meta.status,
    builtAt: meta.builtAt,
    invalidatedAt: meta.invalidatedAt,
    totalFiles: meta.stats.totalFiles,
    caches: meta.caches,
  }, null, 2));
};
