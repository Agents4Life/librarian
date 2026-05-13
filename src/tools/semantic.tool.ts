import type { ToolContext } from "../index-context.js";

export const createSemanticTool = (ctx: ToolContext) => {
  const { queryApi } = ctx;

  return {
    searchSemantic: async (
      query: string,
      options: { topK?: number; minScore?: number; filterDir?: string } = {},
    ) => {
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
