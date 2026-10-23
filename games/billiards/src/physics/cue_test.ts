import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import { type Ball, createBall } from "./ball.ts";
import {
  BALL_MASS,
  BALL_RADIUS as R,
  CUE_MASS,
  CUE_TIP_RESTITUTION,
} from "./constants.ts";
import { type Shot, strike } from "./cue.ts";

function hit(shot: Partial<Shot>): Ball {
  const ball = createBall(0, 0, 0);
  strike(ball, { cue: [1, 0, 0], speed: 2, tip: [0, 0], ...shot });
  return ball;
}

Deno.test("a center hit moves the ball without spin", () => {
  const ball = hit({});
  const expected = ((1 + CUE_TIP_RESTITUTION) * 2) /
    (1 + BALL_MASS / CUE_MASS);
  assertAlmostEquals(ball.vx, expected, 1e-12);
  assertEquals([ball.vy, ball.wx, ball.wy, ball.wz], [0, 0, 0, 0]);
  assertEquals(ball.motion, "sliding");
});

Deno.test("high hits give topspin, low hits backspin", () => {
  const follow = hit({ tip: [0, 0.4] });
  assert(follow.wy * R > 0.8 * follow.vx);
  const draw = hit({ tip: [0, -0.4] });
  assert(draw.wy * R < -0.8 * draw.vx);
  // Some of the stroke goes into spin instead of speed.
  assert(draw.vx < hit({}).vx);
});

Deno.test("right English spins the ball and squirts it left", () => {
  const ball = hit({ tip: [0.4, 0] });
  // Counterclockwise seen from above; heading +x, left is +y.
  assert(ball.wz > 0);
  const squirt = (Math.atan2(ball.vy, ball.vx) * 180) / Math.PI;
  assert(squirt > 1 && squirt < 4, `squirt ${squirt}°`);
});

Deno.test("an elevated cue with English curves the ball (massé)", () => {
  const ball = hit({ cue: [1, 0, -1], tip: [0.4, 0] });
  // Spin about a tilted axis: the contact point slips sideways.
  assert(Math.abs(ball.vy + R * ball.wx) > 0.1);
});

Deno.test("tip offsets past the miscue limit are clamped", () => {
  assertEquals(hit({ tip: [1, 0] }), hit({ tip: [0.5, 0] }));
  assertEquals(hit({ speed: 100 }), hit({ speed: 9 }));
});
