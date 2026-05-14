export type VaultSection =
  | "raw"
  | "wiki"
  | "reports"
  | "reviews"
  | "memory"
  | "templates"
  | "configs"
  | "unknown";

export type SectionMap = Readonly<Record<string, VaultSection>>;

export const DEFAULT_SECTION_MAP: SectionMap = {
  "raw/": "raw",
  "wiki/": "wiki",
  "reports/": "reports",
  "reportes/": "reports",
  "reviews/": "reviews",
  "memory/": "memory",
  "templates/": "templates",
  "configs/": "configs",
};

export interface Note {
  path: string;
  title: string;
  section: VaultSection;
  tags: string[];
  links: string[];
  backlinks: string[];
  headings: string[];
  frontmatter: Record<string, unknown>;
  contentHash: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  fileSize: number;
  embedding?: number[]; // embedding vector, optional
}

export interface NoteIndex {
  version: 1;
  builtAt: string;
  vaultPath: string;
  vaultFingerprint?: string;
  notes: Record<string, Note>;
}
