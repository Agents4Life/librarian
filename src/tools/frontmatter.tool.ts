import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const parseScalar = (value: string) => {
  const trimmed = value.trim();

  if (trimmed === 'true') {
    return true;
  }

  if (trimmed === 'false') {
    return false;
  }

  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;
};

const parseFrontmatter = (content: string) => {
  const lines = content.split(/\r?\n/);

  if (lines[0] !== '---') {
    return { data: {}, body: content };
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line === '---');

  if (endIndex === -1) {
    return { data: {}, body: content };
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const body = lines.slice(endIndex + 1).join('\n');
  const data: Record<string, unknown> = {};
  let currentKey: string | null = null;

  for (const line of frontmatterLines) {
    if (!line.trim()) {
      continue;
    }

    const nestedMatch = line.match(/^  ([^:]+):\s*(.*)$/);

    if (nestedMatch && currentKey) {
      const [, key, value] = nestedMatch;
      const parent = data[currentKey];

      if (typeof parent === 'object' && parent !== null) {
        (parent as Record<string, unknown>)[key.trim()] = parseScalar(value);
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

    data[normalizedKey] = parseScalar(value);
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

const walkMarkdownFilesSafe = async (directory: string): Promise<string[]> => walkMarkdownFiles(directory).catch(() => []);

const walkWikiFiles = async (basePath: string) => walkMarkdownFilesSafe(path.join(basePath, 'wiki'));

const walkRawFiles = async (basePath: string) => walkMarkdownFilesSafe(path.join(basePath, 'raw'));

export const createFrontmatterTool = (basePath: string) => ({
  readFrontmatter: async (relativePath: string) => {
    const absolutePath = path.resolve(basePath, relativePath);
    const raw = await readFile(absolutePath, 'utf8');
    const parsed = parseFrontmatter(raw);

    return {
      data: parsed.data,
      librarian: typeof parsed.data.librarian === 'object' && parsed.data.librarian !== null ? parsed.data.librarian : undefined,
    };
  },

  getStats: async () => {
    const files = await walkMarkdownFilesSafe(basePath);
    const byStatus: Record<string, number> = {};

    for (const file of files) {
      const { data } = parseFrontmatter(await readFile(file, 'utf8'));
      const librarian = typeof data.librarian === 'object' && data.librarian !== null ? (data.librarian as Record<string, unknown>) : undefined;
      const status = typeof librarian?.status === 'string' ? librarian.status : undefined;

      if (!status) {
        continue;
      }

      byStatus[status] = (byStatus[status] ?? 0) + 1;
    }

    return {
      raw_files: files.filter((file) => file.includes(`${path.sep}raw${path.sep}`)).length,
      total_files: files.length,
      wiki_pages: files.filter((file) => file.includes(`${path.sep}wiki${path.sep}`)).length,
      by_status: byStatus,
    };
  },

  updateFrontmatter: async (relativePath: string, data: Record<string, unknown>) =>
    updateFrontmatter(basePath, relativePath, data),

  listIncompleteNotes: async () => listIncompleteNotes(basePath),

  listStaleNotes: async (days = 90) => listStaleNotes(basePath, days),

  listUnprocessed: async () => listUnprocessed(basePath),
});

export const readFrontmatter = async (basePath: string, relativePath: string) => createFrontmatterTool(basePath).readFrontmatter(relativePath);

export const updateFrontmatter = async (
  basePath: string,
  relativePath: string,
  data: Record<string, unknown>,
) => {
  const absolutePath = path.resolve(basePath, relativePath);
  const raw = await readFile(absolutePath, 'utf8');
  const parsed = parseFrontmatter(raw);
  const merged = { ...parsed.data, ...data };

  const frontmatter = Object.entries(merged)
    .map(([key, value]) => {
      if (value && typeof value === 'object') {
        const nested = Object.entries(value as Record<string, unknown>)
          .map(([nestedKey, nestedValue]) => `  ${nestedKey}: ${String(nestedValue)}`)
          .join('\n');
        return `${key}:\n${nested}`;
      }

      return `${key}: ${String(value)}`;
    })
    .join('\n');

  const body = raw.startsWith('---') ? parsed.body : raw;
  await import('node:fs/promises').then(({ writeFile }) => writeFile(absolutePath, `---\n${frontmatter}\n---\n${body}`, 'utf8'));

  return { after: merged, before: parsed.data, status: 'pending_approval' as const };
};

export const getStats = async (basePath: string) => createFrontmatterTool(basePath).getStats();

export const listIncompleteNotes = async (basePath: string) => {
  const files = await walkWikiFiles(basePath);
  const notes = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file, 'utf8');
      const { data, body } = parseFrontmatter(content);
      const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
      const hasTags = Array.isArray((data as Record<string, unknown>).tags) ? ((data as Record<string, unknown>).tags as unknown[]).length > 0 : Boolean((data as Record<string, unknown>).tags);
      const missingSections: string[] = [];

      if (wordCount < 50) missingSections.push('content');
      if (!body.includes('\n## ')) missingSections.push('sections');
      if (!hasTags) missingSections.push('tags');

      return {
        file: path.relative(basePath, file),
        has_content: wordCount > 0,
        missing_sections: missingSections,
        word_count: wordCount,
      };
    }),
  );

  return { notes: notes.filter((note) => note.missing_sections.length > 0) };
};

export const listStaleNotes = async (basePath: string, days = 90) => {
  const files = await walkWikiFiles(basePath);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const notes = await Promise.all(
    files.map(async (file) => {
      const stats = await import('node:fs/promises').then(({ stat }) => stat(file));
      const daysSinceTouch = Math.floor((Date.now() - stats.mtimeMs) / (24 * 60 * 60 * 1000));

      return {
        days_since_touch: daysSinceTouch,
        file: path.relative(basePath, file),
        last_touched: stats.mtime.toISOString(),
        recommendation: stats.mtimeMs < cutoff ? 'review' : 'keep',
      };
    }),
  );

  return { notes: notes.filter((note) => note.days_since_touch >= days) };
};

export const listUnprocessed = async (basePath: string) => {
  const files = await walkRawFiles(basePath);
  const notes = await Promise.all(
    files.map(async (file) => {
      const { data } = parseFrontmatter(await readFile(file, 'utf8'));
      const librarian = data.librarian as Record<string, unknown> | undefined;

      return {
        created: (await import('node:fs/promises').then(({ stat }) => stat(file))).birthtime.toISOString(),
        file: path.relative(basePath, file),
        size: (await import('node:fs/promises').then(({ stat }) => stat(file))).size,
        processed: Boolean(librarian?.processed),
      };
    }),
  );

  return { notes: notes.filter((note) => !note.processed) };
};
