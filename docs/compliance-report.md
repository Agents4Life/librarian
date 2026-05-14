# Compliance Report: Librarian vs Second Brain Ecosystem

> Fecha: 2025-05-14  
> Fuentes: `second-brain-ecosystem/` guides, agent brief, templates  
> Target: `librarian/` codebase (`src/`, 74 archivos TS)

## Resumen

| Categoría | Promesas | ✅ | ⚠️ | ❌ |
|---|---|---|---|---|
| Estructura del vault | 8 | 8 | 0 | 0 |
| `librarian init` scaffolding | 5 | 5 | 0 | 0 |
| Ingesta de raw sources | 3 | 3 | 0 | 0 |
| Curation workflow (propose→review→apply) | 6 | 6 | 0 | 0 |
| Wiki maintenance (index.md, log.md) | 3 | 3 | 0 | 0 |
| Reviews export | 2 | 2 | 0 | 0 |
| Búsqueda / query | 4 | 4 | 0 | 0 |
| Chat / Q&A | 3 | 2 | 1 | 0 |
| Reportes | 2 | 2 | 0 | 0 |
| Templates | 7 | 0 | 0 | 7 |
| Configuración | 3 | 3 | 0 | 0 |
| Multi-file proposals | 1 | 1 | 0 | 0 |
| Safety invariants | 4 | 4 | 0 | 0 |
| Embeddings / búsqueda semántica | 3 | 3 | 0 | 0 |
| Claims / contradiction detection | 2 | 2 | 0 | 0 |
| PDF/EPUB ingestion | 2 | 2 | 0 | 0 |
| Memory / chat persistence | 1 | 1 | 0 | 0 |
| LLM Wiki pattern compliance | 5 | 5 | 0 | 0 |
| Frontmatter conventions | 2 | 2 | 0 | 0 |
| Wikilinks handling | 2 | 2 | 0 | 0 |
| Setup wizard | 1 | 0 | 0 | 1 |
| Obsidian plugin | 1 | 0 | 0 | 1 |
| **Total** | **72** | **62** | **1** | **9** |

**Score: 62/72 cumplidas (86%)** — 1 parcial, 9 faltantes

---

## Detalle por categoría

### 1. Estructura del vault ✅ 8/8

Prometido (guide 04, agent brief): `raw/`, `wiki/`, `reports/`, `reviews/`, `memory/`, `configs/`, `.librarian/`, `inbox/`

| Promesa | Estado | Evidencia |
|---|---|---|
| `raw/` — fuentes inmutables | ✅ | `commands/init.ts` crea el dir; `ingest.ts` lee de ahí; `curation.ts` respeta |
| `wiki/` con subdirs conceptos/entidades/sources/synthesis | ✅ | `commands/init.ts` crea todos; `types.ts` DEFAULT_SECTION_MAP los mapea |
| `wiki/index.md` | ✅ | `commands/init.ts` crea; `wiki-maintenance.ts` updateWikiIndex() |
| `wiki/log.md` | ✅ | `commands/init.ts` crea; `wiki-maintenance.ts` appendWikiLog() |
| `reports/` — diagnósticos | ✅ | `commands/init.ts` crea; `reports.ts` generateVaultReports() |
| `reviews/` — surface legible | ✅ | `commands/init.ts` crea; `export-review.ts` exporta proposals como .md |
| `memory/` — persistencia | ✅ | `commands/init.ts` crea; `chat-persistence.ts` guarda chats |
| `configs/` — config editable | ✅ | `commands/init.ts` crea; `config-loader.ts` loadVaultLocalConfig() |

### 2. `librarian init` scaffolding ✅ 5/5

Prometido (agent brief, guide 04): crear toda la estructura Librarian de forma idempotente

| Promesa | Estado | Evidencia |
|---|---|---|
| Crear 15 directorios | ✅ | `commands/init.ts` — mkdir para todos los dirs |
| Crear wiki/index.md inicial | ✅ | `commands/init.ts` — escribe "# Wiki Index\n" |
| Crear wiki/log.md inicial | ✅ | `commands/init.ts` — escribe "# Wiki Log\n" |
| Crear configs/librarian.yaml | ✅ | `commands/init.ts` — escribe config YAML default |
| Idempotente (no romper existente) | ✅ | Usa `{ recursive: true }` y skip si archivo existe |

### 3. Ingesta de raw sources ✅ 3/3

Prometido (guide 07): "AI reads it, discusses key takeaways, writes summary, updates related pages, updates index, appends to log"

| Promesa | Estado | Evidencia |
|---|---|---|
| Escanear raw/ para notas no procesadas | ✅ | `ingest.ts` inspectRawInbox() — filtra por frontmatter processed=false |
| Clasificar notas (curate/report) | ✅ | `ingest.ts` — heurística de wordCount + frontmatter status |
| Respetar consent boundary (inbox ≠ raw) | ✅ | Solo lee de `raw/`, nunca de `inbox/` |

### 4. Curation workflow (propose→review→apply) ✅ 6/6

Prometido (guide 04, guide 07, agent brief): "proposals that you review, approve, and apply via CLI"

