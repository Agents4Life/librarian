import type { ToolContext } from "../index-context.js";
import { isEmbeddingAvailable, getEmbeddingProvider, getEmbeddingStore } from "../embeddings/index.js";

export const createSemanticTool = (ctx: ToolContext) => {
  const { queryApi } = ctx;

  return {
    searchSemantic: async (
      query: string,
      options: { topK?: number; minScore?: number; filterDir?: string } = {},
    ) => {
      // Prefer embedding-based search when available
      const available = await isEmbeddingAvailable();
      if (available) {
        const provider = getEmbeddingProvider();
        const store = getEmbeddingStore();

        if (store.size() > 0) {
          try {
            const queryVector = await provider.embed(query);
            const results = store.search(queryVector, {
              topK: options.topK ?? 10,
              minScore: options.minScore ?? 0.3,
              filterSections: options.filterDir ? [options.filterDir] : undefined,
            });

            if (results.length > 0) {
              return {
                results: results.map((r) => ({
                  file: r.path,
                  score: r.score,
                  snippet: r.snippet,
                })),
              };
            }
          } catch {
            // Fall through to Jaccard search
          }
        }
      }

      // Fallback: existing Jaccard-based search
      const results = queryApi.search(query, {
        topK: options.topK ?? 10,
        minScore: options.minScore ?? 0.3,
        sections: ["wiki"],
      });

      return {
        results: results.map((r) => ({
          file: r.note.path,
          score: r.score,
          snippet: r.note.headings[0] ?? "",
        })),
      };
    },

    getSimilar: async (relativePath: string, n = 5) => {
      // Prefer embedding-based similarity when available
      const available = await isEmbeddingAvailable();
      if (available) {
        const store = getEmbeddingStore();
        const existing = store.get(relativePath);

        if (existing) {
          try {
            const results = store.search(existing, {
              topK: n + 1,
              minScore: 0,
            });

            const filtered = results
              .filter((r) => r.path !== relativePath)
              .slice(0, n);

            if (filtered.length > 0) {
              return {
                results: filtered.map((r) => ({
                  file: r.path,
                  score: r.score,
                  snippet: r.snippet,
                })),
              };
            }
          } catch {
            // Fall through to Jaccard similarity
          }
        }
      }

      // Fallback: existing Jaccard-based similarity
      const results = queryApi.getSimilar(relativePath, n);

      return {
        results: results.map((r) => ({
          file: r.note.path,
          score: r.score,
          snippet: r.note.headings[0] ?? "",
        })),
      };
    },

    indexFile: async (relativePath: string) => {
      const note = queryApi.getByPath(relativePath);
      if (!note || note.section !== "wiki") {
        return { embedding_dim: 0, status: "skipped" as const };
      }

      return {
        embedding_dim: new Set(note.tags).size,
        status: "indexed" as const,
      };
    },
  };
};
