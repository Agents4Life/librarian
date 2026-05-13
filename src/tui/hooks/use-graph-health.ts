import { useState, useCallback } from "react";

import type { QueryApi } from "../../index-context.js";
import type { ProposalStore } from "../../proposals/proposal-store.js";
import type { GraphHealthSummary } from "../activity/types.js";
import { computeGraphHealth } from "../health/compute-graph-health.js";

export const useGraphHealth = (
  queryApi: QueryApi | null,
  proposalStore: ProposalStore | null,
) => {
  const [summary, setSummary] = useState<GraphHealthSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!queryApi || !proposalStore) return;
    setLoading(true);
    try {
      const result = await computeGraphHealth(queryApi, proposalStore);
      setSummary(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, [queryApi, proposalStore]);

  return { summary, loading, refresh };
};
