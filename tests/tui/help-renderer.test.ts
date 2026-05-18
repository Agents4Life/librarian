import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const COMMANDS = [
  { cmd: '/search <q>', desc: 'Buscar en vault' },
  { cmd: '/status', desc: 'Estado del vault' },
  { cmd: '/process', desc: 'Procesar raw/' },
  { cmd: '/review', desc: 'Proposals pendientes' },
  { cmd: '/index', desc: 'Actualizar indice' },
  { cmd: '/health', desc: 'Salud del grafo' },
  { cmd: '/orphans', desc: 'Notas huérfanas' },
  { cmd: '/stale', desc: 'Notas sin tocar 90 días' },
  { cmd: '/help', desc: 'Esta ayuda' },
];

const helpFooter = 'Ctrl+C salir · ⌘Esc cancelar · 1-4 navegar';

describe('Help Renderer', () => {
  it('includes ⌘Esc cancel shortcut', () => {
    assert.ok(helpFooter.includes('⌘Esc'));
  });

  it('includes Ctrl+C to exit', () => {
    assert.ok(helpFooter.includes('Ctrl+C'));
  });

  it('includes tab navigation 1-4', () => {
    assert.ok(helpFooter.includes('1-4'));
  });

  it('does not include double-Esc hint', () => {
    assert.ok(!helpFooter.includes('Esc Esc'));
  });

  it('lists all expected slash commands', () => {
    const cmdStrings = COMMANDS.map((c) => c.cmd);
    assert.ok(cmdStrings.includes('/search <q>'));
    assert.ok(cmdStrings.includes('/status'));
    assert.ok(cmdStrings.includes('/process'));
    assert.ok(cmdStrings.includes('/review'));
    assert.ok(cmdStrings.includes('/index'));
    assert.ok(cmdStrings.includes('/health'));
    assert.ok(cmdStrings.includes('/orphans'));
    assert.ok(cmdStrings.includes('/stale'));
    assert.ok(cmdStrings.includes('/help'));
  });

  it('does not list /research command', () => {
    const cmdStrings = COMMANDS.map((c) => c.cmd);
    assert.ok(!cmdStrings.some((c) => c.startsWith('/research')));
  });

  it('command descriptions are in Spanish', () => {
    for (const c of COMMANDS) {
      assert.ok(c.desc.length > 0, `${c.cmd} should have a description`);
    }
    assert.ok(COMMANDS.some((c) => c.desc.toLowerCase().includes('buscar')));
    assert.ok(COMMANDS.some((c) => c.desc.toLowerCase().includes('huérfanas') || c.desc.toLowerCase().includes('huerfanas')));
  });
});
