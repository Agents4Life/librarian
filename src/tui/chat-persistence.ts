import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { defaultConfig } from '../config.js';
import type { ChatMessage } from './types.js';

const CHATS_DIR = 'reportes/chats';

const chatsDir = () => join(defaultConfig.vaultPath, CHATS_DIR);

const today = () => new Date().toISOString().slice(0, 10);

const messagesToMarkdown = (messages: ChatMessage[]): string => {
  const lines = messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const label = m.role === 'user' ? '**Van**' : '**Librarian**';
      return `${label}: ${m.content}`;
    });

  return `---\npurim.type: chat\npurim.date: ${today()}\n---\n\n# Charla del ${today()}\n\n${lines.join('\n\n')}\n`;
};

const parseChatMessages = (content: string): ChatMessage[] => {
  const system: ChatMessage = {
    role: 'system',
    content: 'Eres Librarian, el bibliotecario del vault de Obsidian de Van. Responde en el idioma del usuario, de forma breve y util. Cuando hables del vault, usa la informacion de contexto que se te proporciona. Si detectas cruces interesantes entre conceptos, proponlos.',
  };

  const messages: ChatMessage[] = [system];

  const blocks = content.split(/\n(?=\*\*Van\*\*:|\*\*Librarian\*\*:)/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('**Van**:')) {
      messages.push({ role: 'user', content: trimmed.replace('**Van**:', '').trim() });
    } else if (trimmed.startsWith('**Librarian**:')) {
      messages.push({ role: 'assistant', content: trimmed.replace('**Librarian**:', '').trim() });
    }
  }

  return messages;
};

export const saveChat = async (messages: ChatMessage[]): Promise<void> => {
  const userMessages = messages.filter((m) => m.role !== 'system');
  if (userMessages.length === 0) return;

  await mkdir(chatsDir(), { recursive: true });

  const date = today();
  let filename = `chat-${date}.md`;

  try {
    await readFile(join(chatsDir(), filename), 'utf8');
    const files = await readdir(chatsDir());
    const existing = files.filter((f) => f.startsWith(`chat-${date}`));
    filename = `chat-${date}-${String(existing.length).padStart(2, '0')}.md`;
  } catch {
    // file does not exist yet, use default name
  }

  await writeFile(join(chatsDir(), filename), messagesToMarkdown(messages), 'utf8');
};

export const loadLastChat = async (): Promise<ChatMessage[] | null> => {
  try {
    await mkdir(chatsDir(), { recursive: true });

    const files = await readdir(chatsDir());
    const chatFiles = files
      .filter((f) => f.startsWith('chat-') && f.endsWith('.md'))
      .sort()
      .reverse();

    if (chatFiles.length === 0) return null;

    const content = await readFile(join(chatsDir(), chatFiles[0]), 'utf8');
    return parseChatMessages(content);
  } catch {
    return null;
  }
};
