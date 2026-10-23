import type {
  EnemyDefinition,
  LevelDefinition,
  LevelModeDefinition,
  TowerTierDefinition,
  TowerType,
  Vec,
} from "../content/types.ts";
import type { Lane } from "./lane.ts";
import type { Rng } from "./rng.ts";

export type Difficulty = "easy" | "normal" | "hard";
export type GameMode = "campaign" | "heroic" | "iron";
export type WorldStatus = "playing" | "won" | "lost";

/** How incoming damage interacts with an enemy's armour, as in the original. */
export type DamageType = "physical" | "magic" | "elemental" | "ignore";

export type EnemyState = "walking" | "blocked" | "dead";

export interface Enemy {
  id: number;
  /** Key into `ENEMIES`. */
  key: string;
  def: EnemyDefinition;
  lane: Lane;
  /** Distance travelled along the lane, in pixels. */
  distance: number;
  x: number;
  y: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  /** Targetable: between the original's activation and deactivation nodes. */
  active: boolean;
  state: EnemyState;
  /** True once the blocking soldier arrived; the enemy opens with a swing. */
  fightStarted: boolean;
  /** The soldier that stopped this enemy, when blocked. */
  blocker: Soldier | null;
  /** Additional soldiers attacking the blocked enemy. */
  helpers: Soldier[];
  reloadCounter: number;
  charging: boolean;
  chargeCounter: number;
  attackDodged: boolean;
  deadTicks: number;
  regenCounter: number;
  /** Walk speed multiplier; reserved for slow effects. */
  speedMultiplier: number;
}

export interface TowerSlot {
  id: number;
  x: number;
  y: number;
  /** Barracks rally point; other tower types ignore it. */
  rally: Vec | null;
  tower: Tower | null;
}

export interface Tower {
  id: number;
  type: TowerType;
  slot: TowerSlot;
  x: number;
  y: number;
  /** Content tier key: level1 ... level3, ranger, musketeer, arcane, ... */
  tier: string;
  /** 1-4, the meaningful level used for damage and unlocks. */
  level: number;
  stats: TowerTierDefinition;
  /** Gold spent on this tower, including the build cost. */
  invested: number;
  /** Frames left under construction; 0 when ready. */
  buildTicks: number;
  rangeWidth: number;
  rangeHeight: number;
  reloadCounter: number;
  ready: boolean;
  charging: boolean;
  chargeCounter: number;
  chargeTicks: number;
  shootTicks: number;
  target: Enemy | null;
  soldiers: Soldier[];
  /** Barracks rally point that soldiers return to. */
  rally: Vec;
  shots: number;
}

export type SoldierState = "walking" | "idle" | "fighting" | "dead";

export interface Soldier {
  id: number;
  /** Null for temporary reinforcements. */
  tower: Tower | null;
  x: number;
  y: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  armor: number;
  minDamage: number;
  maxDamage: number;
  /** Frames from one attack to the next, charge included. */
  attackReload: number;
  reloadCounter: number;
  charging: boolean;
  chargeCounter: number;
  chargeTicks: number;
  damageAt: number;
  state: SoldierState;
  target: Enemy | null;
  /** True for the soldier that stopped the enemy; false when assisting. */
  blocking: boolean;
  /** 0, 1 or 2, the side of the enemy this soldier fights from. */
  fightingPosition: number;
  destination: Vec;
  post: Vec;
  /** Centre of the area the soldier may engage enemies in. */
  rallyCenter: Vec;
  /** Half-width of the rally ellipse soldiers may walk in. */
  rallyRange: number;
  /** Attack range ellipse, centred on the rally point. */
  rangeWidth: number;
  rangeHeight: number;
  speed: number;
  regen: number;
  regenReload: number;
  regenCounter: number;
  /** Frames left before respawning; only meaningful while dead. */
  respawnTicks: number;
  /** Ticks left alive for temporary soldiers; null means permanent. */
  expiresIn: number | null;
  level: number;
}
export interface ArrowProjectile {
  kind: "arrow";
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  tick: number;
  totalTicks: number;
  target: Enemy | null;
  minDamage: number;
  maxDamage: number;
  done: boolean;
}

