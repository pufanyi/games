// Single-player rules: clear all 15 balls before the clock runs out. Any ball
// in any pocket counts; there's no calling pockets and no 8-ball rules.

import type { ShotEvent } from "../physics/simulate.ts";

/** Seconds on the clock for the whole rack. */
export const TIME_LIMIT = 180;
/** Seconds a foul costs. */
export const FOUL_PENALTY = 10;

/** Potting the cue ball, or not hitting any ball with it. */
export type Foul = "scratch" | "miss";

export interface Judgement {
  /** Object balls potted on the shot; they count even on a foul. */
  potted: number[];
  foul: Foul | null;
}

export function judge(events: ShotEvent[]): Judgement {
  const potted: number[] = [];
  let scratch = false;
  let hit = false;
  for (const event of events) {
    if (event.type === "pocket") {
      if (event.ball === 0) scratch = true;
      else potted.push(event.ball);
    } else if (event.type === "ball" && (event.a === 0 || event.b === 0)) {
      hit = true;
    }
  }
  return { potted, foul: scratch ? "scratch" : hit ? null : "miss" };
}
