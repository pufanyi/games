// Item types and mine generation.
import { chance, randFloat, randInt, random } from "./rng.ts";

export const WIDTH = 800;
export const HEIGHT = 600;
/** Top of the dirt; the miner stands here. */
export const GROUND_Y = 120;
/** Items are placed below this line, leaving room for the swinging claw. */
export const MINE_TOP = 165;

export type Kind =
  | "goldSmall"
  | "goldMedium"
  | "goldLarge"
  | "rockSmall"
  | "rockLarge"
  | "diamond"
  | "bag"
  | "bone"
  | "tnt"
  | "mole";

/** `value` is the base payout in dollars; `weight` divides the reel-in speed. */
export const KINDS: Record<Kind, { r: number; value: number; weight: number }> =
  {
    goldSmall: { r: 13, value: 50, weight: 1.6 },
    goldMedium: { r: 22, value: 150, weight: 3 },
    goldLarge: { r: 40, value: 500, weight: 6.5 },
    rockSmall: { r: 16, value: 11, weight: 3.2 },
    rockLarge: { r: 30, value: 20, weight: 7 },
    diamond: { r: 10, value: 600, weight: 1 },
    bag: { r: 17, value: 0, weight: 1.4 },
    bone: { r: 14, value: 7, weight: 1.2 },
    tnt: { r: 17, value: 0, weight: 1 },
    mole: { r: 15, value: 2, weight: 1.2 },
  };

export interface Item {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  r: number;
  /** Moles: horizontal speed in px/s (sign = direction). */
  vx?: number;
  /** Moles: left end of the patrol. */
  minX?: number;
  /** Moles: right end of the patrol. */
  maxX?: number;
  /** Moles: carrying a diamond. */
  carrying?: boolean;
}

interface Generator {
  rng: number;
  nextId: number;
}

/** Cumulative money needed to clear `level`: 650, 1195, 2010, 3095, ... */
export function goalFor(level: number): number {
  let goal = 650;
  for (let n = 2; n <= level; n++) goal += 545 + 270 * (n - 2);
  return goal;
}

export function generateItems(state: Generator, level: number): Item[] {
  const plan: { kind: Kind; minY: number }[] = [];

  // Enough value that the goal is reachable without perfect play.
  const needed = goalFor(level) - (level > 1 ? goalFor(level - 1) : 0);
  const budget = needed * 1.7 + 200;
  let value = 0;
  while (value < budget && plan.length < 18) {
    const roll = random(state);
    const diamondOdds = Math.min(0.06 + 0.02 * level, 0.22);
    let kind: Kind = "goldSmall";
    let minY = 190;
    if (roll < diamondOdds) {
      kind = "diamond";
      minY = 380;
    } else if (roll < diamondOdds + 0.18) {
      kind = "goldLarge";
      minY = 340;
    } else if (roll < diamondOdds + 0.5) {
      kind = "goldMedium";
      minY = 230;
    }
    plan.push({ kind, minY });
    value += KINDS[kind].value;
  }

  for (let i = 0; i < 3 + Math.min(level, 6); i++) {
    plan.push({
      kind: chance(state, 0.6) ? "rockSmall" : "rockLarge",
      minY: 0,
    });
  }
  const bags = randInt(state, 1, 2) + (level >= 3 ? 1 : 0);
  for (let i = 0; i < bags; i++) plan.push({ kind: "bag", minY: 0 });
  for (let i = randInt(state, 0, 2); i > 0; i--) {
    plan.push({ kind: "bone", minY: 0 });
  }
  if (level >= 2) {
    for (let i = randInt(state, 1, 2); i > 0; i--) {
      plan.push({ kind: "tnt", minY: 260 });
    }
    for (let i = randInt(state, 1, Math.min(3, level)); i > 0; i--) {
      plan.push({ kind: "mole", minY: 250 });
    }
  }

  // Big things first, so they still find room.
  plan.sort((a, b) => KINDS[b.kind].r - KINDS[a.kind].r);

  const items: Item[] = [];
  for (const { kind, minY } of plan) {
    const item = place(state, items, kind, minY);
    if (!item) continue;
    if (kind === "mole") {
      const speed = Math.min(40 + 10 * level, 90);
      item.vx = chance(state, 0.5) ? speed : -speed;
      item.minX = Math.max(30, item.x - 160);
      item.maxX = Math.min(WIDTH - 30, item.x + 160);
      item.carrying = level >= 3 && chance(state, 0.35);
    }
    items.push(item);
  }
  return items;
}

/** Finds a spot for a new item that doesn't overlap existing ones. */
function place(
  state: Generator,
  items: Item[],
  kind: Kind,
  minY: number,
): Item | null {
  const { r } = KINDS[kind];
  const top = Math.max(minY, MINE_TOP) + r;
  const bottom = HEIGHT - r - 10;
  for (let attempt = 0; attempt < 300; attempt++) {
    const x = randFloat(state, r + 20, WIDTH - r - 20);
    const y = randFloat(state, Math.min(top, bottom), bottom);
    const clear = items.every(
      (other) => Math.hypot(other.x - x, other.y - y) > other.r + r + 8,
    );
    if (clear) return { id: state.nextId++, kind, x, y, r };
  }
  return null;
}
