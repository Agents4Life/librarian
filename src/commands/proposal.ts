import { defaultConfig } from "../config.js";
import { FileProposalStore } from "../proposals/index.js";
import { ReviewService } from "../review/index.js";

export const getProposal = async (id: string, vaultPath?: string) => {
  const vp = vaultPath ?? defaultConfig.vaultPath;
  const store = new FileProposalStore(vp);
  const service = new ReviewService(store, vp);
  const proposal = await service.get(id);

  if (!proposal) {
    console.error(`Proposal not found: ${id}`);
    process.exit(1);
  }

  console.log(JSON.stringify(proposal, null, 2));
};
