import { describe, it, before, after } from 'node:test';
import { mkdir, writeFile, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ok, strictEqual } from 'node:assert';

import { buildIndex } from '../../src/indexer/builder.js';
import { createQueryApi } from '../../src/indexer/query.js';
import { runLibrarian } from '../../src/harness.js';
import { FileProposalStore } from '../../src/proposals/proposal-store.js';
import { ReviewService } from '../../src/review/review-service.js';

const makeVaultDirs = async (vaultPath: string) => {
  const dirs = [
    'raw', 'wiki', 'wiki/conceptos', 'wiki/entidades', 'wiki/sources', 'wiki/synthesis',
    '.librarian/state', '.librarian/proposals', 'reports',
  ];
  for (const dir of dirs) {
    await mkdir(join(vaultPath, dir), { recursive: true });
  }
};

const writeRawNote = async (vaultPath: string, name: string, content: string) => {
  await writeFile(join(vaultPath, 'raw', name), content, 'utf8');
};

describe('smoke test e2e', () => {
  let vaultPath: string;

  before(async () => {
    vaultPath = join(tmpdir(), `librarian-smoke-${Date.now()}`);
    await mkdir(vaultPath, { recursive: true });
    await makeVaultDirs(vaultPath);

    // Write 3 raw notes
    await writeRawNote(vaultPath, 'clean-architecture.md', [
      '---',
      'tags: [architecture, patterns]',
      '---',
      '',
      '# Clean Architecture',
      '',
      'Clean Architecture is a software design pattern proposed by Robert C. Martin.',
      'It emphasizes separation of concerns and dependency inversion.',
      'The main rule is that dependencies point inward toward the core.',
    ].join('\n'));

    await writeRawNote(vaultPath, 'solid-principles.md', [
      '---',
      'tags: [architecture, oop]',
      '---',
      '',
      '# SOLID Principles',
      '',
      'SOLID is an acronym for five design principles in object-oriented programming.',
      'Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.',
    ].join('\n'));

    await writeRawNote(vaultPath, 'react-hooks.md', [
      '---',
      'tags: [react, frontend]',
      '---',
      '',
      '# React Hooks',
      '',
      'React Hooks let you use state and lifecycle features in function components.',
      'Key hooks: useState, useEffect, useContext, useReducer.',
    ].join('\n'));
  });

  after(async () => {
    try {
      await rm(vaultPath, { recursive: true, force: true });
    } catch {
      // best effort cleanup
    }
  });

  it('builds index and finds raw notes', async () => {
    const index = await buildIndex(vaultPath);
    ok(index.notes);
    const rawNotes = Object.values(index.notes).filter(n => n.section === 'raw');
    strictEqual(rawNotes.length, 3, 'Expected 3 raw notes in index');
  });

  it('runs search query and returns results', async () => {
    const run = await runLibrarian('buscar Clean Architecture', vaultPath);
    const result = run.result as Record<string, unknown> | null;
    ok(result, 'Search should return a result');
    ok(Array.isArray((result as Record<string, unknown>).results), 'Should have results array');
  });

  it('runs status query and returns stats', async () => {
    const run = await runLibrarian('estado de la wiki', vaultPath);
    const result = run.result as Record<string, unknown> | null;
    ok(result, 'Status should return a result');
  });

  it('generates a proposal for a raw note via curation intent', async () => {
    const store = new FileProposalStore(vaultPath);

    // Create a proposal manually (simulating what proposeWikiPage does)
    const proposal = await store.create({
      sourcePath: 'raw/clean-architecture.md',
      proposal: {
        diff_id: `clean-architecture-${Date.now()}`,
        source: 'raw/clean-architecture.md',
        target: 'wiki/conceptos/clean-architecture.md',
        type: 'create',
        status: 'pending_approval',
        preview: [
          '---',
          'librarian:',
          '  processed: false',
          '  status: review',
          'source: raw/clean-architecture.md',
          'category: conceptos',
          '---',
          '',
          '# Clean Architecture',
          '',
          'Clean Architecture is a software design pattern proposed by Robert C. Martin.',
        ].join('\n'),
        category: 'conceptos',
        tags: ['architecture', 'patterns'],
        summary: 'Software design pattern by Robert C. Martin',
        suggestedLinks: [],
        duplicate: 'none',
      },
    });

    ok(proposal.id, 'Proposal should have an id');
    strictEqual(proposal.status, 'pending');

    // Approve the proposal
    const service = new ReviewService(store, vaultPath);
    const approved = await service.approve(proposal.id);
    strictEqual(approved.status, 'approved');

    // Apply the proposal
    const applied = await service.apply(approved.id);
    strictEqual(applied.status, 'applied');
  });

  it('verifies wiki file was created after apply', async () => {
    const wikiPath = join(vaultPath, 'wiki', 'conceptos', 'clean-architecture.md');
    const exists = await stat(wikiPath).then(() => true, () => false);
    ok(exists, 'Wiki file should exist after apply');
  });

  it('verifies processed ledger was updated', async () => {
    const ledgerPath = join(vaultPath, '.librarian', 'state', 'processed.json');
    const raw = await readFile(ledgerPath, 'utf8');
    const ledger = JSON.parse(raw);
    ok('processed' in ledger, 'Ledger should have processed key');
    ok('raw/clean-architecture.md' in ledger.processed, 'Source should be marked as processed');
  });
});
