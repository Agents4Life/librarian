import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { GraphHealthStatus } from '../activity/types.js';

type HealthCardProps = {
  title: string;
  status: GraphHealthStatus;
  metrics: Array<{ label: string; value: string | number; hint?: string }>;
};

const statusConfig: Record<GraphHealthStatus, { icon: string; color: string; label: string }> = {
  healthy: { icon: '✓', color: theme.success, label: 'Tu vault esta bien' },
  warning: { icon: '⚠', color: theme.warning, label: 'Tu vault necesita atencion' },
  critical: { icon: '✗', color: theme.error, label: 'Tu vault necesita ayuda urgente' },
};

export const HealthCard: React.FC<HealthCardProps> = ({ title, status, metrics }) => {
  const cfg = statusConfig[status];

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" gap={1} marginBottom={0}>
        <Text bold color={cfg.color}>{cfg.icon}</Text>
        <Text bold>{title}</Text>
      </Box>
      {metrics.map((m) => (
        <Box key={m.label} flexDirection="row" gap={1}>
          <Box width={2}>
            <Text color={m.value === 0 ? theme.muted : theme.text}>·</Text>
          </Box>
          <Box width={22}>
            <Text dimColor>{m.label}</Text>
          </Box>
          <Text color={m.value === 0 ? theme.muted : theme.text} bold>{String(m.value)}</Text>
          {m.hint && <Text dimColor> {m.hint}</Text>}
        </Box>
      ))}
    </Box>
  );
};
