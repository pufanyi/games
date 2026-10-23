// The game simulation. No DOM, canvas, clocks, or Math.random(): `step` depends
// only on the state and the inputs, and the state is plain JSON. Rendering,
// input, sound, and screens live in other modules.
import {
  generateItems,
  goalFor,
  HEIGHT,
  type Item,
  KINDS,
  WIDTH,
} from "./level.ts";
import { chance, randInt, random } from "./rng.ts";

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;
export const LEVEL_SECONDS = 60;
/** Where the rope leaves the winch. */
export const PIVOT_Y = 108;

export const SWING_LIMIT = (70 * Math.PI) / 180;
const SWING_SPEED = 1.9; // rad/s
export const REST_LENGTH = 28;
const EXTEND_SPEED = 380; // px/s
const RETRACT_SPEED = 560; // px/s with nothing attached
const STRENGTH_MULTIPLIER = 1.6;
const CLAW_RADIUS = 8;
export const EXPLOSION_RADIUS = 110;

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
    description: "Press ↑ while reeling in to blow up what you're holding.",
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

export interface Claw {
  state: "swing" | "extend" | "retract";
  /** Radians from straight down; positive swings right. */
  angle: number;
  /** Swing direction, 1 or -1. */
  dir: number;
  /** Rope length in px. */
  length: number;
  /** What the claw is holding. */
  item: Item | null;
}

export interface Player {
  x: number;
  claw: Claw;
}

export type Boosts = Record<Exclude<ShopItem, "dynamite">, boolean>;

export type Effect =
  | {
    type: "explosion";
    x: number;
    y: number;
    radius: number;
    ttl: number;
    maxTtl: number;
  }
  | {
    type: "popup";
    x: number;
    y: number;
    text: string;
    ttl: number;
    maxTtl: number;
  };

/** Something that just happened, for sound. Cleared at the start of each step. */
export interface GameEvent {
  type:
    | "fire"
    | "grab"
    | "grabHeavy"
    | "reel"
    | "cash"
    | "cashBig"
    | "explode"
    | "bonus"
    | "buy"
    | "levelClear"
    | "gameOver";
}

export interface Offer {
  item: ShopItem;
  price: number;
  sold: boolean;
}

export interface GameState {
  seed: number;
  rng: number;
  nextId: number;
  tick: number;
  phase: "playing" | "shop" | "gameOver";
  level: number;
  money: number;
  /** Cumulative money needed to clear this level. */
  goal: number;
  /** Ticks left in the level. */
  timeLeft: number;
  dynamite: number;
  /** Active this level. */
  boosts: Boosts;
  players: Player[];
  items: Item[];
  shop: { offers: Offer[] } | null;
  effects: Effect[];
  events: GameEvent[];
}

export type Input =
  | { player: number; action: "fire" | "dynamite" | "continue" }
  | { player: number; action: "buy"; item: ShopItem };

function noBoosts(): Boosts {
  return { strength: false, clover: false, book: false, polish: false };
}

function restingClaw(): Claw {
  return { state: "swing", angle: 0, dir: 1, length: REST_LENGTH, item: null };
}

export function createGame(seed: number): GameState {
  const state: GameState = {
    seed,
    rng: seed >>> 0,
    nextId: 1,
    tick: 0,
    phase: "playing",
    level: 1,
    money: 0,
    goal: 0,
    timeLeft: 0,
    dynamite: 0,
    boosts: noBoosts(),
    players: [{ x: WIDTH / 2, claw: restingClaw() }],
    items: [],
    shop: null,
    effects: [],
    events: [],
  };
  startLevel(state);
  return state;
}

function startLevel(state: GameState) {
  state.phase = "playing";
  state.goal = goalFor(state.level);
  state.timeLeft = LEVEL_SECONDS * TICK_RATE;
  state.items = generateItems(state, state.level);
  state.effects = [];
  for (const player of state.players) player.claw = restingClaw();
}

/** Advances the game by one tick. */
export function step(state: GameState, inputs: Input[] = []) {
  state.events = [];
  state.tick++;
  if (state.phase === "playing") stepPlaying(state, inputs);
  else if (state.phase === "shop") stepShop(state, inputs);

  for (const effect of state.effects) effect.ttl--;
  state.effects = state.effects.filter((effect) => effect.ttl > 0);
}

