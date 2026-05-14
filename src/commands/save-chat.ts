import { defaultConfig } from '../config.js';
import { FileProposalStore } from '../proposals/index.js';
import { convertChatToProposal } from '../chat-to-proposal.js';
import { buildOrLoadIndex } from '../index-context.js';

/**
 * Save a Q&A pair as a wiki page proposal.
 * Usage: librarian save-chat --question "..." --answer "..."
 */
export const saveChat = async (args: {
  question: string;
  answer: string;
  vaultPath?: string;
}): Promise<void> => {
  const vp = args.vaultPath ?? defaultConfig.vaultPath;
  const store = new FileProposalStore(vp);

  // Get existing wiki page names for context
  let existingPages: string[] = [];
  try {
    const index = await buildOrLoadIndex(vp);
    existingPages = Object.keys(index.notes)
      .filter((path) => path.startsWith('wiki/'))
      .map((path) => path.replace(/^wiki\//, '').replace(/\.md$/, ''));
  } catch {
    // Index might not exist yet, that's fine
  }

  const proposal = await convertChatToProposal({
    question: args.question,
    answer: args.answer,
    existingPages,
  });

  // Store the proposal — wrap in StoredProposal shape
  const stored = await store.create({
    sourcePath: `chat://${Date.now()}`,
    proposal,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        proposalId: proposal.diff_id,
        target: proposal.target,
        category: proposal.category,
        title: proposal.summary || 'Untitled',
        message: 'Proposal created. Use `librarian approve <id>` to approve.',
      },
      null,
      2,
    ),
  );
};
