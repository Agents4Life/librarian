import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

import type { StoredProposal } from "../proposals/types.js";
import { generateOperationId } from "../proposals/operation-id.js";
import { markProcessed } from "./processed-ledger.js";
import {
  createTransaction,
  saveTransaction,
  type TransactionRecord,
  type TargetRecord,
} from "./transaction-store.js";

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

const hashFile = async (filePath: string): Promise<string | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
};

const writeTempAndRename = async (
  targetAbsolutePath: string,
  content: string,
  tempSuffix: string,
): Promise<string> => {
  const tempPath = `${targetAbsolutePath}.tmp_${tempSuffix}`;
  await mkdir(path.dirname(tempPath), { recursive: true });
  await writeFile(tempPath, content, "utf8");

  const written = await readFile(tempPath, "utf8");
  if (written.length === 0) {
    throw new Error(`Temp file written with zero length: ${tempPath}`);
  }

  await rename(tempPath, targetAbsolutePath);
  return tempPath;
};

const rollbackTarget = async (
  vaultPath: string,
  target: TargetRecord,
  previousContent: string | null,
): Promise<boolean> => {
  const targetAbs = assertWithinVault(vaultPath, target.path);

  try {
    if (target.action === "create") {
      await unlink(targetAbs).catch(() => {});
    } else if (previousContent !== null) {
      await writeFile(targetAbs, previousContent, "utf8");
    }
    return true;
  } catch {
    return false;
  }
};

export type ApplyResult = {
  operationId: string;
  attempt: number;
  success: boolean;
  error?: string;
  rollbackError?: string;
};

export const applyProposalToVault = async (
  vaultPath: string,
  proposal: StoredProposal,
): Promise<ApplyResult> => {
  const operationId = generateOperationId();
  const attempt = proposal.attempts + 1;

  const targetPath = proposal.proposal.target;
  const targetAbs = assertWithinVault(vaultPath, targetPath);
  const targetExists = await exists(targetAbs);

  if (proposal.proposal.type === "create" && targetExists) {
    throw new Error(`Cannot create: target already exists: ${targetPath}`);
  }

  if (proposal.proposal.type === "update" && !targetExists) {
    throw new Error(`Cannot update: target not found: ${targetPath}`);
  }

  const transaction = await createTransaction(vaultPath, operationId, proposal.id, attempt, [
    { path: targetPath, action: proposal.proposal.type === "update" ? "update" : "create" },
  ]);

  const targetRecord = transaction.targets[0];
  if (!targetRecord) {
    throw new Error("No targets in transaction");
  }

  const previousHash = await hashFile(targetAbs);
  let previousContent: string | null = null;
  if (targetExists) {
    previousContent = await readFile(targetAbs, "utf8");
  }

  targetRecord.previousHash = previousHash;

  try {
    targetRecord.tempPath = `${targetAbs}.tmp_${operationId}`;
    targetRecord.status = "pending";

    await writeTempAndRename(targetAbs, proposal.proposal.preview, operationId);

    targetRecord.status = "completed";
    targetRecord.completedAt = new Date().toISOString();
    targetRecord.tempPath = null;

    transaction.status = "completed";
    transaction.completedAt = new Date().toISOString();
    await saveTransaction(vaultPath, transaction);

    await markProcessed(vaultPath, proposal.sourcePath, {
      proposalId: proposal.id,
      targetPath: proposal.proposal.target,
      operationId,
    });

    return { operationId, attempt, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    transaction.error = errorMessage;

    const rolledBack = await rollbackTarget(vaultPath, targetRecord, previousContent);

    if (rolledBack) {
      targetRecord.status = "rolled_back";
      transaction.status = "rolled_back";
    } else {
      targetRecord.status = "failed";
      transaction.status = "failed";
    }

    transaction.rollbackError = rolledBack ? null : "Rollback failed for target";
    transaction.completedAt = new Date().toISOString();
    await saveTransaction(vaultPath, transaction);

    return {
      operationId,
      attempt,
      success: false,
      error: errorMessage,
      rollbackError: transaction.rollbackError ?? undefined,
    };
  }
};
