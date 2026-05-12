import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { generateVaultReports } from '../src/reports.js';

test('report generator writes actionable markdown files', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'purim-vault-'));
  await mkdir(path.join(vaultPath, 'wiki', 'conceptos'), { recursive: true });
  await writeFile(path.join(vaultPath, 'wiki', 'conceptos', 'empty.md'), '# Empty\n');

  const result = await generateVaultReports(vaultPath);

  assert.ok(result.reports.some((report) => report.endsWith('vault-status.md')));
  const statusReport = await readFile(path.join(vaultPath, 'reportes', 'vault-status.md'), 'utf8');
  assert.match(statusReport, /Estado de la wiki/);
  assert.match(statusReport, /wiki_pages:/);
});

test('report generator includes incomplete and orphan reports', async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), 'purim-vault-'));
  await mkdir(path.join(vaultPath, 'wiki'), { recursive: true });
  await writeFile(path.join(vaultPath, 'wiki', 'orphan.md'), '# Orphan\n');

  await generateVaultReports(vaultPath);

  const incomplete = await readFile(path.join(vaultPath, 'reportes', 'incomplete-notes.md'), 'utf8');
  const orphan = await readFile(path.join(vaultPath, 'reportes', 'orphan-notes.md'), 'utf8');

  assert.match(incomplete, /Páginas incompletas/);
  assert.match(orphan, /Notas huérfanas/);
});
