// The aiming guide: where the cue ball first touches something going straight
// along the aim, and where a ball it hits would head. It ignores spin, throw
// and squirt, like a player's own estimate, so the physics still matters.

import type { Ball } from "./physics/ball.ts";
import { contactTime, CUSHION_REACH, cushionTime } from "./physics/collide.ts";
import { BALL_RADIUS as R } from "./physics/constants.ts";
import { TABLE } from "./physics/table.ts";

export interface AimGuide {
  /** Where the cue ball's center is at first contact (the ghost ball). */
  x: number;
  y: number;
  /** The ball it hits, if it hits one rather than a cushion. */
  target: Ball | null;
  /** The target's direction, scaled by how full the hit is (1 = full). */
  objectX: number;
  objectY: number;
  /** The cue ball's direction off a stun hit: the tangent line. */
  cueX: number;
  cueY: number;
}

/** `dx, dy` is the aim, a unit vector. */
export function aimGuide(balls: Ball[], dx: number, dy: number): AimGuide {
  const cue = balls[0];
  let distance = Infinity;
  let target: Ball | null = null;
  for (const ball of balls) {
    if (ball === cue || ball.motion === "pocketed") continue;
    const t = contactTime(
      ball.x - cue.x,
      ball.y - cue.y,
      -dx,
      -dy,
      2 * R,
      Infinity,
    );
    if (t < distance) {
      distance = t;
      target = ball;
    }
  }
  for (const c of TABLE.cushions) {
    const t = Math.min(
      cushionTime(cue.x, cue.y, dx, dy, c.ax, c.ay, c.bx, c.by, Infinity),
      contactTime(
        c.ax - cue.x,
        c.ay - cue.y,
        -dx,
        -dy,
        CUSHION_REACH,
        Infinity,
      ),
      contactTime(
        c.bx - cue.x,
        c.by - cue.y,
        -dx,
        -dy,
        CUSHION_REACH,
        Infinity,
      ),
    );
    if (t < distance) {
      distance = t;
      target = null;
    }
  }
  // Straight into a pocket: run the guide off the edge of the table.
  if (distance === Infinity) {
    const ex = (TABLE.length / 2 + 0.1 - Math.sign(dx) * cue.x) / Math.abs(dx);
    const ey = (TABLE.width / 2 + 0.1 - Math.sign(dy) * cue.y) / Math.abs(dy);
    distance = Math.min(ex, ey);
  }
  const x = cue.x + dx * distance;
  const y = cue.y + dy * distance;
  if (!target) {
    return { x, y, target, objectX: 0, objectY: 0, cueX: 0, cueY: 0 };
  }

  const nx = (target.x - x) / (2 * R);
  const ny = (target.y - y) / (2 * R);
  const full = dx * nx + dy * ny;
  return {
    x,
    y,
    target,
    objectX: nx * full,
    objectY: ny * full,
    cueX: dx - nx * full,
    cueY: dy - ny * full,
  };
}