function stepPlaying(state: GameState, inputs: Input[]) {
  for (const input of inputs) {
    const claw = state.players[input.player]?.claw;
    if (!claw) continue;
    if (input.action === "fire" && claw.state === "swing") {
      claw.state = "extend";
      state.events.push({ type: "fire" });
    } else if (
      input.action === "dynamite" && claw.state === "retract" && claw.item &&
      state.dynamite > 0
    ) {
      state.dynamite--;
      const { x, y } = claw.item;
      claw.item = null;
      state.effects.push(explosion(x, y, 50));
      state.events.push({ type: "explode" });
    }
  }

  for (const item of state.items) {
    if (item.kind !== "mole" || item.vx === undefined) continue;
    const minX = item.minX ?? 0;
    const maxX = item.maxX ?? WIDTH;
    item.x += item.vx * DT;
    if (item.x < minX || item.x > maxX) {
      item.vx = -item.vx;
      item.x = Math.min(Math.max(item.x, minX), maxX);
    }
  }

  for (const player of state.players) stepClaw(state, player);

  state.timeLeft--;
  const idle = state.players.every((p) => p.claw.state === "swing");
  if (state.timeLeft <= 0 || (state.items.length === 0 && idle)) {
    endLevel(state);
  }
}

export function clawTip(player: Player): { x: number; y: number } {
  const { angle, length } = player.claw;
  return {
    x: player.x + Math.sin(angle) * length,
    y: PIVOT_Y + Math.cos(angle) * length,
  };
}

function stepClaw(state: GameState, player: Player) {
  const claw = player.claw;

  if (claw.state === "swing") {
    claw.angle += claw.dir * SWING_SPEED * DT;
    if (Math.abs(claw.angle) >= SWING_LIMIT) {
      claw.angle = Math.sign(claw.angle) * SWING_LIMIT;
      claw.dir = -claw.dir;
    }
    return;
  }

  if (claw.state === "extend") {
    claw.length += EXTEND_SPEED * DT;
    const tip = clawTip(player);
    if (tip.x < 0 || tip.x > WIDTH || tip.y > HEIGHT) {
      claw.state = "retract";
      return;
    }
    const hit = nearestHit(state.items, tip);
    if (!hit) return;
    claw.state = "retract";
    if (hit.kind === "tnt") {
      explode(state, hit);
      return;
    }
    state.items = state.items.filter((item) => item !== hit);
    claw.item = hit;
    hangFromClaw(player);
    const heavy = KINDS[hit.kind].weight >= 3;
    state.events.push({ type: heavy ? "grabHeavy" : "grab" });
    return;
  }

  const weight = claw.item ? KINDS[claw.item.kind].weight : 1;
  const strength = state.boosts.strength ? STRENGTH_MULTIPLIER : 1;
  claw.length -= (RETRACT_SPEED / weight) * strength * DT;
  if (claw.item) {
    hangFromClaw(player);
    if (state.tick % 9 === 0) state.events.push({ type: "reel" });
  }
  if (claw.length <= REST_LENGTH) {
    const item = claw.item;
    player.claw = { ...restingClaw(), angle: claw.angle, dir: claw.dir };
    if (item) deliver(state, item);
  }
}

