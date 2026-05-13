import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

interface ProposalPreviewProps {
  targetPath: string;
  contentPreview: string;
  operation: string;
}

export const ProposalPreview: React.FC<ProposalPreviewProps> = ({ targetPath, contentPreview, operation }) => (
  <Box flexDirection="column" marginTop={1}>
    <Text bold color={theme.primary}>Preview</Text>
    <Text dimColor>Operation: {operation}</Text>
    <Text dimColor>Target: {targetPath}</Text>
    <Box marginTop={1} flexDirection="column">
      <Text bold>Proposed content:</Text>
      <Box flexDirection="column" paddingLeft={2}>
        {contentPreview.split("\n").slice(0, 40).map((line, i) => (
          <Text key={i} dimColor wrap="wrap">{line}</Text>
        ))}
      </Box>
    </Box>
  </Box>
);
