import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StoredProposal } from "../proposals/types.js";
import { markProcessed } from "./processed-ledger.js";

const assertWithinVault = (vaultPath: string, target: string): string => {
  const canonicalVault = path.resolve(vaultPath);
  const resolved = path.resolve(canonicalVault, target);
  const relative = path.relative(canonicalVault, resolved);

  if (relative.startsWith("..") || relative === "") {
    throw new Error(`Path traversal detected: ${target} resolves outside vault`);
  }

  return resolved;
};

const exists = (p: string): Promise<boolean> =>
  stat(p).then(() => true, () => false);

export const applyProposalToVault = async (
  vaultPath: string,
  proposal: StoredProposal,
): Promise<void> => {
  const targetAbsolutePath = assertWithinVault(vaultPath, proposal.proposal.target);
  const targetDir = path.dirname(targetAbsolutePath);
  const targetExists = await exists(targetAbsolutePath);

  if (proposal.proposal.type === "create" && targetExists) {
    throw new Error(`Cannot create: target already exists: ${proposal.proposal.target}`);
  }

  if (proposal.proposal.type === "update" && !targetExists) {
    throw new Error(`Cannot update: target not found: ${proposal.proposal.target}`);
  }

  await mkdir(targetDir, { recursive: true });
  await markProcessed(vaultPath, proposal.sourcePath, {
    proposalId: proposal.id,
    targetPath: proposal.proposal.target,
  });
  await writeFile(targetAbsolutePath, proposal.proposal.preview, "utf8");
};
