// The game simulation. No DOM, canvas, clocks, or Math.random(): `step` depends
// only on the state and the inputs, and the state is plain JSON. Rendering,
// input, sound, and screens live in other modules.
import { generateItems, goalFor } from "./level.ts";
import { type Item, itemWeight, KINDS } from "./items.ts";
import { randInt, random } from "./rng.ts";

import {
  BAG_REWARDS,
  CLAW_RADIUS,
  DT,
  DYNAMITE_RADIUS,
  EXPLOSION_RADIUS,
  EXTEND_SPEED,
  HEIGHT,
  LEVEL_SECONDS,
  PIVOT_Y,
  REST_LENGTH,
  RETRACT_SPEED,
  STRENGTH_MULTIPLIER,
  SWING_LIMIT,
  SWING_SPEED,
  TICK_RATE,
  WIDTH,
} from "./config.ts";
import { type Offer, rollOffers, type ShopItem } from "./shop.ts";

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
  /** Cooperative players must both be ready to leave the shop. */
  ready: boolean[];
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

export function createGame(seed: number, playerCount: 1 | 2 = 1): GameState {
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
    players: Array.from({ length: playerCount }, (_, i) => ({
      x: playerCount === 1 ? WIDTH / 2 : WIDTH * (i === 0 ? 0.28 : 0.68),
      claw: restingClaw(),
    })),
    ready: Array.from({ length: playerCount }, () => false),
    items: [],
    shop: null,
    effects: [],
    events: [],
  };
  startLevel(state);
  return state;
}

function startLevel(state: GameState) {
  state.ready.fill(false);
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
      blast(state, x, y, DYNAMITE_RADIUS);
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
    const heavy = itemWeight(hit) >= 3;
    state.events.push({ type: heavy ? "grabHeavy" : "grab" });
    return;
  }

  const weight = claw.item ? itemWeight(claw.item) : 1;
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
  blast(state, tnt.x, tnt.y, EXPLOSION_RADIUS);
}

function blast(state: GameState, x: number, y: number, radius: number) {
  state.effects.push(explosion(x, y, radius));
  state.events.push({ type: "explode" });
  const caught = state.items.filter(
    (item) => Math.hypot(item.x - x, item.y - y) < radius + item.r,
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
    if (roll < BAG_REWARDS.dynamiteChance) {
      state.dynamite++;
      popup(state, "+1 Dynamite!");
      state.events.push({ type: "bonus" });
      return;
    }
    if (
      roll < BAG_REWARDS.dynamiteChance + BAG_REWARDS.strengthChance &&
      !state.boosts.strength
    ) {
      state.boosts.strength = true;
      popup(state, "Strength!");
      state.events.push({ type: "bonus" });
      return;
    }
    const amount = state.boosts.clover
      ? randInt(state, BAG_REWARDS.luckyCashMin, BAG_REWARDS.luckyCashMax)
      : randInt(state, BAG_REWARDS.cashMin, BAG_REWARDS.cashMax);
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
    state.shop = { offers: rollOffers(state, state.level) };
    state.events.push({ type: "levelClear" });
  } else {
    state.phase = "gameOver";
    state.events.push({ type: "gameOver" });
  }
}

function stepShop(state: GameState, inputs: Input[]) {
  const shop = state.shop;
  if (!shop) return;
  for (const input of inputs) {
    if (!state.players[input.player]) continue;
    if (input.action === "buy") {
      const offer = shop.offers.find((o) => o.item === input.item && !o.sold);
      if (!offer || state.money < offer.price) continue;
      state.ready.fill(false);
      state.money -= offer.price;
      offer.sold = true;
      if (offer.item === "dynamite") state.dynamite++;
      else state.boosts[offer.item] = true;
      state.events.push({ type: "buy" });
    } else if (input.action === "continue") {
      state.ready[input.player] = true;
      if (!state.ready.every(Boolean)) continue;
      state.shop = null;
      state.level++;
      startLevel(state);
      return;
    }
  }
}
