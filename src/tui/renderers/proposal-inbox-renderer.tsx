import React, { useCallback } from "react";
import { Box, Text } from "ink";
import { useInput } from "ink";
import { theme } from "../theme.js";
import { useAppState } from "../state.js";
import type { RendererProps } from "./registry.js";
import { ProposalList } from "../components/proposal-list.js";

export const ProposalInboxRenderer: React.FC<RendererProps> = ({ node, onAction }) => {
  const { state, dispatch } = useAppState();

  useInput(useCallback((input, key) => {
    if (node.type !== "proposal-inbox") return;
    if (state.composerValue !== "") return;

    if (input === "j" || key.downArrow) {
      dispatch({ type: "MOVE_CURSOR", nodeId: node.id, direction: "down" });
    } else if (input === "k" || key.upArrow) {
      dispatch({ type: "MOVE_CURSOR", nodeId: node.id, direction: "up" });
    } else if (key.return) {
      const selected = node.proposals[node.cursor];
      if (selected) {
        onAction(`open-detail:${selected.id}`);
      }
    }
  }, [node, state.composerValue, dispatch, onAction]));

  if (node.type !== "proposal-inbox") return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>
        Proposal Inbox ({node.proposals.length} pending)
      </Text>
      <Text> </Text>

      <ProposalList proposals={node.proposals} cursor={node.cursor} />

      <Box marginTop={1}>
        <Text dimColor>j/k navigate · enter inspect · q back</Text>
      </Box>
    </Box>
  );
};
