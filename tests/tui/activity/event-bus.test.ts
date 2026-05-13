import test from "node:test";
import assert from "node:assert/strict";

import { createActivityEventBus } from "../../../src/tui/activity/event-bus.js";
import type { ActivityEvent } from "../../../src/tui/activity/types.js";

const makeEvent = (type: ActivityEvent["type"] = "index:rebuilt"): ActivityEvent => ({
  id: `evt-${Math.random().toString(36).slice(2, 8)}`,
  type,
  message: `test event: ${type}`,
  createdAt: Date.now(),
});

test("subscribe receives emitted events", () => {
  const bus = createActivityEventBus();
  const received: ActivityEvent[] = [];

  bus.subscribe((event) => {
    received.push(event);
  });

  const event = makeEvent();
  bus.emit(event);

  assert.equal(received.length, 1);
  assert.equal(received[0].id, event.id);
});

test("unsubscribe stops receiving events", () => {
  const bus = createActivityEventBus();
  const received: ActivityEvent[] = [];

  const unsub = bus.subscribe((event) => {
    received.push(event);
  });

  bus.emit(makeEvent());
  unsub();
  bus.emit(makeEvent());

  assert.equal(received.length, 1);
});

test("multiple subscribers all receive events", () => {
  const bus = createActivityEventBus();
  const a: ActivityEvent[] = [];
  const b: ActivityEvent[] = [];

  bus.subscribe((event) => { a.push(event); });
  bus.subscribe((event) => { b.push(event); });

  const event = makeEvent();
  bus.emit(event);

  assert.equal(a.length, 1);
  assert.equal(b.length, 1);
  assert.equal(a[0].id, event.id);
  assert.equal(b[0].id, event.id);
});

test("emit during subscriber does not break chain", () => {
  const bus = createActivityEventBus();
  const received: ActivityEvent[] = [];

  bus.subscribe((event) => {
    received.push(event);
    if (event.type === "index:rebuilt") {
      bus.emit(makeEvent("graph:warning"));
    }
  });

  bus.emit(makeEvent("index:rebuilt"));

  assert.equal(received.length, 2);
  assert.equal(received[0].type, "index:rebuilt");
  assert.equal(received[1].type, "graph:warning");
});

test("unsubscribe during emit does not skip other listeners", () => {
  const bus = createActivityEventBus();
  const received: string[] = [];

  const unsub = bus.subscribe(() => {
    received.push("a");
    unsub();
  });

  bus.subscribe(() => {
    received.push("b");
  });

  bus.emit(makeEvent());

  assert.deepEqual(received, ["a", "b"]);
});

test("each bus instance is independent", () => {
  const bus1 = createActivityEventBus();
  const bus2 = createActivityEventBus();
  const received: ActivityEvent[] = [];

  bus1.subscribe((event) => { received.push(event); });

  bus2.emit(makeEvent());

  assert.equal(received.length, 0);

  const event = makeEvent();
  bus1.emit(event);

  assert.equal(received.length, 1);
  assert.equal(received[0].id, event.id);
});
