import { mkdir, open, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { defaultConfig } from '../config.js';

const DIRECTORIES: string[] = [
  // human layer — Librarian never processes these directly
  '1-proyectos',
  '2-areas',
  '3-recursos',
  '4-archivo',
  'daily',
  'inbox',
  '_assets',
  // raw/ — explicit consent boundary for AI-processable sources
  'raw',
  // wiki/ — curated and maintained by Librarian
  'wiki',
  'wiki/conceptos',
  'wiki/entidades',
  'wiki/sources',
  'wiki/synthesis',
  // infrastructure
  'reports',
  'reports/chats',
  'reports/conflicts',
  'reviews',
  'memory',
  'configs',
  '.librarian',
  '.librarian/state',
  '.librarian/proposals',
  '.librarian/transactions',
  'templates',
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

const DAILY_TEMPLATE = `---
type: daily
created: {{date:YYYY-MM-DD}}
tags: []
---

# {{date:YYYY-MM-DD}} — {{date:dddd}}

## Focus

- [ ] 

## Notes

- 

## Ideas

- 

## Captured

- 

---

## Links

- [[weekly-review-{{date:gggg-ww}}]]
`;

const WEEKLY_REVIEW_TEMPLATE = `---
type: weekly-review
created: {{date:YYYY-MM-DD}}
tags: []
---

# Weekly Review — {{date:gggg-ww}}

## 1. Clean Inbox

- [ ] Move inbox notes to their PARA home
- [ ] Copy or move valuable AI sources to \`raw/\` only after explicit consent
- [ ] Delete notes that are no longer useful

## 2. Review Librarian Proposals

- [ ] Read proposal exports in \`reviews/\`
- [ ] Approve/reject proposals via CLI
- [ ] Apply approved proposals intentionally

## 3. Review Projects

- [ ] Update active project notes
- [ ] Move completed projects to archive
- [ ] Create new project notes if needed

## 4. Plan Next Week

- [ ] Review calendar and commitments
- [ ] Set 3 priorities for the week
- [ ] Create next week's daily notes if useful

## Notes

- 
`;

const SOURCE_TEMPLATE = `---
type: note
created: {{date:YYYY-MM-DD}}
source_url:
source_type:
author:
tags: []
---

# {{title}}

## Summary


## Notes


## Links

`;

const RAW_SOURCE_TEMPLATE = `---
type: source
created: {{date:YYYY-MM-DD}}
source_url:
source_type:
author:
status: raw
tags: []
---

# {{title}}

## Source


## Notes


## Key Ideas


## Questions

`;

const WIKI_CONCEPT_TEMPLATE = `---
type: concept
source:
category: conceptos
tags: []
librarian:
  processed: true
  status: review
---

# {{title}}

## Summary


## Key Ideas


## Related


## Sources

`;

const WIKI_SOURCE_TEMPLATE = `---
type: source-index
source:
category: sources
tags: []
librarian:
  processed: true
  status: review
---

# {{title}}

## Summary


## Extracted Ideas


## Related Concepts


## Source

`;

const WIKI_SYNTHESIS_TEMPLATE = `---
type: synthesis
source:
category: synthesis
tags: []
librarian:
  processed: true
  status: review
---

# {{title}}

## Question


## Synthesis


## Evidence


## Related

`;

const HOME_NOTE = `# 🏠 Home

## Quick Links

- [[wiki/index|Wiki Index]]
- [[wiki/log|Wiki Log]]

## Active Projects

- 

## Today

- 

---

*Powered by [Librarian](https://github.com/Agents4Life/librarian)*
`;

const FILE_TEMPLATES: FileTemplate[] = [
  {
    relativePath: 'home.md',
    content: () => HOME_NOTE,
  },
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
    relativePath: '.librarian/state/init.json',
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
  {
    relativePath: 'templates/daily-template.md',
    content: () => DAILY_TEMPLATE,
  },
  {
    relativePath: 'templates/weekly-review.md',
    content: () => WEEKLY_REVIEW_TEMPLATE,
  },
  {
    relativePath: 'templates/source-template.md',
    content: () => SOURCE_TEMPLATE,
  },
  {
    relativePath: 'templates/raw-source-template.md',
    content: () => RAW_SOURCE_TEMPLATE,
  },
  {
    relativePath: 'templates/wiki-concept-template.md',
    content: () => WIKI_CONCEPT_TEMPLATE,
  },
  {
    relativePath: 'templates/wiki-source-template.md',
    content: () => WIKI_SOURCE_TEMPLATE,
  },
  {
    relativePath: 'templates/wiki-synthesis-template.md',
    content: () => WIKI_SYNTHESIS_TEMPLATE,
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
