// Physical constants in SI units (meters, kilograms, seconds, radians). Values
// are pooltool's defaults and Dr. Dave Alciatore's measurements (see
// DESIGN.md); tune them by playing.

export const GRAVITY = 9.81;

/** A standard ball: 2.25 in across, 6 oz. */
export const BALL_RADIUS = 0.028575;
export const BALL_MASS = 0.17;
/** A solid sphere's moment of inertia. */
export const BALL_INERTIA = 0.4 * BALL_MASS * BALL_RADIUS * BALL_RADIUS;

/** Cloth friction while the ball's contact point slips. */
export const SLIDING_FRICTION = 0.2;
/** Cloth resistance once the ball rolls without slipping. */
export const ROLLING_FRICTION = 0.01;
/** How fast spin about the vertical axis dies away, in rad/s². */
export const SPIN_DECELERATION = 10.9;

export const BALL_RESTITUTION = 0.95;
/**
 * Ball–ball friction, which causes throw, falls as the surfaces slip faster:
 * `a + b·e^(−c·slip)` with slip in m/s (Alciatore's fit to measurements).
 */
export const BALL_FRICTION = { a: 9.951e-3, b: 0.108, c: 1.088 };

/**
 * Before friction at the nose: topspin adds rebound, so a rolling ball hit
 * straight in comes back at about 0.85 of its speed.
 */
export const CUSHION_RESTITUTION = 0.75;
export const CUSHION_FRICTION = 0.2;
/** The cushion nose is above the ball's center, so hits change its spin. */
export const CUSHION_HEIGHT = 0.635 * 2 * BALL_RADIUS;

export const CUE_MASS = 0.567;
/** How springy the leather tip is; sets ball speed for a given cue speed. */
export const CUE_TIP_RESTITUTION = 0.75;
/**
 * The mass at the cue's tip end that the ball pushes aside when hit off
 * center. Lighter means less squirt; ~8 g is a standard shaft.
 */
export const CUE_END_MASS = 0.008;
/** The fastest stroke a player can make, about a hard break. */
export const MAX_CUE_SPEED = 9;
/** Tip offsets past this fraction of the ball's radius miscue. */
export const MISCUE_LIMIT = 0.5;
/** sin of the steepest cue elevation allowed (70°): a full massé. */
export const MAX_ELEVATION_SIN = 0.9397;
