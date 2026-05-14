# Librarian

> Agente experimental local-first para mantener una LLM Wiki en un vault de Obsidian.

Librarian es un agente de IA que ayuda a mantener la capa de conocimiento de un vault de Obsidian. No es la wiki en sí: es el bibliotecario que lee fuentes inmutables, genera propuestas wiki revisables, encuentra huecos, detecta notas débiles y escribe reportes revisables.

Implementa el [patrón LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f): en vez de buscar documentos crudos desde cero en cada pregunta, la IA construye y mantiene incrementalmente una wiki persistente, estructurada e interconectada en Markdown.

## Estado

Librarian está en alpha experimental.

Hoy es útil para usuarios técnicos de Obsidian que se sienten cómodos con CLI, Markdown, configuración local y revisión de cambios generados. Todavía no es un plugin pulido de Obsidian ni un gestor de conocimiento completamente autónomo.

Primero corré Librarian sobre una copia de tu vault.

## Por Qué Existe

Las herramientas RAG tradicionales te dejan chatear con documentos, pero cada pregunta empieza casi desde cero. Librarian usa otro enfoque: mantiene una capa durable `wiki/` dentro de tu vault.

El objetivo no es reemplazar tu pensamiento. El objetivo es sacar del medio el bookkeeping que hace que las wikis personales se degraden: links faltantes, conceptos duplicados, páginas obsoletas, resúmenes débiles, notas huérfanas y síntesis olvidadas.

## Modelo Del Vault

Librarian espera un vault con estas capas:

```text
vault/
  1-proyectos/  # Carpetas PARA opcionales del Second Brain Ecosystem.
  2-areas/
  3-recursos/
  4-archivo/
  daily/
  inbox/        # Inbox humano. No se procesa automáticamente.
  templates/
  home.md

  raw/          # Fuentes inmutables. Librarian lee, nunca reescribe.
  wiki/         # Páginas mantenidas por IA.
    index.md
    log.md
    conceptos/
    entidades/
    sources/
    synthesis/
  reports/      # Reportes, diagnósticos y artefactos de revisión.
    chats/      # Sesiones de chat persistidas.
    conflicts/  # Archivos de conflictos de merge.
  reviews/      # Superficie humana de revisión/export.
  memory/       # Memoria persistente del agente/sesiones.
  configs/      # Configuración visible/editable de Librarian.
  .librarian/   # Estado interno, índices, cache, locks, propuestas.
    state/      # Índice y ledger de procesados.
    proposals/  # Fuente de verdad de propuestas.
    transactions/ # Registros transaccionales de apply.
```

Reglas base:

- `raw/` es la fuente de verdad. Librarian nunca modifica archivos aquí.
- `wiki/` es conocimiento mantenido. Solo se modifica vía approve/apply.
- `reports/` guarda diagnósticos y logs de chat.
- `reviews/` es una superficie humana de revisión/export. No es la fuente de verdad de propuestas.
- `.librarian/proposals/` es la fuente de verdad de propuestas.
- `.librarian/transactions/` registra intentos de apply y metadata de recuperación.
- `wiki/` solo se modifica vía approve/apply.
- `inbox/` sigue siendo captura humana; mové a `raw/` solo las fuentes que querés que Librarian procese.

## Qué Funciona Hoy

- TUI interactiva y consultas CLI one-shot.
- Indexado del vault, búsqueda en wiki, backlinks, stats de grafo, notas stale, notas incompletas y notas huérfanas.
- Curaduría proposal-first de notas raw en `.librarian/proposals/`.
- Flujo de revisión con `preview`, `approve`, `reject`, `apply`, `retry` y `reset`.
- Reportes de estado y logs de chat persistidos bajo `reports/`.
- Configuración local-first compatible con OpenAI, apuntando a Ollama por defecto.

## Límites Actuales

- Setup wizard pulido.
- Plugin de Obsidian.
- Base vectorial real en la implementación actual.
- Provider real de embeddings; la búsqueda semántica actual es heurística/Jaccard.
- Ingesta PDF/EPUB.
- `reviews/` está documentado como superficie humana de revisión/export, pero la exportación de propuestas ahí todavía no está integrada por completo.
- Las utilidades para mantener `wiki/index.md` y `wiki/log.md` existen, pero todavía no están integradas automáticamente después de apply.
- Las propuestas son single-target; el mantenimiento multi-file de la wiki todavía no está implementado.
- Las buenas respuestas de chat todavía no pueden convertirse en propuestas wiki revisables.
- La detección de contradicciones y el tracking explícito de claims todavía no están implementados.
- Algunas rutas de escritura siguen siendo experimentales.
- El uso de modelos cloud es opt-in por variables de entorno, pero la privacidad depende del proveedor elegido.

## Seguridad

Librarian trabaja con bases de conocimiento personales. Sé conservadora/o.

- Empezá con una copia de tu vault.
- Usá `--dry-run` para procesamiento batch.
- Mantené tu vault en Git u otro sistema de backup.
- Revisá archivos generados antes de confiar en ellos.
- No apuntes Librarian a notas sensibles si configurás un modelo cloud.
- `raw/` está pensado como solo lectura, pero el proyecto está en alpha.

Ver [SAFETY.md](SAFETY.md) para el modelo completo de seguridad.

