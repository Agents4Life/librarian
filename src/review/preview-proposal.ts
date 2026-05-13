import type { StoredProposal } from "../proposals/types.js";

export type ProposalPreview = {
  id: string;
  operation: "create" | "update";
  targetPath: string;
  contentPreview: string;
};

export const computePreview = (proposal: StoredProposal): ProposalPreview => ({
  id: proposal.id,
  operation: proposal.proposal.type === "update" ? "update" : "create",
  targetPath: proposal.proposal.target,
  contentPreview: proposal.proposal.preview,
});
