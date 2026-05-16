import React from 'react';
import { Box, Text } from 'ink';
import { theme, icons } from '../theme.js';
import { useAppState } from '../state.js';
import type { GraphHealthStatus } from '../activity/types.js';

export const Header: React.FC = () => {
  const { state } = useAppState();
  const vaultName = state.vaultPath.split('/').pop() ?? state.vaultPath;

  const ollamaCfg: Record<string, { icon: string; color: string; label: string }> = {
    ready: { icon: '◉', color: theme.success, label: 'ok' },
    'no-model': { icon: '◎', color: theme.warning, label: 'no-model' },
    down: { icon: '○', color: theme.error, label: 'down' },
    checking: { icon: '◌', color: theme.muted, label: '...' },
  };
  const ollama = ollamaCfg[state.ollamaStatus] ?? ollamaCfg.checking;

  const idxCfg: Record<string, { icon: string; color: string; label: string }> = {
    fresh: { icon: '●', color: theme.success, label: 'fresh' },
    stale: { icon: '◐', color: theme.warning, label: 'stale' },
    missing: { icon: '○', color: theme.muted, label: 'missing' },
    rebuilding: { icon: '◌', color: theme.primary, label: 'building' },
  };
  const idx = idxCfg[state.indexStatus] ?? idxCfg.missing;

  const inboxNode = state.workspace.find((n) => n.type === 'proposal-inbox');
  const pendingCount = inboxNode && inboxNode.type === 'proposal-inbox' ? inboxNode.proposals.length : 0;

  const healthNode = state.workspace.find((n) => n.type === 'graph-health');
  const healthStatus = healthNode && healthNode.type === 'graph-health' ? healthNode.summary.status : undefined;
  const healthCfg: Record<string, { icon: string; color: string }> = {
    healthy: { icon: '✓', color: theme.success },
    warning: { icon: '⚠', color: theme.warning },
    critical: { icon: '✗', color: theme.error },
  };
  const h = healthStatus ? healthCfg[healthStatus] : null;

  return (
    <Box gap={1} paddingX={1}>
      <Text bold color={theme.primary}>📚</Text>
      <Text bold>{vaultName}</Text>
      <Text dimColor>│</Text>
      <Text color={idx.color}>{idx.icon} idx:{idx.label}</Text>
      <Text dimColor>│</Text>
      {pendingCount > 0
        ? <Text color={theme.warning}>inbox:{pendingCount}</Text>
        : <Text dimColor>inbox:0</Text>}
      {h && <><Text dimColor>│</Text><Text color={h.color}>{h.icon}</Text></>}
      <Text dimColor>│</Text>
      <Text color={ollama.color}>{ollama.icon} llm:{ollama.label}</Text>
    </Box>
  );
};
