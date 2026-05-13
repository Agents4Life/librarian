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
- `wiki/` contains maintained knowledge pages.
- `reportes/` contains diagnostics, reports, and proposals.
- Existing content should not be overwritten without review.
- Generated relationships should cite evidence from files.

## Current Write Behavior

Some commands are read-only. Some commands write generated reports or wiki pages.

Read-oriented flows include search, incomplete-note listing, stale-note listing, graph inspection, and most chat/query paths.

Write-oriented flows include report generation and live batch processing through `scripts/process-raw.js`.

Batch processing supports `--dry-run`; use it before live mode.

Processing state is tracked in `state/processed.json` (not in `raw/`). The batch script does not modify files in `raw/`. Older versions wrote `librarian.processed: true` into raw frontmatter; if you ran those versions, some raw notes may already contain that field. The current version reads that field for backward compatibility but never writes to `raw/`.

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
- Unexpected writes in alpha flows.
- Misconfigured vault paths.
- Provider-specific privacy or retention policies.
- Older versions of `scripts/process-raw.js` modified frontmatter in `raw/`. Current versions use an external ledger. If you previously ran batch processing, review your `raw/` notes for `librarian.processed` fields that were added by the old script.

## Safer Operating Practices

- Keep your vault under Git or another backup system.
- Review diffs after each live run.
- Keep `raw/` backed up separately.
- Prefer small batches.
- Avoid `--all` until you trust the behavior on your vault.
- Start with non-sensitive sample notes.
