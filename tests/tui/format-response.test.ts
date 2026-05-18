import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatRunResult } from '../../src/tui/app.js';

describe('formatRunResult', () => {
  it('formats search results with absolute file paths', () => {
    const result = {
      results: [
        { file: 'wiki/conceptos/Clean Architecture.md', score: 0.85, snippet: 'Idea central del software' },
        { file: 'wiki/conceptos/SOLID.md', score: 0.6, snippet: 'Principios de diseno' },
      ],
    };

    const text = formatRunResult(result, '/users/test/MyVault');
    assert.ok(text.includes('Se encontraron 2 resultados'));
    assert.ok(text.includes('Clean Architecture'));
    assert.ok(text.includes('SOLID'));
    assert.ok(text.includes('/users/test/MyVault/wiki/conceptos/Clean Architecture.md'));
    assert.ok(text.includes('/users/test/MyVault/wiki/conceptos/SOLID.md'));
    assert.ok(!text.includes('obsidian://'));
    assert.ok(!text.includes('"results"'));
  });

  it('uses default vault name when no vaultPath provided', () => {
    const result = {
      results: [{ file: 'wiki/test.md', score: 0.5 }],
    };
    const text = formatRunResult(result);
    assert.ok(text.includes('wiki/test.md'));
  });

  it('formats message with hint', () => {
    const result = { message: '3 notas pendientes.', hint: 'Usá /process para procesar', preview: ['a.md', 'b.md'] };
    const text = formatRunResult(result);
    assert.ok(text.includes('3 notas pendientes'));
    assert.ok(text.includes('💡'));
    assert.ok(text.includes('a.md'));
  });

  it('formats LLM content directly', () => {
    const result = { content: 'La Clean Architecture se trata de separar capas.' };
    const text = formatRunResult(result);
    assert.equal(text, 'La Clean Architecture se trata de separar capas.');
  });

  it('returns no-results message for empty results', () => {
    const result = { results: [] };
    const text = formatRunResult(result);
    assert.equal(text, 'No se encontraron resultados.');
  });

  it('formats graph stats', () => {
    const result = { total_nodes: 42, total_edges: 80, orphans: 3, avg_connections: 1.9 };
    const text = formatRunResult(result);
    assert.ok(text.includes('42 nodos'));
    assert.ok(text.includes('3 paginas huerfanas'));
  });

  it('formats file arrays with absolute paths', () => {
    const result = [
      { file: 'wiki/A.md', score: 0.9 },
      { file: 'wiki/B.md', score: 0.5 },
    ];
    const text = formatRunResult(result, '/users/test/Notes');
    assert.ok(text.includes('2 elementos encontrados'));
    assert.ok(text.includes('/users/test/Notes/wiki/A.md'));
    assert.ok(text.includes('/users/test/Notes/wiki/B.md'));
    assert.ok(!text.includes('obsidian://'));
  });

  it('formats cancelled process result with cancellation message', () => {
    const result = {
      message: 'Se procesaron 3 notas. 1 duplicadas omitidas. Cancelado después de 3 notas.',
      total: 10,
      proposed: 3,
      skipped: 1,
      errors: 0,
    };
    const text = formatRunResult(result);
    assert.ok(text.includes('Cancelado'));
    assert.ok(text.includes('3 notas'));
  });

  it('strips system-reminder tags from LLM content', () => {
    const result = {
      content: 'Respuesta útil.<system-reminder>some injected content</system-reminder>',
    };
    const text = formatRunResult(result);
    assert.equal(text, 'Respuesta útil.');
    assert.ok(!text.includes('system-reminder'));
  });

  it('strips system-reminder tags from message', () => {
    const result = {
      message: 'Procesado.<system-reminder>injected</system-reminder>Hecho.',
      hint: 'Usá /process',
    };
    const text = formatRunResult(result);
    assert.ok(!text.includes('system-reminder'));
    assert.ok(text.includes('Procesado'));
    assert.ok(text.includes('Hecho'));
  });

  it('formats vault status with stats', () => {
    const result = {
      stats: { total_files: 100, wiki_pages: 60, raw_files: 40 },
    };
    const text = formatRunResult(result);
    assert.ok(text.includes('100 archivos'));
    assert.ok(text.includes('60 paginas wiki'));
    assert.ok(text.includes('40 archivos sin procesar'));
  });
});
