/**
 * Web page fetcher — retrieves a URL and extracts readable text.
 *
 * Lightweight HTML→text: strips scripts/styles/nav, decodes entities,
 * collapses whitespace. No headless browser needed.
 */

import type { FetcherConfig, FetchedPage } from './types.js';

const DEFAULT_MAX_CHARS = 8000;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

const stripHtmlBlocks = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

const decodeEntities = (text: string): string => {
  const entities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': "'", '&#x27;': "'", '&apos;': "'", '&nbsp;': ' ',
  };

  return text.replace(/&(?:#[xX]?[0-9a-fA-F]+|\w+);/g, (match) => {
    if (entities[match]) return entities[match];
    const numMatch = match.match(/&#(?:x([0-9a-fA-F]+)|(\d+));/);
    if (numMatch) {
      const code = numMatch[1] ? parseInt(numMatch[1], 16) : parseInt(numMatch[2], 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return match;
  });
};

const extractTitle = (html: string): string => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1].replace(/<[^>]+>/g, '').trim()) : '';
};

const htmlToText = (html: string): string => {
  let text = stripHtmlBlocks(html);
  text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr|section|article|blockquote|pre)[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = decodeEntities(text);
  text = text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  return text;
};

export const createFetcher = (config: FetcherConfig = {}) => {
  const maxChars = config.maxChars ?? DEFAULT_MAX_CHARS;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userAgent = config.userAgent ?? DEFAULT_USER_AGENT;

  const fetchPage = async (url: string): Promise<FetchedPage> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml,*/*',
          'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        return { url, title: '', content: `[HTTP ${response.status}]`, totalChars: 0 };
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
        return { url, title: '', content: `[Unsupported: ${contentType}]`, totalChars: 0 };
      }

      const html = await response.text();
      const title = extractTitle(html);
      const fullText = htmlToText(html);
      const truncated = fullText.length > maxChars ? fullText.slice(0, maxChars) : fullText;

      return { url, title, content: truncated, totalChars: fullText.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { url, title: '', content: `[Fetch error: ${message}]`, totalChars: 0 };
    } finally {
      clearTimeout(timeout);
    }
  };

  return { fetchPage };
};
