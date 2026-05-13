import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ToolContext } from "../index-context.js";

const wikilinkPattern = /\[\[([^\]]+)\]\]/g;

const normalizeWikilinkTarget = (target: string) => {
  const withoutAlias = target.split("|")[0] ?? "";
  const withoutHeading = withoutAlias.split("#")[0] ?? "";
  const withoutExtension = withoutHeading.replace(/\.md$/i, "");
  const pathSegment = withoutExtension.split("/").at(-1) ?? "";
  return (pathSegment.split("\\").at(-1) ?? "").trim();
};

const extractLinksFromText = (content: string) => {
  const links: Array<{ target: string; line: number; context: string }> = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    wikilinkPattern.lastIndex = 0;
    const matches = line.matchAll(wikilinkPattern);

    for (const match of matches) {
      links.push({
        context: line.trim(),
        line: index + 1,
        target: normalizeWikilinkTarget(match[1] ?? ""),
      });
    }
  });

  return links;
};

export const createWikilinksTool = (ctx: ToolContext) => {
  const { vaultPath, queryApi } = ctx;

  return {
    extractWikilinks: async (relativePath: string) => {
      const absolutePath = path.resolve(vaultPath, relativePath);
      const content = await readFile(absolutePath, "utf8");

      return {
        links: extractLinksFromText(content),
      };
    },

    getBacklinks: async (target: string) => {
      const wikiNotes = queryApi.getBySection("wiki");
      const backlinks: Array<{ source: string; line: number; context: string }> = [];

      for (const note of wikiNotes) {
        const hasLink = note.links.some((l) => l.toLowerCase() === target.toLowerCase());
        if (!hasLink) continue;

        const absolutePath = path.resolve(vaultPath, note.path);
        const content = await readFile(absolutePath, "utf8");
        const links = extractLinksFromText(content);

        for (const link of links) {
          if (link.target.toLowerCase() === target.toLowerCase()) {
            backlinks.push({
              context: link.context,
              line: link.line,
              source: note.path,
            });
          }
        }
      }

      return { backlinks };
    },

    getOrphanNotes: async () => {
      const orphans = queryApi.getOrphans().filter((note) => note.section === "wiki");
      return {
        notes: orphans.map((note) => ({
          file: note.path,
          has_incoming: note.backlinks.length > 0,
          has_outgoing: note.links.length > 0,
        })),
      };
    },

    getGraphStats: async () => queryApi.getGraphStats(),

    findPath: async (source: string, target: string) =>
      queryApi.findPath(source, target),
  };
};

export const extractWikilinks = async (basePath: string, relativePath: string) =>
  createWikilinksTool({ vaultPath: basePath, queryApi: null as never }).extractWikilinks(relativePath);
