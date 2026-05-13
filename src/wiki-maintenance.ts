import { appendFile, mkdir, open, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ToolContext } from "./index-context.js";
import type { WikiCategory } from "./types.js";

const wikiCategories: WikiCategory[] = ["conceptos", "entidades", "sources", "synthesis"];

const toVaultRelative = (basePath: string, absolutePath: string) => path.relative(basePath, absolutePath);

const toObsidianPath = (relativePath: string) => relativePath.split(path.sep).join("/");

const exists = async (absolutePath: string) => {
  try {
    await stat(absolutePath);
    return true;
  } catch {
    return false;
  }
};

export const ensureWikiStructure = async (basePath: string) => {
  const relativeDirectories = [
    "wiki",
    ...wikiCategories.map((category) => path.join("wiki", category)),
    "reports",
  ];
  const created: string[] = [];

  for (const relativeDirectory of relativeDirectories) {
    const absoluteDirectory = path.join(basePath, relativeDirectory);

    if (!(await exists(absoluteDirectory))) {
      created.push(relativeDirectory);
    }

    await mkdir(absoluteDirectory, { recursive: true });
  }

  return { created };
};

export const updateWikiIndex = async (ctx: ToolContext) => {
  const { vaultPath, queryApi } = ctx;
  await ensureWikiStructure(vaultPath);

  const wikiNotes = queryApi.getBySection("wiki");

  const sections = wikiCategories.map((category) => {
    const categoryNotes = wikiNotes.filter((note) =>
      note.path.startsWith(`wiki/${category}/`),
    );

    const links = categoryNotes
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((note) => {
        const relativeToWiki = note.path.replace(/^wiki\//, "").replace(/\.md$/, "");
        const linkTarget = toObsidianPath(relativeToWiki);
        const alias = note.title;

        return `- [[${linkTarget}|${alias}]]`;
      });

    return [`## ${category}`, "", links.length > 0 ? links.join("\n") : "- No pages yet.", ""].join("\n");
  });

  const content = ["# Wiki Index", "", ...sections].join("\n");
  const indexPath = path.join(vaultPath, "wiki", "index.md");

  await writeFile(indexPath, content, "utf8");

  return { file: toVaultRelative(vaultPath, indexPath) };
};

export interface WikiLogEvent {
  action: string;
  reason?: string;
  source: string;
  target: string;
}

export const appendWikiLog = async (vaultPath: string, event: WikiLogEvent) => {
  await ensureWikiStructure(vaultPath);

  const logPath = path.join(vaultPath, "wiki", "log.md");

  try {
    const handle = await open(logPath, "wx", 0o644);
    await handle.write("# Wiki Log\n\n");
    await handle.close();
  } catch (error) {
    if (!(error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EEXIST")) {
      throw error;
    }
  }

  const reason = event.reason ? ` (reason: ${event.reason})` : "";
  const line = `- ${new Date().toISOString()} ${event.action}: ${toObsidianPath(event.source)} -> ${toObsidianPath(event.target)}${reason}\n`;

  await appendFile(logPath, line, "utf8");

  return { file: toVaultRelative(vaultPath, logPath) };
};
