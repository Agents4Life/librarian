import { useState, useCallback } from "react";

import type { StoredProposal, ProposalStatus } from "../../proposals/types.js";
import { FileProposalStore } from "../../proposals/proposal-store.js";
import { ReviewService } from "../../review/review-service.js";

export const useProposals = (vaultPath: string) => {
  const [loading, setLoading] = useState(false);

  const loadProposals = useCallback(async (status?: ProposalStatus): Promise<StoredProposal[]> => {
    setLoading(true);
    try {
      const store = new FileProposalStore(vaultPath);
      const service = new ReviewService(store, vaultPath);
      return await service.list(status);
    } finally {
      setLoading(false);
    }
  }, [vaultPath]);

  const approve = useCallback(async (id: string): Promise<StoredProposal> => {
    const store = new FileProposalStore(vaultPath);
    const service = new ReviewService(store, vaultPath);
    return service.approve(id);
  }, [vaultPath]);

  const reject = useCallback(async (id: string, reason?: string): Promise<StoredProposal> => {
    const store = new FileProposalStore(vaultPath);
    const service = new ReviewService(store, vaultPath);
    return service.reject(id, reason);
  }, [vaultPath]);

  return { loading, loadProposals, approve, reject };
};
