import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import type { CurationProposal, DuplicateReason, WikiCategory } from './types.js';
import { createLlmClient, type LlmMessage } from './llm.js';
import { createSemanticTool } from './tools/semantic.tool.js';
import { inspectRawInbox } from './ingest.js';
import type { ToolContext } from './index-context.js';

type LlmClient = ReturnType<typeof createLlmClient>;

// --- Helpers ---

/** Normalize a filename for comparison: lowercase, no accents, no special chars */
const normalizeFileName = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Walk a directory recursively and return .md files */
const walkMdFiles = async (dir: string): Promise<string[]> => {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const results = await Promise.all(
      entries.map(async (entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walkMdFiles(full);
        if (entry.isFile() && entry.name.endsWith('.md')) return [full];
        return [] as string[];
      }),
    );
    return results.flat();
  } catch {
    return [];
  }
};

// --- Duplicate Detection ---

interface DuplicateCheck {
  reason: DuplicateReason;
  existingPath?: string;
}

/**
 * Check if a wiki page with similar name already exists.
 * Returns 'exact_match' if a normalized filename collision is found.
 */
const checkFilenameDuplicate = async (
  basePath: string,
  fileName: string,
  category: WikiCategory,
): Promise<DuplicateCheck> => {
  const categoryDir = path.resolve(basePath, 'wiki', category);

  try {
    await stat(categoryDir);
  } catch {
    return { reason: 'none' };
  }

  const files = await walkMdFiles(categoryDir);
  const normalized = normalizeFileName(fileName);

  for (const file of files) {
    const existingName = path.basename(file, '.md');
    if (normalizeFileName(existingName) === normalized) {
      return { reason: 'exact_match', existingPath: `wiki/${category}/${existingName}.md` };
    }
  }

  return { reason: 'none' };
};

/**
 * Use semantic search to find similar pages in wiki, then ask GLM to decide
 * if it's a true duplicate.
 */
const checkSemanticDuplicate = async (
  basePath: string,
  noteContent: string,
  fileName: string,
  queryApi?: ToolContext["queryApi"],
  llmClient?: LlmClient,
): Promise<DuplicateCheck> => {
  const semantic = createSemanticTool({ vaultPath: basePath, queryApi: queryApi! });

  try {
    const results = await semantic.searchSemantic(noteContent.slice(0, 500), { minScore: 0.5, topK: 3 });

    if (results.results.length === 0) {
      return { reason: 'none' };
    }

    // Only check the top match
    const topMatch = results.results[0];

    // If score is very high (>0.85), it's likely a duplicate
    if (topMatch.score >= 0.85) {
      return { reason: 'semantic_duplicate', existingPath: topMatch.file };
    }

    // Medium score: ask GLM
    const client = llmClient ?? createLlmClient();
    const response = await client.chat([
      {
        role: 'system',
        content: 'You are a wiki librarian. Decide if two notes are duplicates. Respond ONLY with JSON: {"is_duplicate": true/false, "confidence": 0.0-1.0}',
      },
      {
        role: 'user',
        content: `Note A (new, filename: ${fileName}):\n${noteContent.slice(0, 1000)}\n\nNote B (existing, filename: ${path.basename(topMatch.file)}):\n${topMatch.snippet ?? ''}`,
      },
    ]);

    const jsonMatch = response.content?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.is_duplicate && parsed.confidence >= 0.8) {
        return { reason: 'semantic_duplicate', existingPath: topMatch.file };
      }
    }
  } catch {
    // If semantic search fails, skip duplicate check
  }

  return { reason: 'none' };
};

// --- Classification ---

const curationPrompt = (noteContent: string, existingPages: string[]) => {
  const pageList = existingPages.length > 0
    ? existingPages.join('\n')
    : '(no existing pages)';

  return `You are a wiki librarian. Analyze this note and classify it.

## Existing wiki pages:
${pageList}

## Note content:
${noteContent.slice(0, 3000)}

Respond with ONLY a JSON object:
{
  "category": "conceptos" | "entidades" | "sources" | "synthesis",
  "tags": ["tag1", "tag2"],
  "summary": "Brief summary in the same language as the note",
  "suggestedLinks": ["existing page name to link to"]
}

Rules:
- "conceptos": abstract concepts, patterns, methodologies, theories
- "entidades": specific tools, frameworks, people, projects, organizations
- "sources": references to books, videos, articles, papers
- "synthesis": pages that connect multiple concepts
- Tags should be lowercase, in the note's language
- Summary should be 1-2 sentences
- suggestedLinks should reference existing wiki page names only`;
};

// --- Main ---

