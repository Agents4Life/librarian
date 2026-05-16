/**
 * Search providers — Brave Search, SearXNG, and Tavily.
 */

import type { SearchProviderConfig, WebSearchResponse, WebSearchResult } from './types.js';

// ---------------------------------------------------------------------------
// Brave Search
// ---------------------------------------------------------------------------

const searchBrave = async (
  query: string,
  config: SearchProviderConfig,
): Promise<WebSearchResponse> => {
  const apiKey = config.apiKey ?? process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) throw new Error('Brave Search requires BRAVE_SEARCH_API_KEY');

  const count = config.maxResults ?? 10;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 10_000);

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    });

    if (!response.ok) throw new Error(`Brave Search API error: ${response.status}`);

    const body = await response.json() as {
      web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
    };

    const results: WebSearchResult[] = (body.web?.results ?? [])
      .filter((r) => r.url)
      .map((r) => ({ title: r.title ?? '', url: r.url!, snippet: r.description ?? '' }));

    return { results, totalResults: results.length };
  } finally {
    clearTimeout(timeout);
  }
};

// ---------------------------------------------------------------------------
// SearXNG
// ---------------------------------------------------------------------------

const searchSearXNG = async (
  query: string,
  config: SearchProviderConfig,
): Promise<WebSearchResponse> => {
  const baseUrl = config.baseUrl ?? process.env.SEARXNG_BASE_URL ?? 'http://127.0.0.1:8888';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 10_000);

  try {
    const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&format=json&categories=general`;
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) throw new Error(`SearXNG error: ${response.status}`);

    const body = await response.json() as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
      number_of_results?: number;
    };

    const results: WebSearchResult[] = (body.results ?? [])
      .filter((r) => r.url)
      .slice(0, config.maxResults ?? 10)
      .map((r) => ({ title: r.title ?? '', url: r.url!, snippet: r.content ?? '' }));

    return { results, totalResults: body.number_of_results };
  } finally {
    clearTimeout(timeout);
  }
};

// ---------------------------------------------------------------------------
// Tavily
// ---------------------------------------------------------------------------

const searchTavily = async (
  query: string,
  config: SearchProviderConfig,
): Promise<WebSearchResponse> => {
  const apiKey = config.apiKey ?? process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error('Tavily requires TAVILY_API_KEY');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 15_000);

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: config.maxResults ?? 10,
        include_answer: false,
        search_depth: 'advanced',
      }),
    });

    if (!response.ok) throw new Error(`Tavily API error: ${response.status}`);

    const body = await response.json() as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };

    const results: WebSearchResult[] = (body.results ?? [])
      .filter((r) => r.url)
      .map((r) => ({ title: r.title ?? '', url: r.url!, snippet: r.content ?? '' }));

    return { results, totalResults: results.length };
  } finally {
    clearTimeout(timeout);
  }
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createSearchProvider = (config: SearchProviderConfig) => ({
  search: (query: string): Promise<WebSearchResponse> => {
    switch (config.provider) {
      case 'brave': return searchBrave(query, config);
      case 'searxng': return searchSearXNG(query, config);
      case 'tavily': return searchTavily(query, config);
      default: throw new Error(`Unknown search provider: ${config.provider}`);
    }
  },
});
