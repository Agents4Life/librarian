import { readdir } from "node:fs/promises";
import path from "node:path";

import type { Note, NoteIndex, SectionMap } from "./types.js";
import { parseNote } from "./parser.js";

const walkMarkdownFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(directory, entry.name);

      if (entry.name.startsWith(".")) return [];
      if (entry.isDirectory()) return walkMarkdownFiles(resolved);
      if (entry.isFile() && entry.name.endsWith(".md")) return [resolved];

      return [];
    }),
  );

  return nested.flat();
};

const computeBacklinks = (notes: Record<string, Note>): void => {
  const titleToPath = new Map<string, string>();

  for (const note of Object.values(notes)) {
    titleToPath.set(note.title.toLowerCase(), note.path);
  }

  for (const note of Object.values(notes)) {
    note.backlinks = [];
  }

  for (const note of Object.values(notes)) {
    for (const link of note.links) {
      const linkedPath = titleToPath.get(link.toLowerCase());
      if (!linkedPath || linkedPath === note.path) continue;

      const linkedNote = notes[linkedPath];
      if (linkedNote && !linkedNote.backlinks.includes(note.path)) {
        linkedNote.backlinks.push(note.path);
      }
    }
  }
};

export const buildIndex = async (
  vaultPath: string,
  sectionMap?: SectionMap,
): Promise<NoteIndex> => {
  const files = await walkMarkdownFiles(vaultPath);
  const notes: Record<string, Note> = {};

  for (const file of files) {
    try {
      const note = await parseNote(file, vaultPath, sectionMap);
      notes[note.path] = note;
    } catch {
      // skip unreadable files
    }
  }

  computeBacklinks(notes);

  return {
    version: 1,
    builtAt: new Date().toISOString(),
    vaultPath,
    notes,
  };
};
