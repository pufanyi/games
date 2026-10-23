// Seeded random numbers. The seed lives on the game state (`state.rng`) so the
// whole game stays deterministic and serializable.

export interface RngHolder {
  rng: number;
}

/** Advances `holder.rng` (mulberry32) and returns a float in [0, 1). */
export function random(holder: RngHolder): number {
  holder.rng = (holder.rng + 0x6d2b79f5) >>> 0;
  let t = holder.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [min, max], inclusive. */
export function randInt(holder: RngHolder, min: number, max: number): number {
  return min + Math.floor(random(holder) * (max - min + 1));
}

/** Float in [min, max). */
export function randFloat(holder: RngHolder, min: number, max: number): number {
  return min + random(holder) * (max - min);
}

/** True with probability `p`. */
export function chance(holder: RngHolder, p: number): boolean {
  return random(holder) < p;
}
