import type { ProposalStatus } from "../proposals/types.js";
import { TransitionError } from "./types.js";

const VALID_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["applied", "rejected"],
  rejected: [],
  applied: [],
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