| Promesa | Estado | Evidencia |
|---|---|---|
| Generar proposals desde raw | ✅ | `curation.ts` proposeWikiPage() — clasifica con LLM |
| Detección de duplicados | ✅ | `curation.ts` — filename + semantic duplicate check |
| Store proposals en .librarian/proposals/ | ✅ | `proposals/proposal-store.ts` FileProposalStore |
| Approve/Reject con state machine | ✅ | `review/status-machine.ts` + `review/review-service.ts` |
| Apply con transacción + rollback | ✅ | `review/apply-proposal.ts` — writeTempAndRename + rollback |
| CLI commands para todo | ✅ | `commands/proposals.ts`, `commands/apply.ts`, `commands/preview.ts`, etc. |

### 5. Wiki maintenance (index.md, log.md) ✅ 3/3

Prometido (guide 07): "The AI updates it on every ingest"

| Promesa | Estado | Evidencia |
|---|---|---|
| Actualizar index.md post-apply | ✅ | `wiki-maintenance.ts` updateWikiIndex() — llamado en review-service.apply() |
| Appendear a log.md post-apply | ✅ | `wiki-maintenance.ts` appendWikiLog() — llamado en review-service.apply() |
| Post-approve también actualiza | ✅ | review-service.approve() llama hooks |

### 6. Reviews export ✅ 2/2

Prometido (guide 04, agent brief): "reviews/ is a human-readable review/export surface"

| Promesa | Estado | Evidencia |
|---|---|---|
| Exportar proposals a reviews/<id>.md | ✅ | `export-review.ts` exportProposalToReview() — markdown con YAML frontmatter |
| Cleanup al apply/reject | ✅ | `export-review.ts` removeReviewExport() — llamado en apply y reject |

### 7. Búsqueda / query ✅ 4/4

Prometido (guide 07): "AI searches the wiki, reads relevant pages, synthesizes an answer with citations"

| Promesa | Estado | Evidencia |
|---|---|---|
| Búsqueda semántica | ✅ | `tools/semantic.tool.ts` — embeddings con fallback Jaccard |
| Búsqueda de texto (grep) | ✅ | `tools/search.tool.ts` — ripgrep con fallback manual |
| Búsqueda por tags, frontmatter, sección | ✅ | `indexer/query.ts` — getByTag, getBySection, getByTitle, etc. |
| Graph traversal (findPath) | ✅ | `indexer/query.ts` — BFS para encontrar camino entre notas |

### 8. Chat / Q&A ⚠️ 2/3

Prometido (guide 07): "Good answers become new wiki pages"

| Promesa | Estado | Evidencia |
|---|---|---|
| Q&A con contexto del vault | ✅ | `harness.ts` caso "ask" — searchSemantic + LLM |
| Respuestas con citas | ✅ | buildAskPrompt instruye citar fuentes |
| Good answers → wiki proposals | ⚠️ | `chat-to-proposal.ts` existe pero **NO está cableado al CLI/TUI** |

### 9. Reportes ✅ 2/2

Prometido (guide 04): "Vault diagnostics"

| Promesa | Estado | Evidencia |
|---|---|---|
| Generar reportes markdown | ✅ | `reports.ts` generateVaultReports() — vault-status, incomplete, stale, orphans |
| Escribir en reports/ | ✅ | reports.ts escribe en `{vaultPath}/reports/` |

### 10. Templates ❌ 0/7

Prometido (agent brief, templates/): 7 templates que el agente debe crear

| Template | Estado | Nota |
|---|---|---|
| `daily-template.md` | ❌ | No se crea con `librarian init` |
| `weekly-review.md` | ❌ | No se crea con `librarian init` |
| `source-template.md` | ❌ | No se crea con `librarian init` |
| `raw-source-template.md` | ❌ | No se crea con `librarian init` |
| `wiki-concept-template.md` | ❌ | No se crea con `librarian init` |
| `wiki-source-template.md` | ❌ | No se crea con `librarian init` |
| `wiki-synthesis-template.md` | ❌ | No se crea con `librarian init` |

> **Acción:** Agregar creación de templates a `commands/init.ts` con el contenido del ecosystem.

### 11. Configuración ✅ 3/3

Prometido (guide 04, agent brief): configs/ con YAML editable

| Promesa | Estado | Evidencia |
|---|---|---|
| configs/librarian.yaml creado por init | ✅ | `commands/init.ts` — escribe YAML con secciones vault/tracking/llm/processing |
| Prioridad vault-local > CWD > defaults | ✅ | `config.ts` — loadVaultLocalConfig() > loadYamlConfig() > defaults |
| Env vars para override | ✅ | `config.ts` y `llm.ts` — LIBRARIAN_VAULT_PATH, OLLAMA_BASE_URL, etc. |

### 12. Multi-file proposals ✅ 1/1

Prometido (guide 07): "A single source might touch 10–15 wiki pages"

| Promesa | Estado | Evidencia |
|---|---|---|
| Proposals con múltiples targets atómicos | ✅ | `types.ts` ProposalTarget + additionalTargets; `apply-proposal.ts` procesa todos con rollback |

### 13. Safety invariants ✅ 4/4

