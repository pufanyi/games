// Everything outside the game rules that the loop, the input handlers and the
// screens share: which screen is up, pause, the shot being lined up, and the
// best time. Plain TS so pointer moves and frames can change it without
// involving React; the screens get a small `View` of it instead.
import { play, setMuted, unlock } from "./audio.ts";
import {
  createGame,
  type Game,
  moveCueBall,
  objectBallsLeft,
  pickUpCueBall,
  placeCueBall,
  shoot,
  tick,
} from "../game/game.ts";
import { MAX_CUE_SPEED, MISCUE_LIMIT } from "../physics/constants.ts";
import type { Foul } from "../rules/timed.ts";
import {
  type Best,
  loadBest,
  loadMuted,
  saveBest,
  saveMuted,
} from "./storage.ts";

/** The steepest the player can raise the cue, in degrees. */
export const MAX_ELEVATION = 60;
/** Seconds from zero to full strength; full charge holds until release. */
export const CHARGE_SECONDS = 1.5;
export type ChargeSource = "keyboard" | "pointer" | "table";

export interface Session {
  /** "title" shows a racked table behind the title screen. */
  mode: "title" | "game";
  paused: boolean;
  muted: boolean;
  game: Game;
  /** Aim direction in radians, counterclockwise from +x (toward the foot). */
  aim: number;
  /** 0–1; the cue speed rises with its square, for finer soft shots. */
  power: number;
  charge: ChargeSource | null;
  /** Dragging or charging pulls the rendered cue back. */
  pulling: boolean;
  /** Where the tip hits, as fractions of the ball's radius: [right, up]. */
  tip: [number, number];
  /** Cue elevation in degrees. */
  elevation: number;
  best: Best | null;
  newBest: boolean;
}

/** What the React screens show. Changes rarely, unlike the session. */
export interface View {
  mode: Session["mode"];
  paused: boolean;
  muted: boolean;
  phase: Game["phase"];
  area: Game["area"];
  ballInHand: boolean;
  /** Whole seconds, rounded up, so the view changes once a second. */
  seconds: number;
  ballsLeft: number;
  potted: number[];
  shots: number;
  fouls: number;
  foul: Foul | null;
  power: number;
  charging: boolean;
  tip: [number, number];
  elevation: number;
  best: Best | null;
  newBest: boolean;
}

function newSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

export function createSession(): Session {
  const muted = loadMuted();
  setMuted(muted);
  return {
    mode: "title",
    paused: false,
    muted,
    game: createGame(newSeed()),
    aim: 0,
    power: 0.5,
    pulling: false,
    charge: null,
    tip: [0, 0],
    elevation: 0,
    best: loadBest(),
    newBest: false,
  };
}

export function viewOf(s: Session): View {
  const { game } = s;
  return {
    mode: s.mode,
    paused: s.paused,
    muted: s.muted,
    phase: game.phase,
    area: game.area,
    ballInHand: game.ballInHand,
    seconds: Math.ceil(game.timeLeft),
    ballsLeft: objectBallsLeft(game),
    potted: game.balls.filter((b) => b.id > 0 && b.motion === "pocketed").map((
      b,
    ) => b.id),
    shots: game.shots,
    fouls: game.fouls,
    foul: game.foul,
    power: Math.round(s.power * 100) / 100,
    charging: s.charge !== null,
    tip: s.tip,
    elevation: s.elevation,
    best: s.best,
    newBest: s.newBest,
  };
}

export function sameView(a: View, b: View): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Whether the player can act on the table now. */
export function isActive(s: Session): boolean {
  return s.mode === "game" && !s.paused;
}

export function start(s: Session) {
  unlock();
  s.game = createGame(newSeed());
  s.mode = "game";
  s.paused = false;
  s.newBest = false;
  s.aim = 0;
  s.power = 0.8;
  resetCue(s);
}

export function quitToTitle(s: Session) {
  cancelCharge(s);
  s.game = createGame(newSeed());
  s.mode = "title";
  s.paused = false;
}

