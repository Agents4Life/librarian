# Test Coverage Plan

## Estado Actual

| | |
|---|---|
| **Test runner** | `node --test --import tsx` (NO vitest) |
| **Assert style** | `node:assert/strict` (no `expect`) |
| **Archivos de test** | 36 |
| **Pasando** | 34 |
| **Rotos** | 2 |

### Tests rotos

| Archivo | Causa |
|---|---|
| `tests/tui/focus-system.test.ts` | Importa `expect` de `node:test` (no existe), path relativo mal (`../state.js`), depende de `@testing-library/react` (no instalado) |
| `tests/tui/reducer.test.ts` | Importa `expect` de `node:test` (no existe), path relativo mal (`../state.js`) |

## Tests nuevos para cambios recientes

| Test | Qué cubre | Archivo fuente | Prioridad |
|---|---|---|---|
| `tests/harness-abort.test.ts` | `runLibrarian` con signal abortada → mensaje "Cancelado" | `src/harness.ts` | Alta |
| `tests/tui/reducer.test.ts` (fix) | Todas las acciones del reducer incluyendo SET_LOADING, SET_CHAT_SCROLL, PUSH_ACTIVITY, SET_RAW_PENDING | `src/tui/state.ts` | Alta |
| `tests/tui/help-renderer.test.ts` | Texto de ayuda con ⌘Esc, Ctrl+C, 1-4 | `src/tui/renderers/help-renderer.tsx` | Media |
| `tests/tui/format-response.test.ts` (extender) | Resultado de `/process` con cancelación | `src/tui/app.tsx` (formatRunResult) | Media |

## Fix de tests rotos

### `tests/tui/reducer.test.ts`

- Reescribir con `node:assert/strict` en vez de `expect`
- Corregir import: `'../../src/tui/state.js'` en vez de `'../state.js'`
- Agregar tests para acciones nuevas: SET_LOADING, SET_CHAT_SCROLL, PUSH_ACTIVITY, SET_RAW_PENDING

### `tests/tui/focus-system.test.ts`

- Descartar o reescribir como tests del reducer (sin React)
- Original testeaba `useAppState` hook que requiere `@testing-library/react`

## Cobertura pendiente (módulos sin tests)

| Módulo | Tests sugeridos | Prioridad |
|---|---|---|
| `src/router.ts` | Todas las intents (search-wiki, wiki-status, orphan-notes, etc.) | Alta |
| `src/ingest.ts` (extender) | Exclusión de proposals existentes, exclusión de ledger | Alta |
| `src/tui/commands.ts` | Registry de comandos, verificar sin `/research` | Baja |
| `src/tui/theme.ts` | Valores de tema definidos | Baja |

## Decisiones pendientes

- **`focus-system.test.ts`**: Reescribir como tests del reducer puro o descartar
- **Testing de `app.tsx`**: Componente Ink difícil de testear sin `ink-testing-library`. Por ahora solo testeamos lógica pura (reducer, formatRunResult)
- **`tsconfig.build.json`**: Config de build con `strict: false` — evaluar si se usa o es redundante vs `tsconfig.json` principal
