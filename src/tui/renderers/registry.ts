import { ChatRenderer } from './renderers/chat-renderer.js';
import { SearchRenderer } from './renderers/search-renderer.js';
import { StatusRenderer } from './renderers/wiki-status-renderer.js';
import { GraphRenderer } from './renderers/graph-renderer.js';
import { ProcessRenderer } from './renderers/process-renderer.js';
import { OrphansRenderer } from './renderers/orphans-renderer.js';
import { StaleRenderer } from './renderers/stale-renderer.js';
import { ProposalInboxRenderer } from './renderers/proposal-inbox-renderer.js';
import { ProposalDetailRenderer } from './renderers/proposal-detail-renderer.js';
import { GraphHealthRenderer } from './renderers/graph-health-renderer.js';
import { ActivityRenderer } from './renderers/activity-renderer.js';
import { HelpRenderer } from './renderers/help-renderer.js';

export const registerRenderers = () => {
  // Register all renderers here to avoid circular imports
  // In a real implementation, you'd dynamically load these
  
  // Note: In a production app, you'd want to:
  // 1. Lazy load renderers on demand
  // 2. Handle missing renderers gracefully
  // 3. Potentially support plugin renderers
  
  // For now, we'll just note that renderers are available
  // The actual registration happens in app.tsx
};