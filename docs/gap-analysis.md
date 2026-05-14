# Gap Analysis: Librarian vs Second Brain Ecosystem

> ¿Qué promete el ecosistema? ¿Qué tiene Librarian hoy? ¿Qué falta?

---

## Resumen Ejecutivo

Librarian tiene una **base sólida** (proposal-first, indexado, TUI, CLI, flujo de revisión completo) pero tiene **gaps significativos** contra lo que las guías del Second Brain Ecosystem prometen al usuario final. Los gaps más críticos son: `librarian init`, exportación a `reviews/`, mantenimiento automático post-apply de wiki, y configuración vault-local.

---

## Estado por Funcionalidad

### ✅ Implementado y funcional

| # | Funcionalidad | Evidencia | Notas |
|---|---|---|---|
| 1 | **TUI interactiva** | `src/tui/` | Workspace con múltiples vistas |
| 2 | **CLI one-shot** | `src/index.ts` → `runLibrarian()` | Devuelve JSON |
| 3 | **Router de intents** | `src/router.ts` | Regex + LLM fallback |
| 4 | **Indexado del vault** | `src/indexer/` (builder, store, query, metadata) | Completo con SHA256 hashes |
| 5 | **Búsqueda semántica** | `src/tools/semantic.tool.ts` | Heurística/Jaccard, NO embeddings reales |
| 6 | **Búsqueda en wiki** | `src/tools/search.tool.ts` | Grep-based |
| 7 | **Backlinks y forward links** | `src/tools/wikilinks.tool.ts` | ✅ |
| 8 | **Notas huérfanas** | `query.getOrphans()` | ✅ |
| 9 | **Notas stale (90+ días)** | `query.getStale()` | ✅ |
| 10 | **Notas incompletas** | `query.getIncomplete()` | ✅ |
| 11 | **Stats del grafo** | `query.getGraphStats()` | ✅ |
| 12 | **Curación proposal-first** | `src/curation.ts` | Clasificación con LLM |
| 13 | **Detección de duplicados** | `src/curation.ts` | Filename + semántica |
| 14 | **Proposal Store** | `src/proposals/proposal-store.ts` | File-based en `.librarian/proposals/` |
| 15 | **Workflow de revisión completo** | `src/review/review-service.ts` | approve, reject, apply, retry, reset, recoverStuck |
| 16 | **State machine de propuestas** | `src/review/status-machine.ts` | Transiciones válidas, estados terminales |
| 17 | **Apply con safety** | `src/review/apply-proposal.ts` | Path traversal check, temp+rename, rollback |
| 18 | **Transaction records** | `src/review/transaction-store.ts` | Registro de cada apply |
| 19 | **Processed ledger** | `src/review/processed-ledger.ts` | Tracking externo (no modifica raw/) |
| 20 | **CLI de propuestas** | `src/commands/proposals.ts` | list, approve, reject, retry, reset |
| 21 | **CLI preview** | `src/commands/preview.ts` | ✅ |
| 22 | **CLI apply** | `src/commands/apply.ts` | ✅ |
| 23 | **CLI index rebuild/status** | `src/commands/index.ts` | ✅ |
| 24 | **Batch processing** | `scripts/process-raw.js` | Con `--dry-run` y `--limit` |
| 25 | **Chat persistence** | `src/tui/chat-persistence.ts` | Guarda/carga en `reports/chats/` |
| 26 | **Reportes de vault** | `src/reports.ts` | vault-status, incomplete, stale, orphans |
| 27 | **Config YAML loader** | `src/config-loader.ts` | Parser propio, soporta env vars |
| 28 | **Providers LLM** | `src/llm.ts` | OpenAI-compatible, primary + fallback |
| 29 | **Wiki maintenance utils** | `src/wiki-maintenance.ts` | `ensureWikiStructure()`, `updateWikiIndex()`, `appendWikiLog()` |
| 30 | **Ingest inspection** | `src/ingest.ts` | `inspectRawInbox()` con recomendaciones |

### ⚠️ Parcialmente implementado

