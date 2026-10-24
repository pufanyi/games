// The upgrade paths the four tower families share. The generated `towers.ts`
// holds the balance numbers; this module adds the order and presentation that
// a tower menu needs.
import type { TowerType } from "./types.ts";

export interface TowerTierInfo {
  /** Key into `TOWER_TIERS[type]`. */
  key: string;
  /** 1-5, matching the original's tower level. */
  level: number;
  name: string;
  /** Short line shown in the build and upgrade menus. */
  description: string;
}

export const TOWER_TREE: Readonly<Record<TowerType, readonly TowerTierInfo[]>> =
  {
    archer: [
      {
        key: "level1",
        level: 1,
        name: "Archer Tower",
        description: "Two archers loose arrows at a steady pace.",
      },
      {
        key: "level2",
        level: 2,
        name: "Sharpshooter Tower",
        description: "Longer range, faster volleys, harder hits.",
      },
      {
        key: "level3",
        level: 3,
        name: "Marksman Tower",
        description: "The best arrows gold can buy.",
      },
      {
        key: "ranger",
        level: 4,
        name: "Rangers",
        description: "Rapid poison-tipped arrows over a wide range.",
      },
      {
        key: "musketeer",
        level: 5,
        name: "Musketeers",
        description: "Slow, powerful shots that punch through armour.",
      },
    ],
    mage: [
      {
        key: "level1",
        level: 1,
        name: "Mage Tower",
        description: "Hurls magic bolts that ignore armour.",
      },
      {
        key: "level2",
        level: 2,
        name: "Adept Tower",
        description: "Stronger bolts and a little more reach.",
      },
      {
        key: "level3",
        level: 3,
        name: "Wizard Tower",
        description: "Devastating arcane damage.",
      },
      {
        key: "arcane",
        level: 4,
        name: "Arcane Wizards",
        description: "Massive bolts with a chance to obliterate.",
      },
      {
        key: "sorcerer",
        level: 5,
        name: "Sorcerers",
        description: "Elementals and armour-melting curses.",
      },
    ],
    engineer: [
      {
        key: "level1",
        level: 1,
        name: "Artillery",
        description: "Lobs bombs that splash everything nearby.",
      },
      {
        key: "level2",
        level: 2,
        name: "Howitzer",
        description: "Heavier bombs, same steady crew.",
      },
      {
        key: "level3",
        level: 3,
        name: "Mortar",
        description: "Long-range shells with a wide blast.",
      },
      {
        key: "bfg",
        level: 4,
        name: "Big Bertha",
        description: "Enormous shells that flatten a whole squad.",
      },
      {
        key: "tesla",
        level: 5,
        name: "Tesla",
        description: "Chain lightning that never misses.",
      },
    ],
    barracks: [
      {
        key: "level1",
        level: 1,
        name: "Militia",
        description: "Three soldiers block the road and fight hand to hand.",
      },
      {
        key: "level2",
        level: 2,
        name: "Footmen",
        description: "Tougher soldiers in better armour.",
      },
      {
        key: "level3",
        level: 3,
        name: "Knights",
        description: "Heavy armour and heavy blades.",
      },
      {
        key: "paladin",
        level: 4,
        name: "Paladins",
        description: "Holy warriors with the best armour.",
      },
      {
        key: "barbarian",
        level: 5,
        name: "Barbarians",
        description: "Reckless fighters with huge damage.",
      },
    ],
  };

/** True when the key belongs to one of the two specialization branches. */
export function isSpecialization(type: TowerType, key: string): boolean {
  return (TOWER_TREE[type].find((tier) => tier.key === key)?.level ?? 0) >= 4;
}

/**
 * The browser game has no account meta upgrades. A cap of 0 in the original
 * means "use the player's upgrades", so the level's `unlockLevels` value takes
 * that role; 0 there means the family is unavailable, as in Iron Challenges.
 */
export function tierCap(cap: number | null): number {
  if (cap === null) return 0;
  return Math.max(0, Math.min(5, cap));
}

export const TOWER_TYPE_NAMES: Readonly<Record<TowerType, string>> = {
  archer: "Archers",
  mage: "Mages",
  engineer: "Artillery",
  barracks: "Barracks",
};

export const TOWER_TYPE_DESCRIPTIONS: Readonly<Record<TowerType, string>> = {
  archer: "Fast arrows. Hits ground and flying enemies.",
  mage: "Magic bolts that ignore armour. Hits flying enemies.",
  engineer: "Area damage from afar. Cannot hit flying enemies.",
  barracks: "Soldiers that block the road and hold enemies in place.",
};
