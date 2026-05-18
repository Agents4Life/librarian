# Safety

Librarian is experimental alpha software for personal knowledge bases. Treat it as an assistant that proposes changes, not as an authority that can safely rewrite your vault unattended.

## Recommended First Run

1. Make a copy of your Obsidian vault.
2. Point Librarian at the copy with `LIBRARIAN_VAULT_PATH` or `VAULT_PATH`.
3. Run read-only/status commands first.
4. Run batch processing with `--dry-run`.
5. Review generated proposals before using live mode.

## Vault Rules

- `raw/` is intended to be immutable source material.
- `inbox/`, `daily/`, and PARA folders are the human layer. Librarian does not process them directly.
- `wiki/` contains maintained knowledge pages.
- `reports/` contains diagnostics, reports, chat logs, and other generated artifacts.
- `reviews/` is intended as a human-readable review/export surface. It is not the proposal source of truth.
- `.librarian/proposals/` is the proposal source of truth.
- `.librarian/state/` contains indexes, metadata, and the processed ledger.
- `.librarian/transactions/` contains apply transaction records.
- Existing content should not be overwritten without review.
- Generated relationships should cite evidence from files.

## Current Write Behavior

Some commands are read-only. Some commands write generated reports, internal state, or reviewable proposals. The only current flow that writes wiki pages is `librarian apply <id>` after a proposal has been approved.

Read-oriented flows include search, incomplete-note listing, stale-note listing, graph inspection, orphan listing, `librarian index status`, and most chat/query paths.

State/report write paths include:

- `librarian index rebuild`, which writes `.librarian/state/index.json` and index metadata.
- Status/report flows, which may write Markdown diagnostics under `reports/`.
- Chat persistence, which writes chat logs under `reports/chats/`.
- Batch curation and TUI `/process`, which write proposals under `.librarian/proposals/` and readable exports under `reviews/` in live mode.
- Proposal apply through `librarian apply <id>`, which writes an approved target under `wiki/`, transaction records under `.librarian/transactions/`, and the processed ledger under `.librarian/state/processed.json`.

Batch processing supports `--dry-run`; use it before live mode. Live batch processing generates proposals only. It does not write directly to `wiki/`.

Processing state is tracked in `.librarian/state/processed.json` (not in `raw/`). The batch script does not modify files in `raw/`. Older versions wrote `librarian.processed: true` into raw frontmatter; if you ran those versions, some raw notes may already contain that field. The current version reads that field for backward compatibility but never writes to `raw/`.

## Apply Safety Invariants

- `raw/` files are never modified by apply.
- Proposal targets must resolve inside the vault; path traversal and absolute target paths are rejected.
- Create proposals refuse to overwrite existing targets.
- Update proposals refuse to create missing targets.
- Apply writes through a temporary file and rename.
- Apply records transaction metadata and transition history.
- Apply marks the processed ledger only after a successful target write.
- Failed applies transition to recoverable states such as `failed` or `rolled_back`.

## Privacy

Librarian can use any OpenAI-compatible model endpoint you configure.

- Local Ollama keeps model calls local to your machine or network.
- Cloud providers receive the prompts and note excerpts sent for classification, curation, or chat context.
- API keys should live in `.env` or your shell environment, never in committed files.

Do not use a cloud model with notes you are not willing to send to that provider.

## Known Risks

- False duplicate detection.
- Low-quality suggested links.
- Hallucinated summaries if model context is insufficient.
- Unexpected writes in alpha flows, especially when new write paths are introduced.
- Misconfigured vault paths.
- Provider-specific privacy or retention policies.
- `reviews/`, `memory/`, and `configs/` are part of the intended vault model, but some behavior is still roadmap or only partially integrated.
- `wiki/log.md` is appended during apply. `wiki/index.md` maintenance utilities exist, but full automatic index reconstruction is not yet fully integrated.
- Older versions of `scripts/process-raw.js` modified frontmatter in `raw/`. Current versions use an external ledger. If you previously ran batch processing, review your `raw/` notes for `librarian.processed` fields that were added by the old script.

## Safer Operating Practices

- Keep your vault under Git or another backup system.
- Review diffs after each live run.
- Keep `raw/` backed up separately.
- Prefer small batches.
- Avoid `--all` until you trust the behavior on your vault.
- Start with non-sensitive sample notes.
