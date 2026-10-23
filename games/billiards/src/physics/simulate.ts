// Runs a whole shot, from the cue strike until every ball stops. A shot is
// decided the moment the cue hits, so it's simulated up front and played back
// from the recorded frames.

import { advance, type Ball, isMoving } from "./ball.ts";
import {
  collideBalls,
  collideCushion,
  contactTime,
  CUSHION_REACH,
  cushionTime,
} from "./collide.ts";
import { BALL_RADIUS as R } from "./constants.ts";
import { type Shot, strike } from "./cue.ts";
import { type Cushion, TABLE, type Table } from "./table.ts";

/**
 * Simulation substep, in seconds. Balls move exactly within it; only finding
 * collisions treats their paths as straight, which is off by about 1 µm.
 */
export const STEP = 0.001;
/** Keep a playback frame every this many substeps (125 a second). */
const FRAME_EVERY = 8;
/** Simulated seconds after which a shot is stopped regardless. */
const MAX_DURATION = 120;
/** Balls frozen together resolve over a few collisions; this caps a step. */
const MAX_COLLISIONS_PER_STEP = 256;

export type ShotEvent =
  | { type: "ball"; t: number; a: number; b: number; speed: number }
  | { type: "cushion"; t: number; ball: number; speed: number }
  | { type: "pocket"; t: number; ball: number; pocket: number };

/** Where a ball is and how it spins, for drawing. */
export interface Pose {
  x: number;
  y: number;
  wx: number;
  wy: number;
  wz: number;
  pocketed: boolean;
}

export interface Frame {
  t: number;
  /** In the same order as the balls passed in. */
  balls: Pose[];
}

export interface ShotResult {
  /** The table once everything has stopped. */
  balls: Ball[];
  /** In time order, for the rules and for sound. */
  events: ShotEvent[];
  /** For playback: regular frames, plus one at every event. */
  frames: Frame[];
  /** Simulated seconds until everything stopped. */
  duration: number;
}

/** Strikes the cue ball (id 0) and runs the shot. Doesn't change `balls`. */
export function simulateShot(
  balls: Ball[],
  shot: Shot,
  table: Table = TABLE,
): ShotResult {
  const copy = balls.map((ball) => ({ ...ball }));
  const cue = copy.find((ball) => ball.id === 0);
  if (cue && cue.motion !== "pocketed") strike(cue, shot);
  return run(copy, table);
}

type Hit =
  | { t: number; kind: "ball"; i: number; j: number }
  | { t: number; kind: "cushion"; i: number; cushion: Cushion };

function run(balls: Ball[], table: Table): ShotResult {
  const events: ShotEvent[] = [];
  const frames: Frame[] = [frame(0, balls)];
  const bounds = table.cushions.map(boundingBox);
  let steps = 0;

  while (balls.some(isMoving) && steps * STEP < MAX_DURATION) {
    const start = steps * STEP;
    let elapsed = 0;
    for (let n = 0; n < MAX_COLLISIONS_PER_STEP; n++) {
      const hit = nextHit(balls, table, bounds, STEP - elapsed);
      if (!hit) break;
      for (const ball of balls) advance(ball, hit.t);
      elapsed += hit.t;
      const t = start + elapsed;
      if (hit.kind === "ball") {
        const a = balls[hit.i];
        const b = balls[hit.j];
        const speed = collideBalls(a, b);
        if (speed > 0) {
          events.push({ type: "ball", t, a: a.id, b: b.id, speed });
        }
      } else {
        const ball = balls[hit.i];
        const [nx, ny] = towardCushion(ball, hit.cushion);
        const speed = collideCushion(ball, nx, ny);
        if (speed > 0) {
          events.push({ type: "cushion", t, ball: ball.id, speed });
        }
      }
      frames.push(frame(t, balls));
    }
    for (const ball of balls) advance(ball, STEP - elapsed);
    steps++;

    const t = steps * STEP;
    for (const ball of balls) {
      if (ball.motion === "pocketed") continue;
      const pocket = table.pockets.findIndex((p) =>
        (ball.x - p.x) * (ball.x - p.x) + (ball.y - p.y) * (ball.y - p.y) <
          p.radius * p.radius
      );
      if (pocket < 0) continue;
      ball.vx =
        ball.vy =
        ball.wx =
        ball.wy =
        ball.wz =
          0;
      ball.motion = "pocketed";
      events.push({ type: "pocket", t, ball: ball.id, pocket });
    }
    if (steps % FRAME_EVERY === 0) frames.push(frame(t, balls));
  }

  // Leftover side spin on a ball at rest can't move it again; it would stop
  // while the next shot is lined up.
  for (const ball of balls) {
    if (ball.motion === "spinning") {
      ball.wz = 0;
      ball.motion = "stationary";
    }
  }
  const duration = steps * STEP;
  frames.push(frame(duration, balls));
  return { balls, events, frames, duration };
}

