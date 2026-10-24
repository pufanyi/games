import { assert, assertEquals } from "@std/assert";
import type { LaneDefinition } from "../content/types.ts";
import { createLane, headingAt, pointAt, segmentAt } from "./lane.ts";

function bend(): LaneDefinition {
  return {
    // A right turn 100 px along: (0,0) -> (100,0) -> (100,100).
    points: [[0, 0], [100, 0], [100, 100]],
    engageAt: 10,
    disengageAt: 180,
    leakAt: 195,
    total: 200,
    spacing: 100,
  };
}

Deno.test("createLane measures the road's arc length", () => {
  const lane = createLane(bend());
  assertEquals(lane.total, 200);
  assertEquals(lane.points.length, 3);
  assertEquals(lane.engageAt, 10);
  assertEquals(lane.leakAt, 195);
});

Deno.test("pointAt interpolates along each segment and clamps", () => {
  const lane = createLane(bend());
  assertEquals(pointAt(lane, 0), { x: 0, y: 0 });
  assertEquals(pointAt(lane, 50), { x: 50, y: 0 });
  assertEquals(pointAt(lane, 100), { x: 100, y: 0 });
  assertEquals(pointAt(lane, 150), { x: 100, y: 50 });
  assertEquals(pointAt(lane, 200), { x: 100, y: 100 });
  assertEquals(pointAt(lane, 900), { x: 100, y: 100 });
  assertEquals(pointAt(lane, -40), { x: 0, y: 0 });
});

Deno.test("segmentAt and headingAt follow the bend", () => {
  const lane = createLane(bend());
  assertEquals(segmentAt(lane, 99), 0);
  assertEquals(segmentAt(lane, 150), 1);
  assertEquals(headingAt(lane, 50), 0);
  assert(Math.abs(headingAt(lane, 150) - Math.PI / 2) < 1e-9);
});
