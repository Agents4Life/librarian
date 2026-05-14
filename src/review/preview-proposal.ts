import type { StoredProposal } from "../proposals/types.js";

export type ProposalPreview = {
  id: string;
  operation: "create" | "update";
  targetPath: string;
  contentPreview: string;
  additionalTargets?: Array<{
    path: string;
    action: "create" | "update";
    contentPreview: string;
  }>;
};

export const computePreview = (proposal: StoredProposal): ProposalPreview => {
  const preview: ProposalPreview = {
    id: proposal.id,
    operation: proposal.proposal.type === "update" ? "update" : "create",
    targetPath: proposal.proposal.target,
    contentPreview: proposal.proposal.preview,
  };

  const additional = proposal.proposal.additionalTargets;
  if (additional && additional.length > 0) {
    preview.additionalTargets = additional.map((t) => ({
      path: t.path,
      action: t.action,
      contentPreview: t.content,
    }));
  }

  return preview;
};
