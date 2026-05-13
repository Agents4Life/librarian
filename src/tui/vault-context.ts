import { defaultConfig } from '../config.js';
import { createIndexContext } from '../index-context.js';
import { createSemanticTool } from '../tools/semantic.tool.js';
import { createWikilinksTool } from '../tools/wikilinks.tool.js';
import type { ChatMessage } from '../tui/types.js';

interface VaultContext {
  semanticResults: string;
  linksContext: string;
}

const extractKeywords = (messages: ChatMessage[]): string[] => {
  const recentUserMessages = messages
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => m.content);

  const combined = recentUserMessages.join(' ');

  return combined
    .toLowerCase()
    .split(/[^a-z0-9áéíóúüñ]+/i)
    .filter((word) => word.length > 3)
    .slice(0, 10);
};

export const gatherVaultContext = async (messages: ChatMessage[]): Promise<VaultContext> => {
  const keywords = extractKeywords(messages);

  if (keywords.length === 0) {
    return { semanticResults: '', linksContext: '' };
  }

  const query = keywords.join(' ');
  const vaultPath = defaultConfig.vaultPath;
  const indexContext = await createIndexContext(vaultPath).catch(() => null);

  if (!indexContext) {
    return { semanticResults: '', linksContext: '' };
  }

  const toolContext = { vaultPath, queryApi: indexContext.query };

  const [semanticResults, graphStats] = await Promise.all([
    createSemanticTool(toolContext).searchSemantic(query, { topK: 5, minScore: 0.1 }).catch(() => ({ results: [] })),
    createWikilinksTool(toolContext).getGraphStats().catch(() => ({
      total_nodes: 0,
      total_edges: 0,
      most_connected: [],
      orphans: 0,
      avg_connections: 0,
      clusters: [],
    })),
  ]);

  const semanticText = semanticResults.results.length > 0
    ? semanticResults.results
        .map((r) => `- ${r.file} (score: ${r.score.toFixed(2)}): ${r.snippet}`)
        .join('\n')
    : '';

  const linksText = graphStats.most_connected.length > 0
    ? graphStats.most_connected.slice(0, 5).map((c) => `- ${c.file}: ${c.connections} conexiones`).join('\n')
    : '';

  return { semanticResults: semanticText, linksContext: linksText };
};

export const buildContextualSystemPrompt = (basePrompt: string, context: VaultContext): string => {
  const parts = [basePrompt];

  if (context.semanticResults) {
    parts.push(`\nNotas relevantes de la wiki:\n${context.semanticResults}`);
  }

  if (context.linksContext) {
    parts.push(`\nConceptos mas conectados:\n${context.linksContext}`);
  }

  parts.push('\nUsa este contexto para responder. Si encontras cruces interesantes entre conceptos, mencionálos. Si el usuario pide generar cruces, proponelos basandote en las notas encontradas.');

  return parts.join('');
};
