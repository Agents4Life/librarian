import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { GraphHealthStatus } from '../activity/types.js';
import { MetricRow } from './metric-row.js';

type HealthCardProps = {
  title: string;
  status: GraphHealthStatus;
  metrics: Array<{ label: string; value: string | number }>;
};

const statusConfig: Record<GraphHealthStatus, { icon: string; color: string; label: string }> = {
  healthy: { icon: '✓', color: theme.success, label: 'Healthy' },
  warning: { icon: '⚠', color: theme.warning, label: 'Warning' },
  critical: { icon: '✗', color: theme.error, label: 'Critical' },
};

export const HealthCard: React.FC<HealthCardProps> = ({ title, status, metrics }) => {
  const cfg = statusConfig[status];

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" gap={1} marginBottom={0}>
        <Text bold color={cfg.color}>{cfg.icon}</Text>
        <Text bold>{title}</Text>
        <Text color={cfg.color}>{cfg.label}</Text>
      </Box>
      {metrics.map((m) => (
        <MetricRow
          key={m.label}
          label={m.label}
          value={m.value}
          color={status === 'healthy' ? theme.text : cfg.color}
        />
      ))}
    </Box>
  );
};