/** The closest item the claw tip is touching, if any. */
function nearestHit(items: Item[], tip: { x: number; y: number }) {
  let best: Item | null = null;
  let bestDistance = Infinity;
  for (const item of items) {
    const distance = Math.hypot(item.x - tip.x, item.y - tip.y);
    if (distance < item.r + CLAW_RADIUS && distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }
  return best;
}

/** Moves the held item so it hangs just below the claw. */
function hangFromClaw(player: Player) {
  const item = player.claw.item;
  if (!item) return;
  const tip = clawTip(player);
  const offset = item.r * 0.8;
  item.x = tip.x + Math.sin(player.claw.angle) * offset;
  item.y = tip.y + Math.cos(player.claw.angle) * offset;
}

/** Blows up a TNT barrel and everything near it, setting off other barrels. */
function explode(state: GameState, tnt: Item) {
  state.items = state.items.filter((item) => item !== tnt);
  state.effects.push(explosion(tnt.x, tnt.y, EXPLOSION_RADIUS));
  state.events.push({ type: "explode" });
  const caught = state.items.filter(
    (item) =>
      Math.hypot(item.x - tnt.x, item.y - tnt.y) < EXPLOSION_RADIUS + item.r,
  );
  state.items = state.items.filter((item) => !caught.includes(item));
  for (const item of caught) {
    if (item.kind === "tnt") {
      state.items.push(item);
      explode(state, item);
    }
  }
}

function explosion(x: number, y: number, radius: number): Effect {
  return { type: "explosion", x, y, radius, ttl: 30, maxTtl: 30 };
}

/** Floats `text` up from the sky to the left of the winch. */
function popup(state: GameState, text: string) {
  state.effects.push({
    type: "popup",
    x: WIDTH / 2 - 130,
    y: 80,
    text,
    ttl: 60,
    maxTtl: 60,
  });
}

/** What an item pays out right now, counting this level's boosts. */
export function itemValue(state: GameState, item: Item): number {
  const base = KINDS[item.kind].value;
  const diamond = KINDS.diamond.value * (state.boosts.polish ? 1.5 : 1);
  switch (item.kind) {
    case "rockSmall":
    case "rockLarge":
      return base * (state.boosts.book ? 3 : 1);
    case "diamond":
      return diamond;
    case "mole":
      return base + (item.carrying ? diamond : 0);
    default:
      return base;
  }
}

/** Pays out an item that reached the top. */
function deliver(state: GameState, item: Item) {
  if (item.kind === "bag") {
    const roll = random(state);
    if (roll < 0.2) {
      state.dynamite++;
      popup(state, "+1 Dynamite!");
      state.events.push({ type: "bonus" });
      return;
    }
    if (roll < 0.35 && !state.boosts.strength) {
      state.boosts.strength = true;
      popup(state, "Strength!");
      state.events.push({ type: "bonus" });
      return;
    }
    const amount = state.boosts.clover
      ? randInt(state, 150, 800)
      : randInt(state, 20, 400);
    earn(state, amount);
    return;
  }
  earn(state, Math.round(itemValue(state, item)));
}

function earn(state: GameState, amount: number) {
  state.money += amount;
  popup(state, `+$${amount}`);
  state.events.push({ type: amount >= 300 ? "cashBig" : "cash" });
}

function endLevel(state: GameState) {
  for (const player of state.players) player.claw = restingClaw();
  state.items = [];
  state.boosts = noBoosts();
  if (state.money >= state.goal) {
    state.phase = "shop";
    state.shop = { offers: rollOffers(state) };
    state.events.push({ type: "levelClear" });
  } else {
    state.phase = "gameOver";
    state.events.push({ type: "gameOver" });
  }
}

/** A random selection of shop items at random prices; never empty. */
function rollOffers(state: GameState): Offer[] {
  const all = Object.keys(SHOP_ITEMS) as ShopItem[];
  let picked = all.filter(() => chance(state, 0.6));
  if (picked.length === 0) picked = [all[randInt(state, 0, all.length - 1)]];
  return picked.map((item) => {
    const { min, max, perLevel } = SHOP_ITEMS[item];
    const price = randInt(state, min, max) + perLevel * (state.level - 1);
    return { item, price, sold: false };
  });
}

function stepShop(state: GameState, inputs: Input[]) {
  const shop = state.shop;
  if (!shop) return;
  for (const input of inputs) {
    if (input.action === "buy") {
      const offer = shop.offers.find((o) => o.item === input.item && !o.sold);
      if (!offer || state.money < offer.price) continue;
      state.money -= offer.price;
      offer.sold = true;
      if (offer.item === "dynamite") state.dynamite++;
      else state.boosts[offer.item] = true;
      state.events.push({ type: "buy" });
    } else if (input.action === "continue") {
      state.shop = null;
      state.level++;
      startLevel(state);
      return;
    }
  }
}
