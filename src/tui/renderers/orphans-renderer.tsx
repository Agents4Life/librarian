import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

export const OrphansRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'orphans') return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>Notas Huérfanas</Text>
      <Text dimColor>{node.notes.length} encontradas</Text>
      <Text> </Text>
      {node.notes.length === 0 && (
        <Text color={theme.success}>No hay notas huérfanas.</Text>
      )}
      {node.notes.map((note, i) => (
        <Box key={i} gap={1}>
          <Text dimColor>{String(i + 1).padStart(2)}.</Text>
          <Text>{note.file.split('/').pop()?.replace('.md', '')}</Text>
          {!note.has_outgoing && !note.has_incoming && <Text dimColor>(sin conexiones)</Text>}
        </Box>
      ))}
    </Box>
  );
};
