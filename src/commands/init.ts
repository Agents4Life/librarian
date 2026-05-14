import { mkdir, open, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { defaultConfig } from '../config.js';

const DIRECTORIES: string[] = [
  'raw',
  'wiki',
  'wiki/conceptos',
  'wiki/entidades',
  'wiki/sources',
  'wiki/synthesis',
  'reports',
  'reports/chats',
  'reports/conflicts',
  'reviews',
  'memory',
  'configs',
  '.librarian',
  '.librarian/proposals',
  '.librarian/transactions',
];

const WIKI_INDEX = `# Wiki Index

## conceptos

- No pages yet.

## entidades

- No pages yet.

## sources

- No pages yet.

## synthesis

- No pages yet.
`;

const WIKI_LOG = `# Wiki Log

`;

const LIBRARIAN_YAML = `# Librarian configuration
# See docs at https://github.com/user/librarian

vault:
  raw_dir: raw
  wiki_dir: wiki
  reports_dir: reports

tracking:
  stale_threshold_days: 90

llm:
  primary:
    base_url: "http://localhost:11434/v1"
    model: "glm-4"
  timeout_ms: 30000

processing:
  dry_run_default: true
  batch_size: 10
`;

interface FileTemplate {
  relativePath: string;
  content: () => string;
}

const FILE_TEMPLATES: FileTemplate[] = [
  {
    relativePath: 'wiki/index.md',
    content: () => WIKI_INDEX,
  },
  {
    relativePath: 'wiki/log.md',
    content: () => WIKI_LOG,
  },
  {
    relativePath: 'configs/librarian.yaml',
    content: () => LIBRARIAN_YAML,
  },
  {
    relativePath: '.librarian/state.json',
    content: () =>
      JSON.stringify(
        {
          version: 1,
          initializedAt: new Date().toISOString(),
          status: 'ready',
        },
        null,
        2,
      ) + '\n',
  },
];

export const initVault = async (vaultPath?: string): Promise<void> => {
  const resolved = vaultPath ?? defaultConfig.vaultPath;

  const created: string[] = [];
  const skipped: string[] = [];

  // Create directories (idempotent — recursive mkdir won't fail if exists)
  for (const dir of DIRECTORIES) {
    const fullPath = join(resolved, dir);
    try {
      await mkdir(fullPath, { recursive: true });
      created.push(dir + '/');
    } catch {
      skipped.push(dir + '/');
    }
  }

  // Create files only if they don't exist ('wx' = write + exclusive)
  for (const template of FILE_TEMPLATES) {
    const fullPath = join(resolved, template.relativePath);
    let handle;
    try {
      handle = await open(fullPath, 'wx');
      await handle.write(template.content());
      created.push(template.relativePath);
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'EEXIST') {
        skipped.push(template.relativePath);
      } else {
        throw err;
      }
    } finally {
      await handle?.close();
    }
  }

  console.log(
    JSON.stringify({ ok: true, created, skipped, vaultPath: resolved }),
  );
};
