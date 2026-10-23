// Collisions: when they happen, and what they do to speed and spin. Both are
// instantaneous impulses; the balls only touch for a fraction of a
// millisecond.

import { type Ball, classify } from "./ball.ts";
import {
  BALL_FRICTION,
  BALL_INERTIA as I,
  BALL_MASS as M,
  BALL_RADIUS as R,
  BALL_RESTITUTION,
  CUSHION_FRICTION,
  CUSHION_HEIGHT,
  CUSHION_RESTITUTION,
} from "./constants.ts";
import { expNeg } from "./math.ts";

// The cushion nose touches the ball above its center, at this angle.
const SIN_A = CUSHION_HEIGHT / R - 1;
const COS_A = Math.sqrt(1 - SIN_A * SIN_A);
/** How close a ball's center comes to a cushion nose, seen from above. */
export const CUSHION_REACH = R * COS_A;

/**
 * When a point moving by (wx, wy) per second from offset (dx, dy) comes within
 * `r` of the origin, if within `h` seconds: 0 if it already is and is closing
 * in, Infinity if never.
 */
export function contactTime(
  dx: number,
  dy: number,
  wx: number,
  wy: number,
  r: number,
  h: number,
): number {
  const b = dx * wx + dy * wy;
  if (b >= 0) return Infinity;
  const c = dx * dx + dy * dy - r * r;
  if (c <= 0) return 0;
  const a = wx * wx + wy * wy;
  const disc = b * b - a * c;
  if (disc < 0) return Infinity;
  // The smaller root of a·t² + 2b·t + c, in the form that doesn't cancel.
  const t = c / (-b + Math.sqrt(disc));
  return t <= h ? t : Infinity;
}

/**
 * When a ball at (x, y) moving by (wx, wy) per second reaches the straight
 * part of a cushion from A to B (not its ends, which `contactTime` covers).
 */
export function cushionTime(
  x: number,
  y: number,
  wx: number,
  wy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  h: number,
): number {
  const ex = bx - ax;
  const ey = by - ay;
  const length = Math.sqrt(ex * ex + ey * ey);
  let nx = -ey / length;
  let ny = ex / length;
  let s = (x - ax) * nx + (y - ay) * ny;
  if (s < 0) {
    nx = -nx;
    ny = -ny;
    s = -s;
  }
  const closing = -(wx * nx + wy * ny);
  if (closing <= 0) return Infinity;
  const t = s <= CUSHION_REACH ? 0 : (s - CUSHION_REACH) / closing;
  if (t > h) return Infinity;
  const along = ((x + wx * t - ax) * ex + (y + wy * t - ay) * ey) / length;
  return along >= 0 && along <= length ? t : Infinity;
}

/**
 * Two balls hit: nearly elastic along the line of centers, plus friction
 * between their surfaces, which throws the object ball off that line and
 * passes spin between them. Returns the closing speed, or 0 if they weren't
 * closing.
 */
export function collideBalls(a: Ball, b: Ball): number {
  let nx = b.x - a.x;
  let ny = b.y - a.y;
  const d = Math.sqrt(nx * nx + ny * ny);
  nx /= d;
  ny /= d;
  const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (closing <= 0) return 0;
  const normal = 0.5 * (1 + BALL_RESTITUTION) * M * closing;

  // Slip between the surfaces where they touch (+R·n on a, −R·n on b),
  // along the horizontal tangent (−ny, nx) and vertically.
  const tx = -ny;
  const ty = nx;
  const slipH = (a.vx - b.vx) * tx + (a.vy - b.vy) * ty + R * (a.wz + b.wz);
  const slipV = R * (ny * (a.wx + b.wx) - nx * (a.wy + b.wy));
  const [fh, fv] = friction(
    slipH,
    slipV,
    // A tangential impulse changes the slip through both balls' motion and
    // spin: 7/m horizontally, 5/m vertically (the cloth holds them down).
    M / 7,
    M / 5,
    frictionBetweenBalls(Math.sqrt(slipH * slipH + slipV * slipV)) * normal,
  );

  // The impulse on a: −normal along n, −fh along t, −fv up.
  a.vx += (-normal * nx - fh * tx) / M;
  a.vy += (-normal * ny - fh * ty) / M;
  b.vx -= (-normal * nx - fh * tx) / M;
  b.vy -= (-normal * ny - fh * ty) / M;
  // R·n × impulse, the same for both balls.
  const k = R / I;
  const dwx = k * fv * tx;
  const dwy = k * fv * ty;
  const dwz = -k * fh;
  a.wx += dwx;
  a.wy += dwy;
  a.wz += dwz;
  b.wx += dwx;
  b.wy += dwy;
  b.wz += dwz;
  classify(a);
  classify(b);
  return closing;
}

