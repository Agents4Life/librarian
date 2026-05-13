import type { ToolContext } from "./index-context.js";

const dailyPattern = /(^|\/)(daily|dailies|operational|ops)[-_ ]?/i;

export const inspectRawInbox = async (vaultPath: string, queryApi?: ToolContext["queryApi"]) => {
  const rawNotes = queryApi
    ? queryApi.getBySection("raw")
    : [];

  const notes = rawNotes
    .filter((note) => {
      const librarian = note.frontmatter.librarian as Record<string, unknown> | undefined;
      return !Boolean(librarian?.processed);
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
