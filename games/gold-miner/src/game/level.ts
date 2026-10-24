// Level layouts: the original's 30 fixed mines, goals, and mystery-bag rolls.
// Themes and variants were recovered from the root timeline; geometry lives in
// layouts.ts as numeric data.
import { randInt, type RngHolder } from "./rng.ts";
import { ANIMAL, animalWorldX, FRAME_STEP } from "./original.ts";
import { type Item, type Kind, KINDS, type Prize } from "./items.ts";
import { LAYOUTS } from "./layouts.ts";

/** Cumulative money needed to clear `level`. */
export function goalFor(level: number): number {
  let goal = 650;
  let addOn = 275;
  for (let n = 1; n < level; n++) {
    if (n <= 9) addOn += 270;
    goal += addOn;
  }
  return goal;
}

/**
 * Layout theme for a level. Levels 1-10 use themes 1-10; afterwards the
 * original wraps back to theme 4 and cycles 4-10.
 */
export function themeFor(level: number): number {
  return level <= 10 ? level : 4 + ((level - 4) % 7);
}

/** Which level bonuses are active while the mine is played. */
export interface LevelBonuses {
  clover: boolean;
  rock: boolean;
  diamond: boolean;
}

/** The bag's pre-rolled prize and weight, chosen when the level loads. */
export function rollBag(
  state: RngHolder,
  clover: boolean,
  stick: number,
): { price: Prize; weight: number } {
  let price: Prize;
  const w2 = randInt(state, 1, 6);
  if (clover) {
    if (w2 <= 2) price = "power";
    else if (w2 <= 4) {
      price = stick <= 3 ? "dynamite" : randInt(state, 300, 599);
    } else price = 700;
  } else if (w2 <= 3) {
    price = randInt(state, 1, 600);
  } else if (w2 === 4) {
    price = "power";
  } else if (w2 === 5) {
    price = stick <= 3 ? "dynamite" : randInt(state, 100, 199);
  } else {
    price = 800;
  }

  const roll = randInt(state, 1, 4);
  let weight: number;
  if (roll === 1) weight = randInt(state, 1, 9);
  else if (roll === 2) weight = -randInt(state, 1, 5);
  else if (roll === 3) weight = 9;
  else weight = -1;

  return { price, weight };
}

interface Loader extends RngHolder {
  nextId: number;
}

interface LoadedMine {
  items: Item[];
  theme: number;
  variant: number;
}

/** Builds a level's items from the recovered layout, rolling all prizes now. */
export function loadMine(
  state: Loader,
  level: number,
  bonuses: LevelBonuses,
  stick: number,
): LoadedMine {
  const theme = themeFor(level);
  const variant = randInt(state, 1, 3);
  const layout = LAYOUTS[theme - 1][variant - 1];
  const items = layout.map((entry) => {
    const spec = KINDS[entry.kind];
    let price: Prize = spec.value;
    let weight = spec.weight;

    if (entry.kind === "diamond") price = bonuses.diamond ? 900 : 600;
    else if (entry.kind === "pig") price = bonuses.diamond ? 902 : 602;
    else if (entry.kind === "rockSmall" || entry.kind === "rockLarge") {
      price = bonuses.rock ? spec.value * 3 : spec.value;
    } else if (entry.kind === "bag") {
      const bag = rollBag(state, bonuses.clover, stick);
      price = bag.price;
      weight = bag.weight;
    }

    const item: Item = {
      id: state.nextId++,
      kind: entry.kind,
      x: entry.x,
      y: entry.y,
      weight,
      price,
      hitW: spec.hitW,
      hitH: spec.hitH,
      artW: spec.artW,
      artH: spec.artH,
    };
    if (spec.animal) {
      item.x = animalWorldX(entry.x, entry.facing, ANIMAL.startX);
      item.animal = {
        anchorX: entry.x,
        facing: entry.facing,
        localX: ANIMAL.startX,
        phase: "left",
        hold: 0,
      };
    }
    return item;
  });
  return { items, theme, variant };
}

/** Walks every pig and mole one 60 Hz tick. */
export function stepAnimals(items: Item[], state: RngHolder) {
  for (const item of items) {
    const animal = item.animal;
    if (!animal) continue;
    if (animal.hold > 0) {
      animal.hold -= FRAME_STEP;
      if (animal.hold <= 0) {
        animal.hold = 0;
        animal.phase = animal.phase === "left" ? "right" : "left";
      }
    } else if (animal.phase === "left") {
      animal.localX -= ANIMAL.leftSpeed * FRAME_STEP;
      if (animal.localX <= ANIMAL.leftEndX) {
        animal.localX = ANIMAL.leftEndX;
        animal.hold = randInt(
          state,
          ANIMAL.turnMinFrames,
          ANIMAL.turnMaxFrames,
        );
      }
    } else {
      animal.localX += ANIMAL.rightSpeed * FRAME_STEP;
      if (animal.localX >= ANIMAL.rightEndX) {
        animal.localX = ANIMAL.rightEndX;
        animal.hold = randInt(
          state,
          ANIMAL.turnMinFrames,
          ANIMAL.turnMaxFrames,
        );
      }
    }
    item.x = animalWorldX(animal.anchorX, animal.facing, animal.localX);
  }
}

/** Kinds present in the original layouts, for documentation and tests. */
export const LAYOUT_KINDS: readonly Kind[] = [
  "goldSmall",
  "goldMedium",
  "goldLarge",
  "goldHuge",
  "rockSmall",
  "rockLarge",
  "diamond",
  "pig",
  "mole",
  "bone",
  "skull",
  "tnt",
  "bag",
];
