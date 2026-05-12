import { createServer } from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createLlmClient } from '../src/llm.js';

test('llm client sends chat requests to ollama-compatible api', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/v1/chat/completions' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        const parsed = JSON.parse(body) as { model?: string; messages?: Array<{ content?: string }> };

        assert.equal(parsed.model, 'qwen3.5:4b');
        assert.equal(parsed.messages?.[0]?.content, 'hola');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: 'respuesta' } }] }));
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

  const client = createLlmClient({
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    model: 'qwen3.5:4b',
    timeoutMs: 5000,
  });

  const health = await client.healthcheck();
  const chat = await client.chat([{ role: 'user', content: 'hola' }]);

  assert.equal(health.ok, true);
  assert.equal(chat.content, 'respuesta');
  assert.equal(chat.model, 'qwen3.5:4b');

  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('llm client falls back to the secondary model when the primary fails', async () => {
  const seenModels: string[] = [];
  const server = createServer((req, res) => {
    if (req.url === '/v1/chat/completions' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        const parsed = JSON.parse(body) as { model?: string };
        seenModels.push(parsed.model ?? '');

        if (parsed.model === 'qwen3.5:4b') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'model unavailable' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: 'respuesta secundaria' } }] }));
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

  const client = createLlmClient({
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    model: 'qwen3.5:4b',
    fallbackModel: 'llama3.1:8b',
    timeoutMs: 5000,
  });

  const chat = await client.chat([{ role: 'user', content: 'hola' }]);

  assert.deepEqual(seenModels, ['qwen3.5:4b', 'llama3.1:8b']);
  assert.equal(chat.content, 'respuesta secundaria');
  assert.equal(chat.model, 'llama3.1:8b');

  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('llm client falls back to the next ollama base url when the first one fails', async () => {
  const primary = createServer((req, res) => {
    if (req.url === '/v1/chat/completions' && req.method === 'POST') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'service unavailable' }));
      return;
    }

    if (req.url === '/v1/models') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'service unavailable' }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  const secondary = createServer((req, res) => {
    if (req.url === '/v1/chat/completions' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: 'respuesta por url secundaria' } }] }));
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

  await new Promise<void>((resolve) => primary.listen(0, resolve));
  await new Promise<void>((resolve) => secondary.listen(0, resolve));

  const primaryAddress = primary.address();
  const secondaryAddress = secondary.address();

  if (typeof primaryAddress !== 'object' || primaryAddress === null || typeof secondaryAddress !== 'object' || secondaryAddress === null) {
    throw new Error('server address not available');
  }

  const client = createLlmClient({
    baseUrl: `http://127.0.0.1:${primaryAddress.port}/v1`,
    fallbackBaseUrls: [`http://127.0.0.1:${secondaryAddress.port}/v1`],
    model: 'qwen3.5:4b',
    timeoutMs: 5000,
  });

  const chat = await client.chat([{ role: 'user', content: 'hola' }]);

  assert.equal(chat.content, 'respuesta por url secundaria');

  await new Promise<void>((resolve) => primary.close(() => resolve()));
  await new Promise<void>((resolve) => secondary.close(() => resolve()));
});
