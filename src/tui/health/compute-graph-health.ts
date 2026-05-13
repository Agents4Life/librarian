import type { QueryApi } from '../../index-context.js';
import type { ProposalStore } from '../../proposals/proposal-store.js';
import type { GraphHealthStatus, GraphHealthSummary } from '../activity/types.js';

const deriveHealthStatus = (summary: Omit<GraphHealthSummary, 'status'>): GraphHealthStatus => {
  if (
    (summary.orphanNotes > 0 && summary.incompleteNotes > summary.totalWikiNotes * 0.5) ||
    summary.pendingProposals > 20
  ) {
    return 'critical';
  }

  if (
    summary.orphanNotes > 0 ||
    summary.staleNotes > 0 ||
    summary.incompleteNotes > 0 ||
    summary.rawBacklog > 10 ||
    summary.pendingProposals > 5
  ) {
    return 'warning';
  }

  return 'healthy';
};

export const computeGraphHealth = async (
  queryApi: QueryApi,
  proposalStore: ProposalStore,
): Promise<GraphHealthSummary> => {
  const wikiNotes = queryApi.getBySection('wiki');
  const rawNotes = queryApi.getBySection('raw');
  const orphans = queryApi.getOrphans();
  const stale = queryApi.getStale();
  const incomplete = queryApi.getIncomplete();

  let brokenLinks = 0;
  for (const note of wikiNotes) {
    for (const link of note.links) {
      const found = queryApi.getByTitle(link);
      if (found.length === 0) brokenLinks++;
    }
  }

  const allProposals = await proposalStore.list();
  const pendingProposals = allProposals.filter((p) => p.status === 'pending').length;
  const approvedProposals = allProposals.filter((p) => p.status === 'approved').length;
  const appliedProposals = allProposals.filter((p) => p.status === 'applied').length;

  const rawBacklog = rawNotes.filter((note) => {
    const librarian = note.frontmatter.librarian as Record<string, unknown> | undefined;
    return !Boolean(librarian?.processed);
  }).length;

  const summary = {
    totalWikiNotes: wikiNotes.length,
    orphanNotes: orphans.filter((n) => n.section === 'wiki').length,
    staleNotes: stale.filter((n) => n.section === 'wiki').length,
    incompleteNotes: incomplete.filter((n) => n.section === 'wiki').length,
    brokenLinks,
    rawBacklog,
    pendingProposals,
    approvedProposals,
    appliedProposals,
  };

  return { ...summary, status: deriveHealthStatus(summary) };
};
