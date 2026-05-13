import type { ProposalStatus } from "../proposals/types.js";
import { TransitionError } from "./types.js";

const VALID_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["applying", "rejected"],
  applying: ["applied", "failed", "rolled_back"],
  rejected: [],
  applied: [],
  failed: ["applying"],
  rolled_back: ["applying"],
};

export const canTransition = (from: ProposalStatus, to: ProposalStatus): boolean => {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
};

export const assertTransition = (from: ProposalStatus, to: ProposalStatus): void => {
  if (!canTransition(from, to)) {
    throw new TransitionError(from, to);
  }
};

export const TERMINAL_STATES: ProposalStatus[] = ["applied", "rejected"];
