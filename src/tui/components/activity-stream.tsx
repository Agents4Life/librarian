import React from 'react';
import { Box, Text } from 'ink';
import { useAppState } from '../state.js';

const MAX_VISIBLE = 5;

export const ActivityStream: React.FC = () => {
  const { state } = useAppState();
  const entries = state.activityLog.slice(-MAX_VISIBLE);

  if (entries.length === 0) return null;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {entries.map((entry) => (
        <Box key={entry.id} gap={1}>
          <Text color={entry.color}>{entry.icon}</Text>
          <Text dimColor wrap="wrap">{entry.message}</Text>
        </Box>
      ))}
    </Box>
  );
};
