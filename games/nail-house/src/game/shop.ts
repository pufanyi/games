import { DEFENDERS } from "./catalog.ts";
import { CARD_MAX_LEVEL, MAX_DEFENDERS } from "./config.ts";
import type { DefenderId, GameState } from "./types.ts";

export interface CardState {
  deployed: boolean;
  level: number;
  cost: number;
  affordable: boolean;
  maxed: boolean;
  blocked: boolean;
}

export function cardState(state: GameState, type: DefenderId): CardState {
  const defender = state.defenders.find((member) => member.type === type);
  const level = defender?.level ?? 0;
  const maxed = level >= CARD_MAX_LEVEL;
  const blocked = !defender && state.defenders.length >= MAX_DEFENDERS;
  const cost = DEFENDERS[type].cost[Math.min(level, CARD_MAX_LEVEL - 1)];
  return {
    deployed: defender !== undefined,
    level,
    cost,
    affordable: !maxed && !blocked && state.money >= cost,
    maxed,
    blocked,
  };
}

/** One card per family member: its next purchase upgrades the same defender. */
export function purchase(state: GameState, type: DefenderId): boolean {
  if (state.phase !== "playing") return false;
  const card = cardState(state, type);
  if (!card.affordable) {
    state.events.push("error");
    return false;
  }
  state.money -= card.cost;
  const defender = state.defenders.find((member) => member.type === type);
  if (defender) {
    defender.level++;
    defender.anim = DEFENDERS[type].attackTicks;
    state.events.push("upgrade", "click");
  } else {
    state.defenders.push({
      id: state.nextId++,
      type,
      level: 1,
      slot: state.defenders.length,
      cooldown: 0,
      targetId: null,
      anim: 0,
    });
    state.events.push("deploy", "click");
  }
  return true;
}
