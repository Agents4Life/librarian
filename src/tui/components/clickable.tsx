import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppState } from '../state.js';

interface ClickableProps {
  onClick: () => void;
  children: React.ReactNode;
  hoverText?: string;
  active?: boolean;
  disabled?: boolean;
}

export const Clickable: React.FC<ClickableProps> = ({ onClick, children, hoverText, active, disabled }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {typeof children === 'string' ? (
        <Text 
          color={
            disabled ? 'gray' :
            active ? 'cyan' :
            isHovered ? 'yellow' : undefined
          }
          bold={active || isHovered}
          underline={isHovered && !disabled}
          dimColor={disabled}
        >
          {children}
          {isHovered && hoverText && ` ${hoverText}`}
        </Text>
      ) : (
        React.cloneElement(children as React.ReactElement, {
          style: {
            ...(active && { color: 'cyan' }),
            ...(isHovered && { 
              color: 'yellow',
              textDecoration: 'underline' 
            })
          }
        })
      )}
    </Box>
  );
};