import test from "node:test";
import assert from "node:assert/strict";

import { canTransition, assertTransition } from "../../src/review/status-machine.js";
import { TransitionError } from "../../src/review/types.js";
import type { ProposalStatus } from "../../src/proposals/types.js";

test("canTransition allows pending → approved", () => {
  assert.equal(canTransition("pending", "approved"), true);
});

test("canTransition allows pending → rejected", () => {
  assert.equal(canTransition("pending", "rejected"), true);
});

test("canTransition allows approved → applying", () => {
  assert.equal(canTransition("approved", "applying"), true);
});

test("canTransition allows approved → rejected", () => {
  assert.equal(canTransition("approved", "rejected"), true);
});

test("canTransition allows applying → applied", () => {
  assert.equal(canTransition("applying", "applied"), true);
});

test("canTransition rejects rejected → applied", () => {
  assert.equal(canTransition("rejected", "applied"), false);
});

test("canTransition rejects rejected → approved", () => {
  assert.equal(canTransition("rejected", "approved"), false);
});

test("canTransition rejects applied → rejected", () => {
  assert.equal(canTransition("applied", "rejected"), false);
});

test("canTransition rejects applied → approved", () => {
  assert.equal(canTransition("applied", "approved"), false);
});

test("canTransition rejects pending → applied", () => {
  assert.equal(canTransition("pending", "applied"), false);
});

test("canTransition rejects pending → pending", () => {
  assert.equal(canTransition("pending", "pending"), false);
});

test("canTransition rejects approved → applied (must go through applying)", () => {
  assert.equal(canTransition("approved", "applied"), false);
});

test("assertTransition does not throw for valid transitions", () => {
  const valid: [ProposalStatus, ProposalStatus][] = [
    ["pending", "approved"],
    ["pending", "rejected"],
    ["approved", "applying"],
    ["approved", "rejected"],
    ["applying", "applied"],
  ];

  for (const [from, to] of valid) {
    assert.doesNotThrow(() => assertTransition(from, to));
  }
});

test("assertTransition throws TransitionError for invalid transitions", () => {
  const invalid: [ProposalStatus, ProposalStatus][] = [
    ["pending", "applied"],
    ["rejected", "applied"],
    ["rejected", "approved"],
    ["applied", "rejected"],
    ["applied", "approved"],
    ["applied", "pending"],
    ["approved", "applied"],
  ];

  for (const [from, to] of invalid) {
    assert.throws(
      () => assertTransition(from, to),
      (err: unknown) => err instanceof TransitionError && err.message.includes(`${from} → ${to}`),
    );
  }
});
