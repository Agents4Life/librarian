import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { theme } from '../theme.js';
import { useAppState } from '../state.js';

interface ComposerProps {
  onSubmit: (value: string) => void;
}

const hints = '/help · /search · /status · /process · /review · /health · /graph · /orphans · /stale · /activity';

export const Composer: React.FC<ComposerProps> = ({ onSubmit }) => {
  const { state, dispatch } = useAppState();
  const [focused, setFocused] = useState(true);

  const handleSubmit = (value: string) => {
    if (!value.trim()) return;
    dispatch({ type: 'SET_COMPOSER_VALUE', value: '' });
    onSubmit(value.trim());
  };

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" borderLeft={false} borderRight={false} borderBottom={false} borderColor={theme.borderSubtle} />
      <Box paddingX={1}>
        <Box flexDirection="column">
          <Text dimColor>{hints}</Text>
          <Box gap={1}>
            <Text bold color={theme.primary}>{'>'}</Text>
            <TextInput
              value={state.composerValue}
              onChange={(v) => dispatch({ type: 'SET_COMPOSER_VALUE', value: v })}
              onSubmit={handleSubmit}
              focus={focused}
              placeholder="Escribí un mensaje o /comando..."
              showCursor={true}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
