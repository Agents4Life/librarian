import { appendFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { WikiCategory } from './types.js';

const wikiCategories: WikiCategory[] = ['conceptos', 'entidades', 'sources', 'synthesis'];

const toVaultRelative = (basePath: string, absolutePath: string) => path.relative(basePath, absolutePath);

const toObsidianPath = (relativePath: string) => relativePath.split(path.sep).join('/');

const exists = async (absolutePath: string) => {
  try {
    await stat(absolutePath);
    return true;
  } catch {
    return false;
  }
};

const walkMarkdownFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return walkMarkdownFiles(resolved);
      }

      if (entry.isFile() && entry.name.endsWith('.md')) {
        return [resolved];
      }

      return [] as string[];
    }),
  );

  return nested.flat();
};

export const ensureWikiStructure = async (basePath: string) => {
  const relativeDirectories = [
    'wiki',
    ...wikiCategories.map((category) => path.join('wiki', category)),
    'reportes',
  ];
  const created: string[] = [];

  for (const relativeDirectory of relativeDirectories) {
    const absoluteDirectory = path.join(basePath, relativeDirectory);

    if (!(await exists(absoluteDirectory))) {
      created.push(relativeDirectory);
    }

    await mkdir(absoluteDirectory, { recursive: true });
  }

  return { created };
};

export const updateWikiIndex = async (basePath: string) => {
  await ensureWikiStructure(basePath);

  const sections = await Promise.all(
    wikiCategories.map(async (category) => {
      const categoryPath = path.join(basePath, 'wiki', category);
      const files = (await walkMarkdownFiles(categoryPath)).sort();
      const links = files.map((file) => {
        const relativeToWiki = path.relative(path.join(basePath, 'wiki'), file).replace(/\.md$/, '');
        const linkTarget = toObsidianPath(relativeToWiki);
        const alias = path.basename(file, '.md');

        return `- [[${linkTarget}|${alias}]]`;
      });

      return [`## ${category}`, '', links.length > 0 ? links.join('\n') : '- No pages yet.', ''].join('\n');
    }),
  );

  const content = ['# Wiki Index', '', ...sections].join('\n');
  const indexPath = path.join(basePath, 'wiki', 'index.md');

  await writeFile(indexPath, content, 'utf8');

  return { file: toVaultRelative(basePath, indexPath) };
};

export interface WikiLogEvent {
  action: string;
  reason?: string;
  source: string;
  target: string;
}

export const appendWikiLog = async (basePath: string, event: WikiLogEvent) => {
  await ensureWikiStructure(basePath);

  const logPath = path.join(basePath, 'wiki', 'log.md');
  const hasLog = await exists(logPath);

  if (!hasLog) {
    await writeFile(logPath, '# Wiki Log\n\n', 'utf8');
  } else {
    const current = await readFile(logPath, 'utf8');
    if (!current.startsWith('# Wiki Log')) {
      await writeFile(logPath, `# Wiki Log\n\n${current}`, 'utf8');
    }
  }

  const reason = event.reason ? ` (reason: ${event.reason})` : '';
  const line = `- ${new Date().toISOString()} ${event.action}: ${toObsidianPath(event.source)} -> ${toObsidianPath(event.target)}${reason}\n`;

  await appendFile(logPath, line, 'utf8');

  return { file: toVaultRelative(basePath, logPath) };
};