export const proposeWikiPage = async (
  basePath: string,
  rawRelativePath: string,
  existingPages: string[] = [],
  skipDuplicates = true,
  queryApi?: ToolContext["queryApi"],
  signal?: AbortSignal,
  llmClient?: LlmClient,
): Promise<CurationProposal> => {
  const sourceAbsolutePath = path.resolve(basePath, rawRelativePath);
  const sourceContent = await readFile(sourceAbsolutePath, 'utf8');
  const fileName = path.basename(rawRelativePath, '.md');
  const client = llmClient ?? createLlmClient();

  // 1. Classify with GLM
  const messages: LlmMessage[] = [
    { role: 'system', content: 'You are a wiki librarian. Respond only with valid JSON.' },
    { role: 'user', content: curationPrompt(sourceContent, existingPages) },
  ];

  let category: WikiCategory = 'conceptos';
  let tags: string[] = [];
  let summary = '';
  let suggestedLinks: string[] = [];

  try {
    const response = await client.chat(messages, signal);
    const content = response.content?.trim();

    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const validCategories: WikiCategory[] = ['conceptos', 'entidades', 'sources', 'synthesis'];

        if (parsed.category && validCategories.includes(parsed.category)) {
          category = parsed.category;
        }
        if (Array.isArray(parsed.tags)) {
          tags = parsed.tags.slice(0, 10);
        }
        if (typeof parsed.summary === 'string') {
          summary = parsed.summary;
        }
        if (Array.isArray(parsed.suggestedLinks)) {
          suggestedLinks = parsed.suggestedLinks;
        }
      }
    }
  } catch {
    // Fallback: use defaults if GLM fails
  }

  // 2. Check duplicates (only if skipDuplicates is enabled)
  let duplicate: DuplicateReason = 'none';
  let duplicateOf: string | undefined;

  if (skipDuplicates) {
    // 2a. Filename match (fast)
    const nameCheck = await checkFilenameDuplicate(basePath, fileName, category);
    if (nameCheck.reason !== 'none') {
      duplicate = nameCheck.reason;
      duplicateOf = nameCheck.existingPath;
    }

    // 2b. Semantic match (only if no filename match)
    if (duplicate === 'none') {
      const semanticCheck = await checkSemanticDuplicate(basePath, sourceContent, fileName, queryApi, llmClient);
      if (semanticCheck.reason !== 'none') {
        duplicate = semanticCheck.reason;
        duplicateOf = semanticCheck.existingPath;
      }
    }
  }

  const wikiRelativePath = `wiki/${category}/${fileName}.md`;
  const tagsYaml = tags.length > 0 ? `\ntags: [${tags.map(t => `"${t}"`).join(', ')}]` : '';
  const summaryYaml = summary ? `\nsummary: "${summary.replace(/"/g, '\\"')}"` : '';

  const preview = [
    '---',
    `librarian:`,
    `  processed: false`,
    `  status: review`,
    `source: ${rawRelativePath}`,
    `category: ${category}`,
    `${tagsYaml.slice(1)}`,
    `${summaryYaml.slice(1)}`,
    '---',
    '',
    sourceContent.trim(),
  ].join('\n');

  return {
    diff_id: `${fileName}-${Date.now()}`,
    source: rawRelativePath,
    target: wikiRelativePath,
    type: duplicate !== 'none' ? 'skip' : 'create',
    status: 'pending_approval',
    preview,
    category,
    tags,
    summary,
    suggestedLinks,
    duplicate,
    duplicateOf,
  };
};

export const proposeWikiCurations = async (basePath: string, limit = 10, queryApi?: ToolContext["queryApi"], signal?: AbortSignal, llmClient?: LlmClient) => {
  const inbox = await inspectRawInbox(basePath, queryApi);
  const toProcess = inbox.notes.filter(n => n.recommendation === 'curate').slice(0, limit);

  const semantic = createSemanticTool({ vaultPath: basePath, queryApi: queryApi! });
  let existingPages: string[] = [];

  try {
    const wikiResult = await semantic.searchSemantic('', { minScore: 0 });
    existingPages = wikiResult.results.map(r => path.basename(r.file, '.md'));
  } catch {
    // If semantic search fails, proceed without existing pages context
  }

  const proposals: CurationProposal[] = [];

  for (let i = 0; i < toProcess.length; i++) {
    if (signal?.aborted) break;
    const note = toProcess[i];
    proposals.push(await proposeWikiPage(basePath, note.file, existingPages, true, queryApi, signal, llmClient));
    process.stdout.write(`\r  Procesando ${i + 1}/${toProcess.length}: ${path.basename(note.file)}...`);
  }
  if (toProcess.length > 0) process.stdout.write('\n');

  return {
    inbox,
    proposals,
  };
};