export interface BoltProjectile {
  kind: "bolt";
  id: number;
  x: number;
  y: number;
  speed: number;
  target: Enemy | null;
  destX: number;
  destY: number;
  minDamage: number;
  maxDamage: number;
  done: boolean;
}

export interface BombProjectile {
  kind: "bomb";
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  tick: number;
  totalTicks: number;
  destX: number;
  destY: number;
  areaWidth: number;
  areaHeight: number;
  minDamage: number;
  maxDamage: number;
  done: boolean;
}

export interface FireballProjectile {
  kind: "fireball";
  id: number;
  x: number;
  y: number;
  speed: number;
  targetX: number;
  targetY: number;
  minDamage: number;
  maxDamage: number;
  /** Frames before this fireball starts falling; used to stagger a rain. */
  delay: number;
  done: boolean;
}

export type Projectile =
  | ArrowProjectile
  | BoltProjectile
  | BombProjectile
  | FireballProjectile;

export type EffectKind =
  | "hit"
  | "explosion"
  | "coin"
  | "miss"
  | "lightning"
  | "fireball"
  | "levelup";

export interface Effect {
  id: number;
  kind: EffectKind;
  x: number;
  y: number;
  age: number;
  life: number;
  radius: number;
  /** Direction for small flying particles, in radians. */
  angle: number;
}

export interface SpawnRuntime {
  enemy: string;
  aux?: string;
  maxSame?: number;
  count: number;
  interval: number;
  delay: number;
  fixedPath: boolean;
  path?: number;
  indexCant: number;
  intervalCounter: number;
  indexSwap: number;
  currentType: string;
}

export interface WaveRuntime {
  def: {
    interval: number;
    pathIndex: number;
    spawns: readonly {
      enemy: string;
      aux?: string;
      maxSame?: number;
      count: number;
      interval: number;
      delay: number;
      fixedPath?: boolean;
      path?: number;
    }[];
  };
  spawns: SpawnRuntime[];
  indexSpawn: number;
  /** Waiting for `delay` after a spawn group finished. */
  waitingBetween: boolean;
  waitCounter: number;
  done: boolean;
}

/** Cooldowns are ticks remaining; 0 means the power is ready. */
export interface PowerState {
  lightning: number;
  fireball: number;
  reinforcements: number;
}

export interface World {
  level: LevelDefinition;
  levelId: number;
  mode: GameMode;
  difficulty: Difficulty;
  rng: Rng;
  tick: number;
  lives: number;
  maxLives: number;
  cash: number;
  status: WorldStatus;
  lanes: Lane[][];
  slots: TowerSlot[];
  towers: Tower[];
  enemies: Enemy[];
  soldiers: Soldier[];
  projectiles: Projectile[];
  effects: Effect[];
  activeWaves: WaveRuntime[];
  /** Index of the next wave definition to launch. */
  waveIndex: number;
  /** Ticks waited since the active spawn groups finished. */
  waveCounter: number;
  /** Number of displayed wave groups, matching the original's grouping. */
  waveNumber: number;
  totalWaves: number;
  /** True until the player sends the first wave. */
  waitingForStart: boolean;
  preWinTicks: number;
  nextId: number;
  stats: { kills: number; leaked: number; earned: number };
  powers: PowerState;
  available: { fireball: boolean; reinforcements: boolean };
  modeData: LevelModeDefinition;
  /** Simulation speed; 1 is normal, 2 or 3 when fast-forwarding. */
  speed: number;
  /** Highest tower level buildable for each family. */
  unlockCaps: {
    archer: number;
    mage: number;
    engineer: number;
    barracks: number;
  };
}
