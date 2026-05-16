import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getMainContentMaxHeight } from '../../src/tui/app.js';
import { TABS } from '../../src/tui/components/tab-bar.js';
import { getIndexStatusLabel, getLlmStatusLabel } from '../../src/tui/components/status-bar.js';

describe('TUI layout and copy', () => {
  it('reserves room for a visible top tab row and compact bottom chrome', () => {
    assert.equal(getMainContentMaxHeight(24), 19);
    assert.equal(getMainContentMaxHeight(10), 8);
  });

  it('uses plain-language tab labels for non-technical users', () => {
    assert.deepEqual(TABS.map((tab) => tab.label), ['Chat', 'Revisar', 'Salud', 'Ayuda']);
  });

  it('uses human-readable status labels', () => {
    assert.equal(getIndexStatusLabel('fresh'), 'indice listo');
    assert.equal(getIndexStatusLabel('rebuilding'), 'actualizando indice');
    assert.equal(getLlmStatusLabel('ready'), 'LLM listo');
    assert.equal(getLlmStatusLabel('down'), 'LLM desconectado');
  });
});
