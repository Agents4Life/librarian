import { useCallback } from 'react';
import { uiEventBus } from '../event-bus.js';
import { theme } from '../theme.js';
import { getReviewService } from '../services.js';
import type { AppState, AppAction, WorkspaceNode } from '../state.js';
import type { StoredProposal } from '../../proposals/types.js';

const refreshAllStatusInbox = async (
  service: ReturnType<typeof getReviewService>,
  inboxNode: WorkspaceNode | undefined,
  dispatch: React.Dispatch<AppAction>,
) => {
  if (!inboxNode || inboxNode.type !== 'proposal-inbox') return;
  const [pending, failed, rolledBack, applying] = await Promise.all([
    service.list('pending'),
    service.list('failed'),
    service.list('rolled_back'),
    service.list('applying'),
  ]);
  dispatch({ type: 'UPDATE_INBOX_PROPOSALS', nodeId: inboxNode.id, proposals: [...pending, ...failed, ...rolledBack, ...applying] });
};

export const useProposals = (
  state: AppState,
  dispatch: React.Dispatch<AppAction>,
) => {
  const loadProposalInbox = useCallback(async (): Promise<string | null> => {
    try {
      const service = getReviewService(state.vaultPath);
      const [pending, failed, rolledBack, applying] = await Promise.all([
        service.list('pending'),
        service.list('failed'),
        service.list('rolled_back'),
        service.list('applying'),
      ]);
      const proposals: StoredProposal[] = [...pending, ...failed, ...rolledBack, ...applying];
      const nodeId = crypto.randomUUID();
      const node: WorkspaceNode = { type: 'proposal-inbox', id: nodeId, proposals, cursor: 0, createdAt: Date.now() };
      dispatch({ type: 'ADD_NODE', node });
      uiEventBus.emit({ type: 'agent:done', nodeId });
      return nodeId;
    } catch (error) {
      uiEventBus.emit({ type: 'agent:error', error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }, [state.vaultPath, dispatch]);

  const approve = useCallback(async (proposalId: string) => {
    try {
      const service = getReviewService(state.vaultPath);
      await service.approve(proposalId);
      uiEventBus.emit({ type: 'review:approved', id: proposalId });
      dispatch({ type: 'PUSH_ACTIVITY', entry: { icon: '✓', color: theme.success, message: `Approved: ${proposalId.slice(0, 20)}...` } });
      const inboxNode = state.workspace.find((n) => n.type === 'proposal-inbox');
      await refreshAllStatusInbox(service, inboxNode, dispatch);
      dispatch({ type: 'NAVIGATE_BACK' });
    } catch (error) {
      uiEventBus.emit({ type: 'agent:error', error: error instanceof Error ? error.message : String(error) });
    }
  }, [state.vaultPath, state.workspace, dispatch]);

  const reject = useCallback(async (proposalId: string) => {
    try {
      const service = getReviewService(state.vaultPath);
      await service.reject(proposalId);
      uiEventBus.emit({ type: 'review:rejected', id: proposalId });
      dispatch({ type: 'PUSH_ACTIVITY', entry: { icon: '✗', color: theme.error, message: `Rejected: ${proposalId.slice(0, 20)}...` } });
      const inboxNode = state.workspace.find((n) => n.type === 'proposal-inbox');
      await refreshAllStatusInbox(service, inboxNode, dispatch);
      dispatch({ type: 'NAVIGATE_BACK' });
    } catch (error) {
      uiEventBus.emit({ type: 'agent:error', error: error instanceof Error ? error.message : String(error) });
    }
  }, [state.vaultPath, state.workspace, dispatch]);

  const retry = useCallback(async (proposalId: string) => {
    try {
      const service = getReviewService(state.vaultPath);
      const updated = await service.retry(proposalId);
      dispatch({ type: 'PUSH_ACTIVITY', entry: { icon: '↻', color: theme.primary, message: `Retried: ${proposalId.slice(0, 20)}... → ${updated.status}` } });
      dispatch({ type: 'PUSH_ACTIVITY_EVENT', event: { id: crypto.randomUUID(), type: 'proposal:applied' as const, message: `Retry ${updated.status}: ${updated.proposal.target}`, createdAt: Date.now(), meta: { id: updated.id, target: updated.proposal.target } } });
      const inboxNode = state.workspace.find((n) => n.type === 'proposal-inbox');
      await refreshAllStatusInbox(service, inboxNode, dispatch);
      dispatch({ type: 'NAVIGATE_BACK' });
    } catch (error) {
      uiEventBus.emit({ type: 'agent:error', error: error instanceof Error ? error.message : String(error) });
    }
  }, [state.vaultPath, state.workspace, dispatch]);

  const reset = useCallback(async (proposalId: string) => {
    try {
      const service = getReviewService(state.vaultPath);
      await service.reset(proposalId);
      dispatch({ type: 'PUSH_ACTIVITY', entry: { icon: '↺', color: theme.warning, message: `Reset: ${proposalId.slice(0, 20)}... → pending` } });
      const inboxNode = state.workspace.find((n) => n.type === 'proposal-inbox');
      await refreshAllStatusInbox(service, inboxNode, dispatch);
      dispatch({ type: 'NAVIGATE_BACK' });
    } catch (error) {
      uiEventBus.emit({ type: 'agent:error', error: error instanceof Error ? error.message : String(error) });
    }
  }, [state.vaultPath, state.workspace, dispatch]);

  const openDetail = useCallback((proposalId: string) => {
    const inboxNode = state.workspace.find((n) => n.type === 'proposal-inbox');
    if (!inboxNode || inboxNode.type !== 'proposal-inbox') return;
    const proposal = inboxNode.proposals.find((p: StoredProposal) => p.id === proposalId);
    if (!proposal) return;
    const detailNode: WorkspaceNode = { type: 'proposal-detail', id: crypto.randomUUID(), proposal, showPreview: false, createdAt: Date.now() };
    dispatch({ type: 'ADD_NODE', node: detailNode });
  }, [state.workspace, dispatch]);

  return { loadProposalInbox, approve, reject, retry, reset, openDetail };
};
