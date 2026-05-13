import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createSession, type AgentStep } from '../src/agent.js';
import { runLibrarian } from '../src/harness.js';

test('agent loop emits observe plan act reflect steps', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  await mkdir(path.join(vaultPath, 'wiki', 'conceptos'), { recursive: true });
  await writeFile(path.join(vaultPath, 'wiki', 'conceptos', 'clean-architecture.md'), 'Clean Architecture protects business rules.\n');

  const result = await runLibrarian('buscar Clean Architecture', vaultPath, createSession());

  assert.equal(result.session.turns, 1);
  assert.equal(result.steps[0].kind, 'observe');
  assert.equal(result.steps[1].kind, 'plan');
  assert.equal(result.steps.at(-1)?.kind, 'reflect');
  assert.ok(result.steps.some((step: AgentStep) => step.kind === 'act'));
});

test('agent loop keeps session metadata', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'librarian-vault-'));
  const llmClient = {
    healthcheck: async () => ({ ok: true, status: 200 }),
    chat: async () => ({ content: 'respuesta', model: 'test', raw: {} }),
  };
  const result = await runLibrarian('consulta algo', vaultPath, undefined, llmClient);

  assert.equal(result.session.turns, 1);
  assert.equal(result.session.lastIntent, 'ask');
  assert.ok(result.session.id.length > 0);
});
