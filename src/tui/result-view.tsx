import React from 'react';
import { Box, Text } from 'ink';
import type { AgentRun } from '../agent.js';

interface ResultViewProps {
  result: AgentRun<unknown>;
  onBack: () => void;
}

const StepIndicator: React.FC<{ kind: string }> = ({ kind }) => {
  const icons: Record<string, string> = {
    observe: 'o',
    plan: 'p',
    act: '>',
    reflect: '*',
  };

  return <Text bold>[{icons[kind] ?? '-'}]</Text>;
};

const formatResult = (data: unknown): string => {
  if (data === null || data === undefined) return '';
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    if (typeof obj.content === 'string') return obj.content;
    if (typeof obj.message === 'string') return obj.message;
    if (Array.isArray(obj.results)) {
      return obj.results
        .map((r: Record<string, unknown>) => `  - ${r.file ?? JSON.stringify(r)}`)
        .join('\n');
    }
    if (typeof obj.stats === 'object' && obj.stats !== null) {
      const stats = obj.stats as Record<string, unknown>;

      return Object.entries(stats)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join('\n');
    }
    if (typeof obj.graph === 'object' && obj.graph !== null) {
      const graph = obj.graph as Record<string, unknown>;

      return Object.entries(graph)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join('\n');
    }
    if (Array.isArray(obj.notes)) {
      if (obj.notes.length === 0) return '  Ninguna';

      return obj.notes
        .map((n: Record<string, unknown>) => {
          const parts = [`  - ${n.file ?? ''}`];

          if (n.days_since_touch) parts.push(`    (${n.days_since_touch} dias)`);
          if (n.word_count) parts.push(`    (${n.word_count} palabras)`);

          return parts.join('');
        })
        .join('\n');
    }
    if (Array.isArray(obj.proposals)) {
      if (obj.proposals.length === 0) return '  Ninguna propuesta';

      return obj.proposals
        .map((p: Record<string, unknown>) => `  - ${p.source ?? p.target ?? JSON.stringify(p)}`)
        .join('\n');
    }
  }

  return JSON.stringify(data, null, 2);
};

export const ResultView: React.FC<ResultViewProps> = ({ result, onBack }) => (
  <Box flexDirection="column">
    <Text bold>Intent: {result.routed.intent}</Text>
    <Text dimColor>Confianza: {result.routed.confidence}</Text>
    <Text> </Text>
    <Text bold>Pasos:</Text>
    {result.steps.map((step, i) => (
      <Box key={i} gap={1}>
        <StepIndicator kind={step.kind} />
        <Text>{step.message}</Text>
      </Box>
    ))}
    <Text> </Text>
    <Text bold>Resultado:</Text>
    <Text>{formatResult(result.result)}</Text>
    <Text> </Text>
    <Text dimColor>Enter o Esc para volver al menu</Text>
  </Box>
);
