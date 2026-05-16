import React from 'react';
import { Box, Text } from 'ink';
import { useAppState } from '../state.js';

export const ActivityStream: React.FC = () => {
  const { state } = useAppState();
  const entries = state.activityLog.slice(-2);

  if (entries.length === 0) return null;

  return (
    <Box flexDirection="column">
      {entries.map((entry) => (
        <Box key={entry.id} gap={1}>
          <Text color={entry.color}>{entry.icon}</Text>
          <Text dimColor wrap="wrap">{entry.message}</Text>
        </Box>
      ))}
    </Box>
  );
};
