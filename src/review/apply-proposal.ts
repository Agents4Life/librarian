import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

import type { StoredProposal } from "../proposals/types.js";
import type { ProposalTarget } from "../types.js";
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

  await rename(tempPath, targetAbsolutePath);
  return tempPath;
};

const rollbackTarget = async (
  vaultPath: string,
  target: TargetRecord,
  previousContent: string | null,
): Promise<boolean> => {
  const targetAbs = assertWithinVault(vaultPath, target.path);

  if (target.tempPath) {
    await unlink(target.tempPath).catch(() => {});
  }

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

/**
 * Describes a single file to be written during proposal application.
 * `content` is the full string to write; `action` determines whether
 * we expect the file to already exist ("update") or not ("create").
 */
type ApplyTarget = {
  relativePath: string;
  content: string;
  action: "create" | "update";
};

/**
 * Resolve the main proposal target + any additionalTargets into a flat list.
 */
const collectTargets = (proposal: StoredProposal): ApplyTarget[] => {
  const targets: ApplyTarget[] = [
    {
      relativePath: proposal.proposal.target,
      content: proposal.proposal.preview,
      action: proposal.proposal.type === "update" ? "update" : "create",
    },
  ];

  const additional = proposal.proposal.additionalTargets as
    | ProposalTarget[]
    | undefined;
  if (additional && additional.length > 0) {
    for (const t of additional) {
      targets.push({
        relativePath: t.path,
        content: t.content,
        action: t.action,
      });
    }
  }

  return targets;
};

export const applyProposalToVault = async (
  vaultPath: string,
  proposal: StoredProposal,
): Promise<ApplyResult> => {
  const operationId = generateOperationId();
  const attempt = proposal.attempts + 1;

  // Collect all targets (main + additional)
  const allTargets = collectTargets(proposal);

  // Pre-flight checks for every target
  for (const t of allTargets) {
    const abs = assertWithinVault(vaultPath, t.relativePath);
    const targetExists = await exists(abs);

    if (t.action === "create" && targetExists) {
      return { operationId, attempt, success: false, error: `Cannot create: target already exists: ${t.relativePath}` };
    }

    if (t.action === "update" && !targetExists) {
      return { operationId, attempt, success: false, error: `Cannot update: target not found: ${t.relativePath}` };
    }
  }

  // Create transaction with ALL target paths
  const transaction = await createTransaction(
    vaultPath,
    operationId,
    proposal.id,
    attempt,
    allTargets.map((t) => ({ path: t.relativePath, action: t.action })),
  );

  // Capture previous state for every target
  const previousStates: Array<{ content: string | null; hash: string | null }> = [];
  for (let i = 0; i < allTargets.length; i++) {
    const t = allTargets[i];
    const abs = assertWithinVault(vaultPath, t.relativePath);
    const targetExists = await exists(abs);
    const previousHash = await hashFile(abs);
    let previousContent: string | null = null;
    if (targetExists) {
      previousContent = await readFile(abs, "utf8");
    }
    previousStates.push({ content: previousContent, hash: previousHash });
    transaction.targets[i].previousHash = previousHash;
  }

  // Track which targets have been successfully written (for partial rollback)
  const writtenIndices: number[] = [];

  try {
    for (let i = 0; i < allTargets.length; i++) {
      const t = allTargets[i];
      const abs = assertWithinVault(vaultPath, t.relativePath);
      const targetRecord = transaction.targets[i];

      targetRecord.tempPath = `${abs}.tmp_${operationId}`;
      targetRecord.status = "pending";

      await writeTempAndRename(abs, t.content, operationId);

      targetRecord.status = "completed";
      targetRecord.completedAt = new Date().toISOString();
      targetRecord.tempPath = null;
      writtenIndices.push(i);
    }

    transaction.status = "completed";
    transaction.completedAt = new Date().toISOString();
    await saveTransaction(vaultPath, transaction);

    // Mark processed only for the main source
    await markProcessed(vaultPath, proposal.sourcePath, {
      proposalId: proposal.id,
      targetPath: proposal.proposal.target,
      operationId,
    });

    return { operationId, attempt, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    transaction.error = errorMessage;

    // Rollback all targets that were successfully written
    let allRolledBack = true;
    for (const idx of writtenIndices) {
      const targetRecord = transaction.targets[idx];
      const prevState = previousStates[idx];
      const rolledBack = await rollbackTarget(
        vaultPath,
        targetRecord,
        prevState.content,
      );
      if (!rolledBack) {
        allRolledBack = false;
      }
      targetRecord.status = rolledBack ? "rolled_back" : "failed";
    }

    // Mark any targets that were never written as failed too
    for (let i = 0; i < transaction.targets.length; i++) {
      if (!writtenIndices.includes(i)) {
        transaction.targets[i].status = "failed";
      }
    }

    transaction.status = allRolledBack ? "rolled_back" : "failed";
    transaction.rollbackError = allRolledBack ? null : "Rollback failed for one or more targets";
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
