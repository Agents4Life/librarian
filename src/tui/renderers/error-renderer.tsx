import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

export const ErrorRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'chat') return null;

  const lastMsg = node.messages[node.messages.length - 1];
  if (!lastMsg || lastMsg.role !== 'assistant') return null;

  return (
    <Box flexDirection="column" paddingX={1} borderStyle="single" borderLeft={true} borderRight={false} borderTop={false} borderBottom={false} borderColor={theme.error} paddingLeft={1}>
      <Text bold color={theme.error}>Error</Text>
      <Text color={theme.error}>{lastMsg.content}</Text>
    </Box>
  );
};
