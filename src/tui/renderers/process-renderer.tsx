import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

export const ProcessRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'process') return null;

  const { inbox } = node;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>Procesar Notas</Text>
      <Text> </Text>

      <Text>Total en raw/:     {inbox.total}</Text>
      <Text>Curatables:        <Text color={theme.success}>{inbox.curatable}</Text></Text>
      <Text> </Text>

      {inbox.preview.length > 0 && (
        <>
          <Text bold>Próximas a procesar</Text>
          {inbox.preview.map((file: any, i: number) => (
            <Box key={i} gap={1}>
              <Text dimColor>{i + 1}.</Text>
              <Text>{file.split('/').pop()}</Text>
            </Box>
          ))}
          <Text> </Text>
          <Text dimColor>Para procesar: node scripts/process-raw.js --limit 10</Text>
          <Text dimColor>Preview:       node scripts/process-raw.js --dry-run --limit 10</Text>
        </>
      )}

      {inbox.curatable === 0 && (
        <Text color={theme.success}>No hay notas pendientes para procesar.</Text>
      )}
    </Box>
  );
};
