// The single-player game: placing the cue ball, aiming, playing a shot back,
// and the clock. No DOM, no canvas, no Date.now(), no Math.random(), so it runs
// in tests the same as in the browser; the session drives it with real time.

import { type Ball, createBall } from "../physics/ball.ts";
import { CUSHION_REACH } from "../physics/collide.ts";
import { BALL_RADIUS as R } from "../physics/constants.ts";
import type { Shot } from "../physics/cue.ts";
import { headSpot, rack } from "../physics/rack.ts";
import {
  type Pose,
  type ShotEvent,
  type ShotResult,
  simulateShot,
} from "../physics/simulate.ts";
import { TABLE } from "../physics/table.ts";
import { seededRandom } from "../physics/random.ts";
import { type Foul, FOUL_PENALTY, judge, TIME_LIMIT } from "../rules/timed.ts";

export type Phase = "placing" | "aiming" | "rolling" | "won" | "lost";

/** Things the player should hear about; collected per tick. */
export type GameEvent =
  | ShotEvent
  | { type: "strike"; speed: number }
  | { type: "foul"; foul: Foul }
  | { type: "won" }
  | { type: "lost" };

export interface Playback {
  result: ShotResult;
  /** Seconds since the strike. */
  t: number;
  /** The next frame and event to reach. */
  frame: number;
  event: number;
}

export interface Game {
  /** The cue ball first, then the rack; at rest between shots. */
  balls: Ball[];
  phase: Phase;
  timeLeft: number;
  /** Where the cue ball may be placed: the kitchen for the break. */
  area: "kitchen" | "table";
  /** The cue ball may still be moved before this shot. */
  ballInHand: boolean;
  playback: Playback | null;
  shots: number;
  fouls: number;
  /** The foul on the last shot, if any. */
  foul: Foul | null;
  events: GameEvent[];
}

const SOLIDS = [1, 2, 3, 4, 5, 6, 7];
const STRIPES = [9, 10, 11, 12, 13, 14, 15];

export function createGame(seed: number): Game {
  const random = seededRandom(seed);
  const [x, y] = headSpot();
  return {
    balls: [
      createBall(0, x, y),
      ...rack(rackOrder(random), random() * 2 ** 32),
    ],
    phase: "placing",
    timeLeft: TIME_LIMIT,
    area: "kitchen",
    ballInHand: true,
    playback: null,
    shots: 0,
    fouls: 0,
    foul: null,
    events: [],
  };
}

