import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

export const ReviewRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'review') return null;

  const pending = node.reviews.filter((r) => r.status === 'pending');
  const current = pending[node.activeIndex];

  if (!current) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color={theme.primary}>Review</Text>
        <Text color={theme.success}>No hay propuestas pendientes.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>Review ({node.activeIndex + 1}/{pending.length})</Text>
      <Text> </Text>

      <Text bold>Source</Text>
      <Text dimColor>{current.source}</Text>
      <Text> </Text>

      <Text bold>Target</Text>
      <Text dimColor>{current.target}</Text>
      <Text> </Text>

      <Text bold>Type: {current.type}</Text>

      {current.preview && (
        <>
          <Text> </Text>
          <Text bold>Preview</Text>
          <Text dimColor wrap="wrap">{current.preview.slice(0, 300)}</Text>
        </>
      )}

      <Text> </Text>
      <Text dimColor>a approve · r reject · n next · p prev</Text>
    </Box>
  );
};
