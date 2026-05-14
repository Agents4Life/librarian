import type { Claim, Contradiction, ContradictionSeverity, ClaimsResult } from './types.js';
import { extractClaimsFromPages } from './extractor.js';
import { createLlmClient, type LlmMessage } from '../llm.js';

const contradictionPrompt = (claimA: Claim, claimB: Claim): string => `
You are a logical consistency checker. Analyze these two claims and determine if they contradict each other.

Claim A (from ${claimA.sourcePath}): "${claimA.text}"
Claim B (from ${claimB.sourcePath}): "${claimB.text}"

Respond with ONLY a JSON object:
{
  "is_contradiction": true/false,
  "severity": "critical" | "warning" | "minor",
  "explanation": "why they contradict",
  "suggested_resolution": "how to resolve the contradiction"
}

Rules:
- "critical": Direct factual contradiction (dates, numbers, definitions)
- "warning": Indirect contradiction (different perspectives, partial overlap)
- "minor": Stylistic differences or complementary info that seems conflicting
- Only flag as contradiction if they make mutually exclusive assertions`;

const areCandidatesForContradiction = (a: Claim, b: Claim): boolean => {
  if (a.sourcePath === b.sourcePath) return false;
  
  // Check for overlapping keywords (simple heuristic)
  const tokensA = new Set(a.text.toLowerCase().split(/\s+/));
  const tokensB = new Set(b.text.toLowerCase().split(/\s+/));
  const overlap = [...tokensA].filter(t => tokensB.has(t) && t.length > 3).length;
  
  return overlap >= 2;
};

const checkContradiction = async (claimA: Claim, claimB: Claim): Promise<Contradiction | null> => {
  const client = createLlmClient();

  const messages: LlmMessage[] = [
    { role: 'system', content: 'You are a logical consistency checker. Respond only with valid JSON.' },
    { role: 'user', content: contradictionPrompt(claimA, claimB) },
  ];

  try {
    const response = await client.chat(messages);
    const content = response.content?.trim();
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as {
      is_contradiction: boolean;
      severity: string;
      explanation: string;
      suggested_resolution: string;
    };

    const isContradiction = parsed.is_contradiction === true;
    if (!isContradiction) return null;

    const validSeverities: ContradictionSeverity[] = ['critical', 'warning', 'minor'];

    return {
      claimA,
      claimB,
      severity: validSeverities.includes(parsed.severity as ContradictionSeverity)
        ? (parsed.severity as ContradictionSeverity)
        : 'warning',
      explanation: parsed.explanation,
      suggestedResolution: parsed.suggested_resolution,
    };
  } catch {
    return null;
  }
};

export const detectContradictions = async (
  claims: Claim[],
  onProgress?: (current: number, total: number) => void,
): Promise<Contradiction[]> => {
  const contradictions: Contradiction[] = [];

  // Find candidate pairs
  const maxPairs = 50;
  const pairs: Array<[Claim, Claim]> = [];
  outer:
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      if (areCandidatesForContradiction(claims[i], claims[j])) {
        pairs.push([claims[i], claims[j]]);
        if (pairs.length >= maxPairs) break outer;
      }
    }
  }

  const toCheck = pairs;

  for (let i = 0; i < toCheck.length; i++) {
    const [a, b] = toCheck[i];
    const result = await checkContradiction(a, b);
    if (result) contradictions.push(result);
    onProgress?.(i + 1, toCheck.length);
  }

  return contradictions;
};

export const runClaimsAnalysis = async (
  pages: Array<{ content: string; path: string }>,
  onProgress?: (phase: string, current: number, total: number) => void,
): Promise<ClaimsResult> => {
  // Phase 1: Extract claims
  const claims = await extractClaimsFromPages(pages, (c, t) => onProgress?.('extracting', c, t));

  // Phase 2: Detect contradictions
  const contradictions = await detectContradictions(claims, (c, t) => onProgress?.('detecting', c, t));

  return {
    claims,
    contradictions,
    stats: {
      pagesAnalyzed: pages.length,
      claimsExtracted: claims.length,
      contradictionsFound: contradictions.length,
      criticalCount: contradictions.filter(c => c.severity === 'critical').length,
    },
  };
};
