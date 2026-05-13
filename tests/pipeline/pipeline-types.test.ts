import test from "node:test";
import assert from "node:assert/strict";

import type { PipelineStage, PipelineContext, PipelineResult } from "../../src/pipeline/types.js";

test("PipelineStage interface can be implemented as a typed stage", async () => {
  const echoStage: PipelineStage<string, string> = {
    name: "echo",
    run: async (input, _ctx) => input.toUpperCase(),
  };

  const ctx: PipelineContext = { vaultPath: "/tmp/vault" };
  const result = await echoStage.run("hello", ctx);

  assert.equal(result, "HELLO");
});

test("PipelineResult success carries output and stage name", () => {
  const result: PipelineResult<string> = {
    success: true,
    output: "done",
    stage: "test-stage",
  };

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.output, "done");
    assert.equal(result.stage, "test-stage");
  }
});

test("PipelineResult failure carries error and stage name", () => {
  const result: PipelineResult<string> = {
    success: false,
    error: "something broke",
    stage: "test-stage",
  };

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error, "something broke");
    assert.equal(result.stage, "test-stage");
  }
});
