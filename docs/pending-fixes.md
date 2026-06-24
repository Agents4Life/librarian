# Pending Fixes

Estado de tests y issues conocidos al 2026-06-24.

## Tests

Todos los tests pasan: **252 pass, 0 fail, 0 hangs** (~1.2s).

Los issues documentados el 2026-05-23 fueron resueltos:

### Resueltos

| Issue | Causa raíz | Fix | Commit |
|-------|-----------|-----|--------|
| Indexer — 6 assertion failures | `INDEX_ROOTS` scopeó a `raw/`+`wiki/` pero los tests esperaban `reports/` | Agregar nota aislada al fixture + eliminar assertion de `reports` | `d19ed98` |
| Wikilinks graph — 1 failure | `daily/` y `templates/` fuera de `INDEX_ROOTS` | Assertion `total_nodes` 4→2 | `7639d48` |
| Curation — 1 timeout | `proposeWikiPage` llamaba a Ollama real (sin mock) | Dependency injection: parámetro `llmClient` opcional + mock en test | `c67ac20` |
| LLM — 3 hangs | `health.ok` no existe en la API (`{status,model}`) → assertion falla → server nunca cerrado → event loop vivo | Fix assertion a `health.status` + `t.after()` cleanup + mock `/v1/models` retorna el modelo | `51eae97` |
| Config-loader — 1 env leak (no documentado) | `LIBRARIAN_VAULT_PATH` del entorno real pisaba el valor de test | Save/clear/restore en try/finally | `4bfcb8a` |

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
- `npm test`: 252 pass, 0 fail
- No hay lint configurado en `package.json`
