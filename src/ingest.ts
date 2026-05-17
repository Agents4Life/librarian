import type { ToolContext } from "./index-context.js";
import { loadProcessedPaths } from "./review/processed-ledger.js";
import { FileProposalStore } from "./proposals/proposal-store.js";

const dailyPattern = /(^|\/)(daily|dailies|operational|ops)[-_ ]?/i;

export const inspectRawInbox = async (vaultPath: string, queryApi?: ToolContext["queryApi"]) => {
  const rawNotes = queryApi
    ? queryApi.getBySection("raw")
    : [];

  const processedPaths = await loadProcessedPaths(vaultPath);

  const store = new FileProposalStore(vaultPath);
  const allProposals = await store.list();
  const proposedSources = new Set(allProposals.map((p) => p.sourcePath));

  const notes = rawNotes
    .filter((note) => {
      const librarian = note.frontmatter.librarian as Record<string, unknown> | undefined;
      if (Boolean(librarian?.processed)) return false;
      if (processedPaths.has(note.path)) return false;
      if (proposedSources.has(note.path)) return false;
      return true;
    })
    .map((note) => {
      const hasContent = note.wordCount > 0;
      const fileName = note.path.split("/").pop() ?? "";
      const recommendation = !hasContent || dailyPattern.test(fileName) || dailyPattern.test(note.path)
        ? "report"
        : "curate";

      return {
        created: note.createdAt,
        file: note.path,
        has_content: hasContent,
        processed: false,
        recommendation,
        size: note.fileSize,
      };
    });

  return { notes };
};
