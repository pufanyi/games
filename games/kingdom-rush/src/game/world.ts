import type { LevelDefinition, Vec } from "../content/types.ts";
import { createLanes } from "./lane.ts";
import { createRng } from "./rng.ts";
import { createTower, towerStats } from "./tower.ts";
import type { Difficulty, GameMode, TowerSlot, World } from "./types.ts";
import { countWaveGroups } from "./waves.ts";

export interface WorldOptions {
  level: LevelDefinition;
  mode: GameMode;
  difficulty: Difficulty;
  /** Replays the same random rolls; defaults to a level/mode-specific seed. */
  seed?: number;
}

/** Data stores preset levels as `level_3`; content keys use `level3`. */
function normalizeTier(tier: string): string {
  const match = /^level_(\d+)$/.exec(tier);
  return match ? `level${match[1]}` : tier;
}

/**
 * A mode's 0 unlocks the original's account upgrades. Without meta progression
 * the level's `unlockLevels` value stands in; it too can be 0 (unavailable).
 */
function resolveCap(raw: number | null, fallback: number): number {
  if (raw === null) return fallback;
  return raw === 0 ? fallback : raw;
}

function defaultSeed(levelId: number, mode: GameMode): number {
  const modePart = mode === "campaign" ? 1 : mode === "heroic" ? 2 : 3;
  return levelId * 7919 + modePart * 104729;
}

export function createWorld(options: WorldOptions): World {
  const { level, mode, difficulty } = options;
  const modeData = level.modes[mode] ?? level.modes.campaign;
  const lanes = createLanes(level.lanes);

  const world: World = {
    level,
    levelId: level.id,
    mode,
    difficulty,
    rng: createRng(options.seed ?? defaultSeed(level.id, mode)),
    tick: 0,
    lives: modeData.lives,
    maxLives: modeData.lives,
    cash: modeData.cash,
    status: "playing",
    lanes,
    slots: [],
    towers: [],
    enemies: [],
    soldiers: [],
    projectiles: [],
    effects: [],
    activeWaves: [],
    waveIndex: 0,
    waveCounter: 0,
    waveNumber: 0,
    totalWaves: countWaveGroups(modeData.waves),
    waitingForStart: true,
    preWinTicks: 0,
    nextId: 1,
    stats: { kills: 0, leaked: 0, earned: 0 },
    powers: { lightning: 0, fireball: 0, reinforcements: 0 },
    available: {
      fireball: modeData.fireball,
      reinforcements: modeData.reinforcements,
    },
    modeData,
    speed: 1,
    unlockCaps: {
      archer: resolveCap(modeData.unlocks.archers, level.unlockLevels.archers),
      mage: resolveCap(modeData.unlocks.mages, level.unlockLevels.mages),
      engineer: resolveCap(
        modeData.unlocks.engineers,
        level.unlockLevels.engineers,
      ),
      barracks: resolveCap(
        modeData.unlocks.barracks,
        level.unlockLevels.barracks,
      ),
    },
  };

  for (const definition of modeData.towers) {
    const slot: TowerSlot = {
      id: world.nextId++,
      x: definition.x,
      y: definition.y,
      rally: definition.rally
        ? { x: definition.rally[0], y: definition.rally[1] }
        : null,
      tower: null,
    };
    world.slots.push(slot);
    if (definition.prebuilt) {
      const tier = normalizeTier(definition.prebuilt.tier);
      const stats = towerStats(definition.prebuilt.type, tier);
      if (stats) createTower(world, slot, definition.prebuilt.type, tier, true);
    }
  }

  return world;
}

/** Closest buildable slot to a click, for pointer input. */
export function slotAt(
  world: World,
  point: Vec,
  radius = 26,
): TowerSlot | null {
  let best: TowerSlot | null = null;
  let bestDistance = radius;
  for (const slot of world.slots) {
    const distance = Math.hypot(slot.x - point.x, slot.y - point.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = slot;
    }
  }
  return best;
}

export function towerAt(world: World, point: Vec, radius = 30) {
  let best = null;
  let bestDistance = radius;
  for (const tower of world.towers) {
    const distance = Math.hypot(tower.x - point.x, tower.y - point.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = tower;
    }
  }
  return best;
}
