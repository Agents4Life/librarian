import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { runLibrarian } from '../src/harness.js';

test('harness routes search queries to semantic search', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'purim-vault-'));
  await mkdir(path.join(vaultPath, 'wiki', 'conceptos'), { recursive: true });

  await writeFile(
    path.join(vaultPath, 'wiki', 'conceptos', 'clean-architecture.md'),
    'Clean Architecture protects business rules and architecture decisions.\n',
  );

  const result = await runLibrarian('buscar Clean Architecture', vaultPath);

  assert.equal(result.routed.intent, 'search-wiki');
  assert.equal(result.result.results[0].file, path.join('wiki', 'conceptos', 'clean-architecture.md'));
});

test('harness reports wiki status with stats and graph', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'purim-vault-'));
  await mkdir(path.join(vaultPath, 'wiki', 'conceptos'), { recursive: true });

  await writeFile(
    path.join(vaultPath, 'wiki', 'conceptos', 'clean-architecture.md'),
    ['---', 'purim:', '  status: active', '---', '', 'Clean Architecture.'].join('\n'),
  );

  const result = await runLibrarian('estado de la wiki', vaultPath);

  assert.equal(result.routed.intent, 'wiki-status');
  assert.equal(result.result.stats.total_files, 1);
  assert.equal(result.result.graph.total_nodes, 1);
});

test('harness asks the local llm for chat responses', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/v1/chat/completions' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        const parsed = JSON.parse(body) as { model?: string; messages?: Array<{ role?: string; content?: string }> };

        assert.equal(parsed.model, 'qwen3.5:4b');
        assert.equal(parsed.messages?.[0]?.role, 'system');
        assert.equal(parsed.messages?.[1]?.content, 'pregunta sobre Clean Architecture');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: 'respuesta llm' } }] }));
      });
      return;
    }

    if (req.url === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [] }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();

  if (typeof address !== 'object' || address === null) {
    throw new Error('server address not available');
  }

  const llmClient = {
    healthcheck: async () => ({ ok: true, status: 200 }),
    chat: async (messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) => {
      const response = await fetch(`http://127.0.0.1:${address.port}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'qwen3.5:4b', messages, stream: false }),
      });

      const raw = await response.json() as { choices: Array<{ message: { content: string } }> };

      return {
        content: raw.choices[0].message.content,
        model: 'qwen3.5:4b',
        raw,
      };
    },
  };

  const result = await runLibrarian('pregunta sobre Clean Architecture', undefined, undefined, llmClient);

  assert.equal(result.routed.intent, 'ask');
  assert.equal(result.result.content, 'respuesta llm');

  await new Promise<void>((resolve) => server.close(() => resolve()));
});
