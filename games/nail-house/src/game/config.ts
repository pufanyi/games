export const WIDTH = 660;
export const HEIGHT = 500;

export const TICK_RATE = 30;
export const DT = 1 / TICK_RATE;

export const MAX_HP = 100;
export const START_MONEY = 100;
export const MAX_DEFENDERS = 4;
export const MAX_LEVEL = 7;

/** The four window slots inside the house. */
export const SLOT_X = 90;
export const SLOT_YS = [109.5, 170.75, 228.9, 301.9] as const;

/**
 * Enemies spawn just off the right edge and walk to the house.
 */
export const ENEMY_SPAWN_X = 680;
export const ENEMY_TARGET_X = 120;
export const ENEMY_TARGET_Y = 355;
export const ENEMY_SPAWN_Y_MIN = 200;
export const ENEMY_SPAWN_Y_MAX = 440;
export const ENEMY_ATTACK_CD = 30;

/** The little vine at the foot of the house heals 1 HP every ten taps. */
export const LEAF = {
  x: 48,
  y: 372,
  radius: 18,
  clicksForHeal: 10,
} as const;
