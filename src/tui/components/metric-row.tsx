import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';

type MetricRowProps = {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
};

export const MetricRow: React.FC<MetricRowProps> = ({ label, value, color = theme.text, icon = '·' }) => (
  <Box flexDirection="row" gap={1}>
    <Box width={2}>
      <Text color={color}>{icon}</Text>
    </Box>
    <Box width={16}>
      <Text dimColor>{label}</Text>
    </Box>
    <Text color={color} bold>{String(value)}</Text>
  </Box>
);