function frictionBetweenBalls(slip: number): number {
  return BALL_FRICTION.a + BALL_FRICTION.b * expNeg(BALL_FRICTION.c * slip);
}

/**
 * A ball hits a cushion, which pushes toward (nx, ny) horizontally (a unit
 * vector from the ball's center toward the cushion). The nose touches above
 * the center, so friction there changes topspin and side spin, which is how
 * English changes the rebound. Returns the speed into the cushion, or 0.
 */
export function collideCushion(ball: Ball, nx: number, ny: number): number {
  const into = ball.vx * nx + ball.vy * ny;
  if (into <= 0) return 0;
  // Bounces back at a fraction of the speed it came in with; the downward part
  // of the push is taken up by the slate.
  const normal = ((1 + CUSHION_RESTITUTION) * M * into) / COS_A;

  // Contact point r = R(cos a·n + sin a·z). Tangent directions there: t1
  // along the cushion, t2 up the face of the ball.
  const rx = R * COS_A * nx;
  const ry = R * COS_A * ny;
  const rz = R * SIN_A;
  const t1x = -ny;
  const t1y = nx;
  const t2x = -SIN_A * nx;
  const t2y = -SIN_A * ny;
  const t2z = COS_A;
  // Slip at the contact: v + ω × r.
  const sx = ball.vx + ball.wy * rz - ball.wz * ry;
  const sy = ball.vy + ball.wz * rx - ball.wx * rz;
  const sz = ball.wx * ry - ball.wy * rx;
  const s1 = sx * t1x + sy * t1y;
  const s2 = sx * t2x + sy * t2y + sz * t2z;
  const [f1, f2] = friction(
    s1,
    s2,
    1 / (1 / M + (R * R) / I),
    1 / ((SIN_A * SIN_A) / M + (R * R) / I),
    CUSHION_FRICTION * normal,
  );

  // Impulse P = −normal·r̂ − f1·t1 − f2·t2.
  const px = -normal * COS_A * nx - f1 * t1x - f2 * t2x;
  const py = -normal * COS_A * ny - f1 * t1y - f2 * t2y;
  const pz = -normal * SIN_A - f2 * t2z;
  ball.vx += px / M;
  ball.vy += py / M;
  // r × P / I (the normal part passes through the center and adds nothing).
  ball.wx += (ry * pz - rz * py) / I;
  ball.wy += (rz * px - rx * pz) / I;
  ball.wz += (rx * py - ry * px) / I;
  classify(ball);
  return into;
}

/**
 * Friction impulse against a slip with two components, each with its own
 * effective mass: just enough to stop the slip if friction allows (the
 * surfaces grip), otherwise the full `max` against the slip's direction.
 */
function friction(
  s1: number,
  s2: number,
  mass1: number,
  mass2: number,
  max: number,
): [number, number] {
  const stop1 = s1 * mass1;
  const stop2 = s2 * mass2;
  if (Math.sqrt(stop1 * stop1 + stop2 * stop2) <= max) return [stop1, stop2];
  const s = Math.sqrt(s1 * s1 + s2 * s2);
  const f1 = (max * s1) / s;
  const f2 = (max * s2) / s;
  // Friction can slow the slip to zero but never reverse it.
  return [
    Math.abs(f1) > Math.abs(stop1) ? stop1 : f1,
    Math.abs(f2) > Math.abs(stop2) ? stop2 : f2,
  ];
}
