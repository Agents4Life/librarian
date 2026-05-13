#!/usr/bin/env node
/**
 * process-raw.js — Batch processing of raw notes into proposals.
 *
 * Generates proposals in .librarian/proposals/ for each raw note.
 * Use `librarian approve <id>` and `librarian apply <id>` to write to wiki/.
 *
 * Usage:
 *   node scripts/process-raw.js                    # propose 10 notes (default)
 *   node scripts/process-raw.js --limit 50         # propose 50 notes
 *   node scripts/process-raw.js --all              # propose all pending notes
 *   node scripts/process-raw.js --dry-run          # preview without writing proposals
 *   node scripts/process-raw.js --no-dedup         # skip duplicate detection
 *   node scripts/process-raw.js --limit 5 --yes    # skip confirmation
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const { inspectRawInbox } = await import(`${projectRoot}/dist/ingest.js`);
const { proposeWikiPage } = await import(`${projectRoot}/dist/curation.js`);
const { createIndexContext } = await import(`${projectRoot}/dist/index-context.js`);
const { createSemanticTool } = await import(`${projectRoot}/dist/tools/semantic.tool.js`);
const { appendWikiLog, ensureWikiStructure } = await import(`${projectRoot}/dist/wiki-maintenance.js`);
const { FileProposalStore } = await import(`${projectRoot}/dist/proposals/proposal-store.js`);

// --- CLI args ---
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? Number(args[limitIndex + 1]) : 10;
const dryRun = args.includes('--dry-run');
const all = args.includes('--all');
const yes = args.includes('--yes');
const noDedup = args.includes('--no-dedup');
const actualLimit = all ? Infinity : limit;

// --- Config ---
const vaultPath = process.env.LIBRARIAN_VAULT_PATH ?? process.env.VAULT_PATH;
const logDir = path.resolve(projectRoot, 'logs');
const logFile = path.resolve(logDir, `process-${new Date().toISOString().slice(0, 10)}.log`);

if (!vaultPath) {
  process.stderr.write('Set LIBRARIAN_VAULT_PATH or VAULT_PATH before running this script.\n');
  process.exit(1);
}

await mkdir(logDir, { recursive: true });

// --- Helpers ---
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  process.stdout.write(line + '\n');
  writeFile(logFile, line + '\n', { flag: 'a' }).catch(() => {});
};

const confirm = (message) => {
  if (yes || dryRun) return true;
  process.stdout.write(message + ' [y/N] ');
  return new Promise((resolve) => {
    process.stdin.setRawMode(false);
    process.stdin.resume();
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim().toLowerCase() === 'y');
    });
  });
};

// --- Main ---
log('=== Process Raw Notes (proposal-first) ===');
log(`Vault: ${vaultPath}`);
log(`Mode: ${dryRun ? 'DRY RUN' : 'PROPOSE'} | Limit: ${all ? 'all' : actualLimit} | Dedup: ${!noDedup}`);

try {
  let ctx;
  try {
    ctx = await createIndexContext(vaultPath);
  } catch {
    ctx = null;
  }

  log('Inspecting raw inbox...');
  const inbox = await inspectRawInbox(vaultPath, ctx?.query);
  const curatable = inbox.notes.filter(n => n.recommendation === 'curate');
  const toProcess = curatable.slice(0, actualLimit);

  log(`Pending notes: ${inbox.notes.length} | Curatable: ${curatable.length} | Batch: ${toProcess.length}`);

  if (toProcess.length === 0) {
    log('Nothing to process.');
    process.exit(0);
  }

  log(`Notes to process:`);
  toProcess.forEach((n, i) => log(`  ${i + 1}. ${n.file.split('/').pop()}`));

  if (!(await confirm(`Generate proposals for ${toProcess.length} notes?`))) {
    log('Aborted.');
    process.exit(0);
  }

  let existingPages = [];
  if (ctx) {
    try {
      const semantic = createSemanticTool(ctx);
      const searchResult = await semantic.searchSemantic('', { minScore: 0 });
      existingPages = searchResult.results.map(r => r.file.split('/').pop().replace('.md', ''));
    } catch {}
  }

  const store = dryRun ? null : new FileProposalStore(vaultPath);

  log('Processing...');
  const stats = { proposed: 0, skipped: 0, errors: 0 };

  for (let i = 0; i < toProcess.length; i++) {
    const note = toProcess[i];
    const noteName = note.file.split('/').pop();
    process.stdout.write(`  [${i + 1}/${toProcess.length}] ${noteName}...`);

    try {
      const proposal = await proposeWikiPage(vaultPath, note.file, existingPages, !noDedup);

      if (proposal.type === 'skip') {
        process.stdout.write(` SKIP (${proposal.duplicate})\n`);
        log(`    SKIP: ${proposal.duplicate} of ${proposal.duplicateOf}`);
        stats.skipped++;
        continue;
      }

      if (dryRun) {
        process.stdout.write(' PREVIEW\n');
        log(`    -> ${proposal.target} [${proposal.category}] tags:${proposal.tags.join(',')}`);
      } else {
        await store.create({
          sourcePath: note.file,
          proposal,
        });
        process.stdout.write(' PROPOSED\n');
        log(`    -> ${proposal.target} [${proposal.category}]`);
        log(`       tags: ${proposal.tags.join(', ') || 'none'}`);
        log(`       summary: ${proposal.summary || 'none'}`);
        if (proposal.suggestedLinks.length > 0) {
          log(`       links: ${proposal.suggestedLinks.join(', ')}`);
        }
      }

      stats.proposed++;
    } catch (error) {
      process.stdout.write(` ERROR: ${error.message}\n`);
      log(`    ERROR: ${error.message}`);
      stats.errors++;
    }
  }

  if (!dryRun && stats.proposed > 0) {
    log(`\nNext steps:`);
    log(`  librarian proposals                  # list proposals`);
    log(`  librarian preview <id>               # preview content`);
    log(`  librarian approve <id>               # approve`);
    log(`  librarian apply <id>                 # write to wiki/`);
  }

  // Summary
  log('=== Summary ===');
  log(`Proposed: ${stats.proposed} | Skipped (duplicates): ${stats.skipped} | Errors: ${stats.errors}`);
  log(`Dry run: ${dryRun}`);
  log(`Log: ${logFile}`);
} catch (error) {
  log(`Fatal error: ${error.message}`);
  process.exit(1);
}
