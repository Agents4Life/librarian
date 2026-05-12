import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const wikilinkPattern = /\[\[([^\]]+)\]\]/g;

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

const normalizeWikilinkTarget = (target: string) => {
  const withoutAlias = target.split('|')[0] ?? '';
  const withoutHeading = withoutAlias.split('#')[0] ?? '';
  const withoutExtension = withoutHeading.replace(/\.md$/i, '');
  const pathSegment = withoutExtension.split('/').at(-1) ?? '';

  return (pathSegment.split('\\').at(-1) ?? '').trim();
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
        target: normalizeWikilinkTarget(match[1] ?? ''),
      });
    }
  });

  return links;
};

export const createWikilinksTool = (basePath: string) => ({
  extractWikilinks: async (relativePath: string) => {
    const absolutePath = path.resolve(basePath, relativePath);
    const content = await readFile(absolutePath, 'utf8');

    return {
      links: extractLinksFromText(content),
    };
  },

  getBacklinks: async (target: string) => {
    const files = await walkWikiFiles(basePath);
    const backlinks: Array<{ source: string; line: number; context: string }> = [];

    for (const file of files) {
      const content = await readFile(file, 'utf8');
      const links = extractLinksFromText(content);

      links.forEach((link) => {
        if (link.target !== target) {
          return;
        }

        backlinks.push({
          context: link.context,
          line: link.line,
          source: path.relative(basePath, file),
        });
      });
    }

    return {
      backlinks,
    };
  },

  getOrphanNotes: async () => {
    const files = await walkWikiFiles(basePath);
    const graph = await Promise.all(
      files.map(async (file) => ({
        file: path.relative(basePath, file),
        links: extractLinksFromText(await readFile(file, 'utf8')),
      })),
    );

    const incoming = new Map<string, number>();

    graph.forEach(({ links }) => {
      links.forEach((link) => {
        incoming.set(link.target, (incoming.get(link.target) ?? 0) + 1);
      });
    });

    return {
      notes: graph
        .map(({ file, links }) => ({
          file,
          has_incoming: (incoming.get(path.basename(file, '.md')) ?? 0) > 0,
          has_outgoing: links.length > 0,
        }))
        .filter((note) => !note.has_incoming && !note.has_outgoing),
    };
  },

  getGraphStats: async () => {
    const files = await walkWikiFiles(basePath);
    const nodes = new Map<string, Set<string>>();

    for (const file of files) {
      const source = path.relative(basePath, file);
      const links = extractLinksFromText(await readFile(file, 'utf8'));

      if (!nodes.has(source)) {
        nodes.set(source, new Set());
      }

      links.forEach((link) => {
        nodes.get(source)?.add(link.target);
      });
    }

    const totalEdges = Array.from(nodes.values()).reduce((sum, links) => sum + links.size, 0);
    const mostConnected = Array.from(nodes.entries())
      .map(([file, links]) => ({ file, connections: links.size }))
      .sort((left, right) => right.connections - left.connections)
      .slice(0, 10);

    return {
      avg_connections: nodes.size === 0 ? 0 : totalEdges / nodes.size,
      clusters: [],
      most_connected: mostConnected,
      orphans: Array.from(nodes.values()).filter((links) => links.size === 0).length,
      total_edges: totalEdges,
      total_nodes: nodes.size,
    };
  },

  findPath: async (source: string, target: string) => {
    const files = await walkWikiFiles(basePath);
    const graph = new Map<string, string[]>();

    for (const file of files) {
      const fileName = path.basename(file, '.md');
      graph.set(fileName, extractLinksFromText(await readFile(file, 'utf8')).map((link) => link.target));
    }

    const queue: Array<{ node: string; path: string[] }> = [{ node: source, path: [source] }];
    const visited = new Set<string>([source]);

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      if (current.node === target) {
        return { found: true, length: current.path.length - 1, path: current.path };
      }

      for (const neighbor of graph.get(current.node) ?? []) {
        if (visited.has(neighbor)) {
          continue;
        }

        visited.add(neighbor);
        queue.push({ node: neighbor, path: [...current.path, neighbor] });
      }
    }

    return { found: false, length: 0, path: [] };
  },
});

export const extractWikilinks = async (basePath: string, relativePath: string) =>
  createWikilinksTool(basePath).extractWikilinks(relativePath);

export const getBacklinks = async (basePath: string, target: string) => createWikilinksTool(basePath).getBacklinks(target);

export const getOrphanNotes = async (basePath: string) => createWikilinksTool(basePath).getOrphanNotes();

export const getGraphStats = async (basePath: string) => createWikilinksTool(basePath).getGraphStats();

export const findPath = async (basePath: string, source: string, target: string) =>
  createWikilinksTool(basePath).findPath(source, target);
