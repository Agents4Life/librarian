import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppState } from '../state.js';

export const getIndexStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    fresh: 'indice listo',
    stale: '⚠ actualizar indice',
    missing: 'sin indice',
    rebuilding: 'actualizando indice...',
  };
  return labels[status] ?? 'sin indice';
};

export const getLlmStatusLabel = (status: string, model?: string): string => {
  if (status === 'ready' && model) return `LLM: ${model}`;
  const labels: Record<string, string> = {
    ready: 'LLM listo',
    'no-model': 'falta modelo IA',
    down: 'LLM desconectado',
    checking: 'conectando...',
  };
  return labels[status] ?? 'conectando...';
};

export const StatusBar: React.FC = () => {
  const { state } = useAppState();
  const vaultName = state.vaultPath.split('/').pop() ?? state.vaultPath;

  const ollamaCfg: Record<string, { icon: string; color: string }> = {
    ready: { icon: '◉', color: theme.success },
    'no-model': { icon: '◎', color: theme.warning },
    down: { icon: '✗', color: theme.error },
    checking: { icon: '◌', color: theme.muted },
  };
  const ollama = ollamaCfg[state.ollamaStatus] ?? ollamaCfg.checking;

  const idxCfg: Record<string, { icon: string; color: string; label: string }> = {
    fresh: { icon: '●', color: theme.success, label: getIndexStatusLabel('fresh') },
    stale: { icon: '◐', color: theme.warning, label: getIndexStatusLabel('stale') },
    missing: { icon: '○', color: theme.muted, label: getIndexStatusLabel('missing') },
    rebuilding: { icon: '◌', color: theme.primary, label: getIndexStatusLabel('rebuilding') },
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
    <Box gap={1}>
      <Text bold>{vaultName}</Text>
      <Text dimColor>│</Text>
      <Text color={idx.color}>{idx.icon} {idx.label}</Text>
      {pendingCount > 0 && <>
        <Text dimColor>│</Text>
        <Text color={theme.warning}>por revisar: {pendingCount}</Text>
      </>}
      {h && <><Text dimColor>│</Text><Text color={h.color}>{h.icon}</Text></>}
      <Text dimColor>│</Text>
      <Text color={ollama.color}>{ollama.icon} {getLlmStatusLabel(state.ollamaStatus, state.ollamaModel || undefined)}</Text>
    </Box>
  );
};
