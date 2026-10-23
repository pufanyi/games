import { assertAlmostEquals, assertEquals } from "@std/assert";
import { advance, createBall, timeInState } from "./ball.ts";
import { BALL_RADIUS as R, GRAVITY, ROLLING_FRICTION } from "./constants.ts";

Deno.test("a sliding ball starts rolling at 5/7 of its speed", () => {
  const ball = createBall(0, 0, 0);
  ball.vx = 2;
  ball.motion = "sliding";
  advance(ball, timeInState(ball));
  assertEquals(ball.motion, "rolling");
  assertAlmostEquals(ball.vx, (5 / 7) * 2, 1e-12);
  assertAlmostEquals(ball.wy, ball.vx / R, 1e-9);
});

Deno.test("backspin makes a ball slow down faster, then roll on", () => {
  const ball = createBall(0, 0, 0);
  ball.vx = 2;
  ball.wy = -1 / R;
  ball.motion = "sliding";
  advance(ball, timeInState(ball));
  // Slip 3 m/s; the ball keeps 2 − 3·(2/7) of its speed.
  assertAlmostEquals(ball.vx, 2 - 6 / 7, 1e-12);
});

Deno.test("a rolling ball stops after v²/2a", () => {
  const ball = createBall(0, 0, 0);
  ball.vx = 1;
  ball.wy = 1 / R;
  ball.motion = "rolling";
  advance(ball, 1000);
  assertEquals(ball.motion, "stationary");
  assertAlmostEquals(ball.x, 1 / (2 * ROLLING_FRICTION * GRAVITY), 1e-9);
});

Deno.test("side spin dies away on its own", () => {
  const ball = createBall(0, 0, 0);
  ball.wz = 20;
  ball.motion = "spinning";
  advance(ball, 0.5);
  assertEquals(ball.motion, "spinning");
  advance(ball, 10);
  assertEquals(ball.motion, "stationary");
  assertEquals([ball.x, ball.y, ball.wz], [0, 0, 0]);
});

Deno.test("moving in steps lands where moving at once does", () => {
  const once = createBall(0, 0, 0);
  once.vx = 1.5;
  once.vy = -0.5;
  once.wx = 20;
  once.wz = 15;
  once.motion = "sliding";
  const steps = { ...once };
  advance(once, 2);
  for (let i = 0; i < 2000; i++) advance(steps, 0.001);
  assertAlmostEquals(steps.x, once.x, 1e-9);
  assertAlmostEquals(steps.y, once.y, 1e-9);
});
