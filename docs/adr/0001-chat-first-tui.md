# ADR 0001: Chat-First TUI

**Date:** 2026-05-16

## Context

Librarian's TUI needed a navigation model. Options considered:

1. **Tab-per-command** — Each slash command gets its own tab/view.
2. **Dashboard** — A single dashboard with panels for everything.
3. **Chat-first** — Chat is the home. Most results appear as chat messages. Interactive views open as temporary overlays.

## Decision

We chose **chat-first** (option 3).

## Rationale

- Users are non-technical ("personas comunes"). A chat interface is the most familiar mental model.
- Most commands produce text output (search results, status, stale notes). Showing them as chat messages avoids unnecessary navigation.
- Interactive views (graph health, orphan review, proposal review) are occasional tasks better served as focused overlays dismissed with Esc.
- The chat history naturally serves as an activity log, reducing the need for a separate activity view.
- Tab bar (1-4) provides quick access to the four most useful persistent views: Chat, Revisar, Salud, Ayuda.

## Consequences

- Slash commands are split into two routing categories: chat-bound (`/search`, `/status`, `/process`, `/stale`, `/graph`, `/researcher`) and overlay-bound (`/health`, `/orphans`, `/review`, `/activity`, `/help`).
- All TUI text is in Spanish, human-readable. No technical jargon or raw JSON shown to users.
- CLI one-shot mode still returns JSON for scripting.
- Overlays must have a clear dismiss mechanism (Esc) and show the command name in the header.
