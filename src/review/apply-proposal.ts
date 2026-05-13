import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StoredProposal } from "../proposals/types.js";
import { markProcessed } from "./processed-ledger.js";

export const applyProposalToVault = async (
  vaultPath: string,
  proposal: StoredProposal,
): Promise<void> => {
  const targetAbsolutePath = path.join(vaultPath, proposal.proposal.target);
  const targetDir = path.dirname(targetAbsolutePath);

  await mkdir(targetDir, { recursive: true });
  await writeFile(targetAbsolutePath, proposal.proposal.preview, "utf8");

  await markProcessed(vaultPath, proposal.sourcePath, {
    proposalId: proposal.id,
    targetPath: proposal.proposal.target,
  });
};
