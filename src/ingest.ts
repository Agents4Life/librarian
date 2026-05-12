import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const dailyPattern = /(^|\/)(daily|dailies|operational|ops)[-_ ]?/i;

const parseFrontmatter = (content: string) => {
  const lines = content.split(/\r?\n/);

  if (lines[0] !== '---') {
    return { data: {}, body: content };
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line === '---');

  if (endIndex === -1) {
    return { data: {}, body: content };
  }

  const data: Record<string, unknown> = {};
  const body = lines.slice(endIndex + 1).join('\n');
  let currentKey: string | null = null;

  for (const line of lines.slice(1, endIndex)) {
    if (!line.trim()) {
      continue;
    }

    const nestedMatch = line.match(/^  ([^:]+):\s*(.*)$/);

    if (nestedMatch && currentKey) {
      const [, key, value] = nestedMatch;
      const parent = data[currentKey];

      if (typeof parent === 'object' && parent !== null) {
        (parent as Record<string, unknown>)[key.trim()] = value.trim() === 'true';
      }

      continue;
    }

    const match = line.match(/^([^:]+):\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, value] = match;
    const normalizedKey = key.trim();

    if (!value.trim()) {
      data[normalizedKey] = {};
      currentKey = normalizedKey;
      continue;
    }

    data[normalizedKey] = value.trim() === 'true' ? true : value.trim() === 'false' ? false : value.trim();
    currentKey = normalizedKey;
  }

  return { data, body };
};

const walkMarkdownFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return walkMarkdownFiles(resolved);
      }

      if (entry.isFile() && resolved.endsWith('.md')) {
        return [resolved];
      }

      return [];
    }),
  );

  return nested.flat();
};

export const inspectRawInbox = async (basePath: string) => {
  const rawPath = path.join(basePath, 'raw');
  const files = await walkMarkdownFiles(rawPath).catch(() => [] as string[]);

  const notes = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file, 'utf8');
      const { data, body } = parseFrontmatter(content);
      const processed = Boolean((data.purim as Record<string, unknown> | undefined)?.processed);
      const hasContent = body.trim().length > 0;
      const fileName = path.basename(file);
      const recommendation = !hasContent || dailyPattern.test(fileName) || dailyPattern.test(file)
        ? 'report'
        : 'curate';

      const fileStat = await stat(file);

      return {
        created: fileStat.birthtime.toISOString(),
        file: path.relative(basePath, file),
        has_content: hasContent,
        processed,
        recommendation,
        size: fileStat.size,
      };
    }),
  );

  return {
    notes: notes.filter((note) => !note.processed),
  };
};