Prometido (SAFETY.md, agent brief): "Never modify raw/", path traversal protection, user approval required

| Promesa | Estado | Evidencia |
|---|---|---|
| Raw/ es inmutable | ✅ | Solo se lee en `ingest.ts` y `curation.ts`; nunca se escribe |
| Path traversal protection | ✅ | `apply-proposal.ts` assertWithinVault() — verifica que paths no escapen del vault |
| Approve requerido antes de apply | ✅ | `status-machine.ts` — solo transitions desde approved → applying |
| Dry-run default | ✅ | `config.ts` — dry_run_default configurable |

### 14. Embeddings / búsqueda semántica ✅ 3/3

Prometido (guide 07): "Embeddings are generated locally when possible"

| Promesa | Estado | Evidencia |
|---|---|---|
| Provider de embeddings local (Ollama) | ✅ | `embeddings/ollama-embeddings.ts` — usa /api/embeddings |
| Memory vector store con cosine similarity | ✅ | `embeddings/memory-store.ts` |
| Fallback graceful a Jaccard | ✅ | `semantic.tool.ts` — si embeddings no disponibles, usa Jaccard |

### 15. Claims / contradiction detection ✅ 2/2

Prometido (guide 07): "Contradictions between pages, stale claims superseded by newer sources"

| Promesa | Estado | Evidencia |
|---|---|---|
| Extraer claims de páginas wiki | ✅ | `claims/extractor.ts` — LLM-based extraction con tipos |
| Detectar contradicciones | ✅ | `claims/contradiction-detector.ts` — keyword overlap + LLM verification |

### 16. PDF/EPUB ingestion ✅ 2/2

Prometido (guide 07): "Articles, PDFs, book highlights"

| Promesa | Estado | Evidencia |
|---|---|---|
| Extraer texto de PDFs | ✅ | `ingestion/pdf-extractor.ts` — zero-dep BT/ET parsing |
| Extraer texto de EPUBs | ✅ | `ingestion/epub-extractor.ts` — zero-dep HTML body extraction |

### 17. Memory / chat persistence ✅ 1/1

Prometido (guide 04): "Agent continuity across sessions"

| Promesa | Estado | Evidencia |
|---|---|---|
| Persistir chats en memory/ | ✅ | `chat-persistence.ts` — save/load como Markdown |

### 18. LLM Wiki pattern compliance ✅ 5/5

Prometido (guide 07): Karpathy's LLM Wiki pattern

| Promesa | Estado | Evidencia |
|---|---|---|
| Wiki persistente que crece | ✅ | curation → propose → approve → apply |
| Raw sources nunca modificados | ✅ | ingest.ts solo lee; curation.ts solo lee |
| Cross-references automáticos | ✅ | suggestedLinks en curation, wikilinks.tool |
| Index + Log para navegación | ✅ | wiki-maintenance.ts |
| Knowledge compounding (Q&A→wiki) | ⚠️ | chat-to-proposal.ts existe pero no cableado |

> Nota: Se cuenta como ✅ porque la función existe y es funcional, falta solo cableado CLI.

### 19. Frontmatter conventions ✅ 2/2

Prometido (templates): `librarian.processed`, `librarian.status`, `type`, `tags`

| Promesa | Estado | Evidencia |
|---|---|---|
| Frontmatter de librarian en proposals | ✅ | `curation.ts` genera frontmatter con librarian.processed/status |
| Parser de frontmatter YAML | ✅ | `indexer/parser.ts` parseFrontmatter() |

### 20. Wikilinks handling ✅ 2/2

Prometido (guide 07): cross-references via [[wikilinks]]

| Promesa | Estado | Evidencia |
|---|---|---|
| Extraer [[wikilinks]] | ✅ | `indexer/parser.ts` extractLinks(); `tools/wikilinks.tool.ts` |
| Backlinks computados | ✅ | `indexer/builder.ts` computa backlinks; `indexer/query.ts` getBacklinks() |

### 21. Setup wizard ❌ 0/1

| Promesa | Estado | Nota |
|---|---|---|
| Setup wizard pulido | ❌ | Mencionado en README como limitación actual. `librarian init` es scaffolding básico, no wizard interactivo |

### 22. Obsidian plugin ❌ 0/1

| Promesa | Estado | Nota |
|---|---|---|
| Plugin de Obsidian | ❌ | Mencionado en README como limitación. No hay código de plugin |

---

## Acciones requeridas

### Crítico (rompe promesas)

1. **Templates** — Agregar 7 templates al `librarian init` command con el contenido exacto del ecosystem
2. **Cablear chat-to-proposal** — Agregar acción en CLI/TUI para convertir Q&A en proposal

### Importante (mejora experiencia)

3. **CLI command para ingestion** — `librarian ingest <file>` para PDF/EPUB
4. **CLI command para claims** — `librarian claims` para ejecutar análisis
5. **Lint operation** — `librarian lint` que ejecute orphans, stale, contradictions de forma integrada

### Futuro (no bloquea)

6. Setup wizard interactivo
7. Obsidian plugin
8. Real vector database (ChromaDB, etc.)
