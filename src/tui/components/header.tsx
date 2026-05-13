import React from 'react';
import { Box, Text } from 'ink';
import { theme, icons } from '../theme.js';
import { useAppState } from '../state.js';

export const Header: React.FC = () => {
  const { state } = useAppState();
  const vaultName = state.vaultPath.split('/').pop() ?? state.vaultPath;

  const statusIcon = state.ollamaStatus === 'ok'
    ? <Text color={theme.success}>{icons.bullet}</Text>
    : state.ollamaStatus === 'checking'
      ? <Text color={theme.warning}>◎</Text>
      : <Text color={theme.error}>{icons.circle}</Text>;

  const statusText = state.ollamaStatus === 'ok'
    ? 'ollama:ok'
    : state.ollamaStatus === 'checking'
      ? 'ollama:...'
      : 'ollama:down';

  const inboxNode = state.workspace.find((n) => n.type === "proposal-inbox");
  const pendingCount = inboxNode && inboxNode.type === "proposal-inbox"
    ? inboxNode.proposals.length
    : 0;

  return (
    <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
      <Box gap={1}>
        <Text bold color={theme.primary}>Librarian</Text>
      </Box>
      <Box gap={1}>
        <Text dimColor>{vaultName}</Text>
        <Text dimColor>·</Text>
        {statusIcon}
        <Text dimColor>{statusText}</Text>
        {pendingCount > 0 && (
          <>
            <Text dimColor>·</Text>
            <Text color={theme.warning}>{pendingCount} pending</Text>
          </>
        )}
      </Box>
    </Box>
  );
};
