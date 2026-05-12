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

## Design Principles

- `raw/` is read-only source material.
- Writes should be explicit, reviewable, and preferably proposal-first.
- The agent should cite evidence instead of inventing relationships.
- Local-first behavior is preferred.
- Cloud model usage must be explicit.

## Useful Docs

- [docs/product/CONTEXT.md](docs/product/CONTEXT.md) defines domain language.
- [docs/design/contracts/tools.md](docs/design/contracts/tools.md) defines tool expectations.
- [docs/adr/](docs/adr/) records architecture decisions.
- [SAFETY.md](SAFETY.md) documents safety expectations.
