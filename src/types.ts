export type ToolName =
  | 'filesystem'
  | 'search'
  | 'semantic'
  | 'frontmatter'
  | 'markdownMerge'
  | 'wikilinks';

export type Intent =
  | 'process-notes'
  | 'search-wiki'
  | 'wiki-status'
  | 'incomplete-notes'
  | 'stale-notes'
  | 'orphan-notes'
  | 'connections'
  | 'ask'
  | 'unknown';

export type WikiCategory = 'conceptos' | 'entidades' | 'sources' | 'synthesis';

export type DuplicateReason =
  | 'exact_match'       // same filename exists in wiki
  | 'semantic_duplicate' // GLM says it's the same concept
  | 'none';              // no duplicate found

export type ProposalTarget = {
  path: string;           // relative path within vault, e.g. "wiki/conceptos/clean-architecture.md"
  content: string;        // the content to write
  action: 'create' | 'update';
};

export interface CurationProposal {
  diff_id: string;
  source: string;
  target: string;
  type: 'create' | 'update' | 'skip';
  status: 'pending_approval';
  preview: string;
  category: WikiCategory;
  tags: string[];
  summary: string;
  suggestedLinks: string[];
  duplicate: DuplicateReason;
  duplicateOf?: string; // path to existing wiki page

  // NEW: additional targets beyond the main one
  additionalTargets?: ProposalTarget[];
}

export interface LibrarianConfig {
  vaultPath: string;
  rawDir: string;
  wikiDir: string;
  reportsDir: string;
  staleThresholdDays: number;
}

export interface RoutedIntent {
  intent: Intent;
  confidence: number;
  tool?: ToolName;
  method?: 'regex' | 'llm';
}

export interface ToolResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
