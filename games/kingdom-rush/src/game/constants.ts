/** Simulation constants taken from the original game's settings. */

import type { TowerType } from "../content/types.ts";

/** The original runs its logic at 30 frames per second; we simulate the same. */
export const TICK_RATE = 30;

/** Tower and soldier ranges are ellipses; height is this fraction of width. */
export const RANGE_RATIO = 0.7;

/** Selling a tower returns this share of what was spent on it. */
export const SELL_PERCENT = 0.6;

/** Frames a freshly built tower spends under construction. */
export const BUILD_TICKS = 30;

/** Frames between "no enemies left" and the victory screen. */
export const PRE_WIN_TICKS = 30;

/** Range ellipses are centred this many pixels above the tower's base. */
export const TOWER_Y_OFFSET = -10;

/** The next wave's flag appears this many ticks before it starts. */
export const WAVE_FLAG_LEAD = 50;

export const DIFFICULTY = {
  easy: { enemyHealth: 0.8, soldierHealth: 1.2 },
  normal: { enemyHealth: 1, soldierHealth: 1 },
  hard: { enemyHealth: 1.2, soldierHealth: 1 },
} as const;

/**
 * Charge timings per tower type. `shootTick` is the tick of the charge at
 * which the projectile leaves, as counted in each original tower class.
 */
export const TOWERS: Readonly<
  Record<TowerType, { charge: { ticks: number; shootTick: number } }>
> = {
  archer: { charge: { ticks: 8, shootTick: 7 } },
  mage: { charge: { ticks: 15, shootTick: 10 } },
  engineer: { charge: { ticks: 34, shootTick: 10 } },
  barracks: { charge: { ticks: 0, shootTick: 0 } },
};

/**
 * Soldier timing. The wind-up differs by tier: level-1 militia swing quickly,
 * every later barracks tier takes longer. Damage always lands on tick 5.
 */
export const SOLDIER = {
  speed: 2,
  damageAt: 5,
  idleTicks: 30,
} as const;

/** Frames of a soldier's swing before damage lands, by soldier level. */
export function soldierChargeTicks(level: number): number {
  return level <= 1 ? 11 : 20;
}
