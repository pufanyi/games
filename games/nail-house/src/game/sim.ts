import { stepCombat } from "./combat.ts";
import { LEAF, MAX_HP, START_MONEY, TICK_RATE } from "./config.ts";
import { addFloater, ageEffects } from "./effects.ts";
import { levelSpec } from "./levels.ts";
import type { GameState, WaveState } from "./types.ts";
import { spawnWaves } from "./waves.ts";

/** Leave a beat for the final hit before showing the result. */
const WIN_DELAY = TICK_RATE;

export function createGame(level: number): GameState {
  const spec = levelSpec(level);
  const waves: WaveState[] = spec.waves.map((wave) => ({
    ...wave,
    remaining: wave.count,
    cd: 0,
  }));
  return {
    level: spec.level,
    survival: spec.survival,
    tick: 0,
    phase: "playing",
    hp: MAX_HP,
    money: START_MONEY,
    defenders: [],
    enemies: [],
    projectiles: [],
    fires: [],
    rings: [],
    floaters: [],
    waves,
    spawns: 0,
    kills: 0,
    shake: 0,
    leafClicks: 0,
    leafFlash: 0,
    winCountdown: -1,
    nextId: 1,
    events: [],
  };
}

export function tapLeaf(state: GameState): void {
  if (state.phase !== "playing") return;
  state.leafFlash = 12;
  state.leafClicks++;
  if (state.leafClicks < LEAF.clicksForHeal) {
    state.events.push("click");
    return;
  }
  state.leafClicks = 0;
  if (state.hp >= MAX_HP) return;
  state.hp++;
  state.events.push("heal");
  addFloater(state, LEAF.x + 22, LEAF.y - 16, "+1 HP", "#a8e063", 15);
}

export function step(state: GameState): void {
  state.events.length = 0;
  if (state.phase !== "playing") return;
  state.tick++;
  if (state.shake > 0) state.shake--;
  if (state.leafFlash > 0) state.leafFlash--;

  stepCombat(state);
  spawnWaves(state);
  ageEffects(state);
  checkEnd(state);
}

function checkEnd(state: GameState): void {
  if (state.hp <= 0) {
    state.phase = "lost";
    state.events.push("lose");
    return;
  }
  if (state.survival) return;
  const alive = state.enemies.some((enemy) => enemy.alive);
  const pending = state.waves.some((wave) => wave.remaining > 0);
  if (alive || pending || state.spawns === 0) return;
  if (state.winCountdown < 0) {
    state.winCountdown = WIN_DELAY;
    return;
  }
  state.winCountdown--;
  if (state.winCountdown > 0) return;
  state.phase = "won";
  state.events.push("win");
}
