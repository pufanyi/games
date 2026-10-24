import { chance, randInt, type RngHolder } from "./rng.ts";

export type ShopItem = "dynamite" | "strength" | "clover" | "book" | "polish";

/** Prices are `randInt(min, max) + perLevel * (level - 1)`. */
export const SHOP_ITEMS: Record<
  ShopItem,
  {
    label: string;
    description: string;
    min: number;
    max: number;
    perLevel: number;
  }
> = {
  dynamite: {
    label: "Dynamite",
    description: "Press ↑ while reeling in. Destroys held and nearby items.",
    min: 10,
    max: 60,
    perLevel: 12,
  },
  strength: {
    label: "Strength drink",
    description: "Reel everything in faster next level.",
    min: 60,
    max: 260,
    perLevel: 20,
  },
  clover: {
    label: "Lucky clover",
    description: "Mystery bags pay out better next level.",
    min: 15,
    max: 120,
    perLevel: 15,
  },
  book: {
    label: "Rock collector's book",
    description: "Rocks are worth three times as much next level.",
    min: 10,
    max: 80,
    perLevel: 8,
  },
  polish: {
    label: "Diamond polish",
    description: "Diamonds are worth 50% more next level.",
    min: 100,
    max: 400,
    perLevel: 30,
  },
};

export interface Offer {
  item: ShopItem;
  price: number;
  sold: boolean;
}

/** A random selection of shop items at random prices; never empty. */
export function rollOffers(state: RngHolder, level: number): Offer[] {
  const all = Object.keys(SHOP_ITEMS) as ShopItem[];
  let picked = all.filter(() => chance(state, 0.6));
  if (picked.length === 0) picked = [all[randInt(state, 0, all.length - 1)]];
  return picked.map((item) => {
    const { min, max, perLevel } = SHOP_ITEMS[item];
    const price = randInt(state, min, max) + perLevel * (level - 1);
    return { item, price, sold: false };
  });
}
