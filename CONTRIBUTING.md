# Contributing

Thanks for your interest in Librarian. This project is early and safety matters because it operates on personal knowledge bases.

## Development Setup

```bash
npm install
npm run build
npm test
```

Use a disposable fixture vault or a copy of your real vault while developing.

## Before Opening A PR

- Run `npm run typecheck`.
- Run `npm test`.
- Avoid committing local config, logs, generated state, or vault content.
- Keep changes small and reviewable.
- Update docs when behavior changes.
- Update `SAFETY.md` when changing write behavior.
- Add or update tests for any new write path.

## Design Principles

- `raw/` is read-only source material.
- Writes should be explicit, reviewable, and preferably proposal-first.
- The agent should cite evidence instead of inventing relationships.
- Local-first behavior is preferred.
- Cloud model usage must be explicit.
- `.librarian/proposals/` is the proposal source of truth.
- `reviews/` is a generated human-readable surface, not authoritative state.
- `wiki/` changes should go through approve/apply unless a design note explicitly says otherwise.
- Recovery behavior matters: apply changes should preserve transaction history and avoid ambiguous partial state.

## Safety Checklist For Write Paths

- Do not modify `raw/`.
- Reject path traversal and absolute target paths.
- Refuse accidental overwrites for create operations.
- Refuse missing targets for update operations.
- Persist enough metadata to diagnose or recover failed writes.
- Prefer proposal generation over direct wiki writes.
- Keep live batch processing proposal-first.

## Useful Docs

- [README.md](README.md) documents current capabilities, usage, and user-facing behavior.
- [SAFETY.md](SAFETY.md) documents safety expectations and current write behavior.
- Some planning docs may live outside this repository or in ignored local `docs/` directories. Do not assume local planning docs are versioned here.