/** An 8-ball rack: the 8 in the middle, a solid and a stripe at the back. */
function rackOrder(random: () => number): number[] {
  const shuffled = (ids: number[]) => {
    const out = [...ids];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const [solid, ...solids] = shuffled(SOLIDS);
  const [stripe, ...stripes] = shuffled(STRIPES);
  const rest = shuffled([...solids, ...stripes]);
  const corners = random() < 0.5 ? [solid, stripe] : [stripe, solid];
  // Positions row by row from the apex; 4 is the middle, 10 and 14 the back
  // corners.
  const order: number[] = [];
  for (let i = 0; i < 15; i++) {
    if (i === 4) order.push(8);
    else if (i === 10) order.push(corners[0]);
    else if (i === 14) order.push(corners[1]);
    else order.push(rest.pop() ?? 0);
  }
  return order;
}

export function objectBallsLeft(game: Game): number {
  return game.balls.filter((b) => b.id !== 0 && b.motion !== "pocketed")
    .length;
}

/** Where the cue ball's center may go while placing it. */
export function placementBounds(game: Game) {
  const x = TABLE.length / 2 - CUSHION_REACH - 0.001;
  const y = TABLE.width / 2 - CUSHION_REACH - 0.001;
  return {
    minX: -x,
    maxX: game.area === "kitchen" ? -TABLE.length / 4 : x,
    minY: -y,
    maxY: y,
  };
}

/** Moves the cue ball toward (x, y), kept inside the allowed area. */
export function moveCueBall(game: Game, x: number, y: number): void {
  if (game.phase !== "placing") return;
  const b = placementBounds(game);
  const cue = game.balls[0];
  cue.x = Math.min(Math.max(x, b.minX), b.maxX);
  cue.y = Math.min(Math.max(y, b.minY), b.maxY);
}

/** Whether the cue ball is clear of every other ball where it is. */
export function canPlace(game: Game): boolean {
  const [cue, ...others] = game.balls;
  return others.every((b) =>
    b.motion === "pocketed" ||
    (b.x - cue.x) * (b.x - cue.x) + (b.y - cue.y) * (b.y - cue.y) >=
      4 * R * R
  );
}

export function placeCueBall(game: Game): boolean {
  if (game.phase !== "placing" || !canPlace(game)) return false;
  game.phase = "aiming";
  return true;
}

/** With ball in hand, the cue ball can be picked up again until the shot. */
export function pickUpCueBall(game: Game): void {
  if (game.phase === "aiming" && game.ballInHand) game.phase = "placing";
}

export function shoot(game: Game, shot: Shot): void {
  if (game.phase !== "aiming") return;
  const result = simulateShot(game.balls, shot);
  game.playback = { result, t: 0, frame: 0, event: 0 };
  game.phase = "rolling";
  game.ballInHand = false;
  game.shots++;
  game.events.push({ type: "strike", speed: shot.speed });
}

/**
 * Advances the game by `dt` seconds of real time. The clock runs while
 * placing, aiming and rolling; a shot that's rolling when it runs out still
 * finishes, and counts if it clears the table.
 */
export function tick(game: Game, dt: number): void {
  if (game.phase === "won" || game.phase === "lost") return;
  game.timeLeft -= dt;
  const playback = game.playback;
  if (playback) {
    playback.t += dt;
    const { events, frames, duration } = playback.result;
    while (
      playback.event < events.length && events[playback.event].t <= playback.t
    ) {
      game.events.push(events[playback.event++]);
    }
    while (
      playback.frame < frames.length - 1 &&
      frames[playback.frame + 1].t <= playback.t
    ) {
      playback.frame++;
    }
    if (playback.t >= duration) finishShot(game, playback.result);
  }
  // `finishShot` may have ended the game already.
  const playing = game.phase === "placing" || game.phase === "aiming";
  if (playing && game.timeLeft <= 0) {
    game.timeLeft = 0;
    game.phase = "lost";
    game.events.push({ type: "lost" });
  }
}

function finishShot(game: Game, result: ShotResult): void {
  game.balls = result.balls;
  game.playback = null;
  const { foul } = judge(result.events);
  game.foul = foul;
  if (foul) {
    game.fouls++;
    game.timeLeft -= FOUL_PENALTY;
    game.events.push({ type: "foul", foul });
  }
  if (objectBallsLeft(game) === 0) {
    game.timeLeft = Math.max(game.timeLeft, 0);
    game.phase = "won";
    game.events.push({ type: "won" });
  } else if (game.timeLeft <= 0) {
    game.phase = "aiming"; // `tick` ends the game
  } else if (foul) {
    if (game.balls[0].motion === "pocketed") respotCueBall(game);
    game.area = "table";
    game.ballInHand = true;
    game.phase = "placing";
  } else {
    game.phase = "aiming";
  }
}

/** Puts a potted cue ball back on the head spot, or the nearest free spot. */
function respotCueBall(game: Game): void {
  const [x, y] = headSpot();
  const cue = createBall(0, x, y);
  game.balls[0] = cue;
  for (let ring = 1; !canPlace(game); ring++) {
    // Try points on growing rings around the head spot.
    for (let k = 0; k < 8 * ring && !canPlace(game); k++) {
      const angle = (k / (8 * ring)) * 2 * Math.PI;
      cue.x = x + ring * 2 * R * Math.cos(angle);
      cue.y = y + ring * 2 * R * Math.sin(angle);
    }
  }
}

/** Where every ball is right now, following the shot being played back. */
export function poses(game: Game): Pose[] {
  const playback = game.playback;
  if (!playback) {
    return game.balls.map((b) => ({
      x: b.x,
      y: b.y,
      wx: b.wx,
      wy: b.wy,
      wz: b.wz,
      pocketed: b.motion === "pocketed",
    }));
  }
  const { frames } = playback.result;
  const a = frames[playback.frame];
  const b = frames[Math.min(playback.frame + 1, frames.length - 1)];
  const f = b.t > a.t ? Math.min((playback.t - a.t) / (b.t - a.t), 1) : 0;
  return a.balls.map((p, i) => {
    const q = b.balls[i];
    return {
      x: p.x + (q.x - p.x) * f,
      y: p.y + (q.y - p.y) * f,
      wx: p.wx + (q.wx - p.wx) * f,
      wy: p.wy + (q.wy - p.wy) * f,
      wz: p.wz + (q.wz - p.wz) * f,
      pocketed: p.pocketed,
    };
  });
}
