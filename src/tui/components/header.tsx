import React from 'react';
import { Box, Text } from 'ink';
import { theme, icons } from '../theme.js';
import { useAppState } from '../state.js';
import type { GraphHealthStatus } from '../activity/types.js';

const healthBadge = (status?: GraphHealthStatus) => {
  if (!status) return null;
  const cfg = {
    healthy: { icon: '✓', color: theme.success },
    warning: { icon: '⚠', color: theme.warning },
    critical: { icon: '✗', color: theme.error },
  }[status];
  return <Text color={cfg.color}>{cfg.icon} {status}</Text>;
};

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

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

  const inboxNode = state.workspace.find((n) => n.type === 'proposal-inbox');
  const pendingCount = inboxNode && inboxNode.type === 'proposal-inbox'
    ? inboxNode.proposals.length
    : 0;

  const healthNode = state.workspace.find((n) => n.type === 'graph-health');
  const healthStatus = healthNode && healthNode.type === 'graph-health'
    ? healthNode.summary.status
    : undefined;

  const indexStatusCfg: Record<string, { icon: string; color: string; label: string }> = {
    fresh: { icon: '●', color: theme.success, label: 'index:fresh' },
    stale: { icon: '◐', color: theme.warning, label: 'index:stale' },
    missing: { icon: '○', color: theme.muted, label: 'index:missing' },
    rebuilding: { icon: '◌', color: theme.primary, label: 'index:rebuilding' },
  };
  const idxCfg = indexStatusCfg[state.indexStatus] ?? indexStatusCfg.missing;

  const rawBacklog = healthNode && healthNode.type === 'graph-health'
    ? healthNode.summary.rawBacklog
    : 0;

  return (
    <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
      <Box gap={1}>
        <Text bold color={theme.primary}>Librarian</Text>
      </Box>
      <Box gap={1}>
        <Text dimColor>{vaultName}</Text>
        <Text dimColor>·</Text>
        <Text color={idxCfg.color}>{idxCfg.icon} {idxCfg.label}</Text>
        <Text dimColor>·</Text>
        <Text dimColor>Raw: {rawBacklog}</Text>
        <Text dimColor>·</Text>
        {pendingCount > 0 ? (
          <Text color={theme.warning}>Pending: {pendingCount}</Text>
        ) : (
          <Text dimColor>Pending: 0</Text>
        )}
        <Text dimColor>·</Text>
        {healthBadge(healthStatus) ?? <Text dimColor>Health: —</Text>}
        <Text dimColor>·</Text>
        {state.lastIndexAt !== null ? (
          <Text dimColor>Indexed: {formatTimeAgo(state.lastIndexAt)}</Text>
        ) : (
          <Text dimColor>Indexed: never</Text>
        )}
        <Text dimColor>·</Text>
        {statusIcon}
        <Text dimColor>{statusText}</Text>
      </Box>
    </Box>
  );
};
