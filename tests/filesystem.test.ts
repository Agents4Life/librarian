import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createFilesystemTool } from '../src/tools/filesystem.tool.js';

test('filesystem tool reads a file inside the vault', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'purim-vault-'));
  const tool = createFilesystemTool(vaultPath);

  await writeFile(path.join(vaultPath, 'note.md'), '# Hello Librarian\n');

  const result = await tool.readFile('note.md');

  assert.equal(result.content, '# Hello Librarian\n');
  assert.equal(result.path, 'note.md');
  assert.equal(result.size, 18);
});

test('filesystem tool rejects paths outside the vault', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'purim-vault-'));
  const tool = createFilesystemTool(vaultPath);

  await assert.rejects(() => tool.readFile('../outside.md'), /Path escapes vault/);
});

test('filesystem tool lists directory entries', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'purim-vault-'));
  const tool = createFilesystemTool(vaultPath);

  await mkdir(path.join(vaultPath, 'wiki'));
  await writeFile(path.join(vaultPath, 'alpha.md'), 'alpha');
  await writeFile(path.join(vaultPath, 'wiki', 'beta.md'), 'beta');

  const result = await tool.listDirectory('.');

  assert.deepEqual(
    result.files.map((entry) => entry.name),
    ['alpha.md', 'wiki'],
  );
  assert.equal(result.files[1].isDirectory, true);
});
