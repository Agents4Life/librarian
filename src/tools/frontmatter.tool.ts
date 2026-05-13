import { readFile, writeFile as writeFs } from "node:fs/promises";
import path from "node:path";

import type { ToolContext } from "../index-context.js";
import { parseFrontmatter } from "../indexer/parser.js";

export const createFrontmatterTool = (ctx: ToolContext) => {
  const { vaultPath, queryApi } = ctx;

  return {
    readFrontmatter: async (relativePath: string) => {
      const note = queryApi.getByPath(relativePath);
      if (note) {
        return {
          data: note.frontmatter,
          librarian: typeof note.frontmatter.librarian === "object" && note.frontmatter.librarian !== null
            ? note.frontmatter.librarian as Record<string, unknown>
            : undefined,
        };
      }

      const absolutePath = path.resolve(vaultPath, relativePath);
      const raw = await readFile(absolutePath, "utf8");
      const parsed = parseFrontmatter(raw);

      return {
        data: parsed.data,
        librarian: typeof parsed.data.librarian === "object" && parsed.data.librarian !== null
          ? parsed.data.librarian as Record<string, unknown>
          : undefined,
      };
    },

    getStats: async () => queryApi.getStats(),

    updateFrontmatter: async (relativePath: string, data: Record<string, unknown>) => {
      const absolutePath = path.resolve(vaultPath, relativePath);
      const raw = await readFile(absolutePath, "utf8");
      const parsed = parseFrontmatter(raw);
      const merged = { ...parsed.data, ...data };

      const frontmatter = Object.entries(merged)
        .map(([key, value]) => {
          if (value && typeof value === "object") {
            const nested = Object.entries(value as Record<string, unknown>)
              .map(([nestedKey, nestedValue]) => `  ${nestedKey}: ${String(nestedValue)}`)
              .join("\n");
            return `${key}:\n${nested}`;
          }
          return `${key}: ${String(value)}`;
        })
        .join("\n");

      const body = raw.startsWith("---") ? parsed.body : raw;
      await writeFs(absolutePath, `---\n${frontmatter}\n---\n${body}`, "utf8");

      return { after: merged, before: parsed.data, status: "pending_approval" as const };
    },

    listIncompleteNotes: async () => {
      const notes = queryApi.getIncomplete().filter((n) => n.section === "wiki");
      return {
        notes: notes.map((note) => ({
          file: note.path,
          has_content: note.wordCount > 0,
          missing_sections: [
            ...(note.wordCount < 50 ? ["content"] : []),
            ...(note.headings.length === 0 ? ["sections"] : []),
            ...(note.tags.length === 0 ? ["tags"] : []),
          ],
          word_count: note.wordCount,
        })),
      };
    },

    listStaleNotes: async (days = 90) => {
      const notes = queryApi.getStale(days).filter((n) => n.section === "wiki");
      return {
        notes: notes.map((note) => ({
          days_since_touch: Math.floor(
            (Date.now() - new Date(note.updatedAt).getTime()) / (24 * 60 * 60 * 1000),
          ),
          file: note.path,
          last_touched: note.updatedAt,
          recommendation: "review" as const,
        })),
      };
    },

    listUnprocessed: async () => {
      const rawNotes = queryApi.getBySection("raw");
      return {
        notes: rawNotes
          .filter((note) => {
            const librarian = note.frontmatter.librarian as Record<string, unknown> | undefined;
            return !Boolean(librarian?.processed);
          })
          .map((note) => ({
            created: note.createdAt,
            file: note.path,
            size: note.fileSize,
            processed: false,
          })),
      };
    },
  };
};
