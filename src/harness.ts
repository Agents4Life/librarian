import { defaultConfig } from "./config.js";
import { proposeWikiCurations } from "./curation.js";
import { inspectRawInbox } from "./ingest.js";
import { createIndexContext, type IndexContext } from "./index-context.js";
import { generateVaultReports } from "./reports.js";
import { routeIntent } from "./router.js";
import { createSession, type AgentSession, type AgentStep, type AgentRun } from "./agent.js";
import { createLlmClient } from "./llm.js";
import { createFilesystemTool } from "./tools/filesystem.tool.js";
import { createFrontmatterTool } from "./tools/frontmatter.tool.js";
import { createSemanticTool } from "./tools/semantic.tool.js";
import { createWikilinksTool } from "./tools/wikilinks.tool.js";
import { createSearchTool } from "./tools/search.tool.js";
import path from "node:path";

const resolveVaultPath = (basePath?: string) => basePath ?? defaultConfig.vaultPath;

export const describeRun = async (input: string) => {
  const routed = await routeIntent(input);

  return {
    config: defaultConfig,
    input,
    routed,
  };
};

const observe = (input: string, routedIntent: string, method?: string): AgentStep => ({
  kind: "observe",
  message: `Input recibido: ${input}${method ? ` (${method})` : ""}`,
  tool: routedIntent,
});

const plan = (intent: string): AgentStep => ({
  kind: "plan",
  message: `Plan minimo para ${intent}`,
});

const reflect = (summary: string): AgentStep => ({
  kind: "reflect",
  message: summary,
});

const buildAskPrompt = (input: string, context: string, vaultName?: string) =>
  `Eres Librarian, el bibliotecario de un vault de Obsidian. Respondé en el idioma del usuario, de forma breve y útil.

## Contexto del vault:
${context}

## Reglas:
- Respondé basándote en la información del vault cuando sea relevante
- Si no encontrás información, decilo honestamente
- No inventas información
- Cita las fuentes cuando uses contenido del vault (nombre de la página)
- Si el usuario pide un enlace a una página de Obsidian, generá el link en formato: obsidian://open?vault=${vaultName ?? 'vault'}&file=<ruta-relativa-sin-extensión>
  Ejemplo: para "wiki/conceptos/Agentes de IA.md" → obsidian://open?vault=${vaultName ?? 'vault'}&file=wiki%2Fconceptos%2FAgentes%20de%20IA
- Codificá los espacios como %20 y las / como %2F en el enlace`;

