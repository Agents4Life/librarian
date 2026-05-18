#!/usr/bin/env node
// @ts-nocheck
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
  lint: async (args) => {
    const { lintVault } = await import('./commands/lint.js');
    const vaultPath = args.find((a) => !a.startsWith('--')) ?? '.';
    const skipClaims = args.includes('--skip-claims');
    const result = await lintVault(vaultPath, { skipClaims });

    console.log("\n🔍 Librarian Lint Report");
    console.log("=".repeat(40));

    const c = result.checks;
    console.log(`  Incomplete notes: ${c.incomplete.count === 0 ? '✅' : '⚠️'} ${c.incomplete.count}`);
    c.incomplete.notes.slice(0, 5).forEach((n) => console.log(`    - ${n}`));

    console.log(`  Stale notes:      ${c.stale.count === 0 ? '✅' : '⚠️'} ${c.stale.count}`);
    c.stale.notes.slice(0, 5).forEach((n) => console.log(`    - ${n}`));

    console.log(`  Orphan notes:     ${c.orphans.count === 0 ? '✅' : '⚠️'} ${c.orphans.count}`);
    c.orphans.notes.slice(0, 5).forEach((n) => console.log(`    - ${n}`));

    console.log(`  Wiki index:       ${c.wikiIndex.ok ? '✅' : '❌'} ${c.wikiIndex.message}`);
    console.log(`  Wiki log:         ${c.wikiLog.ok ? '✅' : '❌'} ${c.wikiLog.message}`);
    console.log(`  Claims:           ${c.claims.ok ? '✅' : '❌'} ${c.claims.contradictions} contradictions (${c.claims.critical} critical)`);

    console.log("=".repeat(40));
    console.log(result.healthy ? "✅ Vault is healthy!" : "⚠️ Issues found. Check reports/ for details.");
    console.log();

    if (result.reports.length > 0) {
      console.log("Reports generated:");
      result.reports.forEach((r) => console.log(`  - ${r}`));
    }

    process.exit(result.healthy ? 0 : 1);
  },
  claims: async (args) => {
    const { runClaims } = await import('./claims/cli.js');
    const vaultPath = args.find((a) => !a.startsWith('--')) ?? '.';
    const section = args.find((a) => a.startsWith('--section='))?.split('=').slice(1).join('=');
    const output = (args.find((a) => a.startsWith('--output='))?.split('=')[1] ?? 'markdown') as 'json' | 'markdown';

    const result = await runClaims({ vaultPath, output, section });

    if (output === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n📊 Claims Analysis`);
      console.log(`   Pages analyzed: ${result.stats.pagesAnalyzed}`);
      console.log(`   Claims extracted: ${result.stats.claimsExtracted}`);
      console.log(`   Contradictions: ${result.stats.contradictionsFound} (${result.stats.criticalCount} critical)`);
      console.log(`   Report saved to reports/claims-analysis.md\n`);
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

render(React.createElement(App), { exitOnCtrlC: false });
