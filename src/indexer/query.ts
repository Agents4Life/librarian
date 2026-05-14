import type { Note, NoteIndex, VaultSection } from "./types.js";
import { getEmbeddingProvider, getEmbeddingStore, isEmbeddingAvailable } from "../embeddings/index.js";

const tokenize = (content: string) =>
  content
    .toLowerCase()
    .split(/[^a-z0-9áéíóúüñ]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

const jaccardScore = (left: string[], right: string[]) => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
};

export const createQueryApi = (index: NoteIndex) => {
  const allNotes = () => Object.values(index.notes);

  const getByPath = (relativePath: string): Note | undefined => {
    const normalized = relativePath.replace(/\\/g, "/");
    return index.notes[normalized];
  };

  const getByTitle = (title: string): Note[] =>
    allNotes().filter((note) => note.title.toLowerCase() === title.toLowerCase());

  const getByTag = (tag: string): Note[] =>
    allNotes().filter((note) => note.tags.includes(tag));

  const getBySection = (section: VaultSection): Note[] =>
    allNotes().filter((note) => note.section === section);

  const getBacklinks = (relativePath: string): Note[] => {
    const note = getByPath(relativePath);
    if (!note) return [];
    return note.backlinks
      .map((bl) => index.notes[bl])
      .filter((n): n is Note => n !== undefined);
  };

  const getForwardLinks = (relativePath: string): Note[] => {
    const note = getByPath(relativePath);
    if (!note) return [];
    return note.links
      .map((link) => getByTitle(link))
      .flat()
      .filter((n): n is Note => n !== undefined);
  };

  const getOrphans = (): Note[] => {
    const excludedSections: VaultSection[] = ["unknown", "reviews", "memory"];
    return allNotes().filter((note) => {
      if (note.path.includes(".tmp_")) return false;
      if (note.path.includes(".librarian")) return false;
      if (excludedSections.includes(note.section)) return false;
      return note.links.length === 0 && note.backlinks.length === 0;
    });
  };

  const getGraphStats = () => {
    const notes = allNotes();
    const totalEdges = notes.reduce((sum, note) => sum + note.links.length, 0);
    const mostConnected = [...notes]
      .sort((a, b) => b.links.length + b.backlinks.length - (a.links.length + a.backlinks.length))
      .slice(0, 10)
      .map((note) => ({
        file: note.path,
        connections: note.links.length + note.backlinks.length,
      }));

    return {
      total_nodes: notes.length,
      total_edges: totalEdges,
      avg_connections: notes.length === 0 ? 0 : totalEdges / notes.length,
      orphans: getOrphans().length,
      most_connected: mostConnected,
    };
  };

  const getStale = (days = 90): Note[] => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return allNotes().filter((note) => new Date(note.updatedAt).getTime() < cutoff);
  };

  const getIncomplete = (): Note[] =>
    allNotes().filter((note) => {
      const missingSections: string[] = [];
      if (note.wordCount < 50) missingSections.push("content");
      if (note.headings.length === 0) missingSections.push("sections");
      if (note.tags.length === 0) missingSections.push("tags");
      return missingSections.length > 0;
    });

  const search = (
    query: string,
    options: {
      topK?: number;
      minScore?: number;
      sections?: VaultSection[];
    } = {},
  ) => {
    const queryTokens = tokenize(query);
    let candidates = allNotes();

    if (options.sections && options.sections.length > 0) {
      candidates = candidates.filter((note) =>
        options.sections!.includes(note.section),
      );
    }

    const results = candidates
      .map((note) => {
        const searchableText = [note.title, ...note.tags, ...note.headings].join(" ");
        const score = jaccardScore(queryTokens, tokenize(searchableText));
        return { note, score };
      })
      .filter((result) => result.score >= (options.minScore ?? 0.1))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.topK ?? 10);

    return results;
  };

  const findPath = (source: string, target: string) => {
    const sourceNotes = getByTitle(source);
    const targetNotes = getByTitle(target);

    if (sourceNotes.length === 0 || targetNotes.length === 0) {
      return { found: false as const, length: 0, path: [] };
    }

    const graph = new Map<string, string[]>();
    for (const note of allNotes()) {
      const neighbors = note.links
        .map((link) => getByTitle(link))
        .flat()
        .filter((n): n is Note => n !== undefined)
        .map((n) => n.title);
      graph.set(note.title, [...new Set(neighbors)]);
    }

    const queue: Array<{ node: string; path: string[] }> = [];
    for (const sn of sourceNotes) {
      queue.push({ node: sn.title, path: [sn.title] });
    }
    const visited = new Set(sourceNotes.map((n) => n.title));
    const targetTitles = new Set(targetNotes.map((n) => n.title));

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;

      if (targetTitles.has(current.node)) {
        return { found: true as const, length: current.path.length - 1, path: current.path };
      }

      for (const neighbor of graph.get(current.node) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, path: [...current.path, neighbor] });
        }
      }
    }

    return { found: false as const, length: 0, path: [] };
  };

  const getSimilar = (relativePath: string, n = 5) => {
    const note = getByPath(relativePath);
    if (!note) return [];

    const profile = tokenize(
      [note.title, ...note.tags, ...note.headings].join(" "),
    );

    return allNotes()
      .filter((candidate) => candidate.path !== relativePath)
      .map((candidate) => {
        const candidateProfile = tokenize(
          [candidate.title, ...candidate.tags, ...candidate.headings].join(" "),
        );
        return { note: candidate, score: jaccardScore(profile, candidateProfile) };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  };

  const getStats = () => {
    const notes = allNotes();
    const bySection: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const note of notes) {
      bySection[note.section] = (bySection[note.section] ?? 0) + 1;

      const librarian = note.frontmatter.librarian as Record<string, unknown> | undefined;
      const status = typeof librarian?.status === "string" ? librarian.status : undefined;
      if (status) byStatus[status] = (byStatus[status] ?? 0) + 1;
    }

    return {
      total_files: notes.length,
      by_section: bySection,
      by_status: byStatus,
    };
  };

  const searchEmbeddings = async (
    query: string,
    options: {
      topK?: number;
      minScore?: number;
      sections?: VaultSection[];
    } = {},
  ) => {
    const available = await isEmbeddingAvailable();
    if (!available) {
      return search(query, options);
    }

    const provider = getEmbeddingProvider();
    const store = getEmbeddingStore();

    if (store.size() === 0) {
      return search(query, options);
    }

    try {
      const queryVector = await provider.embed(query);
      const results = store.search(queryVector, {
        topK: options.topK ?? 10,
        minScore: options.minScore ?? 0.1,
        filterSections: options.sections?.map(String),
      });

      if (results.length > 0) {
        return results.map((r) => ({
          note: getByPath(r.path)!,
          score: r.score,
        })).filter((r) => r.note !== undefined);
      }

      return search(query, options);
    } catch {
      return search(query, options);
    }
  };

  const getSimilarEmbeddings = async (relativePath: string, n = 5) => {
    const available = await isEmbeddingAvailable();
    if (!available) {
      return getSimilar(relativePath, n);
    }

    const store = getEmbeddingStore();

    const existing = store.get(relativePath);
    if (!existing) {
      return getSimilar(relativePath, n);
    }

    try {
      const results = store.search(existing, {
        topK: n + 1,
        minScore: 0,
      });

      return results
        .filter((r) => r.path !== relativePath)
        .map((r) => ({
          note: getByPath(r.path)!,
          score: r.score,
        }))
        .filter((r) => r.note !== undefined)
        .slice(0, n);
    } catch {
      return getSimilar(relativePath, n);
    }
  };

  return {
    allNotes,
    getByPath,
    getByTitle,
    getByTag,
    getBySection,
    getBacklinks,
    getForwardLinks,
    getOrphans,
    getGraphStats,
    getStale,
    getIncomplete,
    search,
    findPath,
    getSimilar,
    getStats,
    searchEmbeddings,
    getSimilarEmbeddings,
  };
};
