import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createWikilinksTool } from '../src/tools/wikilinks.tool.js';

test('wikilinks tool reports orphan notes and graph stats', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createWikilinksTool(vaultPath);

  await mkdir(path.join(vaultPath, 'wiki'), { recursive: true });
  await writeFile(path.join(vaultPath, 'wiki', 'alpha.md'), 'Alpha links [[beta]].\n');
  await writeFile(path.join(vaultPath, 'wiki', 'beta.md'), 'Beta is isolated.\n');
  await writeFile(path.join(vaultPath, 'wiki', 'gamma.md'), 'Gamma is isolated too.\n');

  const orphans = await tool.getOrphanNotes();
  const stats = await tool.getGraphStats();

  assert.deepEqual(
    orphans.notes.map((note) => note.file).sort(),
    ['wiki/gamma.md'],
  );
  assert.equal(stats.total_nodes, 3);
  assert.equal(stats.total_edges, 1);
  assert.equal(stats.orphans, 2);
});

test('wikilinks graph only includes wiki pages', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createWikilinksTool(vaultPath);

  await mkdir(path.join(vaultPath, 'wiki'), { recursive: true });
  await mkdir(path.join(vaultPath, 'daily'), { recursive: true });
  await mkdir(path.join(vaultPath, 'templates'), { recursive: true });
  await writeFile(path.join(vaultPath, 'wiki', 'alpha.md'), 'Alpha links [[beta|Beta Alias]].\n');
  await writeFile(path.join(vaultPath, 'wiki', 'beta.md'), 'Beta.\n');
  await writeFile(path.join(vaultPath, 'daily', '2026-05-12.md'), 'Daily links [[alpha]].\n');
  await writeFile(path.join(vaultPath, 'templates', 'daily-template.md'), 'Template.\n');

  const stats = await tool.getGraphStats();

  assert.equal(stats.total_nodes, 2);
  assert.equal(stats.total_edges, 1);
});

test('wikilinks tool finds the shortest path between notes', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createWikilinksTool(vaultPath);

  await mkdir(path.join(vaultPath, 'wiki'), { recursive: true });
  await writeFile(path.join(vaultPath, 'wiki', 'alpha.md'), 'Alpha links [[beta]].\n');
  await writeFile(path.join(vaultPath, 'wiki', 'beta.md'), 'Beta links [[gamma]].\n');
  await writeFile(path.join(vaultPath, 'wiki', 'gamma.md'), 'Gamma.\n');

  const result = await tool.findPath('alpha', 'gamma');

  assert.equal(result.found, true);
  assert.deepEqual(result.path, ['alpha', 'beta', 'gamma']);
  assert.equal(result.length, 2);
});
