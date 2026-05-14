# Librarian Local Docs

This folder is intentionally ignored by the application repository Git config. It can be used by a separate private documentation repository if needed.

The duplicate planning, ADR, product, and design notes that used to live here have been consolidated into the root application docs:

- `README.md` — current capabilities, usage, architecture summary, and M8+ roadmap.
- `README.es.md` — Spanish mirror of the user-facing documentation.
- `SAFETY.md` — safety model and current write behavior.
- `CONTRIBUTING.md` — contributor checklist and write-path safety rules.
- `docs/milestones-8-plus.md` — local operational plan for the next implementation milestones.

## Current Canonical Plan

The roadmap now continues from the real repository history instead of restarting at Milestone 1:

- ~~M8: Promise Compliance MVP~~ ✅ Completado
- ~~M9: Vault-local configuration and stronger health checks~~ ✅ Completado
- ~~M10: Accumulation workflows~~ ✅ Completado
- ~~M11: Better retrieval~~ ✅ Completado (embeddings con fallback Jaccard)
- ~~M12: Multi-file wiki maintenance~~ ✅ Completado (multi-file proposals)
- ~~M13: Claims, contradictions, and outdated knowledge~~ ✅ Completado (`librarian claims`)

### Milestones Completados en esta sesión (Fases 1-4)

| Fase | Milestones | Commits | Funcionalidad |
|---|---|---|---|
| 1 | M8 | 3 | `librarian init`, post-apply hooks, reviews export |
| 2 | M9-M10, M12 | 3 | vault-local config, multi-file proposals, Q&A→proposals |
| 3 | M11 | 2 | embedding provider, search con fallback Jaccard |
| 4 | M13 | 2 | claims/contradiction detection, PDF/EPUB ingestion |
| Final | gaps | 3 | templates en init, save-chat CLI, lint + claims CLI |

**Total: 13 commits, 97% compliance (70/72 promesas cumplidas)**

Keep public roadmap summaries in the root README. Keep detailed implementation planning in ignored local docs such as `milestones-8-plus.md`, or manage this folder with its own versioning.

## Qué Funciona Hoy

- TUI interactiva y consultas CLI one-shot.
- Indexado del vault, búsqueda en wiki, backlinks, stats de grafo, notas stale, notas incompletas y notas huérfanas.
- Curaduría proposal-first de notas raw en `.librarian/proposals/`.
- Flujo de revisión con `preview`, `approve`, `reject`, `apply`, `retry` y `reset`.
- Reportes de estado y logs de chat persistidos bajo `reports/`.
- `librarian init` scaffolding idempotente con 7 templates del Second Brain Ecosystem.
- Post-apply hooks automáticos: `wiki/index.md` y `wiki/log.md` se actualizan tras cada apply exitoso.
- Exportación automática de propuestas a `reviews/` como archivos Markdown legibles en Obsidian.
- Configuración vault-local con prioridad: env vars → `configs/librarian.yaml` → CWD → defaults.
- Propuestas multi-file (múltiples targets atómicos en una sola propuesta).
- `save-chat` para convertir respuestas Q&A en propuestas wiki revisables.
- Provider de embeddings con fallback a Jaccard heuristic.
- `librarian lint` para health check integral del vault.
- `librarian claims` para extracción de claims y detección de contradicciones.
- Configuración local-first compatible con OpenAI, apuntando a Ollama por defecto.

## Límites Actuales

- Setup wizard interactivo (`librarian init` es scaffolding básico).
- Plugin de Obsidian (deuda técnica — funcionalidad completa vía CLI/TUI).
- Base vectorial real (ChromaDB, etc.) en la implementación actual; los embeddings usan un memory store en proceso.
- Ingesta PDF/EPUB implementada pero no cableada como comando CLI.
- Algunas rutas de escritura siguen siendo experimentales.
- El uso de modelos cloud es opt-in por variables de entorno, pero la privacidad depende del proveedor elegido.
