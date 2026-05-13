import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import lockfile from "proper-lockfile";

type LedgerEntry = {
  at: string;
  proposalId?: string;
  targetPath?: string;
};

type ProcessedLedger = {
  processed: Record<string, LedgerEntry>;
};

const LEDGER_PATH = "state";
const LEDGER_FILE = "processed.json";

const ledgerFilePath = (vaultPath: string) =>
  path.join(vaultPath, LEDGER_PATH, LEDGER_FILE);

const loadLedger = async (vaultPath: string): Promise<ProcessedLedger> => {
  try {
    const raw = await readFile(ledgerFilePath(vaultPath), "utf8");
    return JSON.parse(raw) as ProcessedLedger;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return { processed: {} };
    }
    console.error(`Failed to load ledger at ${ledgerFilePath(vaultPath)}:`, error);
    throw error;
  }
};

const saveLedger = async (vaultPath: string, ledger: ProcessedLedger): Promise<void> => {
  const filePath = ledgerFilePath(vaultPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(ledger, null, 2), "utf8");
};

export const isProcessed = async (vaultPath: string, sourcePath: string): Promise<boolean> => {
  const ledger = await loadLedger(vaultPath);
  return sourcePath in ledger.processed;
};

export const markProcessed = async (
  vaultPath: string,
  sourcePath: string,
  metadata: { proposalId: string; targetPath: string },
): Promise<void> => {
  const filePath = ledgerFilePath(vaultPath);
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });

  try {
    await writeFile(filePath, '{"processed":{}}', { flag: "wx" });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EEXIST")) {
      throw error;
    }
  }

  const release = await lockfile.lock(filePath, { lockfilePath: filePath + ".lock", retries: { retries: 5, minTimeout: 20, maxTimeout: 200 } });
  try {
    const ledger = await loadLedger(vaultPath);
    ledger.processed[sourcePath] = {
      at: new Date().toISOString(),
      proposalId: metadata.proposalId,
      targetPath: metadata.targetPath,
    };
    await saveLedger(vaultPath, ledger);
  } finally {
    await release();
  }
};
