import test from "node:test";
import assert from "node:assert/strict";

import { appReducer, createInitialState, type AppState, type AppAction, type IndexCacheStatus } from "../../src/tui/state.js";

test("createInitialState sets indexStatus to missing", () => {
  const state = createInitialState("/tmp/vault");
  assert.equal(state.indexStatus, "missing");
});

test("SET_INDEX_STATUS updates indexStatus", () => {
  const state = createInitialState("/tmp/vault");

  const updated = appReducer(state, { type: "SET_INDEX_STATUS", status: "fresh" });
  assert.equal(updated.indexStatus, "fresh");
});

for (const status of ["fresh", "stale", "missing", "rebuilding"] as IndexCacheStatus[]) {
  test(`SET_INDEX_STATUS handles '${status}'`, () => {
    const state = createInitialState("/tmp/vault");
    const updated = appReducer(state, { type: "SET_INDEX_STATUS", status });
    assert.equal(updated.indexStatus, status);
  });
}

test("SET_INDEX_STATUS does not mutate other state", () => {
  const state = createInitialState("/tmp/vault");
  const updated = appReducer(state, { type: "SET_INDEX_STATUS", status: "stale" });
  assert.equal(updated.vaultPath, state.vaultPath);
  assert.equal(updated.ollamaStatus, state.ollamaStatus);
  assert.equal(updated.workspace.length, state.workspace.length);
  assert.equal(updated.loading, state.loading);
});
