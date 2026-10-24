// Item kinds and their recovered values, weights, and box sizes.
//
// `hitW`/`hitH` are the original `ob.box` AABBs (measured in original stage
// pixels and converted to world pixels). `artW`/`artH` are the drawn sizes,
// used only by the renderer. `weight` is the original reel-in weight: the
// higher it is, the fewer frames the retract timeline advances.
import { SCALE } from "./original.ts";

export type Kind =
  | "goldSmall"
  | "goldMedium"
  | "goldLarge"
  | "goldHuge"
  | "rockSmall"
  | "rockLarge"
  | "diamond"
  | "pig"
  | "mole"
  | "bone"
  | "skull"
  | "tnt"
  | "bag";

/** A bag can pay cash, temporary power, or a stick of dynamite. */
export type Prize = number | "power" | "dynamite";

export interface KindSpec {
  /** Collision box in world pixels (original `ob.box`). */
  hitW: number;
  hitH: number;
  /** Art size in world pixels (original sprite bounds). */
  artW: number;
  artH: number;
  value: number;
  weight: number;
  /** Pig and mole walk back and forth along the layout anchor. */
  animal?: boolean;
}

const px = (value: number) => value * SCALE;

export const KINDS: Record<Kind, KindSpec> = {
  goldSmall: {
    hitW: px(9.62879721680656),
    hitH: px(9.62879721680656),
    artW: px(15),
    artH: px(13),
    value: 50,
    weight: 3,
  },
  goldMedium: {
    hitW: px(18.2949489322491),
    hitH: px(18.2949489322491),
    artW: px(27),
    artH: px(25),
    value: 100,
    weight: 7,
  },
  goldLarge: {
    hitW: px(36.13269980642945),
    hitH: px(36.13269980642945),
    artW: px(54),
    artH: px(49),
    value: 250,
    weight: 8,
  },
  goldHuge: {
    hitW: px(47.109669165778904),
    hitH: px(47.109669165778904),
    artW: px(70),
    artH: px(64),
    value: 500,
    weight: 9,
  },
  rockSmall: {
    hitW: px(24.887774113100022),
    hitH: px(20.551303040236235),
    artW: px(39),
    artH: px(33),
    value: 11,
    weight: 8,
  },
  rockLarge: {
    hitW: px(21.87043185485527),
    hitH: px(21.87043185485527),
    artW: px(41),
    artH: px(36),
    value: 20,
    weight: 9,
  },
  diamond: {
    hitW: px(10.19029546296224),
    hitH: px(10.19029546296224),
    artW: px(14),
    artH: px(12),
    value: 600,
    weight: 2,
  },
  pig: {
    hitW: px(15.017479297704995),
    hitH: px(15.017479297704995),
    artW: px(30),
    artH: px(20),
    value: 602,
    weight: 5,
    animal: true,
  },
  mole: {
    hitW: px(15.017479297704995),
    hitH: px(15.017479297704995),
    artW: px(30),
    artH: px(20),
    value: 2,
    weight: 3,
    animal: true,
  },
  bone: {
    hitW: px(18.77167998859659),
    hitH: px(10.011690450366586),
    artW: px(34),
    artH: px(31),
    value: 7,
    weight: 3,
  },
  skull: {
    hitW: px(16.86441749613732),
    hitH: px(16.86441749613732),
    artW: px(30),
    artH: px(30),
    value: 20,
    weight: 2,
  },
  tnt: {
    hitW: px(30.332859127782285),
    hitH: px(37.54324722150341),
    artW: px(39),
    artH: px(50),
    value: 1,
    weight: 2,
  },
  bag: {
    hitW: px(24.01549609703943),
    hitH: px(24.01549609703943),
    artW: px(36),
    artH: px(35),
    value: 0,
    weight: 1,
  },
};

/** Walking state for a pig or mole. Coordinates are original-stage local. */
export interface AnimalState {
  anchorX: number;
  facing: 1 | -1;
  localX: number;
  phase: "left" | "right";
  /** Frames left standing at a turn. */
  hold: number;
}

export interface Item {
  id: number;
  kind: Kind;
  /** Current center in world pixels; animals move, everything else is fixed. */
  x: number;
  y: number;
  /** Reel-in weight; bags roll their own at level load. */
  weight: number;
  /** Payout when it reaches the top; bags may hold a special prize. */
  price: Prize;
  hitW: number;
  hitH: number;
  artW: number;
  artH: number;
  animal?: AnimalState;
}

export function itemWeight(item: Item): number {
  return item.weight;
}

/** Cash shown for the item, counting bonuses already rolled into `price`. */
export function itemValue(item: Item): number {
  return typeof item.price === "number" ? item.price : 0;
}
