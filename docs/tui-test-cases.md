# TUI — Casos de Uso a Probar

## Layout y Navegación


- [x] Arrancar TUI con `librarian` — muestra chat como vista principal
- [x] Mensaje de bienvenida visible: "Hola! Soy Librarian..."
- [x] Composer muestra placeholder `preguntame algo...`
- [x] Tabs visibles: `1 Chat`, `2 Revisar`, `3 Salud`, `4 Ayuda`
- [x] Navegación con teclas `1`, `2`, `3`, `4` cambia de vista
- [x] Tab cycle con `Tab` rota entre vistas
- [x] `Esc` vuelve a la vista anterior desde overlay
- [x] `Ctrl+C` sale de la TUI

## Status Bar

- [x] Muestra nombre del vault (nombre de carpeta)
- [x] `indice listo` cuando el índice está fresco
- [x] `⚠ actualizar indice` cuando el índice está viejo
- [x] `sin indice` cuando no hay índice
- [x] `actualizando indice...` durante rebuild
- [x] `LLM: <modelo>` cuando Ollama está conectado
- [x] `✗ LLM desconectado` cuando Ollama no responde (icono rojo visible)
- [x] LLM conectado: no se muestra estado de LLM en la barra (solo visible cuando hay problemas)
- [x] `falta modelo IA` cuando no hay modelo configurado
- [x] `por revisar: N` solo visible si hay propuestas pendientes (0 lo oculta)
- [x] Indicador de salud del grafo: `✓` / `⚠` / `✗`

## Chat (vista principal)

- [ ] Mensaje libre ("qué hay sobre arquitectura limpia") responde en español legible
- [ ] Respuesta no contiene JSON crudo ni jerga técnica
- [ ] Tiempo visible: `⏱ 1.2s` después de cada respuesta
- [ ] Input vacío no agrega mensajes
- [ ] Comando desconocido tipo `/noexiste` se trata como mensaje normal
- [ ] Caracteres en español se renderizan correctamente

## Comandos Slash → Chat

- [ ] `/search clean architecture` — resultado aparece como mensaje en chat
- [ ] `/search` muestra rutas absolutas clickeables (Cmd+click)
- [ ] `/status` — resultado aparece como mensaje en chat
- [ ] `/process` — resultado aparece en chat, no escribe en wiki/
- [ ] `/process` con raw/ vacío dice que no hay notas pendientes
- [ ] `/stale` — resultado aparece como mensaje en chat

## Comandos Slash → Overlay

- [ ] `/health` abre overlay de salud del grafo
- [ ] Header visible: `── /health · Esc para volver ──`
- [ ] Dashboard muestra métricas en español con resumen ejecutivo
- [ ] `/orphans` abre overlay de notas huérfanas
- [ ] Header visible: `── /orphans · Esc para volver ──`
- [ ] `/review` abre overlay de propuestas
- [ ] `/review` sin propuestas muestra estado vacío legible
- [ ] `/activity` abre overlay de actividad de sesión
- [ ] `/help` abre overlay de ayuda
- [ ] `/help` lista todos los comandos disponibles

## Propuestas (Review)

- [ ] Ver detalle de propuesta con preview
- [ ] Aprobar propuesta — status cambia
- [ ] Rechazar propuesta — status cambia
- [ ] Apply propuesta aprobada — escribe en wiki/
- [ ] Retry propuesta fallida
- [ ] Reset propuesta rolled_back
- [ ] Volver al inbox desde detalle (`back-to-inbox`)

## Flujo con Errores

- [ ] LLM apagado: status muestra `✗ LLM desconectado` en rojo
- [ ] LLM apagado: enviar mensaje muestra error amigable (no stack trace)
- [ ] Vault sin índice: comandos no rompen la TUI
- [ ] Rutas de archivos con espacios se muestran correctamente

## Actividad (Activity Stream)

- [ ] Muestra progreso durante comandos: `Clasificando consulta...`, `Formateando respuesta...`
- [ ] Muestra `✓ Listo (1.2s)` al completar
- [ ] Muestra errores en rojo
- [ ] Máximo 2 líneas visibles (progreso + error)

## Responsividad

- [ ] Pantalla chica: layout no se rompe, composer y status bar visibles
- [ ] Pantalla grande: layout usa espacio sin estirarse raro

## Inconsistencias Conocidas (bugs pendientes)

- `/graph` — README/CONTEXT dicen que va a chat, pero el código lo mapea a renderer overlay. Verificar comportamiento real.
- `/researcher` — README lo documenta como comando, pero no está registrado en `src/tui/commands.ts`. El skill usa `/research` internamente.
- `/stale` y `/activity` — README dice `/stale` va a chat y `/activity` va a overlay, pero ambos están ausentes de la lista de CHAT_INTENTS y pueden caer en `mapRunToNode`.
