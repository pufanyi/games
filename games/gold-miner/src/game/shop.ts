// The general store between levels, recovered from the shop panel's five
// fixed slots. Slots that are out of stock have no button in the original, and
// buying is never blocked by a low balance: the price is simply subtracted,
// so the money total can go negative.
import { randInt, type RngHolder } from "./rng.ts";

export type ShopItem = "dynamite" | "strength" | "clover" | "book" | "polish";

/** Slots in the order the panel places them (front to back). */
export const SHOP_ORDER: readonly ShopItem[] = [
  "dynamite",
  "strength",
  "clover",
  "book",
  "polish",
];

export const SHOP_ITEMS: Record<
  ShopItem,
  { label: string; description: string }
> = {
  dynamite: {
    label: "Dynamite",
    description:
      "Press ↑ while reeling in to blow up what you're holding and anything nearby.",
  },
  strength: {
    label: "Strength drink",
    description: "Reels everything in faster on the next level only.",
  },
  clover: {
    label: "Lucky clover",
    description: "Mystery bags pay out better on the next level only.",
  },
  book: {
    label: "Rock collector's book",
    description: "Rocks are worth three times as much on the next level only.",
  },
  polish: {
    label: "Diamond polish",
    description: "Diamonds and pigs are worth more on the next level only.",
  },
};

export interface Offer {
  item: ShopItem;
  /** 0 when the slot is out of stock. */
  price: number;
  available: boolean;
  sold: boolean;
}

/**
 * Rolls the five slots: stock checks first, then prices, in the original's
 * display-list order. An out-of-stock slot consumes no price random.
 */
export function rollOffers(
  state: RngHolder,
  level: number,
  stick: number,
): Offer[] {
  // Sprite frame 1 for each slot: `random(10) + 1` against a threshold.
  const strength = randInt(state, 1, 10) < 5;
  const clover = randInt(state, 1, 10) < 5;
  const book = randInt(state, 1, 10) < 7;
  const polish = randInt(state, 1, 10) < 6;
  const available: Record<ShopItem, boolean> = {
    dynamite: stick < 5,
    strength,
    clover,
    book,
    polish,
  };

  // Sprite frame 2 sets the price when the slot has stock.
  const price: Record<ShopItem, number> = {
    dynamite: 0,
    strength: 0,
    clover: 0,
    book: 0,
    polish: 0,
  };
  if (available.dynamite) price.dynamite = randInt(state, 1, 300) + level * 2;
  if (available.strength) price.strength = randInt(state, 100, 399);
  if (available.clover) {
    price.clover = randInt(state, 1, level * 50) + level * 2;
  }
  if (available.book) price.book = randInt(state, 1, 150);
  if (available.polish) price.polish = randInt(state, 1, level * 100) + 200;

  return SHOP_ORDER.map((item) => ({
    item,
    price: price[item],
    available: available[item],
    sold: false,
  }));
}
