import type { ProposalStatus, StoredProposal } from "../proposals/types.js";
import type { ProposalStore } from "../proposals/proposal-store.js";
import type { ReviewInfo } from "./types.js";
import { assertTransition } from "./status-machine.js";
import { applyProposalToVault } from "./apply-proposal.js";

export class ReviewService {
  constructor(
    private readonly store: ProposalStore,
    private readonly vaultPath: string,
  ) {}

  async get(id: string): Promise<StoredProposal | null> {
    return this.store.get(id);
  }

  async list(status?: ProposalStatus): Promise<StoredProposal[]> {
    return this.store.list(status);
  }

  async approve(id: string): Promise<StoredProposal> {
    const proposal = await this.store.get(id);
    if (!proposal) throw new Error(`Proposal not found: ${id}`);

    assertTransition(proposal.status, "approved");

    proposal.status = "approved";
    proposal.updatedAt = new Date().toISOString();
    proposal.review = {
      reviewedAt: new Date().toISOString(),
      decision: "approved",
    };

    return this.store.save(proposal);
  }

  async reject(id: string, reason?: string): Promise<StoredProposal> {
    const proposal = await this.store.get(id);
    if (!proposal) throw new Error(`Proposal not found: ${id}`);

    assertTransition(proposal.status, "rejected");

    proposal.status = "rejected";
    proposal.updatedAt = new Date().toISOString();
    proposal.review = {
      reviewedAt: new Date().toISOString(),
      decision: "rejected",
      reason,
    };

    return this.store.save(proposal);
  }

  async apply(id: string): Promise<StoredProposal> {
    const proposal = await this.store.get(id);
    if (!proposal) throw new Error(`Proposal not found: ${id}`);

    assertTransition(proposal.status, "applied");

    await applyProposalToVault(this.vaultPath, proposal);

    proposal.status = "applied";
    proposal.updatedAt = new Date().toISOString();
    proposal.appliedAt = new Date().toISOString();

    return this.store.save(proposal);
  }
}
