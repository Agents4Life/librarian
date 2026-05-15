import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppState } from '../state.js';
import type { RendererProps } from '../renderers/registry.js';
import { Clickable } from '../components/mouse-support.js';

const STATUS_COLORS: Record<string, string> = {
  pending: theme.warning,
  approved: theme.success,
  rejected: theme.error,
  applying: theme.primary,
  applied: theme.success,
  failed: theme.error,
  rolled_back: theme.warning,
};

const statusColor = (status: string) => STATUS_COLORS[status] || theme.primary;

const MAX_VISIBLE = 15;

export const ProposalInboxRenderer: React.FC<RendererProps> = ({ node, onAction }) => {
  const { state, dispatch } = useAppState();

  // Import useInput here to avoid conflicts
  const { useInput } = require('ink');
  
  useInput((input, key) => {
    if (node.type !== 'proposal-inbox') return;
    if (state.focusedPane === 'composer') return;

    if (input === 'j' || key.downArrow) {
      dispatch({ type: 'MOVE_CURSOR', nodeId: node.id, direction: 'down' });
    } else if (input === 'k' || key.upArrow) {
      dispatch({ type: 'MOVE_CURSOR', nodeId: node.id, direction: 'up' });
    } else if (key.return || input === 'o') {
      const proposal = node.proposals[node.cursor];
      if (proposal) onAction(`open-detail:${proposal.id}`);
    } else if (input === 'h') {
      dispatch({ type: 'ADD_NODE', node: { type: 'help', id: crypto.randomUUID(), createdAt: Date.now() } });
    }
  });

  if (node.type !== 'proposal-inbox') return null;

  const startIdx = Math.max(0, node.cursor - Math.floor(MAX_VISIBLE / 2));
  const endIdx = Math.min(node.proposals.length, startIdx + MAX_VISIBLE);
  const visible = node.proposals.slice(startIdx, endIdx);

  const handleProposalClick = (proposalId: string) => {
    onAction(`open-detail:${proposalId}`);
  };

  const handleQuickAction = (proposalId: string, action: 'approve' | 'reject') => {
    onAction(`${action}:${proposalId}`);
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color={theme.primary}>Proposals</Text>
        <Text dimColor>{node.proposals.length} pendiente{node.proposals.length !== 1 ? 's' : ''}</Text>
      </Box>
      
      {node.proposals.length === 0 ? (
        <Text dimColor>No hay propuestas pendientes.</Text>
      ) : (
        visible.map((proposal, idx) => {
          const actualIdx = startIdx + idx;
          const isCursor = actualIdx === node.cursor;
          
          return (
            <Box key={proposal.id} flexDirection="column" marginBottom={1}>
              <Box gap={1}>
                <Text color={isCursor ? theme.primary : theme.muted}>
                  {isCursor ? '▸' : '·'}
                </Text>
                
                <Clickable
                  onClick={() => handleProposalClick(proposal.id)}
                  hoverText="open details"
                  active={isCursor}
                >
                  <Text bold={isCursor} color={theme.primary}>
                    {proposal.sourcePath.split('/').pop()?.replace('.md', '')}
                  </Text>
                </Clickable>
                
                <Text dimColor>→</Text>
                <Text dimColor>
                  {proposal.proposal.target.split('/').pop()?.replace('.md', '')}
                </Text>
                <Text 
                  color={statusColor(proposal.status)}
                >
                  {proposal.status}
                </Text>
              </Box>
              
              {isCursor && proposal.proposal.summary && (
                <Box flexDirection="row" gap={1} marginLeft={2}>
                  <Text dimColor>{proposal.proposal.summary.slice(0, 80)}</Text>
                </Box>
              )}
              
              {isCursor && (
                <Box flexDirection="row" gap={2} marginLeft={2}>
                  <Clickable
                    onClick={() => handleQuickAction(proposal.id, 'approve')}
                    hoverText="approve"
                  >
                    <Text color={theme.success}>a: approve</Text>
                  </Clickable>
                  
                  <Clickable
                    onClick={() => handleQuickAction(proposal.id, 'reject')}
                    hoverText="reject"
                  >
                    <Text color={theme.error}>r: reject</Text>
                  </Clickable>
                  
                  <Text dimColor>o: open</Text>
                  <Text dimColor>{proposal.status === 'failed' ? 't: retry' : ''}</Text>
                  <Text dimColor>{proposal.status === 'failed' ? 'x: reset' : ''}</Text>
                </Box>
              )}
            </Box>
          );
        })
      )}
      
      {node.proposals.length > MAX_VISIBLE && (
        <Box justifyContent="center" marginTop={1}>
          <Text dimColor>
            {startIdx + 1}-{endIdx} de {node.proposals.length} • j/k mover • o abrir • h ayuda
          </Text>
        </Box>
      )}
    </Box>
  );
};