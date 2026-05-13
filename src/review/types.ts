export type ReviewInfo = {
  reviewedAt: string;
  decision: "approved" | "rejected";
  reason?: string;
};

export class TransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid transition: ${from} → ${to}`);
    this.name = "TransitionError";
  }
}
