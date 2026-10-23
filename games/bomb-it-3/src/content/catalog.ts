import type {
  Difficulty,
  Item,
  Mode,
  Ride,
  Theme,
  Weapon,
} from "../game/types.ts";
export const MODES: {
  id: Mode;
  title: string;
  subtitle: string;
  icon: string;
  objective: string;
}[] = [
  {
    id: "arcade",
    title: "Arcade",
    subtitle: "A classic with a bang",
    icon: "✹",
    objective:
      "Clear the arena of computer opponents. Collect upgrades and watch your escape route.",
  },
  {
    id: "battle",
    title: "Battle royale",
    subtitle: "Weapons at the ready",
    icon: "⚒",
    objective:
      "Score 10 eliminations. Start with a hammer; collect special weapons. Everyone respawns.",
  },
  {
    id: "water",
    title: "Water mania",
    subtitle: "Make a splash",
    icon: "≈",
    objective:
      "Push rivals into the holes with your water jet. First to 10 eliminations wins.",
  },
  {
    id: "race",
    title: "Race",
    subtitle: "Three laps. No brakes.",
    icon: "⚑",
    objective:
      "Follow your colored flags in order. Reach 13 checkpoints before your rivals.",
  },
];
export const THEMES: {
  id: Theme;
  title: string;
  floor: string;
  light: string;
  wall: string;
  accent: string;
}[] = [
  {
    id: "farm",
    title: "Sunny farm",
    floor: "#9dbd65",
    light: "#b2cf7a",
    wall: "#7e9c56",
    accent: "#fff0a2",
  },
  {
    id: "shop",
    title: "Shopping mall",
    floor: "#e6c5ac",
    light: "#f5dbc2",
    wall: "#a388ad",
    accent: "#f495bd",
  },
  {
    id: "city",
    title: "City at night",
    floor: "#53667d",
    light: "#61758a",
    wall: "#34465e",
    accent: "#80e0dc",
  },
  {
    id: "water",
    title: "Aqua park",
    floor: "#81d3d4",
    light: "#a5e7df",
    wall: "#509ea8",
    accent: "#fff0ac",
  },
];
export const CHARACTERS = [
  {
    name: "Bolt",
    color: "#50baff",
    dark: "#2469b0",
    detail: "Cool under pressure",
  },
  {
    name: "Poppy",
    color: "#fc83b2",
    dark: "#bd3f77",
    detail: "Small but mighty",
  },
  {
    name: "Sunny",
    color: "#ffcf58",
    dark: "#ba832d",
    detail: "A little sunshine",
  },
  {
    name: "Sprout",
    color: "#92d965",
    dark: "#4b9544",
    detail: "Born to explore",
  },
];
export const ITEM_LABELS: Record<Item, string> = {
  bomb: "Bomb",
  hammer: "Hammer",
  water: "Water jet",
  laser: "Laser",
  flame: "Flamethrower",
  rocket: "Rocket launcher",
  grenade: "Grenade",
  bowling: "Bowling ball",
  horse: "Horse",
  bike: "Motorcycle",
  car: "Car",
  hovercraft: "Hovercraft",
  power: "Blast range",
  capacity: "Extra bomb",
  speed: "Speed up",
  kick: "Kick bombs",
  shield: "Shield",
  invincible: "Invincibility",
  life: "Extra life",
};
export const ITEM_ICONS: Record<Item, string> = {
  bomb: "●",
  hammer: "T",
  water: "≈",
  laser: "↯",
  flame: "♨",
  rocket: "➤",
  grenade: "✹",
  bowling: "●",
  horse: "H",
  bike: "M",
  car: "C",
  hovercraft: "U",
  power: "+",
  capacity: "B",
  speed: "»",
  kick: "K",
  shield: "◇",
  invincible: "★",
  life: "♥",
};
export const BASE_WEAPON: Record<Mode, Weapon> = {
  arcade: "bomb",
  battle: "hammer",
  water: "water",
  race: "water",
};
export const RIDES: Record<Theme, Ride> = {
  farm: "horse",
  shop: "bike",
  city: "car",
  water: "hovercraft",
};
export const RIDE_SPEED: Record<Ride, number> = {
  horse: 1.8,
  bike: 2.4,
  car: 2.1,
  hovercraft: 1.9,
};
export const RACE_SPEED: Record<Ride, number> = {
  horse: 1.4,
  bike: 2.3,
  car: 2.2,
  hovercraft: 1.6,
};
export const AI_DELAY: Record<Mode, Record<Difficulty, number>> = {
  arcade: { easy: 50, normal: 30, hard: 24 },
  battle: { easy: 30, normal: 18, hard: 12 },
  water: { easy: 30, normal: 18, hard: 12 },
  race: { easy: 7, normal: 5, hard: 3 },
};
export function itemPool(mode: Mode, theme: Theme): Item[] {
  if (mode === "arcade") {
    return [
      ...Array<Item>(24).fill("power"),
      ...Array<Item>(24).fill("capacity"),
      ...Array<Item>(12).fill("speed"),
      ...Array<Item>(8).fill("kick"),
      "shield",
      "invincible",
      "life",
      RIDES[theme],
      RIDES[theme],
    ];
  }
  if (mode === "race") {
    return [
      "flame",
      "flame",
      "flame",
      "laser",
      "laser",
      "laser",
      "bowling",
      "bowling",
    ];
  }
  if (mode === "water") {
    return ["flame", "laser", "grenade", "rocket", "bowling", "speed"];
  }
  return [
    "rocket",
    "rocket",
    ...Array<Item>(6).fill("flame"),
    ...Array<Item>(3).fill("laser"),
    ...Array<Item>(3).fill("grenade"),
    ...Array<Item>(3).fill("bowling"),
    "invincible",
    "invincible",
    RIDES[theme],
    RIDES[theme],
  ];
}
