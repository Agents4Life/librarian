import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

export const WikiStatusRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'status') return null;

  const { stats, graph } = node;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>Estado del Vault</Text>
      <Text> </Text>

      <Text bold>Archivos</Text>
      <Text>  Total:       {stats.total_files}</Text>
      <Text>  Wiki pages:  <Text color={theme.success}>{stats.wiki_pages}</Text></Text>
      <Text>  Raw files:   {stats.raw_files}</Text>
      <Text> </Text>

      <Text bold>Conexiones</Text>
      <Text>  Nodos:       {graph.total_nodes}</Text>
      <Text>  Conexiones:  {graph.total_edges}</Text>
      <Text>  Promedio:    {graph.avg_connections.toFixed(1)}</Text>
      <Text>  Huérfanas:   <Text color={graph.orphans > 0 ? theme.warning : theme.success}>{graph.orphans}</Text></Text>

      {graph.most_connected.length > 0 && (
        <>
          <Text> </Text>
          <Text bold>Más conectadas</Text>
          {graph.most_connected.slice(0, 5).map((c, i) => (
            <Box key={i} gap={1}>
              <Text dimColor>{i + 1}.</Text>
              <Text>{c.file.split('/').pop()?.replace('.md', '')}</Text>
              <Text dimColor>{c.connections} conexiones</Text>
            </Box>
          ))}
        </>
      )}
    </Box>
  );
};
