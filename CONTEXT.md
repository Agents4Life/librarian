# Librarian — Domain Glossary

## Core Concepts

- **Vault** — An Obsidian wiki vault: a directory tree of Markdown files.
- **Note** — A single Markdown file in the vault.
- **Mensaje / Consulta** — A user's input to Librarian (question, search, or slash command).
- **Procesar** — What Librarian does with a Mensaje: classify the intent, execute, return a result.
- **Clasificación** — The step where Librarian decides what to do with a Mensaje (which Intent it maps to).
- **Intent** — The classified purpose: search-wiki, wiki-status, orphan-notes, connections, process-notes, stale-notes, incomplete-notes, ask, unknown.

## Vault Structure

- **Raw Inbox** (`raw/`) — Unprocessed notes waiting to be curated.
- **Wiki** (`wiki/`) — Curated, interconnected notes organized by category.
- **Reports** (`reports/`) — Generated reports (stats, chat logs, health).
- **Index** — Cached representation of the vault's note graph. Built by the Indexer, queried via the Query API.

## Entities

- **Proposal** — A suggested change to the vault (create, update, or skip). Stored in `.librarian/proposals/`.
- **Review** — The approval/rejection of a Proposal by the user.
- **Researcher** — External skill that connects to the internet to research topics not found in the vault.

## TUI

- **Chat-first** — Chat is the home view. Most slash commands produce text results that appear as chat messages.
- **Overlay** — A temporary full-screen view for interactive dashboards (health, orphans, review, activity, help). Opened by slash commands, dismissed with Esc.
- **Workspace Node** — A typed view rendered in the terminal (chat, search results, graph health, etc.).
- **Activity Stream** — Real-time feed of what Librarian is doing (progress messages, errors).
- **Composer** — The input bar where the user types mensajes. Placeholder: "preguntame algo...".
- **Tab** — Navigation shortcut (1-4): Chat, Revisar, Salud, Ayuda.
- **Status Bar** — Bottom bar showing index status, LLM model/status, and pending proposal count.
- **Slash routing** — `/search`, `/status`, `/process`, `/stale`, `/graph`, `/research`, `/index` → chat. `/health`, `/orphans`, `/review`, `/activity`, `/help` → overlay.
- **Response format** — TUI responses are human-readable Spanish text. CLI one-shot returns JSON.

## External

- **LLM** — Local language model (Ollama) used for classification, chat, and curation.
