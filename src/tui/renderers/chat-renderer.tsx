import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';
import type { ChatMessage } from '../types.js';

export const ChatRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'chat') return null;

  const messages: ChatMessage[] = node.messages.filter((m: ChatMessage) => m.role !== 'system');
  const visible = messages.slice(-20);

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
    </Box>
  );
};
