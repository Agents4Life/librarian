import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type RawYamlConfig = {
  vault?: { path?: string; raw_dir?: string; wiki_dir?: string; reports_dir?: string };
  tracking?: { stale_threshold_days?: number };
  llm?: {
    primary?: { base_url?: string; model?: string };
    fallback?: { base_url?: string; model?: string };
    timeout_ms?: number;
  };
  processing?: { dry_run_default?: boolean; batch_size?: number };
};

/**
 * Minimal YAML parser for the Librarian config shape.
 * Handles flat keys and one-level-nested keys under known sections.
 * No external dependencies.
 */
const parseYamlWithSubSections = (content: string): RawYamlConfig => {
  const config: RawYamlConfig = {};
  let currentSection: string | null = null;
  let currentSubSection: string | null = null;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trimEnd();
    if (line === '' || line.trimStart().startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;
    const trimmed = line.trimStart();

    // Top-level section
    if (indent === 0 && trimmed.endsWith(':')) {
      const sectionName = trimmed.slice(0, -1).trim();
      currentSection = sectionName;
      currentSubSection = null;
      if (sectionName === 'vault') config.vault = {};
      if (sectionName === 'tracking') config.tracking = {};
      if (sectionName === 'llm') config.llm = {};
      if (sectionName === 'processing') config.processing = {};
      continue;
    }

    // Sub-section (indent 2, like "primary:", "fallback:")
    if (indent === 2 && trimmed.endsWith(':') && currentSection === 'llm') {
      currentSubSection = trimmed.slice(0, -1).trim();
      continue;
    }

    // Key-value pair
    if (indent >= 2 && trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIdx).trim();
      let value: string = trimmed.slice(colonIdx + 1).trim();

      if (value === '') continue;

      // Strip inline comments
      const commentIdx = value.indexOf('#');
      if (commentIdx > 0) value = value.slice(0, commentIdx).trim();

      // Strip quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Resolve env var references like ${VAR_NAME}
      const envMatch = value.match(/^\$\{(.+)\}$/);
      if (envMatch) {
        value = process.env[envMatch[1]] ?? '';
      }

      // Type coercion
      const num = Number(value);
      const parsed: string | number | boolean =
        value === 'true' ? true
        : value === 'false' ? false
        : isNaN(num) ? value
        : num;

      // Assign to config
      if (currentSection === 'vault' && config.vault) {
        if (key === 'path') config.vault.path = String(parsed);
        if (key === 'raw_dir') config.vault.raw_dir = String(parsed);
        if (key === 'wiki_dir') config.vault.wiki_dir = String(parsed);
        if (key === 'reports_dir') config.vault.reports_dir = String(parsed);
      } else if (currentSection === 'tracking' && config.tracking) {
        if (key === 'stale_threshold_days') config.tracking.stale_threshold_days = Number(parsed);
      } else if (currentSection === 'processing' && config.processing) {
        if (key === 'dry_run_default') config.processing.dry_run_default = Boolean(parsed);
        if (key === 'batch_size') config.processing.batch_size = Number(parsed);
      } else if (currentSection === 'llm' && config.llm) {
        if (key === 'timeout_ms') config.llm.timeout_ms = Number(parsed);
        if (currentSubSection === 'primary') {
          if (!config.llm.primary) config.llm.primary = {};
          if (key === 'base_url') config.llm.primary.base_url = String(parsed);
          if (key === 'model') config.llm.primary.model = String(parsed);
        }
        if (currentSubSection === 'fallback') {
          if (!config.llm.fallback) config.llm.fallback = {};
          if (key === 'base_url') config.llm.fallback.base_url = String(parsed);
          if (key === 'model') config.llm.fallback.model = String(parsed);
        }
      }
    }
  }

  return config;
};

/**
 * Load config from a YAML file. Returns null if file doesn't exist or can't be parsed.
 * Synchronous — called at module init time.
 */
export const loadYamlConfig = (filePath?: string): RawYamlConfig | null => {
  const resolvedPath = filePath ?? join(process.cwd(), 'config.yaml');

  try {
    const content = readFileSync(resolvedPath, 'utf8');
    return parseYamlWithSubSections(content);
  } catch {
    return null;
  }
};
