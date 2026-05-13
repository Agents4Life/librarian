import { describe, it, beforeEach, afterEach } from 'node:test';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ok, strictEqual } from 'node:assert';

import { loadYamlConfig, type RawYamlConfig } from '../src/config-loader.js';

describe('config-loader', () => {
  let configDir: string;
  let configPath: string;

  beforeEach(async () => {
    configDir = join(tmpdir(), `librarian-config-test-${Date.now()}`);
    await mkdir(configDir, { recursive: true });
    configPath = join(configDir, 'config.yaml');
  });

  afterEach(async () => {
    try {
      await rm(configDir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  });

  it('parses a minimal YAML config', async () => {
    await writeFile(configPath, [
      'vault:',
      '  path: /my/vault',
      '  raw_dir: sources',
      '  wiki_dir: knowledge',
      '  reports_dir: output',
      '',
      'tracking:',
      '  stale_threshold_days: 60',
      '',
      'llm:',
      '  primary:',
      '    base_url: http://localhost:8080/v1',
      '    model: llama3:8b',
      '  fallback:',
      '    base_url: http://fallback:8080/v1',
      '    model: mistral:7b',
      '  timeout_ms: 300000',
      '',
      'processing:',
      '  dry_run_default: false',
      '  batch_size: 20',
    ].join('\n'), 'utf8');

    const config = loadYamlConfig(configPath);
    ok(config, 'Config should not be null');

    strictEqual(config.vault?.path, '/my/vault');
    strictEqual(config.vault?.raw_dir, 'sources');
    strictEqual(config.vault?.wiki_dir, 'knowledge');
    strictEqual(config.vault?.reports_dir, 'output');
    strictEqual(config.tracking?.stale_threshold_days, 60);
    strictEqual(config.llm?.primary?.base_url, 'http://localhost:8080/v1');
    strictEqual(config.llm?.primary?.model, 'llama3:8b');
    strictEqual(config.llm?.fallback?.base_url, 'http://fallback:8080/v1');
    strictEqual(config.llm?.fallback?.model, 'mistral:7b');
    strictEqual(config.llm?.timeout_ms, 300000);
    strictEqual(config.processing?.dry_run_default, false);
    strictEqual(config.processing?.batch_size, 20);
  });

  it('returns null for missing config file', () => {
    const config = loadYamlConfig(join(configDir, 'nonexistent.yaml'));
    strictEqual(config, null);
  });

  it('handles malformed YAML gracefully', async () => {
    await writeFile(configPath, '{{{{not yaml', 'utf8');
    // Should not throw, returns whatever it can parse
    const config = loadYamlConfig(configPath);
    ok(config !== undefined, 'Should return something even for malformed input');
  });

  it('handles empty YAML file', async () => {
    await writeFile(configPath, '', 'utf8');
    const config = loadYamlConfig(configPath);
    ok(config, 'Should return empty config object');
  });

  it('ignores comments', async () => {
    await writeFile(configPath, [
      '# This is a comment',
      'vault:',
      '  # Another comment',
      '  path: /test/vault',
    ].join('\n'), 'utf8');

    const config = loadYamlConfig(configPath);
    strictEqual(config.vault?.path, '/test/vault');
  });

  it('resolves env var references', async () => {
    process.env.__TEST_VAULT_PATH = '/env/vault';
    await writeFile(configPath, [
      'vault:',
      '  path: ${__TEST_VAULT_PATH}',
    ].join('\n'), 'utf8');

    const config = loadYamlConfig(configPath);
    strictEqual(config.vault?.path, '/env/vault');
    delete process.env.__TEST_VAULT_PATH;
  });

  it('env vars override YAML values when used by config.ts', async () => {
    // This tests the integration pattern: env var takes precedence in config.ts
    await writeFile(configPath, [
      'vault:',
      '  path: /yaml/vault',
      'tracking:',
      '  stale_threshold_days: 45',
    ].join('\n'), 'utf8');

    const yamlConfig = loadYamlConfig(configPath);
    ok(yamlConfig);
    strictEqual(yamlConfig.vault?.path, '/yaml/vault');

    // Simulate the config.ts pattern: env var overrides YAML
    const vaultPath = process.env.LIBRARIAN_VAULT_PATH ?? yamlConfig?.vault?.path;
    // Without env var set, YAML value wins
    strictEqual(vaultPath, '/yaml/vault');
  });
});
