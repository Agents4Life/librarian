#!/usr/bin/env node
import { runLibrarian } from './harness.js';
import { listProposals, approveProposal, rejectProposal } from './commands/proposals.js';
import { getProposal } from './commands/proposal.js';
import { previewProposal } from './commands/preview.js';
import { applyProposal } from './commands/apply.js';
import type { ProposalStatus } from './proposals/types.js';

const argv = process.argv.slice(2);

const operationalCommands: Record<string, (args: string[]) => Promise<void>> = {
  proposals: async (args) => {
    const status = args.find((a) => a.startsWith("--status="))?.split("=")[1] as ProposalStatus | undefined;
    await listProposals(undefined, { status });
  },
  proposal: async (args) => {
    const id = args[0];
    if (!id) { console.error("Usage: librarian proposal <id>"); process.exit(1); }
    await getProposal(id);
  },
  preview: async (args) => {
    const id = args[0];
    if (!id) { console.error("Usage: librarian preview <id>"); process.exit(1); }
    await previewProposal(id);
  },
  approve: async (args) => {
    const id = args[0];
    if (!id) { console.error("Usage: librarian approve <id>"); process.exit(1); }
    await approveProposal(id);
  },
  reject: async (args) => {
    const id = args[0];
    if (!id) { console.error("Usage: librarian reject <id>"); process.exit(1); }
    const reason = args.find((a) => a.startsWith("--reason="))?.split("=").slice(1).join("=");
    await rejectProposal(id, reason);
  },
  apply: async (args) => {
    const id = args[0];
    if (!id) { console.error("Usage: librarian apply <id>"); process.exit(1); }
    await applyProposal(id);
  },
  init: async () => {
    const { initVault } = await import('./commands/init.js');
    await initVault();
  },
  'save-chat': async (args) => {
    const { saveChat } = await import('./commands/save-chat.js');
    const question = args.find((a) => a.startsWith('--question='))?.split('=').slice(1).join('=');
    const answer = args.find((a) => a.startsWith('--answer='))?.split('=').slice(1).join('=');
    if (!question || !answer) {
      console.error('Usage: librarian save-chat --question="Your question" --answer="The answer"');
      process.exit(1);
    }
    await saveChat({ question, answer });
  },
  retry: async (args) => {
    const id = args[0];
    if (!id) { console.error("Usage: librarian retry <id>"); process.exit(1); }
    const { retryProposal } = await import('./commands/proposals.js');
    await retryProposal(id);
  },
  reset: async (args) => {
    const id = args[0];
    if (!id) { console.error("Usage: librarian reset <id>"); process.exit(1); }
    const { resetProposal } = await import('./commands/proposals.js');
    await resetProposal(id);
  },
  index: async (args) => {
    const subcommand = args[0];
    const { indexRebuild, indexStatus } = await import('./commands/index.js');
    if (subcommand === "rebuild") {
      await indexRebuild();
    } else if (subcommand === "status") {
      await indexStatus();
    } else {
      console.error("Usage: librarian index <rebuild|status>");
      process.exit(1);
    }
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
