import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { Note, SectionMap, VaultSection } from "./types.js";
import { DEFAULT_SECTION_MAP } from "./types.js";

const wikilinkPattern = /\[\[([^\]]+)\]\]/g;
const headingPattern = /^(#{1,6})\s+(.+)$/gm;
const tagPattern = /(?:^|\s)#([a-zA-Z][\w/-]*)/g;

const normalizeWikilinkTarget = (target: string) => {
  const withoutAlias = target.split("|")[0] ?? "";
  const withoutHeading = withoutAlias.split("#")[0] ?? "";
  const withoutExtension = withoutHeading.replace(/\.md$/i, "");
  const normalized = withoutExtension.replace(/\\/g, "/");
  return normalized.replace(/^\/+|\/+$/g, "").trim();
};

export const parseFrontmatter = (content: string) => {
  const lines = content.split(/\r?\n/);

  if (lines[0] !== "---") {
    return { data: {} as Record<string, unknown>, body: content };
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line === "---");

  if (endIndex === -1) {
    return { data: {} as Record<string, unknown>, body: content };
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const body = lines.slice(endIndex + 1).join("\n");
  const data: Record<string, unknown> = {};
  let currentKey: string | null = null;

  const parseScalar = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
    if (/^-?\d+\.\d+$/.test(trimmed)) return Number(trimmed);
    return trimmed;
  };

  for (const line of frontmatterLines) {
    if (!line.trim()) continue;

    const nestedMatch = line.match(/^  ([^:]+):\s*(.*)$/);
    if (nestedMatch && currentKey) {
      const [, key, value] = nestedMatch;
      const parent = data[currentKey];
      if (typeof parent === "object" && parent !== null) {
        (parent as Record<string, unknown>)[key.trim()] = parseScalar(value);
      }
      continue;
    }

    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;

    const [, key, value] = match;
    const normalizedKey = key.trim();

    if (!value.trim()) {
      data[normalizedKey] = {};
      currentKey = normalizedKey;
      continue;
    }

    if (value.trim().startsWith("[")) {
      const items = value.trim()
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
      data[normalizedKey] = items;
      currentKey = null;
      continue;
    }

    data[normalizedKey] = parseScalar(value);
    currentKey = normalizedKey;
  }

  return { data, body };
};

export const detectSection = (
  relativePath: string,
  sectionMap: SectionMap = DEFAULT_SECTION_MAP,
): VaultSection => {
  const normalized = relativePath.replace(/\\/g, "/");
  for (const [prefix, section] of Object.entries(sectionMap)) {
    if (normalized.startsWith(prefix)) return section;
  }
  return "unknown";
};

export const computeContentHash = (content: string): string => {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  return createHash("sha256").update(normalized).digest("hex");
};

export const extractHeadings = (body: string): string[] => {
  const headings: string[] = [];
  let match: RegExpExecArray | null;
  headingPattern.lastIndex = 0;

  while ((match = headingPattern.exec(body)) !== null) {
    headings.push(match[2].trim());
  }

  return headings;
};

export const extractLinks = (content: string): string[] => {
  const links: string[] = [];
  let match: RegExpExecArray | null;
  wikilinkPattern.lastIndex = 0;

  while ((match = wikilinkPattern.exec(content)) !== null) {
    links.push(normalizeWikilinkTarget(match[1] ?? ""));
  }

  return [...new Set(links)];
};

export const extractTags = (frontmatter: Record<string, unknown>, body: string): string[] => {
  const tags = new Set<string>();

  if (Array.isArray(frontmatter.tags)) {
    for (const tag of frontmatter.tags) {
      if (typeof tag === "string") tags.add(tag);
    }
  }

  if (typeof frontmatter.tags === "string") {
    frontmatter.tags.split(",").forEach((t: string) => {
      const trimmed = t.trim();
      if (trimmed) tags.add(trimmed);
    });
  }

  let match: RegExpExecArray | null;
  tagPattern.lastIndex = 0;
  while ((match = tagPattern.exec(body)) !== null) {
    tags.add(match[1]);
  }

  return [...tags];
};

export const parseNote = async (
  absolutePath: string,
  vaultPath: string,
  sectionMap?: SectionMap,
): Promise<Note> => {
  const content = await readFile(absolutePath, "utf8");
  const fileStat = await stat(absolutePath);
  const relativePath = path.relative(vaultPath, absolutePath).replace(/\\/g, "/");
  const title = path.basename(absolutePath, ".md");

  const { data, body } = parseFrontmatter(content);
  const links = extractLinks(content);
  const headings = extractHeadings(body);
  const tags = extractTags(data, body);
  const section = detectSection(relativePath, sectionMap);
  const contentHash = computeContentHash(content);
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  return {
    path: relativePath,
    title,
    section,
    tags,
    links,
    backlinks: [],
    headings,
    frontmatter: data,
    contentHash,
    wordCount,
    createdAt: fileStat.birthtime.toISOString(),
    updatedAt: fileStat.mtime.toISOString(),
    fileSize: fileStat.size,
  };
};
