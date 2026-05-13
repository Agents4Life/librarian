import React, { useCallback } from "react";
import { Box, Text } from "ink";
import { useInput } from "ink";
import { theme } from "../theme.js";
import { useAppState } from "../state.js";
import type { RendererProps } from "./registry.js";
import { ProposalPreview } from "../components/proposal-preview.js";

export const ProposalDetailRenderer: React.FC<RendererProps> = ({ node, onAction }) => {
  const { state, dispatch } = useAppState();

  useInput(useCallback((input, key) => {
    if (node.type !== "proposal-detail") return;
    if (state.composerValue !== "") return;

    if (input === "a") {
      onAction(`approve:${node.proposal.id}`);
    } else if (input === "r") {
      onAction(`reject:${node.proposal.id}`);
    } else if (input === "p") {
      dispatch({ type: "TOGGLE_PREVIEW", nodeId: node.id });
    } else if (input === "q" || key.escape) {
      onAction("back-to-inbox");
    }
  }, [node, state.composerValue, dispatch, onAction]));

  if (node.type !== "proposal-detail") return null;

  const p = node.proposal;
  const statusColor = p.status === "pending" ? theme.warning
    : p.status === "approved" ? theme.success
    : p.status === "rejected" ? theme.error
    : theme.primary;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>Proposal Detail</Text>
      <Text> </Text>

      <Box flexDirection="row" gap={2}>
        <Text bold>Status:</Text>
        <Text color={statusColor}>{p.status}</Text>
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
          {p.diagnostics.warnings.map((w, i) => (
            <Text key={i} dimColor>  - {w}</Text>
          ))}
        </Box>
      )}

      {p.diagnostics.duplicateCandidates.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.warning}>Duplicate candidates</Text>
          {p.diagnostics.duplicateCandidates.map((d, i) => (
            <Text key={i} dimColor>  - {d}</Text>
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

      <Box marginTop={1}>
        <Text dimColor>
          a approve · r reject · p {node.showPreview ? "hide" : "show"} preview · q back
        </Text>
      </Box>
    </Box>
  );
};
