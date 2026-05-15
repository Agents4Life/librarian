import React, { useRef, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { useStdin } from 'ink';
import type { RendererProps, WorkspaceNode } from '../renderers/types.js';

interface ClickableProps {
  onClick: () => void;
  children: React.ReactNode;
  hoverText?: string;
  active?: boolean;
  disabled?: boolean;
}

interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ClickableArea {
  id: string;
  position: Position;
  onClick: () => void;
}

interface MouseState {
  areas: ClickableArea[];
  mouseX?: number;
  mouseY?: number;
}

const CLICK_TIMEOUT = 100; // ms

export const useMouseSupport = () => {
  const { stdin } = useStdin();
  const [mouseState, setMouseState] = React.useState<MouseState>({ areas: [] });
  const lastClickTime = React.useRef(0);

  useEffect(() => {
    if (!stdin) return;

    const handleMouse = (data: Buffer) => {
      // Parse ANSI mouse escape sequence
      const str = data.toString();
      
      // X11 mouse: ESC [ < M Cb ; Cx ; Cy
      const mouseRegex = /\x1b\[<(\d+);(\d+);(\d+)([mM])/;
      const match = str.match(mouseRegex);
      
      if (!match) return;

      const [, button, x, y, eventType] = match;
      const isRelease = eventType === 'm';
      const isPress = eventType === 'M';
      
      if (!isPress) return;

      const mouseX = parseInt(x) - 1;
      const mouseY = parseInt(y) - 1;
      
      // Update mouse position for hover effects
      setMouseState(prev => ({ ...prev, mouseX, mouseY }));

      // Check for clicks (prevent double-clicks)
      const now = Date.now();
      if (now - lastClickTime.current < CLICK_TIMEOUT) return;
      lastClickTime.current = now;

      // Check if click is in any clickable area
      const clickedArea = mouseState.areas.find(area => {
        const { position } = area;
        return (
          mouseX >= position.x &&
          mouseX <= position.x + position.width &&
          mouseY >= position.y &&
          mouseY <= position.y + position.height
        );
      });

      if (clickedArea) {
        clickedArea.onClick();
      }
    };

    // Enable mouse tracking
    stdin.write('\x1b[?1000h'); // X11 mouse reporting
    stdin.write('\x1b[?1002h'); // SGR mouse reporting
    stdin.write('\x1b[?1015h'); // urxvt mouse reporting

    stdin.on('data', handleMouse);

    return () => {
      stdin.off('data', handleMouse);
      stdin.write('\x1b[?1000l'); // Disable mouse reporting
      stdin.write('\x1b[?1002l');
      stdin.write('\x1b[?1015l');
    };
  }, [stdin, mouseState.areas]);

  const registerClickableArea = useCallback((id: string, position: Position, onClick: () => void) => {
    setMouseState(prev => {
      // Remove existing area with same id
      const existingIndex = prev.areas.findIndex(area => area.id === id);
      const newAreas = existingIndex >= 0 
        ? [...prev.areas.slice(0, existingIndex), ...prev.areas.slice(existingIndex + 1)]
        : [...prev.areas];
      
      return {
        ...prev,
        areas: [...newAreas, { id, position, onClick }]
      };
    });
  }, []);

  const unregisterClickableArea = useCallback((id: string) => {
    setMouseState(prev => ({
      ...prev,
      areas: prev.areas.filter(area => area.id !== id)
    }));
  }, []);

  const isMouseOver = useCallback((position: Position) => {
    if (mouseState.mouseX === undefined || mouseState.mouseY === undefined) {
      return false;
    }
    
    return (
      mouseState.mouseX >= position.x &&
      mouseState.mouseX <= position.x + position.width &&
      mouseState.mouseY >= position.y &&
      mouseState.mouseY <= position.y + position.height
    );
  }, [mouseState.mouseX, mouseState.mouseY]);

  return {
    registerClickableArea,
    unregisterClickableArea,
    isMouseOver,
    mousePosition: { x: mouseState.mouseX, y: mouseState.mouseY }
  };
};

export const Clickable: React.FC<ClickableProps> = ({ onClick, children, hoverText, active, disabled }) => {
  const ref = useRef<React.Component>(null);
  const { registerClickableArea, unregisterClickableArea, isMouseOver } = useMouseSupport();
  const [position, setPosition] = React.useState<Position | null>(null);
  const id = React.useId();

  // Use useEffect to get component dimensions
  useEffect(() => {
    if (!ref.current) return;

    // In a real implementation, we'd need to get the actual dimensions
    // For now, we'll estimate based on content
    // This is a limitation of terminal UI - we can't get exact pixel dimensions
    const estimatePosition = () => {
      // This is a simplified estimation
      // In practice, you'd need to track the rendering position
      return {
        x: 0, // Would be calculated from layout
        y: 0,
        width: 20, // Estimate
        height: 1 // Most components are 1 line tall
      };
    };

    const pos = estimatePosition();
    setPosition(pos);
    registerClickableArea(id, pos, onClick);

    return () => {
      unregisterClickableArea(id);
    };
  }, [id, onClick, registerClickableArea, unregisterClickableArea]);

  const isHovered = position && isMouseOver(position);

  return (
    <Box
      ref={ref}
      {...(position && {
        style: {
          cursor: isHovered ? 'pointer' : 'default',
        }
      })}
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