/** The first collision within `h` seconds, if any. */
function nextHit(
  balls: Ball[],
  table: Table,
  bounds: Box[],
  h: number,
): Hit | null {
  let best: Hit | null = null;
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    if (a.motion === "pocketed") continue;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      if (b.motion === "pocketed" || !(isMoving(a) || isMoving(b))) continue;
      const t = contactTime(
        b.x - a.x,
        b.y - a.y,
        b.vx - a.vx,
        b.vy - a.vy,
        2 * R,
        best ? best.t : h,
      );
      if (t < (best ? best.t : Infinity)) best = { t, kind: "ball", i, j };
    }

    if (!isMoving(a)) continue;
    const reach = Math.abs(a.vx * h) + Math.abs(a.vy * h) + CUSHION_REACH;
    for (let c = 0; c < table.cushions.length; c++) {
      const box = bounds[c];
      if (
        a.x + reach < box.minX || a.x - reach > box.maxX ||
        a.y + reach < box.minY || a.y - reach > box.maxY
      ) continue;
      const cushion = table.cushions[c];
      const limit = best ? best.t : h;
      const t = Math.min(
        cushionTime(
          a.x,
          a.y,
          a.vx,
          a.vy,
          cushion.ax,
          cushion.ay,
          cushion.bx,
          cushion.by,
          limit,
        ),
        // The ends of a cushion: the jaw points.
        contactTime(
          cushion.ax - a.x,
          cushion.ay - a.y,
          -a.vx,
          -a.vy,
          CUSHION_REACH,
          limit,
        ),
        contactTime(
          cushion.bx - a.x,
          cushion.by - a.y,
          -a.vx,
          -a.vy,
          CUSHION_REACH,
          limit,
        ),
      );
      if (t < (best ? best.t : Infinity)) {
        best = { t, kind: "cushion", i, cushion };
      }
    }
  }
  return best;
}

/** Unit vector from the ball's center to the nearest point of the cushion. */
function towardCushion(ball: Ball, c: Cushion): [number, number] {
  const ex = c.bx - c.ax;
  const ey = c.by - c.ay;
  const along = Math.min(
    1,
    Math.max(
      0,
      ((ball.x - c.ax) * ex + (ball.y - c.ay) * ey) /
        (ex * ex + ey * ey),
    ),
  );
  const dx = c.ax + along * ex - ball.x;
  const dy = c.ay + along * ey - ball.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  return [dx / d, dy / d];
}

interface Box {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function boundingBox(c: Cushion): Box {
  return {
    minX: Math.min(c.ax, c.bx),
    maxX: Math.max(c.ax, c.bx),
    minY: Math.min(c.ay, c.by),
    maxY: Math.max(c.ay, c.by),
  };
}

function frame(t: number, balls: Ball[]): Frame {
  return {
    t,
    balls: balls.map((b) => ({
      x: b.x,
      y: b.y,
      wx: b.wx,
      wy: b.wy,
      wz: b.wz,
      pocketed: b.motion === "pocketed",
    })),
  };
}
