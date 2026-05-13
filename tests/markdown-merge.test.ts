import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createMarkdownMergeTool } from '../src/tools/markdown-merge.tool.js';

test('markdown merge proposes a combined document', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createMarkdownMergeTool(vaultPath);

  await writeFile(path.join(vaultPath, 'source.md'), ['# Source', '', '## Notes', 'Extra line.'].join('\n'));
  await writeFile(path.join(vaultPath, 'target.md'), ['# Target', '', '## Notes', 'Base line.'].join('\n'));

  const proposal = await tool.proposeMerge('source.md', 'target.md');

  assert.equal(proposal.status, 'pending_approval');
  assert.ok(proposal.diff_id.length > 0);
  assert.match(proposal.proposed, /Base line\./);
  assert.match(proposal.proposed, /Extra line\./);
});

test('markdown merge rejects unapproved proposals', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createMarkdownMergeTool(vaultPath);

  await writeFile(path.join(vaultPath, 'source.md'), ['# Source', '', '## Notes', 'Extra line.'].join('\n'));
  await writeFile(path.join(vaultPath, 'target.md'), ['# Target', '', '## Notes', 'Base line.'].join('\n'));

  const proposal = await tool.proposeMerge('source.md', 'target.md');
  const result = await tool.applyMerge(proposal.diff_id);
  const merged = await readFile(path.join(vaultPath, 'target.md'), 'utf8');

  assert.equal(result.status, 'rejected');
  assert.match(merged, /Base line\./);
  assert.doesNotMatch(merged, /Extra line\./);
});

test('markdown merge applies approved proposals', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createMarkdownMergeTool(vaultPath);

  await writeFile(path.join(vaultPath, 'source.md'), ['# Source', '', '## Notes', 'Extra line.'].join('\n'));
  await writeFile(path.join(vaultPath, 'target.md'), ['# Target', '', '## Notes', 'Base line.'].join('\n'));

  const proposal = await tool.proposeMerge('source.md', 'target.md');
  const proposalFile = path.join(vaultPath, 'reports', 'conflicts', `${proposal.diff_id}.json`);
  const proposalData = JSON.parse(await readFile(proposalFile, 'utf8')) as Record<string, unknown>;

  proposalData.status = 'approved';
  await writeFile(proposalFile, JSON.stringify(proposalData, null, 2));

  const result = await tool.applyMerge(proposal.diff_id);
  const merged = await readFile(path.join(vaultPath, 'target.md'), 'utf8');

  assert.equal(result.status, 'applied');
  assert.match(merged, /Base line\./);
  assert.match(merged, /Extra line\./);
});

test('markdown merge reports conflicts when target changes', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const tool = createMarkdownMergeTool(vaultPath);

  await writeFile(path.join(vaultPath, 'source.md'), ['# Source', '', '## Notes', 'Extra line.'].join('\n'));
  await writeFile(path.join(vaultPath, 'target.md'), ['# Target', '', '## Notes', 'Base line.'].join('\n'));

  const proposal = await tool.proposeMerge('source.md', 'target.md');
  const proposalFile = path.join(vaultPath, 'reports', 'conflicts', `${proposal.diff_id}.json`);
  const proposalData = JSON.parse(await readFile(proposalFile, 'utf8')) as Record<string, unknown>;

  proposalData.status = 'approved';
  await writeFile(proposalFile, JSON.stringify(proposalData, null, 2));

  await writeFile(path.join(vaultPath, 'target.md'), ['# Target', '', '## Notes', 'Changed line.'].join('\n'));

  const result = await tool.applyMerge(proposal.diff_id);

  assert.equal(result.status, 'conflict');
  assert.ok(result.conflict_path);
});
