import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { appendWikiLog, ensureWikiStructure, updateWikiIndex } from '../src/wiki-maintenance.js';

test('wiki maintenance creates the expected wiki structure', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));

  const result = await ensureWikiStructure(vaultPath);

  assert.deepEqual(result.created.sort(), [
    path.join('reportes'),
    path.join('wiki'),
    path.join('wiki', 'conceptos'),
    path.join('wiki', 'entidades'),
    path.join('wiki', 'sources'),
    path.join('wiki', 'synthesis'),
  ].sort());
});

test('wiki maintenance regenerates wiki index from category pages', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  await mkdir(path.join(vaultPath, 'wiki', 'conceptos'), { recursive: true });
  await mkdir(path.join(vaultPath, 'wiki', 'entidades'), { recursive: true });
  await writeFile(path.join(vaultPath, 'wiki', 'conceptos', 'architecture.md'), '# Architecture\n');
  await writeFile(path.join(vaultPath, 'wiki', 'entidades', 'ollama.md'), '# Ollama\n');

  const result = await updateWikiIndex(vaultPath);
  const index = await readFile(path.join(vaultPath, 'wiki', 'index.md'), 'utf8');

  assert.equal(result.file, path.join('wiki', 'index.md'));
  assert.match(index, /# Wiki Index/);
  assert.match(index, /## conceptos/);
  assert.match(index, /- \[\[conceptos\/architecture\|architecture\]\]/);
  assert.match(index, /## entidades/);
  assert.match(index, /- \[\[entidades\/ollama\|ollama\]\]/);
  assert.doesNotMatch(index, /log/);
});

test('wiki maintenance appends processing events to wiki log', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));

  await appendWikiLog(vaultPath, {
    action: 'created',
    source: path.join('raw', 'architecture.md'),
    target: path.join('wiki', 'conceptos', 'architecture.md'),
  });
  await appendWikiLog(vaultPath, {
    action: 'skipped',
    reason: 'exact_match',
    source: path.join('raw', 'architecture.md'),
    target: path.join('wiki', 'conceptos', 'architecture.md'),
  });

  const log = await readFile(path.join(vaultPath, 'wiki', 'log.md'), 'utf8');

  assert.match(log, /# Wiki Log/);
  assert.match(log, /created/);
  assert.match(log, /raw\/architecture\.md -> wiki\/conceptos\/architecture\.md/);
  assert.match(log, /skipped/);
  assert.match(log, /reason: exact_match/);
});
