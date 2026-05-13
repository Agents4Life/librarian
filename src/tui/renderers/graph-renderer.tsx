import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

export const GraphRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'graph') return null;

  const { stats } = node;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>Mapa de Conexiones</Text>
      <Text> </Text>

      <Text>Nodos:        {stats.total_nodes}</Text>
      <Text>Conexiones:   {stats.total_edges}</Text>
      <Text>Promedio:     {stats.avg_connections.toFixed(1)}</Text>
      <Text>Huérfanas:    <Text color={stats.orphans > 0 ? theme.warning : theme.success}>{stats.orphans}</Text></Text>
      <Text> </Text>

      {stats.most_connected.length > 0 && (
        <>
          <Text bold>Top conexiones</Text>
          {stats.most_connected.slice(0, 10).map((c, i) => {
            const bar = '█'.repeat(Math.min(c.connections, 20));
            return (
              <Box key={i} gap={1}>
                <Text dimColor>{String(i + 1).padStart(2)}.</Text>
                <Text>{c.file.split('/').pop()?.replace('.md', '')}</Text>
                <Text color={theme.primary}>{bar}</Text>
                <Text dimColor>{c.connections}</Text>
              </Box>
            );
          })}
        </>
      )}
    </Box>
  );
};
