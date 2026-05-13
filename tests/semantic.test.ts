import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createSemanticTool } from '../src/tools/semantic.tool.js';

test('semantic tool ranks more relevant wiki pages higher', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createSemanticTool(vaultPath);

  await mkdir(path.join(vaultPath, 'wiki', 'conceptos'), { recursive: true });
  await writeFile(
    path.join(vaultPath, 'wiki', 'conceptos', 'clean-architecture.md'),
    'Clean Architecture separates policies from details and protects business rules.\n',
  );
  await writeFile(
    path.join(vaultPath, 'wiki', 'conceptos', 'architecture-notes.md'),
    'Architecture notes mention policies and details.\n',
  );
  await writeFile(
    path.join(vaultPath, 'wiki', 'conceptos', 'random.md'),
    'Bananas and weather and music.\n',
  );

  const result = await tool.searchSemantic('business rules architecture', { topK: 2, minScore: 0.1 });

  assert.equal(result.results[0].file, path.join('wiki', 'conceptos', 'clean-architecture.md'));
  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].score > result.results[1].score, true);
});

test('semantic tool indexes only wiki files', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createSemanticTool(vaultPath);

  await mkdir(path.join(vaultPath, 'wiki', 'conceptos'), { recursive: true });
  await mkdir(path.join(vaultPath, 'raw'), { recursive: true });
  await writeFile(path.join(vaultPath, 'wiki', 'conceptos', 'clean-architecture.md'), 'Clean Architecture.\n');
  await writeFile(path.join(vaultPath, 'raw', 'note.md'), 'Raw note.\n');

  const indexed = await tool.indexFile(path.join('wiki', 'conceptos', 'clean-architecture.md'));
  const skipped = await tool.indexFile(path.join('raw', 'note.md'));

  assert.equal(indexed.status, 'indexed');
  assert.equal(skipped.status, 'skipped');
});
