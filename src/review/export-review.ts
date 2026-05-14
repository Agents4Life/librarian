import { mkdir, writeFile, unlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { StoredProposal } from '../proposals/types.js';

export const exportProposalToReview = async (
  vaultPath: string,
  proposal: StoredProposal
): Promise<string | null> => {
  const reviewsDir = join(vaultPath, 'reviews');
  const filePath = join(reviewsDir, `${proposal.id}.md`);

  const tags = proposal.proposal.tags.join(', ');

  const content = `---
librarian:
  type: review
  proposal_id: "${proposal.id}"
  status: ${proposal.status}
  category: ${proposal.proposal.category}
  source: ${proposal.proposal.source}
  target: ${proposal.proposal.target}
  created_at: ${proposal.createdAt}
---

# Proposal: ${proposal.proposal.target.split('/').pop()}

## Metadata

| Field | Value |
|---|---|
| **Source** | \`${proposal.proposal.source}\` |
| **Target** | \`${proposal.proposal.target}\` |
| **Category** | ${proposal.proposal.category} |
| **Status** | ${proposal.status} |
| **Created** | ${proposal.createdAt} |
| **Tags** | ${tags} |
| **Summary** | ${proposal.proposal.summary} |

## Preview

${proposal.proposal.preview}

---

*Review this proposal with: \`librarian approve ${proposal.id}\` or \`librarian reject ${proposal.id}\`*
`;

  try {
    await mkdir(reviewsDir, { recursive: true });
    await writeFile(filePath, content, 'utf-8');
    return filePath;
  } catch {
    return null;
  }
};

export const removeReviewExport = async (
  vaultPath: string,
  proposalId: string
): Promise<void> => {
  const filePath = join(vaultPath, 'reviews', `${proposalId}.md`);
  try {
    await unlink(filePath);
  } catch {
    // File may not exist; ignore
  }
};

export const exportAllPendingReviews = async (
  vaultPath: string,
  proposals: StoredProposal[]
): Promise<string[]> => {
  const pending = proposals.filter(
    (p) => p.status === 'pending' || p.status === 'approved'
  );

  const results: string[] = [];
  for (const proposal of pending) {
    const path = await exportProposalToReview(vaultPath, proposal);
    if (path) {
      results.push(path);
    }
  }
  return results;
};
