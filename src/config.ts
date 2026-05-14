import { homedir } from 'node:os';

import type { LibrarianConfig } from './types.js';
import { loadYamlConfig, loadVaultLocalConfig } from './config-loader.js';

// Resolve vaultPath: env > CWD yaml > default
const cwdConfig = loadYamlConfig();
const vaultPath = process.env.LIBRARIAN_VAULT_PATH ?? process.env.VAULT_PATH ?? cwdConfig?.vault?.path ?? `${homedir()}/Documents/Obsidian/Vault`;

// Load vault-local config (priority over CWD config)
const vaultConfig = loadVaultLocalConfig(vaultPath);
const mergedConfig = vaultConfig ?? cwdConfig;

export const defaultConfig: LibrarianConfig = {
  vaultPath,
  rawDir: mergedConfig?.vault?.raw_dir ?? 'raw',
  wikiDir: mergedConfig?.vault?.wiki_dir ?? 'wiki',
  reportsDir: mergedConfig?.vault?.reports_dir ?? 'reports',
  staleThresholdDays: mergedConfig?.tracking?.stale_threshold_days ?? 90,
};
