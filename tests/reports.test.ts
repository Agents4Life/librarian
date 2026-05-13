import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { generateVaultReports } from "../src/reports.js";
import { createTestContext } from "./helpers/create-test-context.js";

test("report generator writes actionable markdown files", async () => {
  const ctx = await createTestContext({
    "wiki/conceptos/empty.md": "# Empty\n",
  });

  const result = await generateVaultReports(ctx.vaultPath, ctx.queryApi);

  assert.ok(result.reports.some((report) => report.endsWith("vault-status.md")));
  const statusReport = await readFile(path.join(ctx.vaultPath, "reportes", "vault-status.md"), "utf8");
  assert.match(statusReport, /Estado de la wiki/);
});

test("report generator includes incomplete and orphan reports", async () => {
  const ctx = await createTestContext({
    "wiki/orphan.md": "# Orphan\n",
  });

  await generateVaultReports(ctx.vaultPath, ctx.queryApi);

  const incomplete = await readFile(path.join(ctx.vaultPath, "reportes", "incomplete-notes.md"), "utf8");
  const orphan = await readFile(path.join(ctx.vaultPath, "reportes", "orphan-notes.md"), "utf8");

  assert.match(incomplete, /Páginas incompletas/);
  assert.match(orphan, /Notas huérfanas/);
});
