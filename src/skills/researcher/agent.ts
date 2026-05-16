/**
 * Researcher skill — Search-o1 agentic loop.
 *
 * THINK → SEARCH → READ → REFLECT → (repeat or ANSWER)
 *
 * This is NOT a standalone agent. It's a skill the librarian invokes when
 * it needs web research. The librarian's router does NOT route to this —
 * it's activated explicitly (e.g. `/research` command in the TUI).
 */

import { createLlmClient, type LlmMessage } from '../../llm.js';
import { createFetcher } from './fetcher.js';
import { createSearchProvider } from './provider.js';
import {
  ACTION_PARSE_REGEX,
  type AgentAction,
  type ResearcherConfig,
  type ResearcherResult,
  type SearchStep,
} from './types.js';

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const RESEARCHER_SYSTEM_PROMPT = `You are an expert research agent with access to web search. Your job is to answer questions thoroughly by searching the web and reading relevant pages.

You have access to these actions:
1. **search** — Search the web for information. Provide a focused query.
2. **read** — Fetch and read a specific URL for detailed content.
3. **answer** — Provide your final answer when you have enough information.

RULES:
- Always respond with a SINGLE JSON action block (no other text outside the JSON).
- Start with a "search" action unless the question is trivial.
- After searching, "read" the most promising results before answering.
- For complex questions, you may search multiple times with different queries.
- Your final "answer" must be comprehensive, well-structured, and cite sources.
- If results are insufficient after multiple searches, answer with what you have and note limitations.
- Respond in the SAME LANGUAGE as the user's question.

ACTION FORMAT:
{ "action": "search", "query": "your search query" }
{ "action": "read", "url": "https://example.com/page" }
{ "action": "answer", "answer": "Your detailed answer here", "sources": [{ "title": "Page Title", "url": "https://..." }] }`;

// ---------------------------------------------------------------------------
// Action parsing
// ---------------------------------------------------------------------------

