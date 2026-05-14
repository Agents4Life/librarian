import type { ProposalStatus, StoredProposal, TransitionEntry } from "../proposals/types.js";
import type { ProposalStore } from "../proposals/proposal-store.js";
import type { ReviewInfo } from "./types.js";
import { assertTransition, TERMINAL_STATES } from "./status-machine.js";
import { applyProposalToVault, type ApplyResult } from "./apply-proposal.js";
import { generateOperationId } from "../proposals/operation-id.js";
import { loadTransaction } from "./transaction-store.js";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { updateWikiIndex, appendWikiLog } from "../wiki-maintenance.js";
import { exportProposalToReview, removeReviewExport } from "./export-review.js";

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

    const operationId = generateOperationId();

    proposal.status = "approved";
    proposal.updatedAt = new Date().toISOString();
    proposal.review = {
      reviewedAt: new Date().toISOString(),
      decision: "approved",
    };

    const saved = await this.store.save(proposal);

    try {
      await exportProposalToReview(this.vaultPath, proposal);
    } catch { /* non-critical */ }

    return saved;
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

    const saved = await this.store.save(proposal);

    try {
      await removeReviewExport(this.vaultPath, proposal.id);
    } catch { /* non-critical */ }

    return saved;
  }

  async apply(id: string): Promise<StoredProposal> {
    let proposal = await this.store.get(id);
    if (!proposal) throw new Error(`Proposal not found: ${id}`);

    assertTransition(proposal.status, "applying");

    const operationId = generateOperationId();
    const attempt = proposal.attempts + 1;
    const fromStatus = proposal.status;

    proposal.status = "applying";
    proposal.updatedAt = new Date().toISOString();
    this.recordTransition(proposal, operationId, fromStatus, "applying", attempt, "apply-start");
    await this.store.save(proposal);

    const result: ApplyResult = await applyProposalToVault(this.vaultPath, proposal);

    if (result.success) {
      proposal.status = "applied";
      proposal.updatedAt = new Date().toISOString();
      proposal.appliedAt = new Date().toISOString();
      proposal.attempts = attempt;
      this.recordTransition(proposal, result.operationId, "applying", "applied", attempt, "apply-success");

      // Post-apply: update wiki index and log
      try {
        await updateWikiIndex({ vaultPath: this.vaultPath, queryApi: null as any });
      } catch { /* non-critical */ }

      try {
        await appendWikiLog(this.vaultPath, {
          action: "applied",
          source: proposal.proposal.source,
          target: proposal.proposal.target,
        });
      } catch { /* non-critical */ }

      try {
        await removeReviewExport(this.vaultPath, proposal.id);
      } catch { /* non-critical */ }
    } else {
      const finalStatus = result.rollbackError ? "failed" : "rolled_back";
      proposal.status = finalStatus;
      proposal.updatedAt = new Date().toISOString();
      proposal.attempts = attempt;
      proposal.lastError = result.error ?? "Unknown error";
      this.recordTransition(
        proposal,
        result.operationId,
        "applying",
        finalStatus,
        attempt,
        result.rollbackError ? "apply-failed-no-rollback" : "apply-failed-rolled-back",
        result.error,
      );
    }

    return this.store.save(proposal);
  }

  async retry(id: string): Promise<StoredProposal> {
    const proposal = await this.store.get(id);
    if (!proposal) throw new Error(`Proposal not found: ${id}`);

    if (proposal.status !== "failed" && proposal.status !== "rolled_back") {
      throw new Error(`Cannot retry proposal in '${proposal.status}' state. Only 'failed' or 'rolled_back' can be retried.`);
    }

    assertTransition(proposal.status, "applying");

    return this.apply(id);
  }

  async reset(id: string): Promise<StoredProposal> {
    const proposal = await this.store.get(id);
    if (!proposal) throw new Error(`Proposal not found: ${id}`);

    if (TERMINAL_STATES.includes(proposal.status) && proposal.status !== "rejected") {
      throw new Error(`Cannot reset proposal in '${proposal.status}' state.`);
    }

    if (proposal.status === "pending") {
      throw new Error(`Proposal is already in 'pending' state.`);
    }

    const operationId = generateOperationId();
    const fromStatus = proposal.status;

    const previousError = proposal.lastError;
    proposal.status = "pending";
    proposal.updatedAt = new Date().toISOString();
    proposal.lastError = null;
    this.recordTransition(proposal, operationId, fromStatus, "pending", proposal.attempts, "manual-reset", previousError ?? undefined);

    return this.store.save(proposal);
  }

  async recoverStuck(limit?: number): Promise<StoredProposal[]> {
    const stuck = await this.store.list("applying");
    const toRecover = limit ? stuck.slice(0, limit) : stuck;
    const recovered: StoredProposal[] = [];

    for (const proposal of toRecover) {
      let hasCompletedTransaction = false;

      try {
        const txDir = path.join(this.vaultPath, ".librarian", "transactions");
        const files = await readdir(txDir);
        for (const file of files) {
          if (!file.endsWith(".json")) continue;
          try {
            const raw = await readFile(path.join(txDir, file), "utf8");
            const tx = JSON.parse(raw);
            if (tx.proposalId === proposal.id && tx.status === "completed") {
              hasCompletedTransaction = true;
              break;
            }
          } catch {
            // Skip malformed transaction files
          }
        }
      } catch {
        // No transactions dir — no completed transaction
      }

      if (!hasCompletedTransaction) {
        const operationId = generateOperationId();
        const fromStatus = proposal.status;

        proposal.status = "approved";
        proposal.updatedAt = new Date().toISOString();
        this.recordTransition(proposal, operationId, fromStatus, "approved", proposal.attempts, "stuck-recovery");
        await this.store.save(proposal);
        recovered.push(proposal);
      }
    }

    return recovered;
  }

  private recordTransition(
    proposal: StoredProposal,
    operationId: string,
    fromStatus: ProposalStatus,
    toStatus: ProposalStatus,
    attempt: number,
    reason?: string,
    error?: string,
  ): void {
    const entry: TransitionEntry = {
      operationId,
      from: fromStatus,
      to: toStatus,
      at: new Date().toISOString(),
      attempt,
      reason,
      error,
    };
    proposal.transitions.push(entry);
  }
}
