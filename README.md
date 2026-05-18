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

  raw/          # Fuentes inmutables aprobadas explícitamente para IA.
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
    state/      # Índices y ledger de procesados.
    proposals/  # Fuente de verdad de propuestas.
    transactions/ # Registros transaccionales de apply.
```

Reglas base:

- `raw/` es la frontera explícita de consentimiento para procesamiento con IA. Librarian nunca modifica archivos aquí.
- `wiki/` es conocimiento mantenido. Solo se modifica vía approve/apply.
- `reports/` guarda diagnósticos y logs de chat.
- `reviews/` es una superficie humana de revisión/export. No es la fuente de verdad de propuestas.
- `.librarian/proposals/` es la fuente de verdad de propuestas.
- `.librarian/transactions/` registra intentos de apply y metadata de recuperación.
- `wiki/` solo se modifica vía approve/apply.
- `inbox/`, `daily/` y PARA son la capa humana; mové o copiá a `raw/` solo las fuentes que querés que Librarian procese.

## Qué Funciona Hoy

- TUI interactiva y consultas CLI one-shot.
- Indexado del vault, búsqueda en wiki, backlinks, stats de grafo, notas stale, notas incompletas y notas huérfanas.
- Curaduría automática de notas raw: `/process` clasifica, aprueba y aplica directamente al wiki.
- Flujo de revisión manual disponible con `preview`, `approve`, `reject`, `apply`, `retry` y `reset`.
- Reportes de estado y logs de chat persistidos bajo `reports/`.
- Configuración local-first compatible con OpenAI, apuntando a Ollama por defecto.
- `librarian init` scaffolding idempotente con templates del Second Brain Ecosystem.
- Post-apply hooks: `wiki/log.md` se actualiza durante apply; `wiki/index.md` todavía requiere mantenimiento/rebuild explícito según el flujo usado.
- Exportación automática de propuestas a `reviews/` como Markdown legible en Obsidian.
- Configuración vault-local desde `vault/configs/librarian.yaml`.
- Propuestas multi-file (múltiples targets atómicos en una sola propuesta).
- `save-chat` para convertir respuestas Q&A en propuestas wiki revisables.
- Provider de embeddings con fallback a Jaccard heuristic.
- `librarian lint` para health check integral del vault.
- `librarian claims` para extracción de claims y detección de contradicciones.

## Límites Actuales

- Setup wizard interactivo (`librarian init` es scaffolding básico).
- Plugin de Obsidian (deuda técnica — funcionalidad completa vía CLI/TUI).
- Base vectorial real (ChromaDB, etc.) en la implementación actual; los embeddings usan un memory store en proceso.
- Ingesta PDF/EPUB está implementada pero no cableada como comando CLI.
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

## Primer Uso — Paso a Paso

1. **Instalá Librarian** (ver [Instalación](#instalación) abajo).

2. **Apuntá al vault**:
   ```bash
   export LIBRARIAN_VAULT_PATH="/ruta/a/tu/vault/obsidian"
   ```

3. **Inicializá la capa Librarian en el vault**:
   ```bash
   librarian init
   ```
   Esto crea la capa humana (`inbox/`, `daily/`, PARA), `raw/`, `wiki/`, `reports/`, `reviews/`, `.librarian/`, `_assets/` y templates. Es idempotente — podés correrlo de nuevo sin problema.

4. **Construí el índice**:
   ```bash
   librarian index rebuild
   ```
   Esto escanea el vault y genera `.librarian/state/index.json`. Sin índice, la mayoría de los comandos no funcionan.

5. **Verificá el estado**:
   ```bash
   librarian index status
   ```
   Debería mostrar que el índice está fresco.

6. **Arrancá la TUI**:
   ```bash
   librarian
   ```

7. **Leé la barra de estado**:
   - `● indice listo` — todo OK.
   - `⚠ actualizar indice` — el vault cambió desde el último indexado. Salí con `Ctrl+C`, corré `librarian index rebuild`, y volvé a abrir.
   - `○ sin indice` — nunca se indexó. Corré `librarian index rebuild`.
   - `◉ LLM: modelo` — el modelo de IA está conectado.
   - `✗ LLM desconectado` — Ollama no está corriendo. Verificá que esté activo con `ollama serve`.

8. **Empezá a usarlo**: escribí preguntas en el chat, o usá `/search`, `/status`, `/help`.

## First Run — Step by Step

1. **Install Librarian** (see [Instalación](#instalación) below).

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

`vault/configs/librarian.yaml` forma parte del modelo de vault previsto por Second Brain Ecosystem. Librarian soporta configuración vault-local con prioridad: variables de entorno → `vault/configs/librarian.yaml` → `config.yaml` en CWD → defaults.

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

La TUI es **chat-first**: el chat es la vista principal y los resultados de la mayoría de los comandos aparecen ahí como mensajes legibles. Las vistas interactivas (salud del grafo, revisión de propuestas) se abren como overlays temporales con `Esc` para volver.

La barra de pestañas (1-4) da acceso directo a: **Chat**, **Revisar**, **Salud**, **Ayuda**.

#### Comandos Slash

Los comandos que producen texto van al chat. Los comandos interactivos abren overlays.

| Comando | Destino | Acción |
|---------|---------|--------|
| `/search <query>` | Chat | Buscar en la wiki |
| `/status` | Chat | Vista general del estado |
| `/process` | Chat | Procesar notas raw y escribir al wiki |
| `/review` | Overlay | Revisar propuestas pendientes |
| `/graph` | Chat | Grafo de conexiones |
| `/orphans` | Overlay | Mostrar notas huérfanas |
| `/stale` | Chat | Mostrar notas stale (90+ días) |
| `/health` | Overlay | Dashboard de salud del grafo |
| `/activity` | Overlay | Log de actividad de la sesión |
| `/index` | Chat | Actualizar indice del vault |
| `/help` | Overlay | Lista de comandos disponibles |

#### Barra de Estado

La barra inferior muestra: estado del índice (`indice listo` / `⚠ actualizar indice`), modelo LLM activo (`LLM: qwen2.5:3b` / `✗ LLM desconectado`), y propuestas pendientes.

### Consulta Única

```bash
librarian "buscar Clean Architecture"
librarian "estado de la wiki"
librarian "pregunta sobre Clean Architecture"
```

La CLI one-shot devuelve JSON. La TUI devuelve texto legible.

### Inicialización Del Vault

```bash
librarian init                  # Scaffold Librarian layer en vault (idempotente, incluye templates)
```

### Health Check Y Claims

```bash
librarian lint                  # Health check integral (incomplete, stale, orphans, wiki files, claims)
librarian lint --skip-claims    # Health check rápido sin análisis de claims
librarian claims                # Extraer claims y detectar contradicciones en el wiki
librarian claims --section=conceptos  # Analizar solo una sección del wiki
librarian claims --output=json  # Output en JSON en vez de markdown
```

### Guardar Chat Como Propuesta

```bash
librarian save-chat --question="¿Qué es Clean Architecture?" --answer="Es un patrón..."
```

Convierte un par Q&A en una propuesta wiki revisable usando el LLM para clasificarla.

### Mantenimiento Del Índice

```bash
librarian index status    # Mostrar frescura del índice y metadata de caches
librarian index rebuild   # Reconstruir el índice persistido del vault
```

Librarian usa un flujo de procesamiento automático para `/process` y un flujo proposal-first para operaciones manuales:

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

```

### Procesamiento Batch De Raw

#### Desde la TUI

Dentro de la TUI, `/process` inspecciona las fuentes aprobadas en `raw/`, las clasifica con IA, y las escribe directamente al wiki. Las notas duplicadas se omiten automáticamente. Las propuestas se guardan en `.librarian/proposals/` con fines de auditoría.

```
/process    → procesa notas raw y las escribe al wiki
```

#### Desde la CLI

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
