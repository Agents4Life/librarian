import { homedir } from 'node:os';

import type { LibrarianConfig } from './types.js';
import { loadYamlConfig } from './config-loader.js';

const yamlConfig = loadYamlConfig();

export const defaultConfig: LibrarianConfig = {
  vaultPath: process.env.LIBRARIAN_VAULT_PATH ?? process.env.VAULT_PATH ?? yamlConfig?.vault?.path ?? `${homedir()}/Documents/Obsidian/Vault`,
  rawDir: yamlConfig?.vault?.raw_dir ?? 'raw',
  wikiDir: yamlConfig?.vault?.wiki_dir ?? 'wiki',
  reportsDir: yamlConfig?.vault?.reports_dir ?? 'reports',
  staleThresholdDays: yamlConfig?.tracking?.stale_threshold_days ?? 90,
};
