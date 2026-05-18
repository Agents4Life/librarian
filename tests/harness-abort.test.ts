import test from 'node:test';
import assert from 'node:assert/strict';

import { runLibrarian } from '../src/harness.js';
import { createTestContext } from './helpers/create-test-context.js';

test('runLibrarian accepts an AbortSignal without error for search', async () => {
  const ctx = await createTestContext({
    'wiki/conceptos/testing.md': 'Testing is important for software quality.\n',
  });

  const ac = new AbortController();
  const result = await runLibrarian('buscar testing', ctx.vaultPath, undefined, undefined, ac.signal);

  assert.equal(result.routed.intent, 'search-wiki');
  assert.ok(!ac.signal.aborted);
});

test('runLibrarian with pre-aborted signal still completes for non-process intents', async () => {
  const ctx = await createTestContext({
    'wiki/conceptos/testing.md': 'Some content here.\n',
  });

  const ac = new AbortController();
  ac.abort();

  const result = await runLibrarian('estado de la wiki', ctx.vaultPath, undefined, undefined, ac.signal);

  assert.equal(result.routed.intent, 'wiki-status');
  assert.ok(result.result);
});

test('runLibrarian without signal works as before', async () => {
  const ctx = await createTestContext({
    'wiki/conceptos/testing.md': 'Content.\n',
  });

  const result = await runLibrarian('buscar testing', ctx.vaultPath);

  assert.equal(result.routed.intent, 'search-wiki');
  assert.ok(result.result.results.length >= 1);
});

test('runLibrarian processes orphans without signal', async () => {
  const ctx = await createTestContext({
    'wiki/conceptos/orphan.md': 'An orphan note with no links.\n',
  });

  const result = await runLibrarian('orphan', ctx.vaultPath);

  assert.equal(result.routed.intent, 'orphan-notes');
  assert.ok(Array.isArray(result.result));
});

test('runLibrarian handles process-notes with empty inbox', async () => {
  const ctx = await createTestContext({
    'wiki/conceptos/existing.md': 'Already processed.\n',
  });

  const ac = new AbortController();
  const result = await runLibrarian('procesar notas', ctx.vaultPath, undefined, undefined, ac.signal);

  assert.equal(result.routed.intent, 'process-notes');
  const res = result.result as Record<string, unknown>;
  assert.equal(res.proposed, 0);
  assert.equal(res.total, 0);
});
