import { defaultConfig } from "../config.js";
import { FileProposalStore } from "../proposals/index.js";
import { ReviewService } from "../review/index.js";

export const applyProposal = async (id: string, vaultPath?: string) => {
  const vp = vaultPath ?? defaultConfig.vaultPath;
  const store = new FileProposalStore(vp);
  const service = new ReviewService(store, vp);

  try {
    const updated = await service.apply(id);
    console.log(JSON.stringify({
      ok: true,
      id: updated.id,
      status: updated.status,
      appliedAt: updated.appliedAt,
      targetPath: updated.proposal.target,
    }, null, 2));
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
};