| # | Funcionalidad | Qué falta | Promesa en guía |
|---|---|---|---|
| 31 | **Wiki index.md automático** | ✅ Se llama post-apply vía review-service | Guía 07: wiki auto-mantenida |
| 32 | **Wiki log.md automático** | ✅ Se llama post-apply vía review-service | Guía 07: log de cambios |
| 33 | **Reviews surface** | ✅ Exportación automática a `reviews/` en approve, cleanup en apply/reject | Guía 07: superficie humana de revisión |
| 34 | **Propuestas single-target** | Solo soporta 1 archivo por propuesta. Multi-file no existe | SOUL.md: mantenimiento multi-file |
| 35 | **Q&A → wiki proposals** | Chat responde pero NO puede convertir buenas respuestas en propuestas | README: límite declarado |
| 36 | **Config vault-local** | `vault/configs/librarian.yaml` documentado pero NO leído | README: M9 planificado |

### ❌ No implementado

| # | Funcionalidad | Promesa en guía | Prioridad |
|---|---|---|---|
| 37 | **`librarian init`** | Guía 07: scaffolding de toda la capa Librarian en el vault | 🔴 Crítica |
| 38 | **Embeddings reales** | Guía 07: búsqueda semántica con embeddings | 🟡 Media |
| 39 | **Ingesta PDF/EPUB** | Guía 07: fuentes múltiples | 🟡 Media |
| 40 | **Multi-file wiki maintenance** | SOUL.md: proposals que actualizan múltiples archivos wiki | 🟠 Alta |
| 41 | **Claims/contradiction detection** | Milestones M13 | 🟢 Baja (roadmap lejano) |
| 42 | **Accumulation workflows** | Milestones M10 | 🟢 Baja (roadmap lejano) |
| 43 | **Plugin de Obsidian** | README: límite declarado | 🟢 Baja (roadmap lejano) |
| 44 | **Setup wizard** | README: límite declarado | 🟡 Media |

---

## Promesas del Ecosistema vs Realidad

### Guía 04 — Vault Structure

| Promesa | Estado |
|---|---|
| Carpetas PARA (1-proyectos, 2-areas, 3-recursos, 4-archivo) | ✅ Librarian las respeta, no las crea |
| `raw/` inmutable | ✅ Implementado y verificado |
| `wiki/` con subcarpetas (conceptos, entidades, sources, synthesis) | ✅ `ensureWikiStructure()` las crea |
| `wiki/index.md` | ⚠️ Existe la utilidad, no se llama automáticamente |
| `reports/` con subcarpetas (chats, conflicts) | ⚠️ `chats/` funciona, `conflicts/` no |
| `reviews/` como superficie humana | ⚠️ Declarado, no integrado |
| `memory/` | ❌ No implementado |
| `configs/` | ⚠️ Declarado, no leído |
| `.librarian/` (state, proposals, transactions) | ✅ Funcional |
| `inbox/` humano | ✅ Librarian no lo toca |

### Guía 05 — Essential Plugins

| Promesa | Estado |
|---|---|
| Templates para raw-source, wiki-concept, wiki-source, wiki-synthesis | ✅ Existen en `second-brain/templates/` |
| Librarian los usa automáticamente | ❌ Las plantillas están en el ecosistema, Librarian no las referencia |

### Guía 06 — Workflow

| Promesa | Estado |
|---|---|
| Mover fuentes de `inbox/` a `raw/` | ✅ Humano, no automatizado (correcto) |
| Procesamiento de raw → proposals | ✅ |
| Revisar proposals → approve/apply | ✅ |
| Weekly review template con pasos Librarian | ✅ Template existe |
| Reports para revisión | ⚠️ Se generan pero no son discoverables desde TUI fácilmente |

### Guía 07 — Next Level with AI

| Promesa | Estado |
|---|---|
| Patrón LLM Wiki (no RAG tradicional) | ✅ Librarian sigue este patrón |
| 3 capas (raw → wiki → user) | ✅ |
| 3 operaciones (ingest, query, lint) | ✅ `librarian lint` command implementado |
| `librarian init` para scaffolding | ✅ Implementado — comando idempotente con templates |
| Búsqueda semántica con embeddings | ✅ Embeddings con fallback Jaccard |
| Mantenimiento automático de wiki | ✅ Post-apply hooks integrados |
| Propuestas revisables antes de escribir | ✅ Core del sistema |
| Exportación a `reviews/` legible en Obsidian | ✅ Automático en approve |

