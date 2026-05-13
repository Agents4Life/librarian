import type { CurationProposal } from "../types.js";
import type { ReviewInfo } from "../review/types.js";

export type ProposalStatus = "pending" | "approved" | "rejected" | "applying" | "applied" | "failed" | "rolled_back";

export type ProposalDiagnostics = {
  warnings: string[];
  relatedPaths: string[];
  duplicateCandidates: string[];
  confidence?: number;
};

export type TransitionEntry = {
  operationId: string;
  from: ProposalStatus;
  to: ProposalStatus;
  at: string;
  attempt: number;
  reason?: string;
  error?: string;
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
  attempts: number;
  lastError: string | null;
  transitions: TransitionEntry[];
};

export type CreateProposalInput = {
  sourcePath: string;
  proposal: CurationProposal;
};