const parseAction = (content: string): AgentAction | null => {
  const match = content.match(ACTION_PARSE_REGEX);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as AgentAction;
    return parsed.action ? parsed : null;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Skill
// ---------------------------------------------------------------------------

export const createResearcher = (config: ResearcherConfig) => {
  const llm = createLlmClient(config.llm);
  const provider = createSearchProvider(config.search);
  const fetcher = createFetcher(config.fetcher);

  const maxIterations = config.maxIterations ?? 6;
  const maxPagesRead = config.maxPagesRead ?? 8;
  const maxSearches = config.maxSearches ?? 4;

  const research = async (question: string): Promise<ResearcherResult> => {
    const start = Date.now();
    const steps: SearchStep[] = [];
    const messages: LlmMessage[] = [
      { role: 'system', content: RESEARCHER_SYSTEM_PROMPT },
      { role: 'user', content: question },
    ];

    const gatheredPages = new Map<string, string>();
    const gatheredResults: Array<{ title: string; url: string; snippet: string }> = [];
    let pagesRead = 0;
    let searchesDone = 0;
    let finalResult: ResearcherResult | null = null;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      steps.push({ kind: 'think', description: `Iteration ${iteration + 1}`, ts: Date.now() });

      let llmContent: string;
      try {
        const response = await llm.chat(messages);
        llmContent = response.content?.trim() ?? '';
      } catch (error) {
        steps.push({ kind: 'think', description: `LLM error: ${error instanceof Error ? error.message : String(error)}`, ts: Date.now() });
        break;
      }

      const action = parseAction(llmContent);

      if (!action) {
        // Treat raw content as answer
        finalResult = {
          answer: llmContent,
          sources: gatheredResults.slice(0, 5),
          steps,
          elapsedMs: Date.now() - start,
          iterations: iteration + 1,
        };
        break;
      }

      switch (action.action) {
        // ── SEARCH ─────────────────────────────────────────────────
        case 'search': {
          if (searchesDone >= maxSearches) {
            messages.push(
              { role: 'assistant', content: llmContent },
              { role: 'user', content: 'Maximum searches reached. Provide your final answer now using the "answer" action.' },
            );
            continue;
          }

          const { query } = action;
          steps.push({ kind: 'search', description: `Searching: "${query}"`, ts: Date.now(), data: { query } });

          try {
            const searchResponse = await provider.search(query);
            searchesDone++;
            for (const r of searchResponse.results) gatheredResults.push(r);

            const context = searchResponse.results
              .slice(0, 10)
              .map((r, i) => `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.snippet}`)
              .join('\n\n');

            steps.push({ kind: 'search', description: `Found ${searchResponse.results.length} results`, ts: Date.now() });

            messages.push(
              { role: 'assistant', content: llmContent },
              { role: 'user', content: `Search results for "${query}":\n\n${context}\n\nWhat would you like to do next?` },
            );
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            steps.push({ kind: 'search', description: `Search failed: ${msg}`, ts: Date.now() });
            messages.push(
              { role: 'assistant', content: llmContent },
              { role: 'user', content: `Search failed: ${msg}. Try a different query or answer with what you have.` },
            );
          }
          break;
        }

        // ── READ ───────────────────────────────────────────────────
        case 'read': {
          const { url } = action;

          if (pagesRead >= maxPagesRead) {
            messages.push(
              { role: 'assistant', content: llmContent },
              { role: 'user', content: 'Maximum pages read. Provide your final answer now using the "answer" action.' },
            );
            continue;
          }

          if (gatheredPages.has(url)) {
            messages.push(
              { role: 'assistant', content: llmContent },
              { role: 'user', content: `Already read. Content:\n${gatheredPages.get(url)!.slice(0, 4000)}\n\nWhat next?` },
            );
            continue;
          }

          steps.push({ kind: 'read', description: `Reading: ${url}`, ts: Date.now(), data: { url } });

          try {
            const page = await fetcher.fetchPage(url);
            pagesRead++;
            gatheredPages.set(url, page.content);

            if (page.content.startsWith('[')) {
              messages.push(
                { role: 'assistant', content: llmContent },
                { role: 'user', content: `Could not read ${url}: ${page.content}. Try another URL or answer.` },
              );
            } else {
              steps.push({ kind: 'read', description: `Read ${(page.totalChars ?? page.content.length)} chars from ${page.title || url}`, ts: Date.now() });
              messages.push(
                { role: 'assistant', content: llmContent },
                { role: 'user', content: `Content from "${page.title || url}":\n\n${page.content}\n\nWhat next?` },
              );
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            messages.push(
              { role: 'assistant', content: llmContent },
              { role: 'user', content: `Failed to read ${url}: ${msg}. Try another URL or answer.` },
            );
          }
          break;
        }

        // ── ANSWER ─────────────────────────────────────────────────
        case 'answer': {
          steps.push({ kind: 'answer', description: 'Final answer', ts: Date.now(), data: { sourcesCount: action.sources?.length ?? 0 } });

          const seenUrls = new Set<string>();
          const sources: Array<{ title: string; url: string; snippet?: string }> = (action.sources ?? [])
            .filter((s) => { if (seenUrls.has(s.url)) return false; seenUrls.add(s.url); return true; });

          for (const r of gatheredResults) {
            if (!seenUrls.has(r.url) && sources.length < 10) {
              seenUrls.add(r.url);
              sources.push({ title: r.title, url: r.url, snippet: r.snippet });
            }
          }

          finalResult = {
            answer: action.answer,
            sources,
            steps,
            elapsedMs: Date.now() - start,
            iterations: iteration + 1,
          };
          break;
        }
      }

      if (finalResult) break;
    }

    // Exhausted iterations — force answer
    if (!finalResult) {
      steps.push({ kind: 'reflect', description: `Max iterations (${maxIterations}) reached`, ts: Date.now() });

      const summary = Array.from(gatheredPages.entries())
        .slice(0, 5)
        .map(([url, content]) => `--- ${url} ---\n${content.slice(0, 2000)}`)
        .join('\n\n');

      try {
        const forceResponse = await llm.chat([
          { role: 'system', content: 'Answer based on context. Same language as question. Cite sources.' },
          { role: 'user', content: `Question: ${question}\n\nContext:\n${summary}\n\nProvide a comprehensive answer.` },
        ]);
        finalResult = { answer: forceResponse.content, sources: gatheredResults.slice(0, 5), steps, elapsedMs: Date.now() - start, iterations: maxIterations };
      } catch {
        finalResult = { answer: 'Unable to complete research within iteration limit.', sources: gatheredResults.slice(0, 5), steps, elapsedMs: Date.now() - start, iterations: maxIterations };
      }
    }

    return finalResult;
  };

  return { research };
};
