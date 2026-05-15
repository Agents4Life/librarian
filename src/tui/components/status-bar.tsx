import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppState } from '../state.js';

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
};

export const StatusBar: React.FC = () => {
  const { state } = useAppState();
  const vaultName = state.vaultPath.split('/').pop() ?? '';

  // LLM status
  const llmCfg: Record<string, { label: string; color: string }> = {
    ready: { label: 'llm:ok', color: theme.success },
    'no-model': { label: 'llm:no-model', color: theme.warning },
    down: { label: 'llm:down', color: theme.error },
    checking: { label: 'llm:...', color: theme.muted },
  };
  const llm = llmCfg[state.ollamaStatus] ?? llmCfg.checking;

  // Index status
  const idxCfg: Record<string, { label: string; color: string }> = {
    fresh: { label: 'idx:fresh', color: theme.success },
    stale: { label: 'idx:stale', color: theme.warning },
    missing: { label: 'idx:missing', color: theme.muted },
    rebuilding: { label: 'idx:building', color: theme.primary },
  };
  const idx = idxCfg[state.indexStatus] ?? idxCfg.missing;

  // Health
  const healthNode = state.workspace.find((n) => n.type === 'graph-health');
  const healthStatus = healthNode && healthNode.type === 'graph-health' ? healthNode.summary.status : undefined;
  const rawBacklog = healthNode && healthNode.type === 'graph-health' ? healthNode.summary.rawBacklog : 0;

  // Inbox count
  const inboxNode = state.workspace.find((n) => n.type === 'proposal-inbox');
  const inboxCount = inboxNode && inboxNode.type === 'proposal-inbox' ? inboxNode.proposals.length : 0;

  return (
    <Box justifyContent="space-between">
      <Box gap={1}>
        <Text bold color={theme.primary}>{'📚'} {vaultName}</Text>
        <Text dimColor>│</Text>
        <Text color={llm.color}>{llm.label}</Text>
        <Text dimColor>│</Text>
        <Text color={idx.color}>{idx.label}</Text>
        {rawBacklog > 0 && (
          <>
            <Text dimColor>│</Text>
            <Text color={theme.warning}>raw:{rawBacklog}</Text>
          </>
        )}
        {inboxCount > 0 && (
          <>
            <Text dimColor>│</Text>
            <Text color={theme.warning}>inbox:{inboxCount}</Text>
          </>
        )}
      </Box>
      <Box gap={1}>
        {healthStatus && (
          <Text color={healthStatus === 'healthy' ? theme.success : healthStatus === 'warning' ? theme.warning : theme.error}>
            {healthStatus}
          </Text>
        )}
        {state.lastIndexAt && <Text dimColor>{formatTimeAgo(state.lastIndexAt)}</Text>}
      </Box>
    </Box>
  );
};
