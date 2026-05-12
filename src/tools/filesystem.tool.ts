import { readdir, readFile as readTextFile, stat } from 'node:fs/promises';
import path from 'node:path';

const toAbsolutePath = (basePath: string, relativePath: string) => {
  const resolved = path.resolve(basePath, relativePath);
  const normalizedBase = path.resolve(basePath) + path.sep;

  if (resolved !== path.resolve(basePath) && !resolved.startsWith(normalizedBase)) {
    throw new Error(`Path escapes vault: ${relativePath}`);
  }

  return resolved;
};

export const createFilesystemTool = (basePath: string) => ({
  readFile: async (relativePath: string) => {
    const absolutePath = toAbsolutePath(basePath, relativePath);
    const [content, fileStat] = await Promise.all([
      readTextFile(absolutePath, 'utf8'),
      stat(absolutePath),
    ]);

    return {
      content,
      modifiedAt: fileStat.mtime,
      path: relativePath,
      size: fileStat.size,
    };
  },

  listDirectory: async (relativePath = '.') => {
    const absolutePath = toAbsolutePath(basePath, relativePath);
    const entries = await readdir(absolutePath, { withFileTypes: true });

    return {
      files: entries
        .map((entry) => ({
          isDirectory: entry.isDirectory(),
          name: entry.name,
          path: path.posix.join(relativePath === '.' ? '' : relativePath, entry.name),
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      path: relativePath,
    };
  },
});

export const createFile = async (basePath: string, relativePath: string, content: string) => {
  const absolutePath = toAbsolutePath(basePath, relativePath);
  await readTextFile(absolutePath, 'utf8').catch(() => undefined);
  await import('node:fs/promises').then(({ writeFile }) => writeFile(absolutePath, content, 'utf8'));

  return { path: relativePath, status: 'created' as const };
};

export const moveFile = async (basePath: string, source: string, target: string) => {
  const absoluteSource = toAbsolutePath(basePath, source);
  const absoluteTarget = toAbsolutePath(basePath, target);
  const { rename } = await import('node:fs/promises');
  await rename(absoluteSource, absoluteTarget);

  return { source, status: 'moved' as const, target };
};
