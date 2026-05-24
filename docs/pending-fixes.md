# Pending Fixes

Estado de tests y issues conocidos al 2026-05-23.

## Tests Failing

### 1. Indexer — 6 failures en `tests/indexer.test.ts`

**Causa raíz:** El commit `3c36538` scopeó el indexer a solo `raw/` y `wiki/` (`INDEX_ROOTS`), pero los tests nunca se actualizaron. El fixture `createVault()` crea 4 archivos (incluyendo `reports/report.md`), pero el indexer ahora solo indexa 3.

| Test | Espera | Recibe | Fix |
|------|--------|--------|-----|
| `buildIndex walks vault and computes backlinks` | `>= 4` notes | 3 | `>= 3` |
| `query API - getBySection("reports")` | `length === 1` | 0 | Eliminar test (reports/ ya no se indexa) |
| `query API - getOrphans` | `>= 1` | 0 | Agregar nota aislada en `raw/` o `wiki/` |
| `query API - getGraphStats` | `total_nodes >= 4` | 3 | `>= 3` |
| `query API - getStats` | `total_files >= 4` | 3 | `>= 3` |
| `buildOrLoadIndex builds new index` | `notes.length >= 4` | 3 | `>= 3` |

### 2. Wikilinks graph — 1 failure en `tests/wikilinks-graph.test.ts:38`

`"wikilinks graph only includes wiki pages"` espera `total_nodes === 4` pero recibe 2. Los archivos en `daily/` y `templates/` no están en `INDEX_ROOTS`.

**Fix:** Cambiar assertion a `total_nodes === 2` o mover fixtures a `wiki/`.

### 3. Curation — 1 timeout en `tests/curation.test.ts`

`"curation proposes a new wiki page from a raw note"` se cuelga porque `proposeWikiPage()` llama a `createLlmClient()` sin mock. Intenta conectar a Ollama real y excede el timeout del test.

**Fix:** Mockear el LLM client o agregar skip condicional cuando Ollama no está disponible.

### 4. LLM — 3 tests cuelgan en `tests/llm.test.ts`

Los 3 tests se cuelgan indefinidamente a pesar de usar mock HTTP servers. Posible deadlock en module loading o issue con el test runner.

**Fix:** Investigar deadlock. Los tests usan `createServer` de `node:http` y `createLlmClient` — verificar si el import de `createLlmClient` dispara side effects (DNS, env vars) que bloqueen.

## Limitaciones Funcionales (del README)

- Setup wizard interactivo básico (`librarian init` es scaffolding)
- No hay plugin de Obsidian (deuda técnica — funcionalidad solo vía CLI/TUI)
- No hay base vectorial real (ChromaDB etc.) — embeddings usan memory store en proceso
- Ingesta PDF/EPUB implementada pero no cableada como comando CLI
- `wiki/index.md` requiere mantenimiento/rebuild explícito
- `wiki/log.md` se actualiza durante apply, pero `wiki/index.md` no

## Build Status

- `tsc --noEmit` (typecheck): pasa limpio
- `tsc` (build): pasa limpio
- No hay lint configurado en `package.json`
