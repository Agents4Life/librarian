import React from 'react';
import { Box, Text } from 'ink';
import type { ChatMessage } from './types.js';

interface ChatViewProps {
  messages: ChatMessage[];
  inputValue: string;
  loading: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({ messages, inputValue, loading }) => {
  const visibleMessages = messages.filter((m) => m.role !== 'system');

  return (
    <Box flexDirection="column">
      <Text bold>Chatear con Ollama + Vault</Text>
      <Text dimColor>Esc para volver al menu</Text>
      <Text> </Text>
      {visibleMessages.map((msg, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Text bold>{msg.role === 'user' ? 'Vos' : 'Librarian'}:</Text>
          <Text wrap="wrap">{msg.content}</Text>
        </Box>
      ))}
      {loading && (
        <Text dimColor>Buscando en el vault y pensando...</Text>
      )}
      {!loading && (
        <Box>
          <Text bold>&gt; </Text>
          <Text>{inputValue}</Text>
        </Box>
      )}
    </Box>
  );
};
