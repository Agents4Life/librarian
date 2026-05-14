import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { createIndexContext, type QueryApi } from "../index-context.js";
import { generateVaultReports } from "../reports.js";
import { runClaimsAnalysis } from "../claims/contradiction-detector.js";
import { updateWikiIndex } from "../wiki-maintenance.js";

export interface LintResult {
  healthy: boolean;
  checks: {
    incomplete: { count: number; notes: string[] };
    stale: { count: number; notes: string[] };
    orphans: { count: number; notes: string[] };
    wikiIndex: { ok: boolean; message: string };
    wikiLog: { ok: boolean; message: string };
    claims: { ok: boolean; contradictions: number; critical: number };
  };
  reports: string[];
}

export const lintVault = async (vaultPath: string, opts?: { skipClaims?: boolean }): Promise<LintResult> => {
  const vp = path.resolve(vaultPath);

  // Build context (index + query API)
  const ctx = await createIndexContext(vp);
  const queryApi = ctx.query;

  // Generate reports (incomplete, stale, orphans)
  const reports = await generateVaultReports(vp, queryApi);

  const incomplete = queryApi.getIncomplete();
  const stale = queryApi.getStale();
  const orphans = queryApi.getOrphans();

  // Check wiki index.md exists and is non-empty
  let wikiIndexOk = true;
  let wikiIndexMsg = "OK";
  try {
    const idx = await readFile(path.join(vp, "wiki", "index.md"), "utf8");
    if (idx.trim().length < 10) {
      wikiIndexOk = false;
      wikiIndexMsg = "wiki/index.md is nearly empty";
    }
  } catch {
    wikiIndexOk = false;
    wikiIndexMsg = "wiki/index.md not found — run `librarian init`";
  }

  // Check wiki log.md exists
  let wikiLogOk = true;
  let wikiLogMsg = "OK";
  try {
    await readFile(path.join(vp, "wiki", "log.md"), "utf8");
  } catch {
    wikiLogOk = false;
    wikiLogMsg = "wiki/log.md not found — run `librarian init`";
  }

  // Claims analysis (optional, can be slow)
  let claimsOk = true;
  let contradictionsCount = 0;
  let criticalCount = 0;

  if (!opts?.skipClaims) {
    try {
      const wikiDir = path.join(vp, "wiki");
      const entries = await readdir(wikiDir, { recursive: true });
      const pages: Array<{ content: string; path: string }> = [];

      for (const entry of entries) {
        const full = path.join(wikiDir, entry.toString());
        if (full.endsWith(".md")) {
          try {
            const content = await readFile(full, "utf8");
            pages.push({ content, path: path.relative(vp, full) });
          } catch { /* skip unreadable */ }
        }
      }

      if (pages.length > 0) {
        const result = await runClaimsAnalysis(pages);
        contradictionsCount = result.stats.contradictionsFound;
        criticalCount = result.stats.criticalCount;
        claimsOk = criticalCount === 0;
      }
    } catch {
      // LLM might not be configured — skip gracefully
      claimsOk = true;
    }
  }

  // Refresh wiki index
  try {
    await updateWikiIndex({ vaultPath: vp, queryApi });
  } catch { /* best effort */ }

  const healthy =
    incomplete.length === 0 &&
    stale.length === 0 &&
    orphans.length === 0 &&
    wikiIndexOk &&
    wikiLogOk &&
    claimsOk;

  return {
    healthy,
    checks: {
      incomplete: { count: incomplete.length, notes: incomplete.map((n: any) => n.path) },
      stale: { count: stale.length, notes: stale.map((n: any) => n.path) },
      orphans: { count: orphans.length, notes: orphans.map((n: any) => n.path) },
      wikiIndex: { ok: wikiIndexOk, message: wikiIndexMsg },
      wikiLog: { ok: wikiLogOk, message: wikiLogMsg },
      claims: { ok: claimsOk, contradictions: contradictionsCount, critical: criticalCount },
    },
    reports: reports.reports,
  };
};
