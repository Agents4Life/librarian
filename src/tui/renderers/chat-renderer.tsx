import React from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { theme } from '../theme.js';
import { useAppState } from '../state.js';
import type { RendererProps } from '../renderers/registry.js';
import { Clickable } from '../components/mouse-support.js';

const PAGE_SIZE = 10;

interface ChatState {
  page: number;
  maxPage: number;
}

export const ChatRenderer: React.FC<RendererProps> = ({ node }) => {
  const { dispatch } = useAppState();
  const [state, setState] = React.useState<ChatState>(() => {
    const messages = node.messages.filter((m: any) => m.role !== 'system');
    const maxPage = Math.max(0, Math.ceil(messages.length / PAGE_SIZE) - 1);
    return { page: 0, maxPage };
  });

  if (node.type !== 'chat') return null;

  const messages = node.messages.filter((m: any) => m.role !== 'system');
  const startIdx = state.page * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const visible = messages.slice(startIdx, endIdx);

  const nextPage = () => setState(prev => ({ ...prev, page: Math.min(prev.page + 1, prev.maxPage) }));
  const prevPage = () => setState(prev => ({ ...prev, page: Math.max(prev.page - 1, 0) }));

  const copyMessage = (content: string) => {
    // In a real implementation, this would copy to clipboard
    console.log(`Copied to clipboard: ${content}`);
  };

  if (visible.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={theme.primary} bold>Chat con Librarian</Text>
        <Text dimColor>Escribí una pregunta o /comando para empezar.</Text>
        <Text> </Text>
        <Text dimColor color={theme.success}>💡 Tip: Podés usar el mouse para clickear en los tabs y botones</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Box gap={1}>
          <Text bold color={theme.primary}>Chat con Librarian</Text>
          <Text dimColor>(mouse enabled)</Text>
        </Box>
        <Text dimColor>{state.page + 1}/{state.maxPage + 1}</Text>
      </Box>

      {visible.map((msg: any, i: number) => {
        const isUser = msg.role === 'user';
        
        return (
          <Box key={i} flexDirection="column" marginBottom={1}>
            <Box gap={1}>
              <Text bold color={isUser ? theme.primary : theme.muted}>
                {isUser ? '👤 Vos' : '🤖 Librarian'}
              </Text>
              
              <Clickable
                onClick={() => copyMessage(msg.content)}
                hoverText="copiar mensaje"
              >
                <Text color={theme.muted}>📋</Text>
              </Clickable>
            </Box>
            
            <Box
              borderStyle={isUser ? 'single' : undefined}
              borderLeft={isUser}
              borderRight={false}
              borderTop={false}
              borderBottom={false}
              borderColor={isUser ? theme.primary : undefined}
              paddingLeft={isUser ? 1 : 0}
            >
              <Text wrap="wrap">{msg.content}</Text>
            </Box>
          </Box>
        );
      })}

      {/* Pagination with mouse support */}
      {messages.length > PAGE_SIZE && (
        <Box justifyContent="space-between" marginTop={1}>
          <Box gap={2}>
            <Clickable
              onClick={prevPage}
              disabled={state.page === 0}
              hoverText="página anterior"
            >
              <Text color={state.page === 0 ? theme.muted : theme.primary}>
                ← Anterior
              </Text>
            </Clickable>
            
            <Clickable
              onClick={nextPage}
              disabled={state.page === state.maxPage}
              hoverText="página siguiente"
            >
              <Text color={state.page === state.maxPage ? theme.muted : theme.primary}>
                Siguiente →
              </Text>
            </Clickable>
          </Box>
          
          <Text dimColor>{startIdx + 1}-{Math.min(endIdx, messages.length)} de {messages.length} mensajes</Text>
        </Box>
      )}
      
      <Box marginTop={1}>
        <Text dimColor>
          🖱️ Mouse: Click en tabs, botones y elementos. Teclado: ←/→ páginas
        </Text>
      </Box>
    </Box>
  );
};