export const runLibrarian = async (
  input: string,
  basePath?: string,
  session: AgentSession = createSession(),
  llmClient = createLlmClient(),
): Promise<AgentRun<unknown>> => {
  const routed = await routeIntent(input);
  const vaultPath = resolveVaultPath(basePath);

  let indexContext: IndexContext;
  try {
    indexContext = await createIndexContext(vaultPath);
  } catch {
    indexContext = {
      index: { version: 1, builtAt: new Date().toISOString(), vaultPath, notes: {} },
      query: {
        allNotes: () => [],
        getByPath: () => undefined,
        getByTitle: () => [],
        getByTag: () => [],
        getBySection: () => [],
        getBacklinks: () => [],
        getForwardLinks: () => [],
        getOrphans: () => [],
        getGraphStats: () => ({ total_nodes: 0, total_edges: 0, avg_connections: 0, orphans: 0, most_connected: [] }),
        getStale: () => [],
        getIncomplete: () => [],
        search: () => [],
        findPath: () => ({ found: false as const, length: 0, path: [] }),
        getSimilar: () => [],
        getStats: () => ({ total_files: 0, by_section: {}, by_status: {} }),
        searchEmbeddings: async () => [],
        getSimilarEmbeddings: async () => [],
      },
    };
  }

  const toolCtx = { vaultPath, queryApi: indexContext.query };
  const filesystem = createFilesystemTool(vaultPath);
  const frontmatter = createFrontmatterTool(toolCtx);
  const semantic = createSemanticTool(toolCtx);
  const wikilinks = createWikilinksTool(toolCtx);
  const search = createSearchTool(vaultPath);

  const steps: AgentStep[] = [observe(input, routed.intent, routed.method), plan(routed.intent)];
  const nextSession: AgentSession = {
    ...session,
    turns: session.turns + 1,
    lastIntent: routed.intent,
  };

  let result: unknown;

  switch (routed.intent) {
    case "search-wiki":
      steps.push({ kind: "act", message: "Buscar coincidencias relevantes", tool: "semantic.searchSemantic" });
      result = await semantic.searchSemantic(input, { minScore: 0.1 });
      break;

    case "wiki-status":
      steps.push({ kind: "act", message: "Leer estadisticas del vault", tool: "frontmatter.getStats" });
      steps.push({ kind: "act", message: "Leer grafo de conexiones", tool: "wikilinks.getGraphStats" });
      steps.push({ kind: "act", message: "Generar reportes del vault", tool: "reports.generateVaultReports" });
      result = await generateVaultReports(vaultPath, indexContext.query);
      break;

    case "incomplete-notes":
      steps.push({ kind: "act", message: "Listar notas incompletas", tool: "frontmatter.listIncompleteNotes" });
      result = await frontmatter.listIncompleteNotes();
      break;

    case "stale-notes":
      steps.push({ kind: "act", message: "Listar notas stale", tool: "frontmatter.listStaleNotes" });
      result = await frontmatter.listStaleNotes(defaultConfig.staleThresholdDays);
      break;

    case "orphan-notes":
      steps.push({ kind: "act", message: "Listar notas huérfanas", tool: "wikilinks.getOrphans" });
      result = indexContext.query.getOrphans();
      break;

    case "connections":
      steps.push({ kind: "act", message: "Calcular grafo de conexiones", tool: "wikilinks.getGraphStats" });
      result = await wikilinks.getGraphStats();
      break;

    case "process-notes":
      steps.push({ kind: "act", message: "Inspeccionar raw inbox", tool: "ingest.inspectRawInbox" });
      const inbox = await inspectRawInbox(vaultPath, indexContext.query);
      const curatable = inbox.notes.filter((n) => n.recommendation === "curate");
      result = {
        message: `${curatable.length} notas pendientes para procesar.`,
        hint: "Para procesamiento por lotes usá: node scripts/process-raw.js --limit 10",
        preview: curatable.slice(0, 10).map((n) => n.file),
        total: curatable.length,
      };
      break;

    case "ask": {
      steps.push({ kind: "act", message: "Buscar contexto en la wiki", tool: "semantic.searchSemantic" });
      let context = "";

      try {
        const searchResult = await semantic.searchSemantic(input, { minScore: 0.2 });
        if (searchResult.results.length > 0) {
          context = searchResult.results
            .slice(0, 5)
            .map((r) => `- **${r.file}**: ${r.snippet?.slice(0, 150) ?? ""}`)
            .join("\n");
        }
      } catch {
        // Proceed without context
      }

      steps.push({ kind: "act", message: "Responder consulta con GLM", tool: "llm.chat" });
      const vaultName = path.basename(vaultPath);
      result = await llmClient.chat([
        { role: "system", content: buildAskPrompt(input, context || "Sin contexto disponible.", vaultName) },
        { role: "user", content: input },
      ]);
      break;
    }

    default:
      steps.push({ kind: "act", message: "No ejecutar ninguna tool" });
      result = { message: "Intento desconocido. No se ejecutó ninguna tool." };
      break;
  }

  const summary = typeof result === "object" && result !== null && "message" in result
    ? String((result as Record<string, unknown>).message)
    : `Intento ${routed.intent} completado`;

  steps.push(reflect(summary));
  nextSession.lastSummary = summary;

  return { routed, result, session: nextSession, steps };
};
