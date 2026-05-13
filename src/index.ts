#!/usr/bin/env node
import { runLibrarian } from './harness.js';
import { listProposals, approveProposal, rejectProposal } from './commands/proposals.js';
import type { ProposalStatus } from './proposals/types.js';

const argv = process.argv.slice(2);

const operationalCommands: Record<string, (args: string[]) => Promise<void>> = {
  proposals: async (args) => {
    const status = args.find((a) => a.startsWith("--status="))?.split("=")[1] as ProposalStatus | undefined;
    await listProposals(undefined, { status });
  },
  approve: async (args) => {
    const id = args[0];
    if (!id) { console.error("Usage: librarian approve <id>"); process.exit(1); }
    await approveProposal(id);
  },
  reject: async (args) => {
    const id = args[0];
    if (!id) { console.error("Usage: librarian reject <id>"); process.exit(1); }
    await rejectProposal(id);
  },
};

const command = argv[0];
if (command && operationalCommands[command]) {
  await operationalCommands[command](argv.slice(1));
  process.exit(0);
}

const input = argv.join(' ').trim();

if (input) {
  const result = await runLibrarian(input);

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const { render } = await import('ink');
const React = await import('react');
const { App } = await import('./tui/app.js');

render(React.createElement(App));
