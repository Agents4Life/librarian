import React from 'react';
import { Box, Text } from 'ink';
import type { TuiScreen } from './types.js';

interface InputPromptProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export const InputPrompt: React.FC<InputPromptProps> = ({ label, value, onChange, onSubmit, onBack }) => (
  <Box flexDirection="column">
    <Text bold>{label}</Text>
    <Text> </Text>
    <Text>&gt; {value}</Text>
    <Text dimColor>Enter para confirmar, Esc para volver</Text>
  </Box>
);