### Agent README — Scaffolding Agent

| Promesa | Estado |
|---|---|
| Crear estructura de carpetas | ✅ `librarian init` |
| Verificar que Obsidian está configurado | ⚠️ No aplica (CLI tool) |
| Copiar templates | ✅ 7 templates del ecosystem |

---

## Gaps Críticos (bloquean la promesa de usuario)

### 1. `librarian init` ✅ RESUELTO

**Promesa:** "Agregá la capa Librarian solo cuando quieras mantenimiento wiki asistido por IA."

**Realidad:** `librarian init` scaffolding idempotente implementado. Crea 15 directorios + 4 archivos base.

### 2. Post-apply wiki maintenance ✅ RESUELTO

**Promesa:** Wiki auto-mantenida con `index.md` y `log.md`.

**Realidad:** `review-service.ts` llama `updateWikiIndex()` + `appendWikiLog()` + `removeReviewExport()` después de cada apply exitoso.

### 3. Reviews export surface ✅ RESUELTO

**Promesa:** `reviews/` es la superficie humana de revisión.

**Realidad:** `approve()` → exporta propuesta a `reviews/<id>.md`. `apply()` y `reject()` → limpian el archivo.

### 4. Multi-file proposals 🟠

**Promesa (SOUL.md):** Mantenimiento multi-file de la wiki.

**Realidad:** Cada propuesta es single-target.

**Impacto:** No puede hacer operaciones como "crear página + actualizar index.md + agregar links a páginas relacionadas" en una sola transacción.

### 5. Q&A → wiki proposals 🟡

**Promesa:** Buenas respuestas de chat → propuestas wiki revisables.

**Realidad:** Chat responde pero no hay camino para convertir una respuesta en proposal.

### 6. Vault-local config 🟡

**Promesa:** `vault/configs/librarian.yaml` como config principal.

**Realidad:** Solo se lee `config.yaml` desde CWD. M9 lo tiene planificado.

---

## Plan de Acción Sugerido

### Fase 1 — Cerrar promesas rotas (M8 scope) ✅ COMPLETADA

1. **`librarian init`** — Comando que scaffolding toda la estructura + copia templates ✅
2. **Post-apply hooks** — Llamar `updateWikiIndex()` + `appendWikiLog()` después de cada apply exitoso ✅
3. **Reviews export** — Exportar proposals a `reviews/` como archivos Markdown legibles ✅
4. **CLI + README** — Registrar comando + actualizar docs ✅

### Fase 2 — Config y calidad (M9 scope) ✅ COMPLETADA

5. **Vault-local config** — Leer `vault/configs/librarian.yaml` ✅
6. **Multi-file proposals** — Soportar múltiples targets por propuesta ✅
7. **Q&A → proposals** — Convertir buenas respuestas de chat en propuestas ✅ (`save-chat` CLI)

### Fase 3 — Búsqueda avanzada (M11 scope) ✅ COMPLETADA

8. **Embeddings reales** — Provider de embeddings (local-first) ✅
9. **Mejora de búsqueda semántica** — Embeddings con fallback Jaccard ✅

### Fase 4 — M13 y gaps finales ✅ COMPLETADA

10. Claims/contradiction detection ✅ (`librarian claims` CLI)
11. PDF/EPUB ingestion ✅ (módulo implementado)
12. Templates en init ✅
13. `librarian lint` health check ✅

### Deuda técnica / Futuro

14. Obsidian plugin (deuda técnica)
15. Setup wizard interactivo
16. Real vector database (ChromaDB)
17. CLI `librarian ingest <file>`

---

## Cómo actualizar los docs existentes

- `docs/README.md` → Actualizar estado con este gap analysis
- `docs/milestones-8-plus.md` → Verificar que M8 scope cubre Fase 1
- Nuevo: `docs/adr/` → ADRs para decisiones de `init`, post-apply hooks, reviews export
