/** A factual claim extracted from a wiki page */
export interface Claim {
  id: string;
  text: string;           // the claim text
  sourcePath: string;     // wiki page it came from
  confidence: number;     // 0-1, how confident the extraction is
  type: ClaimType;
}

export type ClaimType =
  | 'factual'       // "X was released in 2020"
  | 'definitional'  // "Clean Architecture is a pattern that..."
  | 'relational'    // "React uses a virtual DOM"
  | 'temporal'      // "After refactoring, performance improved"
  | 'causal';       // "Using TDD reduces bugs"

/** A contradiction between two claims */
export interface Contradiction {
  claimA: Claim;
  claimB: Claim;
  severity: ContradictionSeverity;
  explanation: string;    // why they contradict
  suggestedResolution: string;
}

export type ContradictionSeverity = 'critical' | 'warning' | 'minor';

/** Result of a claims extraction run */
export interface ClaimsResult {
  claims: Claim[];
  contradictions: Contradiction[];
  stats: {
    pagesAnalyzed: number;
    claimsExtracted: number;
    contradictionsFound: number;
    criticalCount: number;
  };
}
