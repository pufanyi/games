import type { WaveSpec } from "./types.ts";

export interface LevelSpec {
  level: number;
  name: string;
  blurb: string;
  survival: boolean;
  waves: readonly WaveSpec[];
}

/**
 * Wave tables from `src/Game.as`. `interval` shrinks by one tick after every
 * spawn until it reaches `min`, which is why later waves arrive faster than
 * their starting interval. The seventh level is the original's endless
 * survival mode: 999 of every enemy type.
 */
export const LEVELS: readonly LevelSpec[] = [
  {
    level: 1,
    name: "First Stand",
    blurb: "A few knives and a sledge. Learn the wall.",
    survival: false,
    waves: [
      { enemy: "grunt", startTime: 0, interval: 150, min: 100, count: 20 },
      { enemy: "brute", startTime: 1900, interval: 200, min: 100, count: 5 },
    ],
  },
  {
    level: 2,
    name: "More Muscle",
    blurb: "Shovels join the crew. Spread your family out.",
    survival: false,
    waves: [
      { enemy: "grunt", startTime: 0, interval: 120, min: 100, count: 35 },
      { enemy: "brute", startTime: 1200, interval: 150, min: 100, count: 20 },
      { enemy: "worker", startTime: 3200, interval: 200, min: 100, count: 5 },
    ],
  },
  {
    level: 3,
    name: "Three Fronts",
    blurb: "Bikes are fast. The wrecking ball is not far behind.",
    survival: false,
    waves: [
      { enemy: "grunt", startTime: 0, interval: 120, min: 100, count: 16 },
      { enemy: "brute", startTime: 1000, interval: 140, min: 100, count: 16 },
      { enemy: "worker", startTime: 1900, interval: 170, min: 120, count: 8 },
      { enemy: "biker", startTime: 3000, interval: 210, min: 150, count: 2 },
    ],
  },
  {
    level: 4,
    name: "Rush Hour",
    blurb: "Crates on wheels and the first jackhammer.",
    survival: false,
    waves: [
      { enemy: "grunt", startTime: 0, interval: 110, min: 90, count: 66 },
      { enemy: "brute", startTime: 1200, interval: 150, min: 120, count: 36 },
      { enemy: "worker", startTime: 3200, interval: 170, min: 140, count: 16 },
      { enemy: "biker", startTime: 4100, interval: 410, min: 180, count: 6 },
      { enemy: "breaker", startTime: 5000, interval: 510, min: 180, count: 2 },
    ],
  },
  {
    level: 5,
    name: "Heavy Equipment",
    blurb: "A wrecking ball enters the pit.",
    survival: false,
    waves: [
      { enemy: "grunt", startTime: 0, interval: 110, min: 70, count: 90 },
      { enemy: "brute", startTime: 1200, interval: 150, min: 100, count: 46 },
      { enemy: "worker", startTime: 3200, interval: 170, min: 140, count: 26 },
      { enemy: "biker", startTime: 4800, interval: 350, min: 180, count: 6 },
      { enemy: "breaker", startTime: 5500, interval: 410, min: 180, count: 3 },
      {
        enemy: "excavator",
        startTime: 6600,
        interval: 510,
        min: 180,
        count: 1,
      },
    ],
  },
  {
    level: 6,
    name: "The Long Siege",
    blurb: "Eight wrecking balls. One house.",
    survival: false,
    waves: [
      { enemy: "grunt", startTime: 0, interval: 80, min: 60, count: 165 },
      { enemy: "brute", startTime: 1400, interval: 150, min: 90, count: 78 },
      { enemy: "worker", startTime: 3200, interval: 180, min: 120, count: 45 },
      { enemy: "biker", startTime: 4800, interval: 270, min: 140, count: 22 },
      { enemy: "breaker", startTime: 5500, interval: 370, min: 180, count: 12 },
      {
        enemy: "excavator",
        startTime: 6600,
        interval: 450,
        min: 180,
        count: 8,
      },
    ],
  },
  {
    level: 7,
    name: "Final Stand",
    blurb: "Survival mode. How long can the house hold?",
    survival: true,
    waves: [
      { enemy: "grunt", startTime: 0, interval: 120, min: 30, count: 999 },
      { enemy: "brute", startTime: 1400, interval: 150, min: 60, count: 999 },
      { enemy: "worker", startTime: 3800, interval: 170, min: 90, count: 999 },
      { enemy: "biker", startTime: 5900, interval: 180, min: 100, count: 999 },
      {
        enemy: "breaker",
        startTime: 6800,
        interval: 190,
        min: 120,
        count: 999,
      },
      {
        enemy: "excavator",
        startTime: 7700,
        interval: 250,
        min: 150,
        count: 999,
      },
    ],
  },
];

export function levelSpec(level: number): LevelSpec {
  return LEVELS[Math.max(1, Math.min(LEVELS.length, level)) - 1];
}
