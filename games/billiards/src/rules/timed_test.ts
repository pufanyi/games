import { assertEquals } from "@std/assert";
import type { ShotEvent } from "../physics/simulate.ts";
import { judge } from "./timed.ts";

const hit = (a: number, b: number): ShotEvent => ({
  type: "ball",
  t: 0.1,
  a,
  b,
  speed: 1,
});
const pot = (ball: number, pocket = 0): ShotEvent => ({
  type: "pocket",
  t: 0.5,
  ball,
  pocket,
});
const rail = (ball: number): ShotEvent => ({
  type: "cushion",
  t: 0.3,
  ball,
  speed: 1,
});

Deno.test("any ball in any pocket counts", () => {
  assertEquals(judge([hit(0, 5), hit(5, 12), pot(12, 4), pot(5, 1)]), {
    potted: [12, 5],
    foul: null,
  });
});

Deno.test("a shot that hits a ball and pots nothing is fine", () => {
  assertEquals(judge([hit(0, 3), rail(3)]), { potted: [], foul: null });
});

Deno.test("potting the cue ball is a scratch, but potted balls still count", () => {
  assertEquals(judge([hit(0, 7), pot(7), pot(0, 2)]), {
    potted: [7],
    foul: "scratch",
  });
});

Deno.test("missing every ball is a foul", () => {
  assertEquals(judge([rail(0), rail(0)]), { potted: [], foul: "miss" });
  // Even if the cue ball then drops; the scratch is the one reported.
  assertEquals(judge([rail(0), pot(0)]), { potted: [], foul: "scratch" });
});

Deno.test("balls hitting each other don't count as the cue ball hitting", () => {
  assertEquals(judge([hit(4, 9)]).foul, "miss");
});
