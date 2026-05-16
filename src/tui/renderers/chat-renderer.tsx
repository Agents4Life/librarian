import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';
import type { ChatMessage } from '../types.js';

const clean = (text: string) =>
  text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();

const humanizeSearchResults = (parsed: { results?: Array<{ file?: string; score?: number; snippet?: string }> }): string => {
  const results = parsed.results ?? [];
  if (results.length === 0) return 'No se encontraron resultados.';
  const lines = results.map((r) => {
    const name = (r.file ?? '').split('/').pop()?.replace('.md', '') ?? r.file ?? '?';
    const pct = typeof r.score === 'number' ? ` (${Math.round(r.score * 100)}%)` : '';
    const snip = r.snippet ? ` — ${r.snippet.slice(0, 80)}` : '';
    return `  → ${name}${pct}${snip}`;
  });
  return `Se encontraron ${results.length} resultado${results.length > 1 ? 's' : ''}:\n${lines.join('\n')}`;
};

const humanizeResponse = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return trimmed;

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.file != null) {
      return humanizeSearchResults({ results: parsed });
    }

    if (parsed.results && Array.isArray(parsed.results)) {
      return humanizeSearchResults(parsed);
    }

    if (parsed.message && typeof parsed.message === 'string') {
      let out = parsed.message;
      if (parsed.hint) out += `\n💡 ${parsed.hint}`;
      if (Array.isArray(parsed.preview) && parsed.preview.length > 0) {
        out += '\nArchivos: ' + parsed.preview.slice(0, 5).join(', ');
      }
      return out;
    }

    if (parsed.total_files != null || parsed.total_nodes != null) {
      const parts: string[] = [];
      if (parsed.total_files != null) parts.push(`${parsed.total_files} archivos`);
      if (parsed.wiki_pages != null) parts.push(`${parsed.wiki_pages} paginas wiki`);
      if (parsed.total_nodes != null) parts.push(`${parsed.total_nodes} nodos`);
      if (parsed.total_edges != null) parts.push(`${parsed.total_edges} conexiones`);
      if (parsed.orphans != null) parts.push(`${parsed.orphans} huerfanas`);
      if (parts.length > 0) return `Estado del vault: ${parts.join(', ')}.`;
    }

    return JSON.stringify(parsed, null, 2);
  } catch {
    return trimmed;
  }
};

export const ChatRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'chat') return null;

  const messages: ChatMessage[] = node.messages.filter((m: ChatMessage) => m.role !== 'system');
  const visible = messages.slice(-20);

  if (visible.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color={theme.primary} bold>Chat con Librarian</Text>
        <Text dimColor>Escribí una pregunta o /comando para empezar.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {visible.map((msg: ChatMessage, i: number) => {
        const content = clean(msg.content);
        if (msg.role === 'user') {
          return (
            <Box key={i} flexDirection="column" borderStyle="single" borderLeft={true} borderRight={false} borderTop={false} borderBottom={false} borderColor={theme.primary} paddingLeft={1}>
              <Text bold color={theme.primary}>Vos</Text>
              <Text wrap="wrap">{content}</Text>
            </Box>
          );
        }

        return (
          <Box key={i} flexDirection="column">
            <Text bold color={theme.muted}>Librarian</Text>
            <Text wrap="wrap">{humanizeResponse(content)}</Text>
          </Box>
        );
      })}
    </Box>
  );
};
