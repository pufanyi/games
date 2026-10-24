// Shapes shared by the generated content modules. Coordinates are in the
// original game's 800x600 level space; y grows downwards.

export type Vec = { x: number; y: number };

export type TowerType = "archer" | "mage" | "engineer" | "barracks";

/**
 * One walkable road. `points` is a simplified polyline (the original stored a
 * point every few pixels); `engageAt`, `disengageAt` and `leakAt` are arc
 * lengths derived from the original node indices at which enemies become
 * targetable, stop being targetable, and escape.
 */
export interface LaneDefinition {
  points: readonly (readonly [number, number])[];
  engageAt: number;
  disengageAt: number;
  leakAt: number;
  total: number;
  /** Average distance between the original path's nodes. */
  spacing: number;
}

export interface TowerSlotDefinition {
  x: number;
  y: number;
  /** Where barracks soldiers stand; also used by other types as a rally marker. */
  rally?: readonly [number, number];
  /** Iron mode starts with these towers already built, for free. */
  prebuilt?: { type: TowerType; tier: string };
}

export interface WaveSpawnDefinition {
  /** Key into `ENEMIES`. */
  enemy: string;
  /** Second enemy key when a spawn alternates between two types. */
  aux?: string;
  /** How many of one type before alternating to `aux`. */
  maxSame?: number;
  count: number;
  /** Frames between two spawns of this group. */
  interval: number;
  /** Frames to wait after the previous group in the same wave finished. */
  delay: number;
  fixedPath?: boolean;
  path?: number;
}

export interface WaveDefinition {
  /** Frames after the previous wave started; 0 means "same wave". */
  interval: number;
  /** Which entry of `lanes` this wave uses; enemies pick a random lane in it. */
  pathIndex: number;
  spawns: WaveSpawnDefinition[];
}

export interface LevelModeDefinition {
  lives: number;
  cash: number;
  waves: WaveDefinition[];
  towers: TowerSlotDefinition[];
  /**
   * Highest tower tier each type may be upgraded to in this level/mode. 0 means
   * "use the level's `unlockLevels` fallback", which is how Iron Challenges
   * restrict the tower families they do not allow.
   */
  unlocks: {
    archers: number | null;
    mages: number | null;
    engineers: number | null;
    barracks: number | null;
  };
  fireball: boolean;
  reinforcements: boolean;
}

export interface LevelDefinition {
  id: number;
  /** `lanes[pathIndex][laneIndex]`. */
  lanes: LaneDefinition[][];
  /** `spawns[pathIndex]` holds the flag position and a direction reference. */
  spawns: number[][][];
  goals: number[][];
  /**
   * The original falls back to the player's account upgrades when a mode says
   * 0. This recreation has no meta progression, so these per-level values take
   * that role instead; 0 means the family is not available at all.
   */
  unlockLevels: {
    archers: number;
    mages: number;
    engineers: number;
    barracks: number;
  };
  modes: Readonly<Record<string, LevelModeDefinition>>;
}

/**
 * Enemy balance. All values come from the original game's settings at normal
 * difficulty, where the health multiplier is 1. Extra ability fields (heal,
 * summon, area attack, ...) are present when the original had them.
 */
export interface EnemyDefinition {
  className: string;
  health: number;
  armor: number;
  magicArmor: number;
  dodge: number;
  speed: number;
  gold: number;
  /** Lives lost when this enemy reaches the exit. */
  cost: number;
  minDamage: number;
  maxDamage: number;
  /** Frames between attacks while fighting a soldier. */
  attackReloadTime: number;
  /** Frames from starting a swing to landing it. */
  attackChargeTime: number;
  /** False for enemies soldiers cannot stop, such as ogres and flyers. */
  canBeBlocked: boolean;
  /** Frames the corpse stays before removal. */
  deadTime: number;
  isBoss: boolean;
  xSoldierAdjust: number;
  xAdjust: number;
  yAdjust: number;
  isFlying: boolean;
  elite: boolean;
  /** 0 small, 1 medium, 2 large. */
  size: number;
  /** Some enemies heal themselves over time. */
  regenerateHealPoints?: number;
  regenerateTime?: number;
  [extra: string]: number | boolean | string | number[][] | undefined;
}

export interface TowerTierDefinition {
  cost: number;
  range?: number;
  minDamage?: number;
  maxDamage?: number;
  reload?: number;
  /** Engineer explosion ellipse width (height is 2/3 of it). */
  area?: number;
  /** Barracks: how far soldiers may walk from their rally point. */
  rangeRally?: number;
  health?: number;
  armor?: number;
  respawn?: number;
  regen?: number;
  regenReload?: number;
  /** Ability tuning the base simulation does not use yet. */
  [extra: string]: number | undefined;
}

export interface PowerDefinition {
  [stat: string]: number | undefined;
}
