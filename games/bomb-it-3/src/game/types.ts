export type Mode = "arcade" | "battle" | "water" | "race";
export type Theme = "farm" | "shop" | "city" | "water";
export type Difficulty = "easy" | "normal" | "hard";
export type Direction = "up" | "down" | "left" | "right";
export type Weapon =
  | "bomb"
  | "hammer"
  | "water"
  | "laser"
  | "flame"
  | "rocket"
  | "grenade"
  | "bowling";
export type Ride = "horse" | "bike" | "car" | "hovercraft";
export type Item =
  | Weapon
  | Ride
  | "power"
  | "capacity"
  | "speed"
  | "kick"
  | "shield"
  | "invincible"
  | "life";
export interface Settings {
  mode: Mode;
  theme: Theme | "random";
  players: 1 | 2;
  enemies: number;
  difficulty: Difficulty;
  levels: number;
  characters: [number, number];
}
export interface Input {
  direction: Direction | null;
  action: boolean;
}
export interface Point {
  x: number;
  y: number;
}
export interface Player extends Point {
  id: number;
  character: number;
  human: boolean;
  spawn: Point;
  direction: Direction;
  alive: boolean;
  respawn: number;
  invincible: number;
  shield: boolean;
  ride: Ride | null;
  power: number;
  capacity: number;
  speed: number;
  kick: boolean;
  weapon: Weapon;
  ammo: number;
  cooldown: number;
  moving: boolean;
  kills: number;
  checkpoints: number;
  score: number;
  lives: number;
  aiDirection: Direction | null;
  aiNext: number;
  aiAction: boolean;
  stuck: number;
  lastX: number;
  lastY: number;
  featureCooldown: number;
  stun: number;
}
export interface Bomb extends Point {
  id: number;
  owner: number;
  fuse: number;
  power: number;
  pass: number[];
  direction: Direction | null;
  slide: number;
}
export interface Fire extends Point {
  owner: number;
  ttl: number;
  kind: "fire" | "laser" | "water";
}
export interface Pickup extends Point {
  kind: Item;
  delay: number;
}
export interface Projectile extends Point {
  owner: number;
  direction: Direction;
  kind: Weapon;
  ttl: number;
  distance: number;
}
export interface Feature extends Point {
  kind: string;
  direction: Direction;
  phase: number;
  origin: Point;
}
export interface GameEvent extends Point {
  kind: "bomb" | "blast" | "pickup" | "hit" | "shot" | "checkpoint";
  owner: number;
}
export interface State {
  settings: Settings;
  seed: number;
  tick: number;
  time: number;
  level: number;
  theme: Theme;
  layout: string;
  tiles: number[];
  hidden: (Item | null)[];
  players: Player[];
  bombs: Bomb[];
  fire: Fire[];
  pickups: Pickup[];
  projectiles: Projectile[];
  features: Feature[];
  routes: Point[][];
  status: "playing" | "won" | "lost";
  events: GameEvent[];
  nextId: number;
}
export const COLS = 17;
export const ROWS = 15;
export const HZ = 30;
export const WALL = 1;
export const BOX = 2;
export const PIT = 3;
export const DIRECTIONS: Direction[] = ["up", "right", "down", "left"];
export const VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};
export const index = (x: number, y: number) => y * COLS + x;
export const cell = (p: Point): Point => ({
  x: Math.round(p.x),
  y: Math.round(p.y),
});
export const sameCell = (a: Point, b: Point) =>
  Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y);
export function tile(s: State, x: number, y: number): number {
  return x < 0 || x >= COLS || y < 0 || y >= ROWS ? WALL : s.tiles[index(x, y)];
}
export function random(s: { seed: number }): number {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
