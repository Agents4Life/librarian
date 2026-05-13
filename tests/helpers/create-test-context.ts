import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildIndex, createQueryApi } from "../../src/indexer/index.js";
import type { ToolContext } from "../../src/index-context.js";

export type TestVaultFiles = Record<string, string>;

export const createTestContext = async (files?: TestVaultFiles): Promise<ToolContext> => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), "librarian-vault-"));

  if (files) {
    for (const [relativePath, content] of Object.entries(files)) {
      const absolutePath = path.join(vaultPath, relativePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, content, "utf8");
    }
  }

  const index = await buildIndex(vaultPath);
  const queryApi = createQueryApi(index);

  return { vaultPath, queryApi };
};
