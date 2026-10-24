export type DefenderId =
  | "grandma"
  | "grandpa"
  | "muscle"
  | "tinker"
  | "auntie"
  | "kid";

export type EnemyId =
  | "grunt"
  | "brute"
  | "worker"
  | "biker"
  | "breaker"
  | "excavator";

export type WeaponKind =
  | "slipper"
  | "rifle"
  | "dumbbell"
  | "catapult"
  | "bottle"
  | "cracker";

export type Phase = "playing" | "won" | "lost";

export type SoundName =
  | "click"
  | "error"
  | "deploy"
  | "upgrade"
  | "coin"
  | "heal"
  | "slipper"
  | "rifle"
  | "dumbbell"
  | "catapult"
  | "bottle"
  | "cracker"
  | "impact"
  | "burn"
  | "house-hit"
  | "death"
  | "win"
  | "lose";

export interface DefenderDef {
  id: DefenderId;
  name: string;
  role: string;
  weapon: WeaponKind;
  /** Damage per hit at levels 1-5. */
  power: readonly number[];
  /** Seconds between attacks at levels 1-5. */
  interval: readonly number[];
  /** Furthest enemy x-coordinate the defender can target. */
  range: number;
  /** Deploy plus four upgrade prices. */
  cost: readonly [number, number, number, number, number];
  /** Whether launching the weapon reserves damage on the target. */
  reserves: boolean;
  /** Duration of the attack pose, in ticks. */
  attackTicks: number;
  /** Launch position relative to the window. */
  muzzleX: number;
  muzzleY: number;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  /** Pixels per tick. */
  speed: number;
  /** Money awarded on a kill. */
  money: number;
  /** Distance from the house where this enemy stops. */
  range: number;
}

export interface WaveSpec {
  enemy: EnemyId;
  startTime: number;
  interval: number;
  min: number;
  count: number;
}

export interface WaveState extends WaveSpec {
  /** Enemies not yet spawned. */
  remaining: number;
  /** Ticks until the next spawn. */
  cd: number;
}

export interface DefenderState {
  id: number;
  type: DefenderId;
  level: number;
  slot: number;
  cooldown: number;
  targetId: number | null;
  anim: number;
}

export interface EnemyState {
  id: number;
  type: EnemyId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  range: number;
  hp: number;
  maxHp: number;
  /** Damage already promised by an in-flight weapon, used for targeting. */
  reserved: number;
  alive: boolean;
  slow: number;
  attacking: boolean;
  attackCd: number;
  /** Ticks since death, or -1 while alive. */
  death: number;
}

export interface ProjectileState {
  id: number;
  kind: WeaponKind;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetId: number | null;
  targetX: number;
  targetY: number;
  duration: number;
  elapsed: number;
  arc: number;
  power: number;
  effect: number;
  rotation: number;
  spin: number;
}

export interface FireState {
  id: number;
  x: number;
  y: number;
  radius: number;
  power: number;
  ticksLeft: number;
  nextTick: number;
}

export interface RingState {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  width: number;
}

export interface FloaterState {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface GameState {
  level: number;
  survival: boolean;
  tick: number;
  phase: Phase;
  hp: number;
  money: number;
  defenders: DefenderState[];
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  fires: FireState[];
  rings: RingState[];
  floaters: FloaterState[];
  waves: WaveState[];
  spawns: number;
  kills: number;
  /** Ticks of house shaking after a hit. */
  shake: number;
  leafClicks: number;
  leafFlash: number;
  /** Ticks left before the victory screen, while the last bodies fade. */
  winCountdown: number;
  nextId: number;
  /** Sounds generated since the session last drained this list. */
  events: SoundName[];
}
