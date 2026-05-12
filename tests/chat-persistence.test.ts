import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

test('chat persistence writes chats outside raw', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'purim-vault-'));
  process.env.LIBRARIAN_VAULT_PATH = vaultPath;

  const { saveChat } = await import(`../src/tui/chat-persistence.js?test=${Date.now()}`);

  await saveChat([
    { role: 'system', content: 'system' },
    { role: 'user', content: 'hola' },
    { role: 'assistant', content: 'respuesta' },
  ]);

  const content = await readFile(path.join(vaultPath, 'reportes', 'chats', `chat-${new Date().toISOString().slice(0, 10)}.md`), 'utf8');

  assert.match(content, /hola/);
});