/** Pausing applies while a game is on. */
export function setPaused(s: Session, paused: boolean) {
  const over = s.game.phase === "won" || s.game.phase === "lost";
  if (paused) cancelCharge(s);
  if (s.mode === "game" && !over) s.paused = paused;
}

export function toggleMuted(s: Session) {
  unlock();
  s.muted = !s.muted;
  setMuted(s.muted);
  saveMuted(s.muted);
}

/** Aims the cue ball at a point on the table. */
export function aimAt(s: Session, x: number, y: number) {
  if (s.charge) return;
  const cue = s.game.balls[0];
  if (x === cue.x && y === cue.y) return;
  s.aim = Math.atan2(y - cue.y, x - cue.x);
}

export function turnAim(s: Session, radians: number) {
  if (!s.charge) s.aim += radians;
}

export function setPower(s: Session, power: number) {
  if (!s.charge) s.power = Math.min(Math.max(power, 0), 1);
}

export function setPulling(s: Session, pulling: boolean) {
  if (!s.charge) s.pulling = pulling;
}

/** A single input owns the charge; another input cannot release its shot. */
export function beginCharge(s: Session, source: ChargeSource) {
  if (!isActive(s) || s.game.phase !== "aiming" || s.charge || s.pulling) {
    return;
  }
  s.charge = source;
  s.power = 0;
  s.pulling = true;
}

export function releaseCharge(s: Session, source: ChargeSource) {
  if (s.charge !== source) return;
  s.charge = null;
  shootNow(s);
}

export function cancelCharge(s: Session) {
  s.charge = null;
  s.pulling = false;
}

/** Sets the tip offset, kept inside the miscue limit. */
export function setTip(s: Session, right: number, up: number) {
  if (s.charge) return;
  const r = Math.sqrt(right * right + up * up);
  const k = r > MISCUE_LIMIT ? MISCUE_LIMIT / r : 1;
  s.tip = [right * k, up * k];
}

export function setElevation(s: Session, degrees: number) {
  if (s.charge) return;
  s.elevation = Math.min(Math.max(degrees, 0), MAX_ELEVATION);
}

function resetCue(s: Session) {
  cancelCharge(s);
  s.tip = [0, 0];
  s.elevation = 0;
  s.pulling = false;
}

export function moveCue(s: Session, x: number, y: number) {
  if (isActive(s)) moveCueBall(s.game, x, y);
}

export function place(s: Session) {
  if (isActive(s)) placeCueBall(s.game);
}

export function pickUp(s: Session) {
  if (isActive(s) && !s.charge) pickUpCueBall(s.game);
}

/** Shoots with the current aim, power, spin and elevation. */
export function shootNow(s: Session) {
  if (s.charge) return;
  s.pulling = false;
  if (!isActive(s) || s.game.phase !== "aiming" || s.power < 0.02) return;
  const e = (s.elevation * Math.PI) / 180;
  shoot(s.game, {
    cue: [
      Math.cos(e) * Math.cos(s.aim),
      Math.cos(e) * Math.sin(s.aim),
      -Math.sin(e),
    ],
    speed: MAX_CUE_SPEED * s.power * s.power,
    tip: [...s.tip],
  });
  // Each shot starts from a center hit with a level cue, as in the originals.
  resetCue(s);
}

/** Advances by `dt` seconds of real time, with the sound around it. */
export function update(s: Session, dt: number) {
  if (!isActive(s)) return;
  if (s.charge) {
    s.power = Math.min(1, s.power + Math.max(0, dt) / CHARGE_SECONDS);
  }
  const before = s.game.phase;
  tick(s.game, dt);
  if (s.game.phase !== "aiming") cancelCharge(s);
  // Including the strike, which `shoot` queued between frames.
  for (const event of s.game.events) play(event);
  s.game.events = [];
  if (before !== "won" && s.game.phase === "won") recordBest(s);
}

function recordBest(s: Session) {
  const result = { timeLeft: s.game.timeLeft, shots: s.game.shots };
  const best = s.best;
  const better = !best || result.timeLeft > best.timeLeft;
  if (better) {
    s.best = result;
    s.newBest = true;
    saveBest(result);
  }
}
