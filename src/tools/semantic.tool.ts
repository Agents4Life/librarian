import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const tokenize = (content: string) =>
  content
    .toLowerCase()
    .split(/[^a-z0-9áéíóúüñ]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

const jaccardScore = (left: string[], right: string[]) => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;

  return union === 0 ? 0 : intersection / union;
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

const isWikiFile = (file: string) => file.includes(`${path.sep}wiki${path.sep}`);

export const createSemanticTool = (basePath: string) => ({
  searchSemantic: async (
    query: string,
    options: { topK?: number; minScore?: number; filterDir?: string } = {},
  ) => {
    const files = await walkMarkdownFiles(basePath);
    const queryTokens = tokenize(query);
    const results: Array<{ file: string; score: number; snippet: string }> = [];

    for (const file of files) {
      if (!isWikiFile(file)) {
        continue;
      }

      if (options.filterDir && !file.includes(options.filterDir)) {
        continue;
      }

      const content = await readFile(file, 'utf8');
      const score = jaccardScore(queryTokens, tokenize(content));

      if (score < (options.minScore ?? 0.3)) {
        continue;
      }

      results.push({
        file: path.relative(basePath, file),
        score,
        snippet: content.split(/\r?\n/).find((line) => line.length > 0)?.trim() ?? '',
      });
    }

    return {
      results: results.sort((left, right) => right.score - left.score).slice(0, options.topK ?? 10),
    };
  },

  getSimilar: async (relativePath: string, n = 5) => {
    const targetPath = path.resolve(basePath, relativePath);
    const targetContent = await readFile(targetPath, 'utf8');
    const targetTokens = tokenize(targetContent);
    const files = await walkMarkdownFiles(basePath);
    const results: Array<{ file: string; score: number; snippet: string }> = [];

    for (const file of files) {
      if (path.resolve(file) === targetPath || !isWikiFile(file)) {
        continue;
      }

      const content = await readFile(file, 'utf8');
      const score = jaccardScore(targetTokens, tokenize(content));

      if (score === 0) {
        continue;
      }

      results.push({
        file: path.relative(basePath, file),
        score,
        snippet: content.split(/\r?\n/).find((line) => line.length > 0)?.trim() ?? '',
      });
    }

    return {
      results: results.sort((left, right) => right.score - left.score).slice(0, n),
    };
  },

  indexFile: async (relativePath: string) => {
    const absolutePath = path.resolve(basePath, relativePath);

    if (!isWikiFile(absolutePath)) {
      return { embedding_dim: 0, status: 'skipped' as const };
    }

    const content = await readFile(absolutePath, 'utf8');
    const embeddingDim = new Set(tokenize(content)).size;

    return {
      embedding_dim: embeddingDim,
      status: 'indexed' as const,
    };
  },
});

export const searchSemantic = async (
  basePath: string,
  query: string,
  options: { topK?: number; minScore?: number; filterDir?: string } = {},
) => createSemanticTool(basePath).searchSemantic(query, options);

export const getSimilar = async (basePath: string, relativePath: string, n = 5) =>
  createSemanticTool(basePath).getSimilar(relativePath, n);

export const indexFile = async (basePath: string, relativePath: string) => createSemanticTool(basePath).indexFile(relativePath);
