// A ball's motion on the cloth between collisions, after Leckie and Greenspan,
// "An Event-Based Pool Physics Simulator" (2006). Each motion state has a
// closed-form solution, so a ball can be moved forward by any time exactly.
//
// Axes: x along the table, y across it, z up. Angular velocity is about those
// axes; a ball rolling toward +x spins about +y.

import {
  BALL_RADIUS as R,
  GRAVITY,
  ROLLING_FRICTION,
  SLIDING_FRICTION,
  SPIN_DECELERATION,
} from "./constants.ts";

export type Motion =
  | "stationary"
  | "spinning" // in place, about the vertical axis only
  | "sliding" // the contact point slips on the cloth
  | "rolling" // no slip
  | "pocketed";

/** Plain data, so a table of balls can be copied, sent and compared. */
export interface Ball {
  /** 0 is the cue ball; 1–15 the object balls. */
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  wx: number;
  wy: number;
  wz: number;
  motion: Motion;
}

/** Below this speed (m/s) a velocity counts as zero. */
const EPSILON = 1e-9;

const SLIDE_DECELERATION = SLIDING_FRICTION * GRAVITY;
const ROLL_DECELERATION = ROLLING_FRICTION * GRAVITY;

export function createBall(id: number, x: number, y: number): Ball {
  return { id, x, y, vx: 0, vy: 0, wx: 0, wy: 0, wz: 0, motion: "stationary" };
}

export function isMoving(ball: Ball): boolean {
  return ball.motion === "sliding" || ball.motion === "rolling";
}

/** Velocity of the ball's contact point with the cloth. */
export function slip(ball: Ball): [number, number] {
  return [ball.vx - R * ball.wy, ball.vy + R * ball.wx];
}

/** Sets `motion` from the velocities, after a collision or a strike. */
export function classify(ball: Ball): void {
  if (ball.motion === "pocketed") return;
  const [ux, uy] = slip(ball);
  if (Math.sqrt(ux * ux + uy * uy) > EPSILON) {
    ball.motion = "sliding";
  } else if (Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) > EPSILON) {
    ball.motion = "rolling";
    matchRollingSpin(ball);
  } else {
    ball.vx =
      ball.vy =
      ball.wx =
      ball.wy =
        0;
    ball.motion = Math.abs(ball.wz) * R > EPSILON ? "spinning" : "stationary";
    if (ball.motion === "stationary") ball.wz = 0;
  }
}

/** Moves the ball forward by `t` seconds, through any changes of state. */
export function advance(ball: Ball, t: number): void {
  // Each change lowers the state (sliding → rolling → spinning → stationary),
  // so this loops at most three times.
  while (t > 0) {
    const left = timeInState(ball);
    if (left > t) {
      evolve(ball, t);
      return;
    }
    evolve(ball, left);
    endState(ball);
    t -= left;
  }
}

/** How long until the ball's current state ends on its own. */
export function timeInState(ball: Ball): number {
  switch (ball.motion) {
    case "sliding": {
      // The slip shrinks at 7/2·μs·g: friction both slows the ball and spins
      // it up toward rolling.
      const [ux, uy] = slip(ball);
      return (2 * Math.sqrt(ux * ux + uy * uy)) / (7 * SLIDE_DECELERATION);
    }
    case "rolling":
      return Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) /
        ROLL_DECELERATION;
    case "spinning":
      return Math.abs(ball.wz) / SPIN_DECELERATION;
    default:
      return Infinity;
  }
}

/** Closed-form motion within the current state; `t` must not pass its end. */
function evolve(ball: Ball, t: number): void {
  switch (ball.motion) {
    case "sliding": {
      // Friction opposes the slip, whose direction stays fixed while sliding.
      const [ux, uy] = slip(ball);
      const u = Math.sqrt(ux * ux + uy * uy);
      const ex = ux / u;
      const ey = uy / u;
      const dv = SLIDE_DECELERATION * t;
      ball.x += ball.vx * t - 0.5 * dv * t * ex;
      ball.y += ball.vy * t - 0.5 * dv * t * ey;
      ball.vx -= dv * ex;
      ball.vy -= dv * ey;
      // The same force, acting at the contact point, torques the ball.
      const dw = (2.5 * dv) / R;
      ball.wx -= dw * ey;
      ball.wy += dw * ex;
      break;
    }
    case "rolling": {
      const v = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const dv = ROLL_DECELERATION * t;
      ball.x += ball.vx * t - (0.5 * dv * t * ball.vx) / v;
      ball.y += ball.vy * t - (0.5 * dv * t * ball.vy) / v;
      ball.vx -= (dv * ball.vx) / v;
      ball.vy -= (dv * ball.vy) / v;
      matchRollingSpin(ball);
      break;
    }
    case "spinning":
      break;
    default:
      return;
  }
  const dw = SPIN_DECELERATION * t;
  ball.wz = ball.wz > 0 ? Math.max(0, ball.wz - dw) : Math.min(0, ball.wz + dw);
}

/** Snaps the values that should be exactly zero when a state runs out. */
function endState(ball: Ball): void {
  switch (ball.motion) {
    case "sliding":
      matchRollingSpin(ball);
      break;
    case "rolling":
      ball.vx =
        ball.vy =
        ball.wx =
        ball.wy =
          0;
      break;
    case "spinning":
      ball.wz = 0;
      break;
  }
  classify(ball);
}

function matchRollingSpin(ball: Ball): void {
  ball.wx = -ball.vy / R;
  ball.wy = ball.vx / R;
}
