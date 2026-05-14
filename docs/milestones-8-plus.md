# Librarian Milestones 8+

This planning document is local to `docs/`, which is intentionally ignored by the application repository. Use it as the operational plan for the next implementation branches.

## Current Milestone Map

Librarian is not starting from scratch. The repository has already completed the infrastructure, review workflow, TUI review surfaces, production hardening, and functional improvements through Milestone 7.

- **Pre-M3**: vault indexer, query API, TUI runtime, and tools migrated to `ToolContext`.
- **M3**: proposal store, pipeline contracts, and CLI proposal subcommands.
- **M4**: review workflow, state machine, apply/preview flow, path safety, and locked processed ledger.
- **M5a**: proposal inbox and detail screens in the TUI.
- **M5b**: graph health dashboard and activity log.
- **M6**: production hardening, transaction records, index invalidation, proposal recovery, and apply-order invariant tests.
- **M7**: functional improvements, YAML config loader, chat through `runLibrarian`, e2e smoke test, TUI alignment, and error hardening.

## Milestone 8: Promise Compliance MVP

Objective: close the gap between the current implementation and the public Second Brain Ecosystem promise.

Recommended branch:

```bash
milestone-8-promise-compliance-mvp
```

Recommended issues:

- `feat(init): scaffold complete Librarian vault layer`
- `feat(curation): generate structured wiki proposal previews`
- `feat(review): update wiki index and log after apply`
- `feat(reviews): export proposals as human-readable markdown`

### Scope

#### `librarian init`

- Initializes the promised optional vault layer.
- Creates `raw/`, `wiki/`, `reports/`, `reviews/`, `memory/`, `configs/`, and `.librarian/*`.
- Creates `wiki/index.md` and `wiki/log.md` when missing.
- Never overwrites user content.

#### Structured Proposals

- `proposeWikiPage` stops generating previews that are mostly raw-content copies.
- Generated pages include `Summary`, `Key Ideas`, `Related`, and `Sources`.
- Suggested links are materialized as wikilinks where possible.
- Every generated wiki proposal cites the original `raw/` source.

#### Apply Maintains Wiki Navigation

- Successful apply updates `wiki/index.md`.
- Successful apply appends to `wiki/log.md`.
- Index/log maintenance failures are reported as warnings.
- A successful target write is not reverted only because index/log maintenance failed.

#### `reviews/` Export

- Proposal exports under `reviews/` are human-readable and regenerable.
- `.librarian/proposals/` remains the proposal source of truth.
- Proposal state transitions update or move the exported review markdown.

### Acceptance Criteria

- `librarian init` initializes the full optional layer: `raw/`, `wiki/`, `reports/`, `reviews/`, `memory/`, `configs/`, and `.librarian/*`.
- Initialization creates `wiki/index.md` and `wiki/log.md` when missing and never overwrites user content.
- Proposal previews include `Summary`, `Key Ideas`, `Related`, and `Sources`.
- Suggested links are represented as wikilinks.
- Raw files are never modified.
- Proposal generation never writes directly to `wiki/`.
- Successful apply updates `wiki/index.md` and appends to `wiki/log.md`.
- Index/log maintenance failures are visible warnings, not silent failures.
- `reviews/` exports are human-readable and regenerable.
- Deleting `reviews/` does not break proposal operations.

### Out Of Scope For M8

- Real embeddings or vector storage.
- Q&A-to-wiki proposal workflows.
- Multi-file proposal operations.
- Claims, contradiction detection, or outdated-knowledge replacement.

## Milestone 9: Vault-Local Configuration And Stronger Health Checks

Objective: make setup match the Second Brain Ecosystem vault model and improve actionable diagnostics.

Scope:

- Support official config at `vault/configs/librarian.yaml`.
- Define config precedence: environment variables, vault-local config, repo-local `config.yaml`, defaults.
- Extend health reports with broken wikilinks, pages missing `Summary`, pages missing `Sources`, raw backlog, pending proposals, and severity/status.

Acceptance criteria:

- Config precedence is documented and tested.
- `config.example.yaml` can be copied into `vault/configs/librarian.yaml`.
- `/status` and reports expose actionable health issues.
- Tests cover broken links, missing sources, raw backlog, and pending proposals.

## Milestone 10: Accumulation Workflows

Objective: start fulfilling “good answers become new wiki pages.”

Scope:

- Persist better metadata about the context used in chat answers.
- Add a `propose-answer` flow or equivalent command.
- Create `synthesis` proposals from valuable Q&A.
- Require approve/apply before writing to `wiki/`.

Acceptance criteria:

- A persisted chat answer can become a proposal.
- The proposal cites source pages used as context.
- No direct write to `wiki/` occurs.
- Tests cover proposal creation from persisted chat.

## Milestone 11: Better Retrieval

Objective: replace or complement heuristic semantic search.

Scope:

- Introduce a `SearchProvider` boundary.
- Keep the current heuristic provider as default/fallback.
- Add optional local embeddings with Ollama.
- Do not use cloud embeddings without explicit configuration.

Acceptance criteria:

- Embeddings are opt-in.
- Local embeddings are the preferred provider when enabled.
- Cloud providers require explicit configuration.
- Tests mock the embedding provider.

## Milestone 12: Multi-File Wiki Maintenance

Objective: support the Guide 07 vision where one source can touch many wiki pages.

Scope:

- Change the proposal model from a single target to multiple operations.
- Preview each operation separately.
- Apply multiple create/update operations with robust transaction records.
- Provide rollback or clear partial-failure reporting.
- Make CLI/TUI review each target change understandable before approval.

Acceptance criteria:

- One proposal can affect multiple wiki pages.
- Apply is transactional or reports partial rollback clearly.
- Tests cover failure during a multi-target apply.
- The review UI makes every target change visible.

## Milestone 13: Claims, Contradictions, And Outdated Knowledge

Objective: address the most ambitious linting promise safely.

Scope:

- Introduce an explicit claim model.
- Track claims with source and verification date.
- Report claims without sources, old claims, and possible conflicts.
- Generate correction proposals instead of automatic rewrites.

Possible claim shape:

```markdown
## Claims

- Claim: ...
  Source: [[source-page]]
  Last verified: YYYY-MM-DD
```

Acceptance criteria:

- Librarian reports possible contradictions with evidence.
- It does not rewrite claims automatically.
- Corrections are proposal-first.
