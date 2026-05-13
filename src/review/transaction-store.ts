import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type TargetRecord = {
  path: string;
  action: "create" | "update";
  status: "pending" | "completed" | "rolled_back" | "failed";
  tempPath: string | null;
  previousHash: string | null;
  completedAt: string | null;
};

export type TransactionRecord = {
  operationId: string;
  proposalId: string;
  attempt: number;
  startedAt: string;
  completedAt: string | null;
  status: "in_progress" | "completed" | "failed" | "rolled_back";
  targets: TargetRecord[];
  error: string | null;
  rollbackError: string | null;
};

const TRANSACTIONS_DIR = ".librarian";
const TRANSACTIONS_SUBDIR = "transactions";

const transactionsDir = (vaultPath: string) =>
  path.join(vaultPath, TRANSACTIONS_DIR, TRANSACTIONS_SUBDIR);

const transactionPath = (vaultPath: string, operationId: string) =>
  path.join(transactionsDir(vaultPath), `${operationId}.json`);

export const createTransaction = async (
  vaultPath: string,
  operationId: string,
  proposalId: string,
  attempt: number,
  targets: Array<{ path: string; action: "create" | "update" }>,
): Promise<TransactionRecord> => {
  const record: TransactionRecord = {
    operationId,
    proposalId,
    attempt,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "in_progress",
    targets: targets.map((t) => ({
      path: t.path,
      action: t.action,
      status: "pending" as const,
      tempPath: null,
      previousHash: null,
      completedAt: null,
    })),
    error: null,
    rollbackError: null,
  };

  const filePath = transactionPath(vaultPath, operationId);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(record, null, 2), "utf8");

  return record;
};

export const saveTransaction = async (
  vaultPath: string,
  record: TransactionRecord,
): Promise<void> => {
  const filePath = transactionPath(vaultPath, record.operationId);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(record, null, 2), "utf8");
};

export const loadTransaction = async (
  vaultPath: string,
  operationId: string,
): Promise<TransactionRecord | null> => {
  const filePath = transactionPath(vaultPath, operationId);
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as TransactionRecord;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
};
