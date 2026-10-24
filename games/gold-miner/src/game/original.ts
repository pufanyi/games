// Numeric evidence recovered from the original 黄金矿工 SWF: clip timelines,
// stage mapping, and blast sizes. See ../CALIBRATION.md for how each value was
// measured. This module is pure data and helpers; it imports nothing.
//
// Original-stage units are converted with SCALE = 1.4 (550x400 -> 770x560
// inside the 800x600 world), and animation frames advance at 18 fps.

export const SCALE = 1.4;
/** The original movie's frame rate. */
export const FLASH_FPS = 18;
/** Original animation frames advanced per 60 Hz simulation tick. */
export const FRAME_STEP = FLASH_FPS / 60;
/** Original stage pixels -> world pixels. */
export const STAGE = { x: 275.5, y: 48.6, width: 550, height: 400 };

export function worldX(x: number): number {
  return 400 + (x - STAGE.x) * SCALE;
}

export function worldY(y: number): number {
  return 108 + (y - STAGE.y) * SCALE;
}

/**
 * Rotation of the swinging claw clip (sprite 289), in degrees, for frames
 * 3-86. Frame 86 is 0 degrees and loops back to frame 3. The world angle is
 * the negation: positive rotation in Flash moves the tip to the left.
 */
export const SWING_DEGREES: readonly number[] = [
  6,
  12.01,
  18.02,
  23.06,
  28.1,
  33.31,
  37.36,
  41.59,
  45.65,
  49.14,
  52.62,
  55.18,
  57.9,
  60.42,
  62.41,
  64.16,
  65.22,
  66.43,
  67.42,
  67.41,
  67.19,
  66.96,
  66.92,
  66.66,
  65.22,
  63.92,
  62.42,
  60.4,
  58.15,
  55.18,
  52.38,
  49.36,
  45.4,
  41.59,
  37.62,
  33.31,
  28.09,
  23.06,
  18.02,
  12.03,
  6.04,
  0.05,
  -5.56,
  -11.55,
  -17.55,
  -23.56,
  -28.33,
  -33.12,
  -38.09,
  -42.11,
  -46.13,
  -49.39,
  -52.66,
  -55.92,
  -58.43,
  -60.93,
  -62.69,
  -64.44,
  -66.16,
  -66.95,
  -67.71,
  -68.44,
  -68.42,
  -68.19,
  -67.95,
  -67.17,
  -66.16,
  -64.44,
  -62.69,
  -60.93,
  -58.43,
  -55.92,
  -52.66,
  -49.39,
  -46.13,
  -42.11,
  -38.09,
  -33.12,
  -28.33,
  -23.56,
  -17.56,
  -11.77,
  -5.79,
  0,
];

export const SWING_FIRST_FRAME = 3;
export const SWING_LAST_FRAME = 86;

/** Random start from the clip's frame-2 action: `random(82) + 1` after frame 2. */
export function randomSwingFrame(r: number): number {
  return SWING_FIRST_FRAME + r; // r in [0, 81] -> frames 3..84
}

/** Rotation in degrees at a fractional frame, interpolating between keys. */
export function swingDegrees(frame: number): number {
  // The clip shows frames 3-86 (84 keys), then jumps back to 3. Interpolate
  // across that one-frame jump so the motion stays continuous.
  const span = SWING_DEGREES.length;
  let offset = frame - SWING_FIRST_FRAME;
  offset = ((offset % span) + span) % span;
  const index = Math.floor(offset);
  const next = (index + 1) % span;
  const t = offset - index;
  return SWING_DEGREES[index] * (1 - t) + SWING_DEGREES[next] * t;
}

/** Local y of the extending claw (sprite 288), frame 2 = 12.45. */
export const EXTENSION_FIRST_FRAME = 2;
export const EXTENSION_LAST_FRAME = 42;
/** The `up42` label: the empty clip has pulled back slightly by this frame. */
export const EXTENSION_END_FRAME = 44;
const EXTENSION_START_Y = 12.45;
const EXTENSION_STEP_Y = 9.86;
const EXTENSION_PEAK_Y = EXTENSION_START_Y +
  (EXTENSION_LAST_FRAME - EXTENSION_FIRST_FRAME) * EXTENSION_STEP_Y;

export function extensionLocalY(frame: number): number {
  if (frame <= EXTENSION_LAST_FRAME) {
    const f = Math.max(EXTENSION_FIRST_FRAME, frame);
    return EXTENSION_START_Y + (f - EXTENSION_FIRST_FRAME) * EXTENSION_STEP_Y;
  }
  // Frames 42-44 retract a couple of pixels while the claw stays open.
  const t = Math.min(
    1,
    (frame - EXTENSION_LAST_FRAME) /
      (EXTENSION_END_FRAME - EXTENSION_LAST_FRAME),
  );
  return EXTENSION_PEAK_Y + (RETRACT_LABEL_Y[RETRACT_LABEL_Y.length - 1] -
        EXTENSION_PEAK_Y) * t;
}

