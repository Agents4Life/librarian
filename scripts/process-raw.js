#!/usr/bin/env node
/**
 * process-raw.js — Batch processing of raw notes into wiki with GLM classification.
 *
 * Usage:
 *   node scripts/process-raw.js                    # process 10 notes (default)
 *   node scripts/process-raw.js --limit 50         # process 50 notes
 *   node scripts/process-raw.js --all              # process all pending notes
 *   node scripts/process-raw.js --dry-run          # preview without writing
 *   node scripts/process-raw.js --no-dedup         # skip duplicate detection
 *   node scripts/process-raw.js --limit 5 --yes    # skip confirmation
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');

const { inspectRawInbox } = await import(`${projectRoot}/dist/ingest.js`);
const { proposeWikiPage } = await import(`${projectRoot}/dist/curation.js`);
const { createSemanticTool } = await import(`${projectRoot}/dist/tools/semantic.tool.js`);

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
const logDir = resolve(projectRoot, 'logs');
const logFile = resolve(logDir, `process-${new Date().toISOString().slice(0, 10)}.log`);

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

/** Mark a raw note as processed by adding librarian.processed: true to frontmatter */
const markProcessed = async (basePath, rawRelativePath) => {
  const fullPath = resolve(basePath, rawRelativePath);
  const content = await readFile(fullPath, 'utf-8');
  const lines = content.split('\n');

  // Find the second --- (end of frontmatter)
  let fmEnd = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { fmEnd = i; break; }
  }

  let newContent;
  if (fmEnd === -1) {
    // No frontmatter — add one
    newContent = `---\nlibrarian:\n  processed: true\n---\n\n${content}`;
  } else {
    // Insert before the closing ---
    lines.splice(fmEnd, 0, '  processed: true');
    newContent = lines.join('\n');
  }

  await writeFile(fullPath, newContent, 'utf-8');
};

// --- Main ---
log('=== Process Raw Notes ===');
log(`Vault: ${vaultPath}`);
log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'} | Limit: ${all ? 'all' : actualLimit} | Dedup: ${!noDedup}`);

try {
  log('Inspecting raw inbox...');
  const inbox = await inspectRawInbox(vaultPath);
  const curatable = inbox.notes.filter(n => n.recommendation === 'curate');
  const toProcess = curatable.slice(0, actualLimit);

  log(`Pending notes: ${inbox.notes.length} | Curatable: ${curatable.length} | Batch: ${toProcess.length}`);

  if (toProcess.length === 0) {
    log('Nothing to process.');
    process.exit(0);
  }

  log(`Notes to process:`);
  toProcess.forEach((n, i) => log(`  ${i + 1}. ${n.file.split('/').pop()}`));

  if (!(await confirm(`Process ${toProcess.length} notes?`))) {
    log('Aborted.');
    process.exit(0);
  }

  // Get existing wiki pages for context
  let existingPages = [];
  try {
    const semantic = createSemanticTool(vaultPath);
    const searchResult = await semantic.searchSemantic('', { minScore: 0 });
    existingPages = searchResult.results.map(r => r.file.split('/').pop().replace('.md', ''));
  } catch {}

  log('Processing...');
  const stats = { created: 0, skipped: 0, errors: 0 };

  for (let i = 0; i < toProcess.length; i++) {
    const note = toProcess[i];
    const noteName = note.file.split('/').pop();
    process.stdout.write(`  [${i + 1}/${toProcess.length}] ${noteName}...`);

    try {
      const proposal = await proposeWikiPage(vaultPath, note.file, existingPages, !noDedup);

      if (proposal.type === 'skip') {
        process.stdout.write(` SKIP (${proposal.duplicate})\n`);
        log(`    SKIP: ${proposal.duplicate} of ${proposal.duplicateOf}`);
        if (!dryRun) await markProcessed(vaultPath, note.file);
        stats.skipped++;
        continue;
      }

      if (dryRun) {
        process.stdout.write(' PREVIEW\n');
        log(`    -> ${proposal.target} [${proposal.category}] tags:${proposal.tags.join(',')}`);
      } else {
        // Write to wiki
        const targetPath = resolve(vaultPath, proposal.target);
        const targetDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
        await mkdir(targetDir, { recursive: true });
        await writeFile(targetPath, proposal.preview, 'utf-8');
        process.stdout.write(' DONE\n');
        log(`    -> ${proposal.target} [${proposal.category}]`);
        log(`       tags: ${proposal.tags.join(', ') || 'none'}`);
        log(`       summary: ${proposal.summary || 'none'}`);
        if (proposal.suggestedLinks.length > 0) {
          log(`       links: ${proposal.suggestedLinks.join(', ')}`);
        }
        // Mark raw note as processed
        await markProcessed(vaultPath, note.file);
      }

      stats.created++;
    } catch (error) {
      process.stdout.write(` ERROR: ${error.message}\n`);
      log(`    ERROR: ${error.message}`);
      stats.errors++;
    }
  }

  // Summary
  log('=== Summary ===');
  log(`Created: ${stats.created} | Skipped (duplicates): ${stats.skipped} | Errors: ${stats.errors}`);
  log(`Dry run: ${dryRun}`);
  log(`Log: ${logFile}`);
} catch (error) {
  log(`Fatal error: ${error.message}`);
  process.exit(1);
}
