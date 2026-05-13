import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createFrontmatterTool } from '../src/tools/frontmatter.tool.js';

test('frontmatter tool reads metadata from a note', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createFrontmatterTool(vaultPath);

  await writeFile(
    path.join(vaultPath, 'note.md'),
    ['---', 'title: Test Note', 'librarian:', '  processed: true', '  status: active', '---', '', 'Body'].join('\n'),
  );

  const result = await tool.readFrontmatter('note.md');

  assert.equal(result.data.title, 'Test Note');
  assert.equal(result.librarian?.processed, true);
  assert.equal(result.librarian?.status, 'active');
});

test('frontmatter tool counts wiki pages and statuses', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createFrontmatterTool(vaultPath);

  await mkdir(path.join(vaultPath, 'wiki'), { recursive: true });
  await mkdir(path.join(vaultPath, 'raw'), { recursive: true });

  await writeFile(
    path.join(vaultPath, 'wiki', 'alpha.md'),
    ['---', 'librarian:', '  status: active', '---', '', 'Alpha'].join('\n'),
  );
  await writeFile(
    path.join(vaultPath, 'raw', 'beta.md'),
    ['---', 'librarian:', '  status: review', '---', '', 'Beta'].join('\n'),
  );

  const result = await tool.getStats();

  assert.equal(result.total_files, 2);
  assert.equal(result.wiki_pages, 1);
  assert.equal(result.raw_files, 1);
  assert.equal(result.by_status.active, 1);
  assert.equal(result.by_status.review, 1);
});

test('frontmatter health checks only wiki pages', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createFrontmatterTool(vaultPath);

  await mkdir(path.join(vaultPath, 'wiki', 'conceptos'), { recursive: true });
  await mkdir(path.join(vaultPath, 'daily'), { recursive: true });
  await mkdir(path.join(vaultPath, 'templates'), { recursive: true });
  await mkdir(path.join(vaultPath, '1-proyectos'), { recursive: true });

  await writeFile(path.join(vaultPath, 'wiki', 'conceptos', 'empty.md'), '# Empty\n');
  await writeFile(path.join(vaultPath, 'daily', '2026-05-12.md'), '# Daily\n');
  await writeFile(path.join(vaultPath, 'templates', 'daily-template.md'), '# Template\n');
  await writeFile(path.join(vaultPath, '1-proyectos', 'launch.md'), '# Launch\n');

  const incomplete = await tool.listIncompleteNotes();
  const stale = await tool.listStaleNotes(0);

  assert.deepEqual(incomplete.notes.map((note) => note.file), [path.join('wiki', 'conceptos', 'empty.md')]);
  assert.deepEqual(stale.notes.map((note) => note.file), [path.join('wiki', 'conceptos', 'empty.md')]);
});
