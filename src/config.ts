import { homedir } from 'node:os';

import type { LibrarianConfig } from './types.js';

export const defaultConfig: LibrarianConfig = {
  vaultPath: process.env.LIBRARIAN_VAULT_PATH ?? process.env.VAULT_PATH ?? `${homedir()}/Documents/Obsidian/Vault`,
  rawDir: 'raw',
  wikiDir: 'wiki',
  reportsDir: 'reports',
  staleThresholdDays: 90,
};
