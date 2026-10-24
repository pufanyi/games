export type Kind =
  | "goldSmall"
  | "goldMedium"
  | "goldLarge"
  | "goldHuge"
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
    goldMedium: { r: 22, value: 100, weight: 5 },
    goldLarge: { r: 30, value: 250, weight: 10 },
    goldHuge: { r: 40, value: 500, weight: 20 },
    rockSmall: { r: 16, value: 11, weight: 10 },
    rockLarge: { r: 30, value: 20, weight: 22 },
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
  /** A mystery bag keeps its seeded weight throughout the level. */
  weight?: number;
  /** Moles: horizontal speed in px/s (sign = direction). */
  vx?: number;
  /** Moles: left end of the patrol. */
  minX?: number;
  /** Moles: right end of the patrol. */
  maxX?: number;
  /** Moles: carrying a diamond. */
  carrying?: boolean;
}

export function itemWeight(item: Item): number {
  return item.weight ?? KINDS[item.kind].weight;
}
