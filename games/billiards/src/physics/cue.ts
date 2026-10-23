// The cue hitting the cue ball: a single impulse along the cue, at the point
// where the tip touches (Leckie and Greenspan), plus squirt.

import { type Ball, classify } from "./ball.ts";
import {
  BALL_INERTIA as I,
  BALL_MASS as M,
  BALL_RADIUS as R,
  CUE_END_MASS,
  CUE_MASS,
  CUE_TIP_RESTITUTION,
  MAX_CUE_SPEED,
  MAX_ELEVATION_SIN,
  MISCUE_LIMIT,
} from "./constants.ts";

export interface Shot {
  /**
   * Direction of the stroke, from the butt toward the tip; any length. z is
   * how steeply the cue points down (0 for a level cue).
   */
  cue: [number, number, number];
  /** Speed of the cue at impact, in m/s. */
  speed: number;
  /**
   * Where the tip hits, as fractions of the ball's radius, seen along the
   * cue: [right, up]. [0, −0.4] is a draw shot, [0.3, 0] right English.
   */
  tip: [number, number];
}

/** Hits the cue ball (in place). Out-of-range values are clamped. */
export function strike(ball: Ball, shot: Shot): void {
  const [dx, dy, dz] = shot.cue;
  const level = Math.sqrt(dx * dx + dy * dy);
  if (level === 0) return;
  const cx = dx / level;
  const cy = dy / level;
  const sin = Math.min(
    Math.max(0, -dz / Math.sqrt(level * level + dz * dz)),
    MAX_ELEVATION_SIN,
  );
  const cos = Math.sqrt(1 - sin * sin);

  const speed = Math.min(Math.max(shot.speed, 0), MAX_CUE_SPEED);
  let [side, height] = shot.tip;
  const offset = Math.sqrt(side * side + height * height);
  if (offset > MISCUE_LIMIT) {
    side *= MISCUE_LIMIT / offset;
    height *= MISCUE_LIMIT / offset;
  }
  const a = side * R;
  const b = height * R;

  // Directions: j along the cue, up perpendicular to it in the vertical
  // plane, right to the shooter's right.
  const jx = cos * cx;
  const jy = cos * cy;
  const jz = -sin;
  const upx = sin * cx;
  const upy = sin * cy;
  const upz = cos;
  const rightx = cy;
  const righty = -cx;
  // The tip touches the back of the ball, offset by (a, b) from the cue's
  // line through the center.
  const c = Math.sqrt(R * R - a * a - b * b);
  const qx = a * rightx + b * upx - c * jx;
  const qy = a * righty + b * upy - c * jy;
  const qz = b * upz - c * jz;

  // Impulse from a collision between the cue and the ball at Q: hitting off
  // center puts some of it into spin instead of speed.
  const impulse = ((1 + CUE_TIP_RESTITUTION) * speed) /
    (1 / CUE_MASS + (1 + (2.5 * (a * a + b * b)) / (R * R)) / M);

  // The slate takes the downward part; the rest moves the ball.
  const ballSpeed = (impulse * cos) / M;
  // Squirt: hitting right of center pushes the ball slightly left of the aim
  // line, more so with a heavier cue end (Alciatore).
  const x = side;
  const squirt = (2.5 * x * Math.sqrt(1 - x * x)) /
    (1 + M / CUE_END_MASS + 2.5 * (1 - x * x));
  const norm = Math.sqrt(1 + squirt * squirt);
  ball.vx = (ballSpeed * (cx - squirt * rightx)) / norm;
  ball.vy = (ballSpeed * (cy - squirt * righty)) / norm;

  // Spin: Q × impulse·j / I.
  const k = impulse / I;
  ball.wx = k * (qy * jz - qz * jy);
  ball.wy = k * (qz * jx - qx * jz);
  ball.wz = k * (qx * jy - qy * jx);
  classify(ball);
}
