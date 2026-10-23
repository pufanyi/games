// Seeded mine generation and cumulative level goals.
import { chance, randFloat, randInt, random } from "./rng.ts";

import { BAG_WEIGHTS, HEIGHT, MINE_TOP, WIDTH } from "./config.ts";
import { type Item, type Kind, KINDS } from "./items.ts";

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

  // Provision a value budget; actual reachability also depends on time and layout.
  const needed = goalFor(level) - (level > 1 ? goalFor(level - 1) : 0);
  const budget = needed * 1.7 + 200;
  let value = 0;
  while (value < budget && plan.length < 18) {
    const roll = random(state);
    const diamondOdds = level === 1 ? 0 : Math.min(0.06 + 0.02 * level, 0.22);
    let kind: Kind = "goldSmall";
    let minY = 190;
    if (roll < diamondOdds) {
      kind = "diamond";
      minY = 380;
    } else if (roll < diamondOdds + 0.18) {
      kind = "goldHuge";
      minY = 340;
    } else if (roll < diamondOdds + 0.3) {
      kind = "goldLarge";
      minY = 290;
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
    if (kind === "bag") {
      item.weight = BAG_WEIGHTS[randInt(state, 0, BAG_WEIGHTS.length - 1)];
    }
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
