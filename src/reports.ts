import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ToolContext } from "./index-context.js";

const renderList = (items: string[]) => items.map((item) => `- ${item}`).join("\n");

export const generateVaultReports = async (vaultPath: string, queryApi?: ToolContext["queryApi"]) => {
  const reportDir = path.resolve(vaultPath, "reportes");
  await mkdir(reportDir, { recursive: true });

  const stats = queryApi ? queryApi.getStats() : { total_files: 0, by_section: {} as Record<string, number>, by_status: {} as Record<string, number> };
  const incomplete = queryApi ? queryApi.getIncomplete() : [];
  const stale = queryApi ? queryApi.getStale() : [];
  const orphans = queryApi ? queryApi.getOrphans() : [];
  const graph = queryApi ? queryApi.getGraphStats() : { total_nodes: 0, total_edges: 0, avg_connections: 0, orphans: 0, most_connected: [] };

  const wikiPages = stats.by_section["wiki"] ?? 0;
  const rawFiles = stats.by_section["raw"] ?? 0;

  const reports = [
    {
      file: path.join(reportDir, "vault-status.md"),
      content: ["# Estado de la wiki", "", `- total_files: ${stats.total_files}`, `- wiki_pages: ${wikiPages}`, `- raw_files: ${rawFiles}`, `- orphan_notes: ${orphans.length}`, `- total_edges: ${graph.total_edges}`, ""].join("\n"),
    },
    {
      file: path.join(reportDir, "incomplete-notes.md"),
      content: ["# Páginas incompletas", "", renderList(incomplete.map((note) => `${note.path} (${note.wordCount} palabras)`)) || "- Ninguna", ""].join("\n"),
    },
    {
      file: path.join(reportDir, "stale-notes.md"),
      content: ["# Notas stale", "", renderList(stale.map((note) => `${note.path} (${Math.floor((Date.now() - new Date(note.updatedAt).getTime()) / (24 * 60 * 60 * 1000))} días)`)) || "- Ninguna", ""].join("\n"),
    },
    {
      file: path.join(reportDir, "orphan-notes.md"),
      content: ["# Notas huérfanas", "", renderList(orphans.map((note) => note.path)) || "- Ninguna", ""].join("\n"),
    },
  ];

  await Promise.all(reports.map((report) => writeFile(report.file, report.content, "utf8")));

  return {
    graph,
    incomplete: { notes: incomplete.map((note) => ({ file: note.path, has_content: note.wordCount > 0, missing_sections: [], word_count: note.wordCount })) },
    orphans: { notes: orphans.map((note) => ({ file: note.path, has_incoming: note.backlinks.length > 0, has_outgoing: note.links.length > 0 })) },
    reports: reports.map((report) => path.relative(vaultPath, report.file)),
    stale: { notes: stale.map((note) => ({ file: note.path, days_since_touch: Math.floor((Date.now() - new Date(note.updatedAt).getTime()) / (24 * 60 * 60 * 1000)), last_touched: note.updatedAt, recommendation: "review" })) },
    stats: { ...stats, wiki_pages: wikiPages, raw_files: rawFiles },
  };
};
