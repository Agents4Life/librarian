export type GraphHealthStatus = "healthy" | "warning" | "critical";

export type GraphHealthSummary = {
  totalWikiNotes: number;
  orphanNotes: number;
  staleNotes: number;
  incompleteNotes: number;
  brokenLinks: number;
  rawBacklog: number;
  pendingProposals: number;
  approvedProposals: number;
  appliedProposals: number;
  status: GraphHealthStatus;
};

export type ActivityEvent = {
  id: string;
  type:
    | "review:approved"
    | "review:rejected"
    | "proposal:created"
    | "proposal:applied"
    | "pipeline:processed"
    | "index:rebuilt"
    | "graph:warning"
    | "graph:critical";
  message: string;
  createdAt: number;
  meta?: Record<string, unknown>;
};
