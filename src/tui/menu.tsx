import React from 'react';
import { Box, Text } from 'ink';
import { menuItems } from './types.js';

interface MenuProps {
  onSelect: (item: typeof menuItems[number]) => void;
}

export const Menu: React.FC<MenuProps> = ({ onSelect }) => (
  <Box flexDirection="column">
    <Text bold>Librarian</Text>
    <Text> </Text>
    {menuItems.map((item) => (
      <Text key={item.key}>
        <Text bold>{item.key}.</Text> {item.label}
      </Text>
    ))}
    <Text> </Text>
    <Text dimColor>q. Salir</Text>
  </Box>
);
