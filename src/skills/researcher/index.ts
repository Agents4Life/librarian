/**
 * Researcher skill — agentic web search (Search-o1 pattern).
 *
 * This is a skill for the librarian agent, NOT a standalone agent.
 * Invoked explicitly via `/research` command or programmatic API.
 *
 * Usage:
 *   import { createResearcher, autoDetectProvider } from './skills/researcher/index.js';
 *   import { defaultLlmConfig } from '../llm.js';
 *
 *   const researcher = createResearcher({ llm: defaultLlmConfig, search: autoDetectProvider() });
 *   const result = await researcher.research('What is agentic search?');
 */

export { createResearcher } from './agent.js';
export { createFetcher } from './fetcher.js';
export { createSearchProvider } from './provider.js';
export type {
  AgentAction,
  FetcherConfig,
  FetchedPage,
  ResearcherConfig,
  ResearcherResult,
  SearchProviderConfig,
  SearchProviderName,
  SearchStep,
  SearchStepKind,
  WebSearchResponse,
  WebSearchResult,
} from './types.js';

import type { SearchProviderConfig } from './types.js';

/**
 * Auto-detect search provider from environment.
 * Priority: BRAVE_SEARCH_API_KEY > TAVILY_API_KEY > SearXNG (localhost)
 */
export const autoDetectProvider = (): SearchProviderConfig => {
  if (process.env.BRAVE_SEARCH_API_KEY) {
    return { provider: 'brave', apiKey: process.env.BRAVE_SEARCH_API_KEY };
  }
  if (process.env.TAVILY_API_KEY) {
    return { provider: 'tavily', apiKey: process.env.TAVILY_API_KEY };
  }
  if (process.env.SEARXNG_BASE_URL) {
    return { provider: 'searxng', baseUrl: process.env.SEARXNG_BASE_URL };
  }
  return { provider: 'searxng', baseUrl: 'http://127.0.0.1:8888' };
};
