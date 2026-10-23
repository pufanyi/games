import { assert, assertAlmostEquals } from "@std/assert";
import { advance, type Ball, createBall, timeInState } from "./ball.ts";
import { collideBalls, collideCushion } from "./collide.ts";
import {
  BALL_INERTIA,
  BALL_MASS,
  BALL_RADIUS as R,
  BALL_RESTITUTION,
} from "./constants.ts";
import { seededRandom } from "../random.ts";

const DEGREES = 180 / Math.PI;

/** A ball moving along +x at `speed`, rolling or (stun) not spinning. */
function moving(speed: number, rolling: boolean): Ball {
  const ball = createBall(0, 0, 0);
  ball.vx = speed;
  if (rolling) ball.wy = speed / R;
  ball.motion = rolling ? "rolling" : "sliding";
  return ball;
}

/** An object ball touching `cue`, hit with a cut angle of `cut` degrees. */
function objectBall(cut: number): Ball {
  const a = cut / DEGREES;
  return createBall(1, 2 * R * Math.cos(a), 2 * R * Math.sin(a));
}

/** Lets a ball run until it rolls, then gives its heading in degrees. */
function headingOnceRolling(ball: Ball): number {
  while (ball.motion === "sliding") advance(ball, timeInState(ball));
  return Math.atan2(ball.vy, ball.vx) * DEGREES;
}

function energy(ball: Ball): number {
  const w2 = ball.wx * ball.wx + ball.wy * ball.wy + ball.wz * ball.wz;
  return 0.5 * BALL_MASS * (ball.vx * ball.vx + ball.vy * ball.vy) +
    0.5 * BALL_INERTIA * w2;
}

Deno.test("stun shot, full hit: the cue ball stops dead", () => {
  const cue = moving(2, false);
  const object = objectBall(0);
  collideBalls(cue, object);
  // All but the speed lost to the inelastic hit.
  assertAlmostEquals(cue.vx, ((1 - BALL_RESTITUTION) / 2) * 2, 1e-12);
  assertAlmostEquals(object.vx, ((1 + BALL_RESTITUTION) / 2) * 2, 1e-12);
});

Deno.test("stun shot, cut: the cue ball leaves near the tangent line", () => {
  for (const cut of [15, 30, 45, 60]) {
    const cue = moving(1, false);
    const object = objectBall(cut);
    collideBalls(cue, object);
    const between = Math.atan2(object.vy, object.vx) -
      Math.atan2(cue.vy, cue.vx);
    // A little under 90°: the hit isn't perfectly elastic, and throw.
    const degrees = Math.abs(between) * DEGREES;
    assert(degrees > 80 && degrees < 90, `cut ${cut}°: ${degrees}°`);
  }
});

Deno.test("rolling cue ball, half-ball hit: deflects about 30°", () => {
  const cue = moving(1, true);
  collideBalls(cue, objectBall(30));
  // −y: away from the object ball, which was cut to +y.
  assertAlmostEquals(headingOnceRolling(cue), -33.7, 3);
});

Deno.test("draw comes back, follow goes through", () => {
  const draw = moving(1, false);
  draw.wy = -1.5 / R;
  collideBalls(draw, objectBall(0));
  assert(headingOnceRolling(draw) === 180);

  const follow = moving(1, true);
  collideBalls(follow, objectBall(0));
  assert(headingOnceRolling(follow) === 0);
});

Deno.test("throw: a slow half-ball cut throws the object ball a few degrees", () => {
  function thrown(speed: number): number {
    const cue = moving(speed, false);
    const object = objectBall(30);
    collideBalls(cue, object);
    // Positive: toward the cue ball's path, off the 30° line of centers.
    return 30 - Math.atan2(object.vy, object.vx) * DEGREES;
  }
  const slow = thrown(0.5);
  const fast = thrown(4);
  assert(slow > 3 && slow < 6, `slow throw ${slow}°`);
  assert(fast > 0.5 && fast < slow, `fast throw ${fast}°`);
});

Deno.test("ball–ball hits conserve momentum and never add energy", () => {
  const random = seededRandom(7);
  const spread = () => (random() * 2 - 1) * 3;
  for (let i = 0; i < 500; i++) {
    const a = createBall(0, 0, 0);
    const angle = random() * Math.PI * 2;
    const b = createBall(1, 2 * R * Math.cos(angle), 2 * R * Math.sin(angle));
    for (const ball of [a, b]) {
      ball.vx = spread();
      ball.vy = spread();
      ball.wx = spread() / R;
      ball.wy = spread() / R;
      ball.wz = spread() / R;
      ball.motion = "sliding";
    }
    const px = a.vx + b.vx;
    const py = a.vy + b.vy;
    const before = energy(a) + energy(b);
    collideBalls(a, b);
    assertAlmostEquals(a.vx + b.vx, px, 1e-12);
    assertAlmostEquals(a.vy + b.vy, py, 1e-12);
    assert(energy(a) + energy(b) <= before + 1e-12);
  }
});

Deno.test("cushion: a rolling ball comes straight back, slower", () => {
  const ball = moving(1, true);
  collideCushion(ball, 1, 0);
  assertAlmostEquals(ball.vx, -0.85, 0.02);
  assertAlmostEquals(ball.vy, 0, 1e-12);
  // The nose grips the top of the ball, taking off most of the topspin.
  assert(ball.wy < 0.5 / R);
});

Deno.test("cushion: English changes the rebound angle", () => {
  // Heading +x, right English spins the ball counterclockwise seen from
  // above, and it comes back to the shooter's right (−y).
  const right = moving(1, true);
  right.wz = 30;
  collideCushion(right, 1, 0);
  assert(right.vy < -0.1);

  const left = moving(1, true);
  left.wz = -30;
  collideCushion(left, 1, 0);
  assertAlmostEquals(left.vy, -right.vy, 1e-12);
});

Deno.test("cushion hits never add energy", () => {
  const random = seededRandom(11);
  const spread = () => (random() * 2 - 1) * 3;
  for (let i = 0; i < 500; i++) {
    const ball = createBall(0, 0, 0);
    ball.vx = Math.abs(spread()) + 0.01;
    ball.vy = spread();
    ball.wx = spread() / R;
    ball.wy = spread() / R;
    ball.wz = spread() / R;
    const before = energy(ball);
    collideCushion(ball, 1, 0);
    assert(energy(ball) <= before + 1e-12);
    assert(ball.vx < 0);
  }
});
