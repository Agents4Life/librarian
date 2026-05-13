import type { NoteIndex } from "./indexer/types.js";
import { buildIndex } from "./indexer/builder.js";
import { computeVaultFingerprint, loadIndex, saveIndex } from "./indexer/store.js";
import { createQueryApi } from "./indexer/query.js";

export type QueryApi = ReturnType<typeof createQueryApi>;

export type ToolContext = {
  vaultPath: string;
  queryApi: QueryApi;
};

export type IndexContext = {
  index: NoteIndex;
  query: QueryApi;
};

export const buildOrLoadIndex = async (vaultPath: string): Promise<NoteIndex> => {
  const existing = await loadIndex(vaultPath);

  if (existing && existing.vaultPath === vaultPath) {
    const currentFingerprint = await computeVaultFingerprint(vaultPath);
    if (existing.vaultFingerprint === currentFingerprint) {
      return existing;
    }
    // Fingerprint mismatch — vault changed, rebuild
  }

  const index = await buildIndex(vaultPath);
  index.vaultFingerprint = await computeVaultFingerprint(vaultPath);
  await saveIndex(vaultPath, index);
  return index;
};

export const createIndexContext = async (vaultPath: string): Promise<IndexContext> => {
  const index = await buildOrLoadIndex(vaultPath);
  const query = createQueryApi(index);
  return { index, query };
};
