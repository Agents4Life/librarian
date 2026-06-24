# Librarian

> Experimental local-first agent for maintaining an LLM Wiki in an Obsidian vault.

Librarian is an AI agent that helps maintain the knowledge layer of an Obsidian vault. It's not the wiki itself: it's the librarian that reads immutable sources, generates reviewable wiki proposals, finds gaps, detects weak notes, and writes reviewable reports.

It implements the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f): instead of searching raw documents from scratch on every question, the AI builds and maintains incrementally a persistent, structured, interconnected wiki in Markdown.

## Status

Librarian is in experimental alpha.

Today it's useful for technical Obsidian users who are comfortable with CLI, Markdown, local configuration, and reviewing generated changes. It's not yet a polished Obsidian plugin or a fully autonomous knowledge manager.

First, run Librarian on a copy of your vault.

## Why It Exists

Traditional RAG tools let you chat with documents, but each question starts almost from scratch. Librarian takes a different approach: it maintains a durable `wiki/` layer inside your vault.

The goal isn't to replace your thinking. The goal is to remove the bookkeeping that makes personal wikis degrade: missing links, duplicated concepts, stale pages, weak summaries, orphan notes, and forgotten syntheses.

## Vault Model

Librarian expects a vault with these layers:

```text
vault/
  1-proyectos/  # Optional PARA folders from the Second Brain Ecosystem.
  2-areas/
  3-recursos/
  4-archivo/
  daily/
  inbox/        # Human inbox. Not processed automatically.
  templates/
  home.md

  raw/          # Immutable sources explicitly approved for AI.
  wiki/         # AI-maintained pages.
    index.md
    log.md
    conceptos/
    entidades/
    sources/
    synthesis/
  reports/      # Reports, diagnostics, and review artifacts.
    chats/      # Persisted chat sessions.
    conflicts/  # Merge conflict files.
  reviews/      # Human review/export surface.
  memory/       # Persistent agent/session memory.
  configs/      # Visible/editable Librarian configuration.
  .librarian/   # Internal state, indexes, cache, locks, proposals.
    state/      # Indexes and processed ledger.
    proposals/  # Source of truth for proposals.
    transactions/ # Transactional records of apply.
```

Base rules:

- `raw/` is the explicit consent boundary for AI processing. Librarian never modifies files here.
- `wiki/` is maintained knowledge. Only modified via approve/apply.
- `reports/` holds diagnostics and chat logs.
- `reviews/` is a human review/export surface. It's not the source of truth for proposals.
- `.librarian/proposals/` is the source of truth for proposals.
- `.librarian/transactions/` records apply attempts and recovery metadata.
- `wiki/` is only modified via approve/apply.
- `inbox/`, `daily/`, and PARA are the human layer; move or copy to `raw/` only the sources you want Librarian to process.

## What Works Today

- Interactive TUI and one-shot CLI queries.
- Vault indexing, wiki search, backlinks, graph stats, stale notes, incomplete notes, and orphan notes.
- Automatic curation of raw notes: `/process` classifies, approves, and applies directly to the wiki.
- Manual review flow available with `preview`, `approve`, `reject`, `apply`, `retry`, and `reset`.
- Status reports and persisted chat logs under `reports/`.
- Local-first configuration compatible with OpenAI, pointing to Ollama by default.
- `librarian init` idempotent scaffolding with Second Brain Ecosystem templates.
- Post-apply hooks: `wiki/log.md` updates during apply; `wiki/index.md` still requires explicit maintenance/rebuild depending on the flow used.
- Automatic export of proposals to `reviews/` as Obsidian-readable Markdown.
- Vault-local configuration from `vault/configs/librarian.yaml`.
- Multi-file proposals (multiple atomic targets in a single proposal).
- `save-chat` to convert Q&A responses into reviewable wiki proposals.
- Embeddings provider with fallback to Jaccard heuristic.
- `librarian lint` for comprehensive vault health check.
- `librarian claims` for claim extraction and contradiction detection.

## Current Limitations

