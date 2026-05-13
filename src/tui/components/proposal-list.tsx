import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

interface ProposalListProps {
  proposals: Array<{ id: string; sourcePath: string; status: string; proposal: { type: string; category: string; target: string } }>;
  cursor: number;
}

export const ProposalList: React.FC<ProposalListProps> = ({ proposals, cursor }) => {
  if (proposals.length === 0) {
    return <Text color={theme.success}>No pending proposals.</Text>;
  }

  return (
    <Box flexDirection="column">
      {proposals.map((p, i) => {
        const active = i === cursor;
        const name = p.sourcePath.split("/").pop() ?? p.sourcePath;
        const target = p.proposal.target.split("/").pop() ?? p.proposal.target;

        return (
          <Box key={p.id} gap={1}>
            <Text color={active ? theme.primary : theme.muted}>
              {active ? "▶" : " "}
            </Text>
            <Text color={active ? theme.primary : undefined} bold={active}>
              {name}
            </Text>
            <Text dimColor>→</Text>
            <Text dimColor>{target}</Text>
            <Text color={theme.muted}>[{p.proposal.type}]</Text>
          </Box>
        );
      })}
    </Box>
  );
};
