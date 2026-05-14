import { readdir } from "node:fs/promises";
import path from "node:path";

import type { Note, NoteIndex, SectionMap } from "./types.js";
import { parseNote } from "./parser.js";
import { isEmbeddingAvailable, getEmbeddingProvider, getEmbeddingStore } from "../embeddings/index.js";

const INDEX_ROOTS = ["raw", "wiki"];

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

/** Walk only the content directories (raw/ + wiki/) under the vault root */
const walkContentDirs = async (vaultPath: string): Promise<string[]> => {
  const results: string[] = [];
  for (const dir of INDEX_ROOTS) {
    const full = path.join(vaultPath, dir);
    const files = await walkMarkdownFiles(full);
    results.push(...files);
  }
  return results;
};

const resolveAmbiguousTitle = (
  candidates: string[],
  link: string,
  sourcePath: string,
): string | null => {
  const exact = candidates.find((c) => {
    const title = path.basename(c, ".md");
    return title === link;
  });
  if (exact) return exact;

  const sourceDir = path.dirname(sourcePath);
  const sameDir = candidates.find((c) => path.dirname(c) === sourceDir);
  if (sameDir) return sameDir;

  return null;
};

const computeBacklinks = (notes: Record<string, Note>): void => {
  const titleToPaths = new Map<string, string[]>();

  for (const note of Object.values(notes)) {
    const key = note.title.toLowerCase();
    const existing = titleToPaths.get(key);
    if (existing) {
      existing.push(note.path);
    } else {
      titleToPaths.set(key, [note.path]);
    }
  }

  for (const note of Object.values(notes)) {
    note.backlinks = [];
  }

  for (const note of Object.values(notes)) {
    for (const link of note.links) {
      const candidates = titleToPaths.get(link.toLowerCase());
      if (!candidates || candidates.length === 0) continue;

      let resolved: string | null;
      if (candidates.length === 1) {
        resolved = candidates[0];
      } else {
        resolved = resolveAmbiguousTitle(candidates, link, note.path);
      }

      if (!resolved || resolved === note.path) continue;

      const linkedNote = notes[resolved];
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
  const files = await walkContentDirs(vaultPath);
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

  const index: NoteIndex = {
    version: 1,
    builtAt: new Date().toISOString(),
    vaultPath,
    notes,
  };

  // Fire-and-forget: generate embeddings in the background after index is built
  maybeGenerateEmbeddings(index).catch(() => {
    // Silently ignore embedding generation failures
  });

  return index;
};

const maybeGenerateEmbeddings = async (index: NoteIndex): Promise<void> => {
  const available = await isEmbeddingAvailable();
  if (!available) return;

  const provider = getEmbeddingProvider();
  const store = getEmbeddingStore();

  const wikiNotes = Object.values(index.notes)
    .filter((n) => n.section === "wiki" && n.wordCount > 20);

  for (const note of wikiNotes) {
    const text = [note.title, ...note.tags, ...note.headings].join(" ");
    try {
      const vector = await provider.embed(text);
      store.upsert(note.path, text, vector);
      note.embedding = vector.values;
    } catch {
      // Skip individual failures
    }
  }
};