- Interactive setup wizard (`librarian init` is basic scaffolding).
- Obsidian plugin (technical debt — full functionality via CLI/TUI).
- Real vector database (ChromaDB, etc.) in the current implementation; embeddings use an in-process memory store.
- PDF/EPUB ingestion is implemented but not wired as a CLI command.
- Some write paths remain experimental.
- Cloud model usage is opt-in via environment variables, but privacy depends on the chosen provider.

## Safety

Librarian works with personal knowledge bases. Be conservative.

- Start with a copy of your vault.
- Use `--dry-run` for batch processing.
- Keep your vault in Git or another backup system.
- Review generated files before trusting them.
- Don't point Librarian at sensitive notes if you configure a cloud model.
- `raw/` is meant to be read-only, but the project is in alpha.

See [SAFETY.md](SAFETY.md) for the complete security model.

## First Run — Step by Step

1. **Install Librarian** (see [Installation](#installation) below).

2. **Point to your vault**:
   ```bash
   export LIBRARIAN_VAULT_PATH="/path/to/your/obsidian/vault"
   ```

3. **Initialize the Librarian layer in your vault**:
   ```bash
   librarian init
   ```
   This creates the human layer (`inbox/`, `daily/`, PARA), `raw/`, `wiki/`, `reports/`, `reviews/`, `.librarian/`, `_assets/`, and templates. It's idempotent — safe to run again.

4. **Build the index**:
   ```bash
   librarian index rebuild
   ```
   This scans the vault and generates `.librarian/state/index.json`. Without an index, most commands won't work.

5. **Verify the index**:
   ```bash
   librarian index status
   ```
   Should report a fresh index.

6. **Start the TUI**:
   ```bash
   librarian
   ```

7. **Read the status bar**:
   - `● indice listo` — all good.
   - `⚠ actualizar indice` — the vault changed since last index. Quit with `Ctrl+C`, run `librarian index rebuild`, and restart.
   - `○ sin indice` — never indexed. Run `librarian index rebuild`.
   - `◉ LLM: model` — AI model is connected.
   - `✗ LLM desconectado` — Ollama is not running. Make sure it's active with `ollama serve`.

8. **Start using it**: type questions in the chat, or use `/search`, `/status`, `/help`.

## Installation

```bash
git clone git@github.com:Agents4Life/librarian.git
cd librarian
npm install
npm run build
npm link
```

After `npm link`, the `librarian` command becomes available globally.

Node.js 22+ is required.

## Configuration

Define your vault path before running commands:

```bash
export LIBRARIAN_VAULT_PATH="/path/to/your/obsidian/vault"
```

You can also start from the environment template:

```bash
cp .env.example .env
```

For batch scripts, `VAULT_PATH` is also supported for compatibility:

```bash
export VAULT_PATH="/path/to/your/obsidian/vault"
```

Copy `config.example.yaml` if you want a documented local file:

```bash
cp config.example.yaml config.yaml
```

`config.yaml` is ignored by Git because it may contain local paths or provider configuration.

`vault/configs/librarian.yaml` is part of the vault model provided by the Second Brain Ecosystem. Librarian supports vault-local configuration with priority: environment variables → `vault/configs/librarian.yaml` → `config.yaml` in CWD → defaults.

## Model Providers

By default, Librarian points to a local Ollama endpoint compatible with OpenAI:

```bash
export OLLAMA_BASE_URL="http://127.0.0.1:11434/v1"
export OLLAMA_MODEL="qwen3.5:4b"
```

You can configure another OpenAI-compatible endpoint using the same variables. If you set `ZAI_API_KEY`, Librarian sends an `Authorization` header when appropriate.

Librarian uses native `fetch()` — no external LLM SDK. It supports primary and fallback endpoints with configurable timeout.

Privacy depends on the provider:

- Local Ollama: notes stay on your machine or local network.
- Cloud provider: selected fragments of notes may be sent to that provider.

Local-first is the default stance, not a guarantee if you configure a cloud provider.

## Usage

### Interactive TUI

```bash
librarian
```

The TUI is **chat-first**: chat is the main view, and most command results appear there as readable messages. Interactive views (graph health, proposal review) open as temporary overlays, dismissed with `Esc`.

The tab bar (1-4) gives direct access to: **Chat**, **Review**, **Health**, **Help**.

#### Slash Commands

Commands that produce text go to chat. Interactive commands open overlays.

| Command | Target | Action |
|---------|---------|--------|
| `/search <query>` | Chat | Search the wiki |
| `/status` | Chat | Status overview |
| `/process` | Chat | Process raw notes and write to the wiki |
| `/review` | Overlay | Review pending proposals |
| `/graph` | Chat | Connections graph |
| `/orphans` | Overlay | Show orphan notes |
| `/stale` | Chat | Show stale notes (90+ days) |
| `/health` | Overlay | Graph health dashboard |
| `/activity` | Overlay | Session activity log |
| `/index` | Chat | Update vault index |
| `/help` | Overlay | List available commands |

#### Status Bar

The bottom bar shows: index status (`indice listo` / `⚠ actualizar indice`), active LLM model (`LLM: qwen2.5:3b` / `✗ LLM desconectado`), and pending proposals.

### One-shot Query

```bash
librarian "search Clean Architecture"
librarian "wiki status"
librarian "ask about Clean Architecture"
```

The one-shot CLI returns JSON. The TUI returns readable text.

### Vault Initialization

```bash
librarian init                  # Scaffold Librarian layer in vault (idempotent, includes templates)
```

### Health Check And Claims

```bash
librarian lint                  # Comprehensive health check (incomplete, stale, orphans, wiki files, claims)
librarian lint --skip-claims    # Quick health check without claim analysis
librarian claims                # Extract claims and detect contradictions in the wiki
librarian claims --section=conceptos  # Analyze a single wiki section
librarian claims --output=json  # JSON output instead of markdown
```

### Save Chat As Proposal

```bash
librarian save-chat --question="What is Clean Architecture?" --answer="It's a pattern..."
```

Converts a Q&A pair into a reviewable wiki proposal using the LLM to classify it.

### Index Maintenance

```bash
librarian index status    # Show index freshness and cache metadata
librarian index rebuild   # Rebuild the persisted vault index
```

Librarian uses an automatic processing flow for `/process` and a proposal-first flow for manual operations:

```bash
librarian proposals                      # List all proposals
librarian proposals --status=pending     # Filter by status
librarian proposal <id>                  # View proposal details
librarian preview <id>                   # Preview content
librarian approve <id>                   # Approve a proposal
librarian reject <id> --reason="..."     # Reject with a reason
librarian apply <id>                     # Execute an approved proposal
librarian retry <id>                     # Retry a failed or rolled-back proposal
librarian reset <id>                     # Reset a failed or rolled-back proposal to pending
```

Proposal states: `pending → approved → applying → applied`, `pending → rejected`. On error: `applying → failed` (recoverable via `retry`) or `applying → rolled_back` (recoverable via `reset`).

### Batch Processing Of Raw

#### From The TUI

Inside the TUI, `/process` inspects the approved sources in `raw/`, classifies them with AI, and writes them directly to the wiki. Duplicate notes are skipped automatically. Proposals are saved in `.librarian/proposals/` for auditing purposes.

```
/process    → process raw notes and write them to the wiki
```

#### From The CLI

Preview proposals without writing:

```bash
node scripts/process-raw.js --dry-run --limit 10
```

Live mode generates proposals in `.librarian/proposals/`. Review and apply them with:

```bash
node scripts/process-raw.js --limit 10
librarian proposals
librarian preview <id>
librarian approve <id>
librarian apply <id>
```

## Second Brain Ecosystem Compatibility

Librarian is designed to implement the optional AI operational layer described in the Second Brain Ecosystem guides, especially guide 04 and guide 07. The base Second Brain setup works without Librarian.

Compatibility rules:

- Keep the PARA folders and the human workflow intact.
- Add the Librarian layer only when you want AI-assisted wiki maintenance.
- Move sources from `inbox/` to `raw/` only when you consent to Librarian processing them.
- Treat `reviews/` as a human-readable surface and `.librarian/proposals/` as the source of truth.
- Treat the full vision from guide 07 as broader than the current alpha. Librarian today implements the proposal-first foundation, not the entire autonomous promise of LLM Wiki.

## License

MIT
