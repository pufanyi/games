// Session state shared by the loop, the canvas, and the React screens. React
// only sees a small `View` that changes on transitions, never every tick.
import { CARD_ORDER, DEFENDERS } from "../game/catalog.ts";
import { MAX_LEVEL } from "../game/config.ts";
import { levelSpec } from "../game/levels.ts";
import { randomSeed } from "../game/rng.ts";
import {
  cardState,
  createGame,
  purchase,
  step,
  tapLeaf as tapVine,
} from "../game/sim.ts";
import type { DefenderId, GameState } from "../game/types.ts";
import { play, setMuted, unlock } from "./audio.ts";
import { loadMuted, loadUnlocked, saveMuted, saveUnlocked } from "./storage.ts";

export type Screen = "title" | "levels" | "game";

export interface Session {
  screen: Screen;
  paused: boolean;
  muted: boolean;
  unlocked: number;
  game: GameState;
  /** The last win unlocked a new stage. */
  newUnlock: boolean;
  /** The result of the current game has already been recorded. */
  scored: boolean;
}

export interface CardView {
  type: DefenderId;
  name: string;
  role: string;
  level: number;
  cost: number;
  deployed: boolean;
  affordable: boolean;
  maxed: boolean;
  blocked: boolean;
}

export interface View {
  screen: Screen;
  paused: boolean;
  muted: boolean;
  phase: GameState["phase"];
  level: number;
  levelName: string;
  survival: boolean;
  hp: number;
  money: number;
  unlocked: number;
  kills: number;
  spawns: number;
  total: number;
  seconds: number;
  newUnlock: boolean;
  leafClicks: number;
  leafNeeded: number;
  cards: CardView[];
}

export function createSession(): Session {
  const muted = loadMuted();
  setMuted(muted);
  return {
    screen: "title",
    paused: false,
    muted,
    unlocked: loadUnlocked(),
    game: createGame(1, randomSeed()),
    newUnlock: false,
    scored: false,
  };
}

export function viewOf(session: Session): View {
  const { game } = session;
  const spec = levelSpec(game.level);
  return {
    screen: session.screen,
    paused: session.paused,
    muted: session.muted,
    phase: game.phase,
    level: game.level,
    levelName: spec.name,
    survival: game.survival,
    hp: game.hp,
    money: game.money,
    unlocked: session.unlocked,
    kills: game.kills,
    spawns: game.spawns,
    total: game.waves.reduce((sum, wave) => sum + wave.count, 0),
    seconds: Math.floor(game.tick / 30),
    newUnlock: session.newUnlock,
    leafClicks: game.leafClicks,
    leafNeeded: 10,
    cards: CARD_ORDER.map((type) => {
      const def = DEFENDERS[type];
      const card = cardState(game, type);
      return {
        type,
        name: def.name,
        role: def.role,
        level: card.level,
        cost: card.cost,
        deployed: card.deployed,
        affordable: card.affordable,
        maxed: card.maxed,
        blocked: card.blocked,
      };
    }),
  };
}

export function sameView(a: View, b: View): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function isPlaying(session: Session): boolean {
  return session.screen === "game" && !session.paused &&
    session.game.phase === "playing";
}

export function startLevel(session: Session, level: number): void {
  if (level < 1 || level > session.unlocked) return;
  unlock();
  session.game = createGame(level, randomSeed());
  session.screen = "game";
  session.paused = false;
  session.newUnlock = false;
  session.scored = false;
  play("click");
}

export function retry(session: Session): void {
  startLevel(session, session.game.level);
}

export function nextLevel(session: Session): void {
  const next = session.game.level + 1;
  if (next <= session.unlocked && next <= MAX_LEVEL) {
    startLevel(session, next);
    return;
  }
  openLevels(session);
}

export function openLevels(session: Session): void {
  session.screen = "levels";
  session.paused = false;
  play("click");
}

export function openTitle(session: Session): void {
  session.screen = "title";
  session.paused = false;
  play("click");
}

export function setPaused(session: Session, paused: boolean): void {
  if (session.screen !== "game" || session.game.phase !== "playing") return;
  session.paused = paused;
}

export function toggleMuted(session: Session): void {
  unlock();
  session.muted = !session.muted;
  setMuted(session.muted);
  saveMuted(session.muted);
}

export function buyCard(session: Session, type: DefenderId): void {
  if (!isPlaying(session)) return;
  purchase(session.game, type);
}

export function tapLeaf(session: Session): void {
  if (!isPlaying(session)) return;
  tapVine(session.game);
}

/** One fixed simulation tick plus sound and progress bookkeeping. */
export function tick(session: Session): void {
  if (session.screen !== "game" || session.paused) return;
  if (session.game.phase === "playing") step(session.game);
  for (const event of session.game.events) play(event);
  session.game.events = [];

  if (session.game.phase === "won" && !session.scored) {
    session.scored = true;
    if (
      session.game.level === session.unlocked &&
      session.unlocked < MAX_LEVEL
    ) {
      session.unlocked++;
      saveUnlocked(session.unlocked);
      session.newUnlock = true;
    }
  }
  if (session.game.phase === "lost") session.scored = true;
}
