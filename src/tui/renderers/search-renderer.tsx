import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

export const SearchRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'search') return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>Resultados: "{node.query}"</Text>
      <Text dimColor>{node.results.length} resultados</Text>
      <Text> </Text>
      {node.results.length === 0 && (
        <Text dimColor>No se encontraron resultados.</Text>
      )}
      {node.results.map((r, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Box gap={1}>
            <Text color={theme.primary}>{'→'}</Text>
            <Text bold>{r.file.split('/').pop()?.replace('.md', '')}</Text>
            <Text dimColor>{(r.score * 100).toFixed(0)}%</Text>
          </Box>
          {r.snippet && (
            <Text dimColor wrap="wrap">  {r.snippet.slice(0, 120)}</Text>
          )}
        </Box>
      ))}
    </Box>
  );
};
