import { defaultConfig } from "../config.js";
import { FileProposalStore, type ProposalStatus } from "../proposals/index.js";

type ListOptions = { status?: ProposalStatus; format?: "json" };

export const listProposals = async (vaultPath?: string, options?: ListOptions) => {
  const vp = vaultPath ?? defaultConfig.vaultPath;
  const store = new FileProposalStore(vp);
  const proposals = await store.list(options?.status);

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
  const updated = await store.updateStatus(id, "approved");
  console.log(JSON.stringify({ ok: true, id: updated.id, status: updated.status }, null, 2));
};

export const rejectProposal = async (id: string, vaultPath?: string) => {
  const vp = vaultPath ?? defaultConfig.vaultPath;
  const store = new FileProposalStore(vp);
  const updated = await store.updateStatus(id, "rejected");
  console.log(JSON.stringify({ ok: true, id: updated.id, status: updated.status }, null, 2));
};
