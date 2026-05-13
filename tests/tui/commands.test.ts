import test from "node:test";
import assert from "node:assert/strict";

import { createCommands, parseComposerInput } from "../../src/tui/commands.js";

test("/orphans command is registered", () => {
  const commands = createCommands(() => {}, async () => {});
  const orphans = commands.find((c) => c.slash === "/orphans");
  assert.ok(orphans);
  assert.equal(orphans.description, "Notas huérfanas");
});

test("parseComposerInput identifies /orphans", () => {
  const commands = createCommands(() => {}, async () => {});
  const parsed = parseComposerInput("/orphans", commands);
  assert.equal(parsed.isCommand, true);
  assert.equal(parsed.command?.slash, "/orphans");
});

test("parseComposerInput passes through non-command input", () => {
  const commands = createCommands(() => {}, async () => {});
  const parsed = parseComposerInput("hello world", commands);
  assert.equal(parsed.isCommand, false);
  assert.equal(parsed.args, "hello world");
});

test("all commands have slash prefix", () => {
  const commands = createCommands(() => {}, async () => {});
  for (const cmd of commands) {
    assert.ok(cmd.slash.startsWith("/"), `Command ${cmd.slash} should start with /`);
  }
});

test("no duplicate command slashes", () => {
  const commands = createCommands(() => {}, async () => {});
  const slashes = commands.map((c) => c.slash);
  const unique = new Set(slashes);
  assert.equal(slashes.length, unique.size);
});
