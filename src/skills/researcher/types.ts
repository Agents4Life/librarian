/**
 * Researcher skill types — agentic web search with iterative reasoning.
 *
 * Search-o1 pattern: THINK → SEARCH → READ → REFLECT → (repeat or ANSWER)
 * The skill is invoked explicitly (e.g. `/research` command) or when the
 * librarian agent determines a question requires external information.
 */

// ---------------------------------------------------------------------------
// Search provider
// ---------------------------------------------------------------------------

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  results: WebSearchResult[];
  totalResults?: number;
}

export type SearchProviderName = 'brave' | 'searxng' | 'tavily';

export interface SearchProviderConfig {
  provider: SearchProviderName;
  apiKey?: string;
  baseUrl?: string;
  maxResults?: number;
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Page fetcher
// ---------------------------------------------------------------------------

export interface FetchedPage {
  url: string;
  title: string;
  content: string;
  totalChars?: number;
}

export interface FetcherConfig {
  maxChars?: number;
  timeoutMs?: number;
  userAgent?: string;
}

// ---------------------------------------------------------------------------
// Agent loop
// ---------------------------------------------------------------------------

export type SearchStepKind = 'think' | 'search' | 'read' | 'reflect' | 'answer';

export interface SearchStep {
  kind: SearchStepKind;
  description: string;
  ts: number;
  data?: unknown;
}

export interface ResearcherConfig {
  llm: import('../../llm.js').LlmConfig;
  search: SearchProviderConfig;
  fetcher?: FetcherConfig;
  maxIterations?: number;
  maxPagesRead?: number;
  maxSearches?: number;
}

export interface ResearcherResult {
  answer: string;
  sources: Array<{ title: string; url: string; snippet?: string }>;
  steps: SearchStep[];
  elapsedMs: number;
  iterations: number;
}

// ---------------------------------------------------------------------------
// LLM action protocol
// ---------------------------------------------------------------------------

export type AgentAction =
  | { action: 'search'; query: string }
  | { action: 'read'; url: string }
  | { action: 'answer'; answer: string; sources: Array<{ title: string; url: string }> };

export const ACTION_PARSE_REGEX = /\{[\s\S]*"action"\s*:\s*"(search|read|answer)"[\s\S]*\}/;
