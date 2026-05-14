# Cómo Armar tu Second Brain

> Guía paso a paso basada en `second-brain-ecosystem` + `librarian`

---

## 1. Instalar Obsidian y crear vault

```
1. Descargá Obsidian desde obsidian.md
2. Creá un nuevo vault en una carpeta vacía
3. Esa carpeta es tu "vault root"
```

---

## 2. Correr `librarian init`

```bash
# Instalar librarian
cd ~/Documents/dev/4_personal/librarian
npm install && npm run build && npm link

# Apuntar al vault
export LIBRARIAN_VAULT_PATH="/ruta/a/tu/vault"

# Scaffolding (crea carpetas + templates + config)
librarian init
```

Esto crea:

```
tu-vault/
  1-proyectos/
  2-areas/
  3-recursos/
  4-archivo/
  daily/
  inbox/
  templates/          ← 7 templates listos
    daily-template.md
    weekly-review.md
    source-template.md
    raw-source-template.md
    wiki-concept-template.md
    wiki-source-template.md
    wiki-synthesis-template.md
  home.md
  raw/                ← fuentes para Librarian
  wiki/               ← mantenido por Librarian
    index.md
    log.md
    conceptos/
    entidades/
    sources/
    synthesis/
  reports/
  reviews/
  memory/
  configs/
  .librarian/
```

---

## 3. Configurar Obsidian

En **Settings → Core Plugins**, activá:

- Templates (apuntar a `templates/`)
- Daily notes (template: `daily-template.md`, folder: `daily/`)
- Backlinks
- Graph view

En **Settings → Community Plugins**, instalá los 8 esenciales:

| Plugin | Para qué |
|---|---|
| Calendar | Navegación por días |
| Dataview | Queries dinámicas |
| Tasks | Gestión de tareas |
| Excalidraw | Dibujos y diagramas |
| Templater | Templates avanzados |
| Tag Wrangler | Gestión de tags |
| Linter | Limpieza de formato |
| Homepage | `home.md` como inicio |

---

## 4. Configurar Librarian

```bash
# Opción A: Variables de entorno (prioridad más alta)
export LIBRARIAN_VAULT_PATH="/ruta/a/tu/vault"
export OLLAMA_BASE_URL="http://127.0.0.1:11434/v1"
export OLLAMA_MODEL="qwen3.5:4b"

# Opción B: Config en el vault
cp config.example.yaml /ruta/a/tu/vault/configs/librarian.yaml
# Editar con tus preferencias
```

Prioridad de configuración: `variables de entorno → configs/librarian.yaml → config.yaml en CWD → defaults`

---

## 5. Workflow diario (CODE)

### C — Capturar

```
1. En Obsidian: crear nota diaria (Calendar o Cmd+T)
2. Anotar ideas, links, fragmentos en inbox/ o directo en la daily
3. Lo que merece preservar → mover a raw/ como fuente
```

### O — Organizar (PARA)

```
1-proyectos/   ← Cosas con deadline (ej: "Migrar app a React")
2-areas/       ← Responsabilidades continuas (ej: "Salud", "Finanzas")
3-recursos/    ← Referencias útiles (ej: "Recetas", "Design Patterns")
4-archivo/     ← Cosas inactivas
```

### D — Destilar (Librarian hace lo pesado)

```bash
# Procesar fuentes crudas en propuestas wiki
librarian "process notes"

# Revisar propuestas
librarian proposals
librarian preview <id>

# Aprobar y aplicar
librarian approve <id>
librarian apply <id>    # → escribe en wiki/ + actualiza index + log + reviews/
```

### E — Expresar

```
1. Abrí wiki/synthesis/ para ver síntesis generadas
2. Usá Dataview queries para cruzar info
3. Revisá reports/claims-analysis.md para contradicciones
```

---

## 6. Workflow semanal

```bash
# Abrir weekly review
# Obsidian → Templates → weekly-review.md

# Health check
librarian lint

# Ver estado
librarian "wiki status"

# Revisar huérfanas y stale
librarian "stale notes"
librarian "orphan notes"
```

---

## 7. Flujo completo con IA

```
┌─────────────────────────────────────────────────┐
│                   TÚ                            │
│  Capturás en inbox/ y raw/                      │
│  Organizás con PARA                             │
│  Revisás propuestas en reviews/                 │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│               LIBRARIAN                         │
│                                                  │
│  raw/ ──ingest──→ proposals ──approve──→ wiki/  │
│                                                  │
│  Preguntás ──→ respuesta ──save-chat──→ proposal│
│                                                  │
│  lint ──→ health check (stale, orphans, claims) │
│                                                  │
│  claims ──→ detección de contradicciones        │
└─────────────────────────────────────────────────┘
```

---

## Reglas de oro

1. **`raw/` es sagrado** — Librarian lee pero nunca modifica
2. **Solo aprobá lo que leíste** — siempre `preview` antes de `approve`
3. **`inbox/` es tuyo** — Librarian no toca esa carpeta
4. **Mové a `raw/` solo lo que querés que procese** — no todo merece ser wiki
5. **Hacé lint semanal** — `librarian lint` te dice qué se degradó
6. **Usá Git** — backup del vault + historial de cambios
