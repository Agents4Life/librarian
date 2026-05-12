import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { proposeWikiCurations, proposeWikiPage } from '../src/curation.js';

test('curation proposes a new wiki page from a raw note', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'purim-vault-'));
  await mkdir(path.join(vaultPath, 'raw'), { recursive: true });

  await writeFile(path.join(vaultPath, 'raw', 'architecture.md'), ['---', 'purim:', '  processed: false', '---', '', 'Architecture note.'].join('\n'));

  const proposal = await proposeWikiPage(vaultPath, path.join('raw', 'architecture.md'));

  assert.equal(proposal.status, 'pending_approval');
  assert.equal(proposal.type, 'create');
  assert.equal(proposal.target, path.join('wiki', 'conceptos', 'architecture.md'));
  assert.match(proposal.preview, /source: raw\/architecture\.md/);
});

test('curation skips a duplicate when wiki page already exists', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'purim-vault-'));
  await mkdir(path.join(vaultPath, 'raw'), { recursive: true });
  await mkdir(path.join(vaultPath, 'wiki', 'conceptos'), { recursive: true });

  await writeFile(path.join(vaultPath, 'raw', 'architecture.md'), ['---', 'purim:', '  processed: false', '---', '', 'New detail.'].join('\n'));
  await writeFile(path.join(vaultPath, 'wiki', 'conceptos', 'architecture.md'), ['# Architecture', '', '## Notes', 'Existing note.'].join('\n'));

  const proposal = await proposeWikiPage(vaultPath, path.join('raw', 'architecture.md'));

  assert.equal(proposal.status, 'pending_approval');
  assert.equal(proposal.type, 'skip');
  assert.equal(proposal.duplicate, 'exact_match');
  assert.equal(proposal.duplicateOf, path.join('wiki', 'conceptos', 'architecture.md'));
});

test('curation returns proposals only for curate-worthy notes', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'purim-vault-'));
  await mkdir(path.join(vaultPath, 'raw'), { recursive: true });

  await writeFile(path.join(vaultPath, 'raw', 'idea.md'), ['---', 'purim:', '  processed: false', '---', '', 'Idea note.'].join('\n'));
  await writeFile(path.join(vaultPath, 'raw', 'daily-note.md'), ['---', 'purim:', '  processed: false', '---', '', 'Daily note.'].join('\n'));

  const result = await proposeWikiCurations(vaultPath);

  assert.equal(result.inbox.notes.length, 2);
  assert.equal(result.proposals.length, 1);
  assert.equal(result.proposals[0].type, 'create');
});
