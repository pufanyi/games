import type { Offer } from "../game/shop.ts";
// Everything outside the simulation that the game loop and the screens share:
// which screen is up, pause, queued inputs, and the best score. Plain TS so the
// loop can change it 60 times a second without involving React; the screens
// get a small `View` of it instead.
import { play, setMuted, unlock } from "./audio.ts";
import { goalFor } from "../game/level.ts";
import { createGame, type GameState, type Input, step } from "../game/sim.ts";
import {
  type Best,
  loadBest,
  loadMuted,
  saveBest,
  saveMuted,
} from "./storage.ts";

export interface Session {
  /** "title" runs a demo game behind the title screen. */
  mode: "title" | "game";
  paused: boolean;
  muted: boolean;
  game: GameState;
  queued: Input[];
  best: Best | null;
  /** The game that just ended set a new best. */
  newBest: boolean;
}

/** What the React screens show. Changes rarely, unlike the game state. */
export interface View {
  mode: Session["mode"];
  paused: boolean;
  muted: boolean;
  phase: GameState["phase"];
  level: number;
  money: number;
  goal: number;
  nextGoal: number;
  sticks: number;
  /** Up only works while the claw is reeling something in. */
  canDynamite: boolean;
  offers: Offer[];
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
    queued: [],
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
    level: game.level,
    money: game.money,
    goal: game.goal,
    nextGoal: goalFor(game.level + 1),
    sticks: game.sticks,
    canDynamite: game.sticks > 0 &&
      game.players[0]?.claw.state === "retract",
    offers: game.shop?.offers.map((offer) => ({ ...offer })) ?? [],
    best: s.best,
    newBest: s.newBest,
  };
}

export function sameView(a: View, b: View): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function isPlaying(s: Session): boolean {
  return s.mode === "game" && !s.paused && s.game.phase === "playing";
}

export function queue(s: Session, input: Input) {
  if (s.mode === "game" && !s.paused) s.queued.push(input);
}

export function start(s: Session) {
  unlock();
  s.game = createGame(newSeed());
  s.mode = "game";
  s.paused = false;
  s.newBest = false;
  s.queued = [];
}

export function quitToTitle(s: Session) {
  s.game = createGame(newSeed());
  s.mode = "title";
  s.paused = false;
}

/** Pausing only applies while a level is being played. */
export function setPaused(s: Session, paused: boolean) {
  if (s.mode === "game" && s.game.phase === "playing") s.paused = paused;
}

export function toggleMuted(s: Session) {
  unlock();
  s.muted = !s.muted;
  setMuted(s.muted);
  saveMuted(s.muted);
}

/** One fixed simulation tick, plus the sound and scoring around it. */
export function tick(s: Session) {
  if (s.mode === "title") {
    // The demo miner fires every couple of seconds.
    const fire = s.game.tick % 150 === 60;
    step(s.game, fire ? [{ player: 0, action: "fire" }] : []);
    if (s.game.phase !== "playing") s.game = createGame(newSeed());
    return;
  }
  if (s.paused) return;
  const before = s.game.phase;
  step(s.game, s.queued);
  s.queued = [];
  for (const event of s.game.events) play(event.type);
  if (before !== "gameOver" && s.game.phase === "gameOver") recordBest(s);
}

function recordBest(s: Session) {
  const result = { level: s.game.level, money: s.game.money };
  const best = s.best;
  const better = !best || result.level > best.level ||
    (result.level === best.level && result.money > best.money);
  if (better) {
    s.best = result;
    s.newBest = true;
    saveBest(result);
  }
}
