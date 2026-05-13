import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

export const StaleRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'stale') return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>Notas sin tocar 90 días</Text>
      <Text dimColor>{node.notes.length} encontradas</Text>
      <Text> </Text>
      {node.notes.length === 0 && (
        <Text color={theme.success}>Todas las notas están activas.</Text>
      )}
      {node.notes.map((note, i) => (
        <Box key={i} gap={1}>
          <Text dimColor>{String(i + 1).padStart(2)}.</Text>
          <Text>{note.file.split('/').pop()?.replace('.md', '')}</Text>
          <Text color={note.days_since_touch > 180 ? theme.error : theme.warning}>{note.days_since_touch}d</Text>
        </Box>
      ))}
    </Box>
  );
};
