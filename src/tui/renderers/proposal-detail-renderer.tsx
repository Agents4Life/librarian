import React from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { theme } from '../theme.js';
import { useAppState } from '../state.js';
import type { RendererProps } from '../renderers/registry.js';
import { ProposalPreview } from '../components/proposal-preview.js';
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

const statusColor = (status: string) => STATUS_COLORS[status] ?? theme.primary;

interface ProposalDetailState {
  confirming: null | 'approve' | 'reject';
}

export const ProposalDetailRenderer: React.FC<RendererProps> = ({ node, onAction }) => {
  const { state, dispatch } = useAppState();
  const [detailState, setDetailState] = React.useState<ProposalDetailState>({ confirming: null });

  useInput((input: string, key: any) => {
    if (node.type !== "proposal-detail") return;
    if (state.focusedPane === "composer") return;
    const p = node.proposal;

    // If we're in confirmation mode
    if (detailState.confirming) {
      if (input === "y") {
        // Execute confirmed action
        onAction(`${detailState.confirming}:${p.id}`);
        setDetailState({ confirming: null });
      } else if (input === "n" || key.escape) {
        // Cancel confirmation
        setDetailState({ confirming: null });
      }
      return;
    }

    // Normal mode
    if (input === "a") {
      setDetailState({ confirming: 'approve' });
    } else if (input === "r") {
      setDetailState({ confirming: 'reject' });
    } else if (input === "t" && (p.status === "failed" || p.status === "rolled_back")) {
      onAction(`retry:${p.id}`);
    } else if (input === "x" && (p.status === "failed" || p.status === "rolled_back")) {
      onAction(`reset:${p.id}`);
    } else if (input === "p") {
      dispatch({ type: "TOGGLE_PREVIEW", nodeId: node.id });
    } else if (key.escape) {
      onAction("back-to-inbox");
    }
  }, [node, state.focusedPane, dispatch, onAction, detailState.confirming]);

  if (node.type !== "proposal-detail") return null;

  const p = node.proposal;
  const canRetry = p.status === "failed" || p.status === "rolled_back";

  const handleQuickAction = (action: 'approve' | 'reject') => {
    setDetailState({ confirming: action });
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>Proposal Detail</Text>
      <Text> </Text>

      {/* Confirmation overlay */}
      {detailState.confirming && (
        <Box flexDirection="column" borderStyle="double" padding={1} marginBottom={1} borderColor={theme.warning}>
          <Text bold color={theme.warning}>
            ¿Estás seguro que querés {detailState.confirming === 'approve' ? 'APPROVAR' : 'RECHAZAR'} esta propuesta?
          </Text>
          <Text> </Text>
          <Text dimColor>
            {p.sourcePath} → {p.proposal.target}
          </Text>
          <Text> </Text>
          
          <Box gap={2}>
            <Clickable onClick={() => onAction(`${detailState.confirming}:${p.id}`)}>
              <Text color={theme.success} bold>y</Text>
              <Text> Sí, {detailState.confirming === 'approve' ? 'aprobar' : 'rechazar'}</Text>
            </Clickable>
            
            <Clickable onClick={() => setDetailState({ confirming: null })}>
              <Text color={theme.error} bold>n</Text>
              <Text> Cancelar</Text>
            </Clickable>
          </Box>
        </Box>
      )}

      <Box flexDirection="row" gap={2}>
        <Text bold>Status:</Text>
        <Text color={statusColor(p.status)}>{p.status}</Text>
      </Box>

      <Box flexDirection="row" gap={2}>
        <Text bold>Source:</Text>
        <Text dimColor>{p.sourcePath}</Text>
      </Box>

      <Box flexDirection="row" gap={2}>
        <Text bold>Target:</Text>
        <Text dimColor>{p.proposal.target}</Text>
      </Box>

      <Box flexDirection="row" gap={2}>
        <Text bold>Type:</Text>
        <Text>{p.proposal.type}</Text>
      </Box>

      <Box flexDirection="row" gap={2}>
        <Text bold>Category:</Text>
        <Text>{p.proposal.category}</Text>
      </Box>

      {p.attempts > 0 && (
        <Box flexDirection="row" gap={2}>
          <Text bold>Attempts:</Text>
          <Text color={p.attempts > 1 ? theme.warning : undefined}>{p.attempts}</Text>
        </Box>
      )}

      {p.lastError && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.error}>Last Error</Text>
          <Text dimColor>{p.lastError}</Text>
        </Box>
      )}

      {p.proposal.tags.length > 0 && (
        <Box flexDirection="row" gap={2}>
          <Text bold>Tags:</Text>
          <Text dimColor>{p.proposal.tags.join(", ")}</Text>
        </Box>
      )}

      {p.proposal.summary && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Summary</Text>
          <Text dimColor>{p.proposal.summary}</Text>
        </Box>
      )}

      {p.diagnostics.warnings.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.warning}>Warnings</Text>
          {p.diagnostics.warnings.map((w: any, i: number) => (
            <Text key={i} dimColor>  - {w}</Text>
          ))}
        </Box>
      )}

      {p.diagnostics.duplicateCandidates.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.warning}>Duplicate candidates</Text>
          {p.diagnostics.duplicateCandidates.map((d: any, i: number) => (
            <Text key={i} dimColor>  - {d}</Text>
          ))}
        </Box>
      )}

      {p.transitions.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Transition History</Text>
          {p.transitions.map((t: any, i: number) => (
            <Box key={i} flexDirection="row" gap={1}>
              <Text dimColor>{new Date(t.at).toLocaleString()}</Text>
              <Text color={statusColor(t.from)}>{t.from}</Text>
              <Text dimColor>{"→"}</Text>
              <Text color={statusColor(t.to)}>{t.to}</Text>
              {t.error && <Text color={theme.error}>err</Text>}
            </Box>
          ))}
        </Box>
      )}

      {node.showPreview && (
        <ProposalPreview
          targetPath={p.proposal.target}
          contentPreview={p.proposal.preview}
          operation={p.proposal.type === "update" ? "update" : "create"}
        />
      )}

      {/* Action buttons with click support */}
      <Box flexDirection="row" gap={3} marginTop={1}>
        <Clickable
          onClick={() => handleQuickAction('approve')}
          disabled={detailState.confirming !== null}
          hoverText="approve this proposal"
        >
          <Text color={theme.success} bold>✓ Approve</Text>
        </Clickable>
        
        <Clickable
          onClick={() => handleQuickAction('reject')}
          disabled={detailState.confirming !== null}
          hoverText="reject this proposal"
        >
          <Text color={theme.error} bold>✗ Reject</Text>
        </Clickable>
        
        {canRetry && (
          <Clickable
            onClick={() => onAction(`retry:${p.id}`)}
            hoverText="retry failed proposal"
          >
            <Text color={theme.warning} bold>↻ Retry</Text>
          </Clickable>
        )}
        
        {canRetry && (
          <Clickable
            onClick={() => onAction(`reset:${p.id}`)}
            hoverText="reset to pending"
          >
            <Text color={theme.primary} bold>↺ Reset</Text>
          </Clickable>
        )}
        
        <Clickable
          onClick={() => dispatch({ type: "TOGGLE_PREVIEW", nodeId: node.id })}
          hoverText={node.showPreview ? "hide preview" : "show preview"}
        >
          <Text color={theme.primary} bold>
            {node.showPreview ? "👁 Hide" : "👁 Show"} Preview
          </Text>
        </Clickable>
        
        <Clickable
          onClick={() => onAction("back-to-inbox")}
          hoverText="back to inbox"
        >
          <Text color={theme.muted} bold>← Back</Text>
        </Clickable>
      </Box>
    </Box>
  );
};