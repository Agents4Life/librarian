import type { CurationProposal } from "../types.js";
import type { ReviewInfo } from "../review/types.js";

export type ProposalStatus = "pending" | "approved" | "rejected" | "applying" | "applied";

export type ProposalDiagnostics = {
  warnings: string[];
  relatedPaths: string[];
  duplicateCandidates: string[];
  confidence?: number;
};

export type StoredProposal = {
  id: string;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
  sourcePath: string;
  proposal: CurationProposal;
  diagnostics: ProposalDiagnostics;
  review?: ReviewInfo;
  appliedAt?: string;
};

export type CreateProposalInput = {
  sourcePath: string;
  proposal: CurationProposal;
};
