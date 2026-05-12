import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createFrontmatterTool } from './tools/frontmatter.tool.js';
import { createWikilinksTool } from './tools/wikilinks.tool.js';

const renderList = (items: string[]) => items.map((item) => `- ${item}`).join('\n');

export const generateVaultReports = async (basePath: string) => {
  const reportDir = path.resolve(basePath, 'reportes');
  await mkdir(reportDir, { recursive: true });

  const frontmatter = createFrontmatterTool(basePath);
  const wikilinks = createWikilinksTool(basePath);

  const stats = await frontmatter.getStats();
  const incomplete = await frontmatter.listIncompleteNotes();
  const stale = await frontmatter.listStaleNotes();
  const orphans = await wikilinks.getOrphanNotes();
  const graph = await wikilinks.getGraphStats();

  const reports = [
    {
      file: path.join(reportDir, 'vault-status.md'),
      content: ['# Estado de la wiki', '', `- total_files: ${stats.total_files}`, `- wiki_pages: ${stats.wiki_pages}`, `- raw_files: ${stats.raw_files}`, `- orphan_notes: ${orphans.notes.length}`, `- total_edges: ${graph.total_edges}`, ''].join('\n'),
    },
    {
      file: path.join(reportDir, 'incomplete-notes.md'),
      content: ['# Páginas incompletas', '', renderList(incomplete.notes.map((note) => `${note.file} (${note.word_count} palabras)`)) || '- Ninguna', ''].join('\n'),
    },
    {
      file: path.join(reportDir, 'stale-notes.md'),
      content: ['# Notas stale', '', renderList(stale.notes.map((note) => `${note.file} (${note.days_since_touch} días)`)) || '- Ninguna', ''].join('\n'),
    },
    {
      file: path.join(reportDir, 'orphan-notes.md'),
      content: ['# Notas huérfanas', '', renderList(orphans.notes.map((note) => note.file)) || '- Ninguna', ''].join('\n'),
    },
  ];

  await Promise.all(reports.map((report) => writeFile(report.file, report.content, 'utf8')));

  return {
    graph,
    incomplete,
    orphans,
    reports: reports.map((report) => path.relative(basePath, report.file)),
    stale,
    stats,
  };
};