## Instalación

```bash
git clone git@github.com:Agents4Life/librarian.git
cd librarian
npm install
npm run build
npm link
```

Después de `npm link`, el comando `librarian` queda disponible globalmente.

Se requiere Node.js 22+.

## Configuración

Definí la ruta de tu vault antes de correr comandos:

```bash
export LIBRARIAN_VAULT_PATH="/ruta/a/tu/vault/obsidian"
```

También podés partir desde el template de entorno:

```bash
cp .env.example .env
```

Para scripts batch, `VAULT_PATH` también está soportado por compatibilidad:

```bash
export VAULT_PATH="/ruta/a/tu/vault/obsidian"
```

Copiá `config.example.yaml` si querés un archivo local documentado:

```bash
cp config.example.yaml config.yaml
```

`config.yaml` está ignorado por Git porque puede contener rutas locales o configuración de proveedores.

`vault/configs/librarian.yaml` forma parte del modelo de vault previsto por Second Brain Ecosystem, pero todavía no es la ruta principal de configuración. El soporte para configuración local al vault está planificado para M9.

## Proveedores De Modelo

Por defecto, Librarian apunta a un endpoint local de Ollama compatible con OpenAI:

```bash
export OLLAMA_BASE_URL="http://127.0.0.1:11434/v1"
export OLLAMA_MODEL="qwen3.5:4b"
```

Podés configurar otro endpoint compatible con OpenAI usando las mismas variables. Si configurás `ZAI_API_KEY`, Librarian envía un header `Authorization` cuando corresponde.

Librarian usa `fetch()` nativo — no tiene SDK externo de LLM. Soporta endpoints primario y fallback con timeout configurable.

La privacidad depende del proveedor:

- Ollama local: las notas se quedan en tu máquina o red local.
- Proveedor cloud: fragmentos seleccionados de notas pueden enviarse a ese proveedor.

Local-first es la postura por defecto, no una garantía si configurás un proveedor cloud.

## Uso

### TUI Interactiva

```bash
librarian
```

La TUI usa una metáfora de workspace con múltiples vistas. Dentro de la TUI, usá comandos slash:

| Comando | Acción |
|---------|--------|
| `/search <query>` | Buscar en la wiki |
| `/status` | Vista general del estado |
| `/process` | Procesar notas raw |
| `/review` | Revisar propuestas |
| `/graph` | Grafo de conexiones |
| `/orphans` | Mostrar notas huérfanas |
| `/stale` | Mostrar notas stale (90+ días) |
| `/health` | Dashboard de salud del grafo |
| `/activity` | Log de actividad de la sesión |

### Consulta Única

```bash
librarian "buscar Clean Architecture"
librarian "estado de la wiki"
librarian "pregunta sobre Clean Architecture"
```

La CLI devuelve JSON.

### Inicialización Del Vault

```bash
librarian init                  # Scaffold Librarian layer in vault (idempotent)
```

### Workflow De Propuestas

Librarian usa un flujo proposal-first para todas las escrituras al vault:

```bash
librarian proposals                      # Listar todas las propuestas
librarian proposals --status=pending     # Filtrar por estado
librarian proposal <id>                  # Ver detalles de una propuesta
librarian preview <id>                   # Previsualizar contenido
librarian approve <id>                   # Aprobar una propuesta
librarian reject <id> --reason="..."     # Rechazar con un motivo
librarian apply <id>                     # Ejecutar una propuesta aprobada
librarian retry <id>                     # Reintentar una propuesta fallida o rolled-back
librarian reset <id>                     # Resetear una propuesta fallida o rolled-back a pending
```

Estados de propuesta: `pending → approved → applying → applied`, `pending → rejected`. En caso de error: `applying → failed` (recuperable vía `retry`) o `applying → rolled_back` (recuperable vía `reset`).

### Mantenimiento Del Índice

```bash
librarian index status    # Mostrar frescura del índice y metadata de caches
librarian index rebuild   # Reconstruir el índice persistido del vault
```

### Procesamiento Batch De Raw

Previsualizar propuestas sin escribir:

```bash
node scripts/process-raw.js --dry-run --limit 10
```

El modo live genera propuestas en `.librarian/proposals/`. Revisalas y aplicalas con:

```bash
node scripts/process-raw.js --limit 10
librarian proposals
librarian preview <id>
librarian approve <id>
librarian apply <id>
```

## Compatibilidad Con Second Brain Ecosystem

Librarian está diseñado para implementar la capa operativa opcional de IA descrita en las guías de Second Brain Ecosystem, especialmente la guía 04 y la guía 07. La configuración base del Segundo Cerebro funciona sin Librarian.

Reglas de compatibilidad:

- Mantené intactas las carpetas PARA y el workflow humano.
- Agregá la capa Librarian solo cuando quieras mantenimiento wiki asistido por IA.
- Mové fuentes de `inbox/` a `raw/` solo cuando consentís que Librarian las procese.
- Tratá `reviews/` como superficie humana legible y `.librarian/proposals/` como fuente de verdad.
- Tratá la visión completa de la guía 07 como más amplia que el alpha actual. Librarian hoy implementa la base proposal-first, no toda la promesa autónoma de LLM Wiki.

## Licencia

MIT
