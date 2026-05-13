import { defaultConfig } from "../config.js";
import { FileProposalStore, type ProposalStatus } from "../proposals/index.js";
import { ReviewService } from "../review/index.js";

type ListOptions = { status?: ProposalStatus; format?: "json" };

export const listProposals = async (vaultPath?: string, options?: ListOptions) => {
  const vp = vaultPath ?? defaultConfig.vaultPath;
  const store = new FileProposalStore(vp);
  const service = new ReviewService(store, vp);
  const proposals = await service.list(options?.status);

  const output = proposals.map((p) => ({
    id: p.id,
    status: p.status,
    sourcePath: p.sourcePath,
    type: p.proposal.type,
    category: p.proposal.category,
    createdAt: p.createdAt,
  }));

  console.log(JSON.stringify(output, null, 2));
};

export const approveProposal = async (id: string, vaultPath?: string) => {
  const vp = vaultPath ?? defaultConfig.vaultPath;
  const store = new FileProposalStore(vp);
  const service = new ReviewService(store, vp);

  try {
    const updated = await service.approve(id);
    console.log(JSON.stringify({ ok: true, id: updated.id, status: updated.status }, null, 2));
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
};

export const rejectProposal = async (id: string, reason?: string, vaultPath?: string) => {
  const vp = vaultPath ?? defaultConfig.vaultPath;
  const store = new FileProposalStore(vp);
  const service = new ReviewService(store, vp);

  try {
    const updated = await service.reject(id, reason);
    console.log(JSON.stringify({ ok: true, id: updated.id, status: updated.status }, null, 2));
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
};