/**
 * Retract key frames from the `upN` labels: the label reached when the claw
 * grabs during extension frame N. A grab jumps the rope to the matching label,
 * which can be slightly longer than the current extension (frames 2-4).
 */
const RETRACT_LABEL_FRAME: readonly number[] = [
  288, // up2
  285,
  273,
  264,
  254,
  247,
  243,
  239,
  236,
  232,
  226,
  220,
  215,
  209,
  204,
  198,
  192,
  186,
  180,
  172,
  164,
  157,
  151,
  144,
  137,
  131,
  126,
  120,
  114,
  108,
  103,
  98,
  92,
  86,
  80,
  73,
  67,
  61,
  55,
  49,
  44, // up42
];

const RETRACT_LABEL_Y: readonly number[] = [
  66.4,
  70.55,
  87.2,
  99.65,
  113.45,
  123.15,
  128.7,
  134.25,
  138.4,
  143.9,
  152.2,
  160.5,
  167.45,
  175.75,
  182.65,
  190.95,
  199.25,
  207.55,
  215.9,
  226.95,
  238,
  247.7,
  256,
  265.7,
  275.4,
  283.7,
  290.6,
  298.9,
  307.2,
  315.5,
  322.45,
  329.35,
  337.65,
  345.95,
  354.25,
  363.95,
  372.25,
  380.55,
  388.85,
  397.15,
  404.1,
];

/** The `upN` retract frame and local y for extension frame N (2..42). */
export function retractStart(extensionFrame: number): {
  frame: number;
  localY: number;
} {
  const n = Math.min(
    EXTENSION_LAST_FRAME,
    Math.max(EXTENSION_FIRST_FRAME, Math.round(extensionFrame)),
  );
  const index = n - EXTENSION_FIRST_FRAME;
  return { frame: RETRACT_LABEL_FRAME[index], localY: RETRACT_LABEL_Y[index] };
}

/** Payout starts when the retracting clip reaches this frame. */
export const PAYOUT_FRAME = 293;
/** Local y of the claw at payout (world length 83.3). */
export const PAYOUT_LOCAL_Y = 59.5;

/** Sorted retract key frames, including the delivery point. */
const RETRACT_POINTS: readonly { frame: number; y: number }[] = [
  ...RETRACT_LABEL_FRAME.map((frame, i) => ({ frame, y: RETRACT_LABEL_Y[i] }))
    .sort((a, b) => a.frame - b.frame),
  { frame: PAYOUT_FRAME, y: PAYOUT_LOCAL_Y },
];

/** Local y of the retracting claw at a fractional frame. */
export function retractLocalY(frame: number): number {
  const points = RETRACT_POINTS;
  if (frame <= points[0].frame) return points[0].y;
  const last = points[points.length - 1];
  if (frame >= last.frame) return last.y;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].frame <= frame) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  const t = (frame - a.frame) / (b.frame - a.frame);
  return a.y + (b.y - a.y) * t;
}

/** Timer clip: one second every 18 frames, 21 frames at ten seconds or less. */
export const TIMER_NORMAL_FRAMES = 18;
export const TIMER_LOW_FRAMES = 21;
export const TIMER_LOW_THRESHOLD = 10;

/** Bonus clip timings, in original frames after the payout clip starts. */
export const PAYOUT_TIMING = {
  /** Cash is added and the swing resets at frame 32 (30 frames after start). */
  cashMoney: 30,
  cashEnd: 32,
  /** An empty bag pays nothing and resets almost immediately. */
  emptyEnd: 1,
  /** A "power" bag grants temporary strength and clears at frame 56. */
  powerGrant: 34,
  powerEnd: 54,
  /** A "dynamite" bag adds a stick at frame 78 and clears at frame 79. */
  dynamiteStick: 76,
  dynamiteEnd: 77,
} as const;

/** Explosion boxes from the `box` child of the explosion clip. */
export const TNT_BLAST = {
  width: 193.45612189946698 * SCALE,
  height: 173.94929592115804 * SCALE,
};
export const DYNAMITE_BLAST = {
  width: 38.79 * SCALE,
  height: 34.88 * SCALE,
};
/** Frames from the explosion clip starting until its box tests for hits. */
export const BLAST_DELAY_FRAMES = 8;
/** The dynamite projectile homes at 50% of the remaining distance per frame. */
export const DYNAMITE_HOMING = 0.5;

/**
 * Animal patrol from sprites 316/318 inside containers 317/319. Body x in the
 * container is in original stage pixels; the container scales it by 0.596.
 */
export const ANIMAL = {
  scale: 0.596,
  startX: 3.5,
  leftEndX: -381.6,
  rightEndX: 4.45,
  leftSpeed: 4.894,
  rightSpeed: 4.6,
  /** Pauses at each turn: `random(20) + 1` frames. */
  turnMinFrames: 1,
  turnMaxFrames: 20,
} as const;

export function animalWorldX(
  anchorX: number,
  facing: 1 | -1,
  localX: number,
): number {
  return anchorX + facing * localX * ANIMAL.scale * SCALE;
}
