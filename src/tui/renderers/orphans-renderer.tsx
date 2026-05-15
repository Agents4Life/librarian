import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

const PAGE_SIZE = 12;

interface OrphansState {
  page: number;
  maxPage: number;
}

export const OrphansRenderer: React.FC<RendererProps> = ({ node }) => {
  const [state, setState] = React.useState<OrphansState>(() => {
    const maxPage = Math.max(0, Math.ceil(node.notes.length / PAGE_SIZE) - 1);
    return { page: 0, maxPage };
  });

  if (node.type !== 'orphans') return null;

  const startIdx = state.page * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const visible = node.notes.slice(startIdx, endIdx);

  const nextPage = () => setState(prev => ({ ...prev, page: Math.min(prev.page + 1, prev.maxPage) }));
  const prevPage = () => setState(prev => ({ ...prev, page: Math.max(prev.page - 1, 0) }));

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color={theme.primary}>Notas huérfanas</Text>
        <Text dimColor>{state.page + 1}/{state.maxPage + 1}</Text>
      </Box>
      <Text dimColor>{node.notes.length} notas sin enlaces</Text>
      <Text> </Text>

      {visible.length === 0 && (
        <Text dimColor>No se encontraron notas huérfanas en esta página.</Text>
      )}

      {visible.map((note, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Box gap={1}>
            <Text color={theme.primary}>◈</Text>
            <Text bold>{note.file.split('/').pop()?.replace('.md', '')}</Text>
            {note.has_outgoing && <Text color={theme.success}>→</Text>}
            {note.has_incoming && <Text color={theme.accent}>←</Text>}
          </Box>
          <Text dimColor>  {note.file}</Text>
        </Box>
      ))}

      {node.notes.length > PAGE_SIZE && (
        <Box justifyContent="space-between" marginTop={1}>
          <Text dimColor>[←/→] página anterior/siguiente</Text>
          <Text dimColor>{startIdx + 1}-{Math.min(endIdx, node.notes.length)} de {node.notes.length} notas</Text>
        </Box>
      )}
    </Box>
  );
};