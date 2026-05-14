import { readFile } from "node:fs/promises";
import path from "node:path";

import { extractClaimsFromPages } from "./extractor.js";
import { detectContradictions, runClaimsAnalysis } from "./contradiction-detector.js";
import type { ClaimsResult } from "./types.js";
import { readdir } from "node:fs/promises";
import { writeFile, mkdir } from "node:fs/promises";

export interface ClaimsOptions {
  vaultPath: string;
  output?: "json" | "markdown";
  section?: string; // wiki subfolder to analyze (e.g. "conceptos", "sources")
}

export const runClaims = async (opts: ClaimsOptions): Promise<ClaimsResult> => {
  const vp = path.resolve(opts.vaultPath);
  const targetDir = opts.section
    ? path.join(vp, "wiki", opts.section)
    : path.join(vp, "wiki");

  // Read pages from target
  const entries = await readdir(targetDir, { recursive: true });
  const pages: Array<{ content: string; path: string }> = [];

  for (const entry of entries) {
    const full = path.join(targetDir, entry.toString());
    if (full.endsWith(".md")) {
      try {
        const content = await readFile(full, "utf8");
        pages.push({ content, path: path.relative(vp, full) });
      } catch { /* skip */ }
    }
  }

  if (pages.length === 0) {
    return {
      claims: [],
      contradictions: [],
      stats: {
        pagesAnalyzed: 0,
        claimsExtracted: 0,
        contradictionsFound: 0,
        criticalCount: 0,
      },
    };
  }

  // Run analysis
  const result = await runClaimsAnalysis(pages);

  // Write report to reports/
  if (opts.output === "markdown" || !opts.output) {
    const reportDir = path.join(vp, "reports");
    await mkdir(reportDir, { recursive: true });

    const lines: string[] = [
      "# Análisis de Claims y Contradicciones",
      "",
      `- Páginas analizadas: ${result.stats.pagesAnalyzed}`,
      `- Claims extraídos: ${result.stats.claimsExtracted}`,
      `- Contradicciones: ${result.stats.contradictionsFound}`,
      `  - Críticas: ${result.stats.criticalCount}`,
      "",
    ];

    if (result.contradictions.length > 0) {
      lines.push("## Contradicciones detectadas", "");
      for (const c of result.contradictions) {
        lines.push(`### [${c.severity.toUpperCase()}] ${c.explanation}`);
        lines.push(`- **A** (${c.claimA.sourcePath}): "${c.claimA.text}"`);
        lines.push(`- **B** (${c.claimB.sourcePath}): "${c.claimB.text}"`);
        lines.push(`- Resolución sugerida: ${c.suggestedResolution}`);
        lines.push("");
      }
    } else {
      lines.push("✅ No se encontraron contradicciones.");
    }

    const reportPath = path.join(reportDir, "claims-analysis.md");
    await writeFile(reportPath, lines.join("\n"), "utf8");
  }

  return result;
};
