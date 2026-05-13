import { mkdir, readFile, writeFile } from "node:fs/promises";
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
