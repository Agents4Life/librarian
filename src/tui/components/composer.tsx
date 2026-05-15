import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { theme } from '../theme.js';
import { useAppState } from '../state.js';

interface ComposerProps {
  onSubmit: (value: string) => void;
}

export const Composer: React.FC<ComposerProps> = ({ onSubmit }) => {
  const { state, dispatch } = useAppState();
  const isFocused = state.focusedPane === 'composer';

  const handleSubmit = (value: string) => {
    if (!value.trim()) return;
    dispatch({ type: 'SET_COMPOSER_VALUE', value: '' });
    onSubmit(value.trim());
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color={theme.borderSubtle}>{'─'.repeat(80)}</Text>
      <Box gap={1}>
        <Text bold color={isFocused ? theme.primary : theme.muted}>
          {isFocused ? '❯' : '·'}
        </Text>
        {isFocused ? (
          <TextInput
            value={state.composerValue}
            onChange={(v) => dispatch({ type: 'SET_COMPOSER_VALUE', value: v })}
            onSubmit={handleSubmit}
            focus={true}
            placeholder="mensaje o /comando...  (Esc → navegar)"
            showCursor={true}
          />
        ) : (
          <Text dimColor>Pulsa Enter o i para escribir</Text>
        )}
      </Box>
    </Box>
  );
};
