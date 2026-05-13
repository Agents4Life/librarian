import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

export type IndexCacheStatus = "fresh" | "stale" | "missing" | "rebuilding";

export type CacheEntry = {
  builtAt: string;
  status: IndexCacheStatus;
};

export type FileEntry = {
  mtimeMs: number;
  size: number;
  hash: string;
};

export type IndexMetadata = {
  builtAt: string;
  invalidatedAt: string | null;
  status: IndexCacheStatus;
  indexedFiles: Record<string, FileEntry>;
  caches: {
    semantic: CacheEntry;
    wikilinks: CacheEntry;
    backlinks: CacheEntry;
    orphans: CacheEntry;
  };
  stats: {
    totalFiles: number;
    totalSize: number;
  };
};

const META_DIR = ".librarian";
const META_STATE_DIR = "state";
const META_FILE = "index-metadata.json";

const metadataPath = (vaultPath: string) =>
  path.join(vaultPath, META_DIR, META_STATE_DIR, META_FILE);

export const emptyMetadata = (): IndexMetadata => ({
  builtAt: new Date().toISOString(),
  invalidatedAt: null,
  status: "missing",
  indexedFiles: {},
  caches: {
    semantic: { builtAt: "", status: "missing" },
    wikilinks: { builtAt: "", status: "missing" },
    backlinks: { builtAt: "", status: "missing" },
    orphans: { builtAt: "", status: "missing" },
  },
  stats: { totalFiles: 0, totalSize: 0 },
});

export const loadIndexMetadata = async (vaultPath: string): Promise<IndexMetadata | null> => {
  const filePath = metadataPath(vaultPath);
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as IndexMetadata;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

export const saveIndexMetadata = async (vaultPath: string, meta: IndexMetadata): Promise<void> => {
  const filePath = metadataPath(vaultPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(meta, null, 2), "utf8");
};

const hashFile = async (filePath: string): Promise<string> => {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
};

export const detectStaleness = async (
  vaultPath: string,
  metadata: IndexMetadata,
): Promise<boolean> => {
  const indexedFiles = metadata.indexedFiles;

  for (const [relativePath, entry] of Object.entries(indexedFiles)) {
    const absPath = path.join(vaultPath, relativePath);
    let fileStat;
    try {
      fileStat = await stat(absPath);
    } catch {
      return true;
    }

    if (fileStat.mtimeMs !== entry.mtimeMs || fileStat.size !== entry.size) {
      const currentHash = await hashFile(absPath);
      if (currentHash !== entry.hash) {
        return true;
      }
    }
  }

  return false;
};
