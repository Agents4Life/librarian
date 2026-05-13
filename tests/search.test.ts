import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createSearchTool } from '../src/tools/search.tool.js';

test('search tool finds exact matches in markdown files', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createSearchTool(vaultPath);

  await writeFile(path.join(vaultPath, 'alpha.md'), 'Clean Architecture is relevant.\n');
  await writeFile(path.join(vaultPath, 'beta.txt'), 'Clean Architecture in txt.\n');

  const result = await tool.searchText('Clean Architecture', { filePattern: '*.md' });

  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].file, 'alpha.md');
  assert.equal(result.results[0].line, 1);
});

test('search tool limits results when requested', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createSearchTool(vaultPath);

  await writeFile(path.join(vaultPath, 'alpha.md'), 'Librarian\n');
  await writeFile(path.join(vaultPath, 'beta.md'), 'Librarian\n');

  const result = await tool.searchText('Librarian', { filePattern: '*.md', maxResults: 1 });

  assert.equal(result.results.length, 1);
});
