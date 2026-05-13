import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

import type { NoteIndex } from "./types.js";

const INDEX_DIR = ".librarian";
const STATE_DIR = "state";
const INDEX_FILE = "index.json";

const indexPath = (vaultPath: string) =>
  path.join(vaultPath, INDEX_DIR, STATE_DIR, INDEX_FILE);

export const saveIndex = async (vaultPath: string, index: NoteIndex): Promise<void> => {
  const filePath = indexPath(vaultPath);
  const dir = path.dirname(filePath);

  await mkdir(dir, { recursive: true });
  await writeFile(filePath, JSON.stringify(index, null, 2), "utf8");
};

export const loadIndex = async (vaultPath: string): Promise<NoteIndex | null> => {
  const filePath = indexPath(vaultPath);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }

  try {
    const parsed = JSON.parse(raw) as NoteIndex;

    if (parsed.version !== 1) return null;

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};

const collectMdFiles = async (dir: string, base: string, entries: Array<{ rel: string; mtimeMs: number }>): Promise<void> => {
  let items: string[];
  try {
    items = await readdir(dir);
  } catch {
    return;
  }

  for (const item of items) {
    const full = path.join(dir, item);
    const s = await stat(full);
    if (s.isDirectory()) {
      await collectMdFiles(full, base, entries);
    } else if (item.endsWith(".md")) {
      entries.push({ rel: path.relative(base, full), mtimeMs: s.mtimeMs });
    }
  }
};

export const computeVaultFingerprint = async (vaultPath: string): Promise<string> => {
  const entries: Array<{ rel: string; mtimeMs: number }> = [];

  for (const sub of ["raw", "wiki"]) {
    await collectMdFiles(path.join(vaultPath, sub), vaultPath, entries);
  }

  entries.sort((a, b) => a.rel.localeCompare(b.rel));

  const payload = entries.map((e) => `${e.rel}:${e.mtimeMs}`).join("\n");
  return createHash("sha256").update(payload).digest("hex");
};
