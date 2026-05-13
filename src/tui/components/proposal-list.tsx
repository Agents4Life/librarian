import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

const STATUS_COLORS: Record<string, string> = {
  pending: theme.muted,
  approved: theme.success,
  rejected: theme.error,
  applying: theme.primary,
  applied: theme.success,
  failed: theme.error,
  rolled_back: theme.warning,
};

interface ProposalListProps {
  proposals: Array<{ id: string; sourcePath: string; status: string; proposal: { type: string; category: string; target: string } }>;
  cursor: number;
}

export const ProposalList: React.FC<ProposalListProps> = ({ proposals, cursor }) => {
  if (proposals.length === 0) {
    return <Text color={theme.success}>No proposals.</Text>;
  }

  return (
    <Box flexDirection="column">
      {proposals.map((p, i) => {
        const active = i === cursor;
        const name = p.sourcePath.split("/").pop() ?? p.sourcePath;
        const target = p.proposal.target.split("/").pop() ?? p.proposal.target;
        const statusBadgeColor = STATUS_COLORS[p.status] ?? theme.muted;

        return (
          <Box key={p.id} gap={1}>
            <Text color={active ? theme.primary : theme.muted}>
              {active ? "▶" : " "}
            </Text>
            <Text color={active ? theme.primary : undefined} bold={active}>
              {name}
            </Text>
            <Text dimColor>{"→"}</Text>
            <Text dimColor>{target}</Text>
            <Text color={theme.muted}>[{p.proposal.type}]</Text>
            {p.status !== "pending" && (
              <Text color={statusBadgeColor}>{p.status}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
