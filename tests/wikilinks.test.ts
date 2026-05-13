import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createWikilinksTool } from '../src/tools/wikilinks.tool.js';

test('wikilinks tool extracts links from a note', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createWikilinksTool(vaultPath);

  await writeFile(path.join(vaultPath, 'note.md'), 'Link to [[Clean Architecture]] and [[DDD]].\n');

  const result = await tool.extractWikilinks('note.md');

  assert.deepEqual(
    result.links.map((link) => link.target),
    ['Clean Architecture', 'DDD'],
  );
  assert.equal(result.links[0].line, 1);
});

test('wikilinks tool normalizes Obsidian aliases and headings', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createWikilinksTool(vaultPath);

  await writeFile(path.join(vaultPath, 'note.md'), 'Links [[Clean Architecture|clean arch]] and [[DDD#Tactical Patterns]].\n');

  const result = await tool.extractWikilinks('note.md');

  assert.deepEqual(
    result.links.map((link) => link.target),
    ['Clean Architecture', 'DDD'],
  );
});

test('wikilinks tool normalizes Obsidian path targets to note names', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createWikilinksTool(vaultPath);

  await writeFile(path.join(vaultPath, 'note.md'), 'Link [[conceptos/Clean Architecture.md|clean arch]].\n');

  const result = await tool.extractWikilinks('note.md');

  assert.deepEqual(result.links.map((link) => link.target), ['Clean Architecture']);
});

test('wikilinks tool finds backlinks across markdown files', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createWikilinksTool(vaultPath);

  await mkdir(path.join(vaultPath, 'wiki'), { recursive: true });
  await writeFile(path.join(vaultPath, 'wiki', 'alpha.md'), 'Alpha references [[Clean Architecture]].\n');
  await writeFile(path.join(vaultPath, 'wiki', 'beta.md'), 'Beta references [[DDD]].\n');

  const result = await tool.getBacklinks('Clean Architecture');

  assert.equal(result.backlinks.length, 1);
  assert.equal(result.backlinks[0].source, path.join('wiki', 'alpha.md'));
  assert.equal(result.backlinks[0].line, 1);
});
