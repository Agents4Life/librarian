import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const walkFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return walkFiles(resolved);
      }

      return [resolved];
    }),
  );

  return nested.flat();
};

const searchWithTraversal = async (basePath: string, query: string, filePattern?: string) => {
  const files = await walkFiles(basePath);
  const matcher = filePattern ? new RegExp(`^${filePattern.replaceAll('.', '\\.') .replaceAll('*', '.*')}$`) : null;
  const results: Array<{ file: string; line: number; content: string; match: string }> = [];

  for (const file of files) {
    const relative = path.relative(basePath, file);

    if (matcher && !matcher.test(path.basename(relative))) {
      continue;
    }

    const content = await readFile(file, 'utf8');
    content.split(/\r?\n/).forEach((line, index) => {
      if (!line.includes(query)) {
        return;
      }

      results.push({
        content: line,
        file: relative,
        line: index + 1,
        match: query,
      });
    });
  }

  return results;
};

const searchWithRipgrep = async (basePath: string, query: string, filePattern?: string) => {
  const args = ['--line-number', '--column', '--color', 'never', '--no-heading'];

  if (filePattern) {
    args.push('-g', filePattern);
  }

  args.push(query, basePath);

  try {
    const { stdout } = await execFileAsync('rg', args, { maxBuffer: 1024 * 1024 });
    return stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(.*?):(\d+):(\d+):(.*)$/);

        if (!match) {
          return null;
        }

        const [, file, lineNumber, , content] = match;

        return {
          content,
          file: path.relative(basePath, file),
          line: Number(lineNumber),
          match: query,
        };
      })
      .filter((value): value is { file: string; line: number; content: string; match: string } => value !== null);
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return searchWithTraversal(basePath, query, filePattern);
    }

    return searchWithTraversal(basePath, query, filePattern);
  }
};

export const createSearchTool = (basePath: string) => ({
  searchText: async (
    query: string,
    options: { dir?: string; filePattern?: string; maxResults?: number } = {},
  ) => {
    const targetPath = options.dir ? path.resolve(basePath, options.dir) : basePath;
    const results = await searchWithRipgrep(targetPath, query, options.filePattern);

    return {
      results: results.slice(0, options.maxResults ?? results.length),
    };
  },
});

export const searchText = async (
  basePath: string,
  query: string,
  options: { dir?: string; filePattern?: string; maxResults?: number } = {},
) => createSearchTool(basePath).searchText(query, options);

export const searchByTag = async (basePath: string, tag: string) => {
  const result = await searchText(basePath, `tags: ${tag}`, { filePattern: '*.md' });
  return { results: result.results };
};

export const searchByFrontmatter = async (basePath: string, key: string, value: string) => {
  const result = await searchText(basePath, `${key}: ${value}`, { filePattern: '*.md' });
  return { results: result.results };
};
