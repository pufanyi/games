import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import { aimGuide } from "./aim.ts";
import { createBall } from "./physics/ball.ts";
import { CUSHION_REACH } from "./physics/collide.ts";
import { BALL_RADIUS as R } from "./physics/constants.ts";
import { TABLE } from "./physics/table.ts";

Deno.test("a straight-on aim stops a ball's width short of the target", () => {
  const balls = [createBall(0, 0, 0), createBall(1, 0.5, 0)];
  const guide = aimGuide(balls, 1, 0);
  assertEquals(guide.target?.id, 1);
  assertAlmostEquals(guide.x, 0.5 - 2 * R, 1e-12);
  assertAlmostEquals(guide.objectX, 1, 1e-12);
  assertAlmostEquals(guide.cueX, 0, 1e-12);
});

Deno.test("a half-ball hit sends the object ball off at 30°", () => {
  const balls = [createBall(0, 0, 0), createBall(1, 0.5, R)];
  const guide = aimGuide(balls, 1, 0);
  const angle = Math.atan2(guide.objectY, guide.objectX) * (180 / Math.PI);
  assertAlmostEquals(angle, 30, 1e-9);
  // Half as full as a straight-on hit; the cue ball goes off at right angles.
  assertAlmostEquals(
    Math.hypot(guide.objectX, guide.objectY),
    Math.sqrt(3) / 2,
    1e-9,
  );
  assertAlmostEquals(
    guide.objectX * guide.cueX + guide.objectY * guide.cueY,
    0,
    1e-12,
  );
});

Deno.test("with no ball in the way, the guide stops at the cushion", () => {
  const balls = [createBall(0, 0.2, 0), createBall(1, 0.5, 0.3)];
  const guide = aimGuide(balls, 0, 1);
  assertEquals(guide.target, null);
  assertAlmostEquals(guide.y, TABLE.width / 2 - CUSHION_REACH, 1e-12);
});

Deno.test("aimed straight into a pocket, the guide runs into it", () => {
  // x = 0 is the middle of the side pockets.
  const guide = aimGuide([createBall(0, 0, 0)], 0, 1);
  assertEquals(guide.target, null);
  assert(guide.y > TABLE.width / 2);
});

Deno.test("potted balls aren't in the way", () => {
  const balls = [createBall(0, 0, 0), createBall(1, 0.5, 0)];
  balls[1].motion = "pocketed";
  assertEquals(aimGuide(balls, 1, 0).target, null);
});
