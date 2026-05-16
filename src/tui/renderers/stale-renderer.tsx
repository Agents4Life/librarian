import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

const PAGE_SIZE = 12;

interface StaleState {
  page: number;
  maxPage: number;
}

export const StaleRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'stale') return null;

  const [state, setState] = React.useState<StaleState>(() => {
    const maxPage = Math.max(0, Math.ceil(node.notes.length / PAGE_SIZE) - 1);
    return { page: 0, maxPage };
  });

  const startIdx = state.page * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const visible = node.notes.slice(startIdx, endIdx);

  const nextPage = () => setState(prev => ({ ...prev, page: Math.min(prev.page + 1, prev.maxPage) }));
  const prevPage = () => setState(prev => ({ ...prev, page: Math.max(prev.page - 1, 0) }));

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color={theme.primary}>Notas sin tocar 90+ días</Text>
        <Text dimColor>{state.page + 1}/{state.maxPage + 1}</Text>
      </Box>
      <Text dimColor>{node.notes.length} notas potencialmente obsoletas</Text>
      <Text> </Text>

      {visible.length === 0 && (
        <Text dimColor>No se encontraron notas stale en esta página.</Text>
      )}

      {visible.map((note: any, i: number) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Box gap={1}>
            <Text color={theme.warning}>⧖</Text>
            <Text bold>{note.file.split('/').pop()?.replace('.md', '')}</Text>
            <Text dimColor>({note.days_since_touch} días)</Text>
          </Box>
          <Text dimColor>  Último cambio: {note.last_touched}</Text>
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