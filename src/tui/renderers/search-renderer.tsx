import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from '../renderers/registry.js';
import { Clickable } from '../components/mouse-support.js';

const PAGE_SIZE = 15;

interface SearchState {
  page: number;
  maxPage: number;
}

export const SearchRenderer: React.FC<RendererProps> = ({ node }) => {
  const [state, setState] = React.useState<SearchState>(() => {
    const maxPage = Math.max(0, Math.ceil(node.results.length / PAGE_SIZE) - 1);
    return { page: 0, maxPage };
  });

  if (node.type !== 'search') return null;

  const startIdx = state.page * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const visible = node.results.slice(startIdx, endIdx);

  const nextPage = () => setState(prev => ({ ...prev, page: Math.min(prev.page + 1, prev.maxPage) }));
  const prevPage = () => setState(prev => ({ ...prev, page: Math.max(prev.page - 1, 0) }));

  const openFile = (filePath: string) => {
    // In a real implementation, this would open the file in the editor
    // For now, we'll just log it
    console.log(`Opening file: ${filePath}`);
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Box gap={1}>
          <Text bold color={theme.primary}>Resultados:</Text>
          <Text>"{node.query}"</Text>
        </Box>
        <Text dimColor>{state.page + 1}/{state.maxPage + 1}</Text>
      </Box>
      <Text dimColor>{node.results.length} resultados</Text>
      <Text> </Text>
      
      {visible.length === 0 && (
        <Text dimColor>No se encontraron resultados en esta página.</Text>
      )}
      
      {visible.map((r, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Box gap={1}>
            <Text color={theme.primary}>{'→'}</Text>
            
            <Clickable
              onClick={() => openFile(r.file)}
              hoverText="open file"
            >
              <Text bold>{r.file.split('/').pop()?.replace('.md', '')}</Text>
            </Clickable>
            
            <Text dimColor>{(r.score * 100).toFixed(0)}%</Text>
          </Box>
          {r.snippet && (
            <Text dimColor wrap="wrap">  {r.snippet.slice(0, 120)}</Text>
          )}
        </Box>
      ))}
      
      {/* Pagination controls with mouse support */}
      {node.results.length > PAGE_SIZE && (
        <Box justifyContent="space-between" marginTop={1}>
          <Box gap={2}>
            <Clickable
              onClick={prevPage}
              disabled={state.page === 0}
              hoverText="previous page"
            >
              <Text color={state.page === 0 ? theme.muted : theme.primary}>
                ← Previous
              </Text>
            </Clickable>
            
            <Clickable
              onClick={nextPage}
              disabled={state.page === state.maxPage}
              hoverText="next page"
            >
              <Text color={state.page === state.maxPage ? theme.muted : theme.primary}>
                Next →
              </Text>
            </Clickable>
          </Box>
          
          <Text dimColor>{startIdx + 1}-{Math.min(endIdx, node.results.length)} de {node.results.length} resultados</Text>
        </Box>
      )}
    </Box>
  );
};