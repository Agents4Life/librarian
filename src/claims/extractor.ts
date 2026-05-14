import type { Claim, ClaimType } from './types.js';
import { createLlmClient, type LlmMessage } from '../llm.js';

const extractionPrompt = (pageContent: string, pagePath: string): string => `
You are a knowledge analyst. Extract factual claims from this wiki page.

## Page: ${pagePath}
${pageContent.slice(0, 4000)}

Respond with ONLY a JSON array of claim objects:
[
  {
    "text": "the exact claim text",
    "type": "factual" | "definitional" | "relational" | "temporal" | "causal",
    "confidence": 0.0-1.0
  }
]

Rules:
- Extract ONLY explicit claims, not opinions or questions
- Each claim should be self-contained
- Include specific facts, definitions, relationships, dates, numbers
- Skip trivial or obvious statements
- Confidence: 1.0 = explicitly stated, 0.5 = implied
- Max 10 claims per page`;

export const extractClaimsFromPage = async (
  pageContent: string,
  pagePath: string,
): Promise<Claim[]> => {
  const client = createLlmClient();

  const messages: LlmMessage[] = [
    { role: 'system', content: 'You are a knowledge analyst. Respond only with valid JSON arrays.' },
    { role: 'user', content: extractionPrompt(pageContent, pagePath) },
  ];

  try {
    const response = await client.chat(messages);
    const content = response.content?.trim();

    if (!content) return [];

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      text: string;
      type: string;
      confidence: number;
    }>;

    const validTypes: ClaimType[] = ['factual', 'definitional', 'relational', 'temporal', 'causal'];

    return parsed
      .filter(item => item.text && typeof item.text === 'string')
      .map((item, idx) => ({
        id: `claim-${pagePath.replace(/[^a-z0-9]/gi, '-')}-${idx}`,
        text: item.text,
        sourcePath: pagePath,
        confidence: Math.min(1, Math.max(0, Number.isFinite(item.confidence) ? item.confidence as number : 0.7)),
        type: validTypes.includes(item.type as ClaimType) ? (item.type as ClaimType) : 'factual',
      }));
  } catch {
    return [];
  }
};

export const extractClaimsFromPages = async (
  pages: Array<{ content: string; path: string }>,
  onProgress?: (current: number, total: number) => void,
): Promise<Claim[]> => {
  const allClaims: Claim[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const claims = await extractClaimsFromPage(page.content, page.path);
    allClaims.push(...claims);
    onProgress?.(i + 1, pages.length);
  }

  return allClaims;
};
