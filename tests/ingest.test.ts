import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { inspectRawInbox } from '../src/ingest.js';

test('raw inbox lists only unprocessed notes', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  await mkdir(path.join(vaultPath, 'raw'), { recursive: true });

  await writeFile(path.join(vaultPath, 'raw', 'idea.md'), ['---', 'librarian:', '  processed: false', '---', '', 'Idea'].join('\n'));
  await writeFile(path.join(vaultPath, 'raw', 'done.md'), ['---', 'librarian:', '  processed: true', '---', '', 'Done'].join('\n'));

  const result = await inspectRawInbox(vaultPath);

  assert.equal(result.notes.length, 1);
  assert.equal(result.notes[0].file, path.join('raw', 'idea.md'));
  assert.equal(result.notes[0].processed, false);
  assert.equal(result.notes[0].recommendation, 'curate');
});

test('raw inbox marks daily notes as report', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  await mkdir(path.join(vaultPath, 'raw'), { recursive: true });

  await writeFile(path.join(vaultPath, 'raw', 'daily-note.md'), ['---', 'librarian:', '  processed: false', '---', '', 'Daily note'].join('\n'));

  const result = await inspectRawInbox(vaultPath);

  assert.equal(result.notes[0].recommendation, 'report');
});
