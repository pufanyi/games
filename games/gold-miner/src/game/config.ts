// Runtime tuning derived from the original SWF measurements. Raw evidence and
// helpers live in original.ts; the numbers below are the units the simulation
// uses (world pixels, 60 Hz ticks, original animation frames).
import { FRAME_STEP, SCALE } from "./original.ts";

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;
export { FRAME_STEP, SCALE };

export const WIDTH = 800;
export const HEIGHT = 600;

/** Where the rope leaves the winch (original stage 275.5, 48.6). */
export const PIVOT_X = 400;
export const PIVOT_Y = 108;
/** Top of the dirt: original stage y 68. */
export const GROUND_Y = 135.16;

export const LEVEL_SECONDS = 60;

/** Rope at rest: sprite 288 frame 1-2 local y 12.45. */
export const REST_LENGTH = 12.45 * SCALE;
/** Full extension: sprite 288 frame 42 local y 406.85. */
export const MAX_LENGTH = 406.85 * SCALE;
/** How much rope is out when the payout animation starts. */
export const PAYOUT_LENGTH = 59.5 * SCALE;

/** The claw's hit box, before the rotated clip's AABB grows it. */
export const CLAW_BOX = 12.4 * SCALE;
