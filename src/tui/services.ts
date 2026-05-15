import { FileProposalStore } from '../proposals/proposal-store.js';
import { ReviewService } from '../review/review-service.js';

let store: FileProposalStore | null = null;
let service: ReviewService | null = null;
let currentVaultPath: string | null = null;

export function getStore(vaultPath: string): FileProposalStore {
  if (!store || currentVaultPath !== vaultPath) {
    store = new FileProposalStore(vaultPath);
    currentVaultPath = vaultPath;
  }
  return store;
}

export function getReviewService(vaultPath: string): ReviewService {
  if (!service || currentVaultPath !== vaultPath) {
    const s = getStore(vaultPath);
    service = new ReviewService(s, vaultPath);
    currentVaultPath = vaultPath;
  }
  return service;
}
