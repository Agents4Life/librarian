import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';
import type { ChatMessage } from '../types.js';

const PAGE_SIZE = 10;

interface ChatState {
  page: number;
  maxPage: number;
}

export const ChatRenderer: React.FC<RendererProps> = ({ node }) => {
  const [state, setState] = React.useState<ChatState>(() => {
    const messages: ChatMessage[] = node.messages.filter((m: ChatMessage) => m.role !== 'system');
    const maxPage = Math.max(0, Math.ceil(messages.length / PAGE_SIZE) - 1);
    return { page: 0, maxPage };
  });

  if (node.type !== 'chat') return null;

  const messages: ChatMessage[] = node.messages.filter((m: ChatMessage) => m.role !== 'system');
  const startIdx = state.page * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const visible = messages.slice(startIdx, endIdx);

  const nextPage = () => setState(prev => ({ ...prev, page: Math.min(prev.page + 1, prev.maxPage) }));
  const prevPage = () => setState(prev => ({ ...prev, page: Math.max(prev.page - 1, 0) }));

  if (visible.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={theme.primary} bold>Chat con Librarian</Text>
        <Text dimColor>Escribí una pregunta o /comando para empezar.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color={theme.primary}>Chat con Librarian</Text>
        <Text dimColor>{state.page + 1}/{state.maxPage + 1}</Text>
      </Box>

      {visible.map((msg: ChatMessage, i: number) => {
        if (msg.role === 'user') {
          return (
            <Box key={i} flexDirection="column" marginBottom={1} borderStyle="single" borderLeft={true} borderRight={false} borderTop={false} borderBottom={false} borderColor={theme.primary} paddingLeft={1}>
              <Text bold color={theme.primary}>Vos</Text>
              <Text wrap="wrap">{msg.content}</Text>
            </Box>
          );
        }

        return (
          <Box key={i} flexDirection="column" marginBottom={1}>
            <Text bold color={theme.muted}>Librarian</Text>
            <Text wrap="wrap">{msg.content}</Text>
          </Box>
        );
      })}

      <Box justifyContent="space-between" marginTop={1}>
        <Text dimColor>[←/→] página anterior/siguiente</Text>
        <Text dimColor>{startIdx + 1}-{Math.min(endIdx, messages.length)} de {messages.length} mensajes</Text>
      </Box>
    </Box>
  );
};