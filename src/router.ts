import type { Intent, RoutedIntent } from './types.js';
import { createLlmClient, type LlmMessage } from './llm.js';

const patterns: Array<[RegExp, RoutedIntent]> = [
  [/proces|nueva|notas/i, { intent: 'process-notes', confidence: 0.9, tool: 'filesystem' }],
  [/buscar|busc[aá]|qué tengo|relacion/i, { intent: 'search-wiki', confidence: 0.85, tool: 'semantic' }],
  [/estado|cómo está|stats|resumen/i, { intent: 'wiki-status', confidence: 0.8, tool: 'frontmatter' }],
  [/incomplet|vac[ií]a/i, { intent: 'incomplete-notes', confidence: 0.85, tool: 'frontmatter' }],
  [/90 d[ií]as|stale|sin tocar/i, { intent: 'stale-notes', confidence: 0.85, tool: 'frontmatter' }],
  [/hu[eé]rfana|orphan/i, { intent: 'orphan-notes', confidence: 0.85, tool: 'frontmatter' }],
  [/conexi|grafo|mapa de conexiones/i, { intent: 'connections', confidence: 0.8, tool: 'wikilinks' }],
  [/ask|pregunta|consulta/i, { intent: 'ask', confidence: 0.95 }],
];

const validIntents: Intent[] = [
  'process-notes',
  'search-wiki',
  'wiki-status',
  'incomplete-notes',
  'stale-notes',
  'orphan-notes',
  'connections',
  'ask',
];

const intentClassificationPrompt = `You are an intent classifier for a wiki librarian agent. Given a user input, classify it into exactly one of these intents:

- process-notes: The user wants to process, curate, or ingest new notes from the raw inbox into the wiki.
- search-wiki: The user wants to search, find, or query information in the wiki.
- wiki-status: The user wants to know the overall status, stats, or summary of the vault.
- incomplete-notes: The user wants to list empty or incomplete wiki pages.
- stale-notes: The user wants to list notes that haven't been touched in a long time.
- orphan-notes: The user wants to find orphan notes (pages with no incoming or outgoing wikilinks).
- connections: The user wants to see wikilinks, connections, or the graph structure.
- ask: The user is asking a question, wants an explanation, or is having a conversation.

Respond with ONLY a JSON object: {"intent": "...", "confidence": 0.0-1.0}
Do not include any other text.`;

const classifyWithLlm = async (input: string): Promise<RoutedIntent | null> => {
  try {
    const client = createLlmClient();
    const messages: LlmMessage[] = [
      { role: 'system', content: intentClassificationPrompt },
      { role: 'user', content: input },
    ];

    const response = await client.chat(messages);
    const content = response.content?.trim();

    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.intent || !validIntents.includes(parsed.intent)) {
      return null;
    }

    return {
      intent: parsed.intent as Intent,
      confidence: typeof parsed.confidence === 'number' ? Math.min(parsed.confidence, 1) : 0.7,
      method: 'llm',
    };
  } catch {
    return null;
  }
};

export const routeIntent = async (input: string): Promise<RoutedIntent> => {
  const match = patterns.find(([pattern]) => pattern.test(input));

  if (match) {
    return { ...match[1], method: 'regex' };
  }

  const llmResult = await classifyWithLlm(input);

  if (llmResult) {
    return llmResult;
  }

  return { intent: 'unknown', confidence: 0.2 };
};
