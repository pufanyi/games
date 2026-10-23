// Internal pixels and seconds. Calibration evidence: ../../CALIBRATION.md.
export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;
export const LEVEL_SECONDS = 60;
/** Where the rope leaves the winch. */
export const PIVOT_Y = 108;

export const SWING_LIMIT = (70 * Math.PI) / 180;
export const SWING_SPEED = 1.9; // rad/s
export const REST_LENGTH = 28;
export const EXTEND_SPEED = 380; // px/s
export const RETRACT_SPEED = 560; // px/s with nothing attached
export const STRENGTH_MULTIPLIER = 2.5;
export const CLAW_RADIUS = 8;
export const EXPLOSION_RADIUS = 110;

export const DYNAMITE_RADIUS = 50;

export const WIDTH = 800;
export const HEIGHT = 600;
/** Top of the dirt; the miner stands here. */
export const GROUND_Y = 120;
/** Items are placed below this line, leaving room for the swinging claw. */
export const MINE_TOP = 165;

// These distributions approximate historical descriptions, not original code.
export const BAG_REWARDS = {
  dynamiteChance: 0.2,
  strengthChance: 0.15,
  cashMin: 2,
  cashMax: 800,
  luckyCashMin: 700,
  luckyCashMax: 800,
};
export const BAG_WEIGHTS = [1.4, 5, 10, 20];
