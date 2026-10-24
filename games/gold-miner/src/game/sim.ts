// The game simulation. No DOM, canvas, clocks, or Math.random(): `step` depends
// only on the state and the inputs, and the state is plain JSON. Rendering,
// input, sound, and screens live in other modules.
//
// The original runs its animation clips at 18 fps while the stage itself does
// nothing. This simulation ticks at 60 Hz and advances the clips by 0.3 frames
// per tick, so the timing is the same on any display and the motion is smooth.
import { goalFor, type LevelBonuses, loadMine, stepAnimals } from "./level.ts";
import { type Item, itemWeight } from "./items.ts";
import { randInt } from "./rng.ts";
import {
  CLAW_BOX,
  FRAME_STEP,
  LEVEL_SECONDS,
  PAYOUT_LENGTH,
  PIVOT_Y,
  REST_LENGTH,
  SCALE,
  WIDTH,
} from "./config.ts";
import {
  BLAST_DELAY_FRAMES,
  DYNAMITE_BLAST,
  DYNAMITE_HOMING,
  EXTENSION_END_FRAME,
  EXTENSION_FIRST_FRAME,
  EXTENSION_LAST_FRAME,
  extensionLocalY,
  PAYOUT_FRAME,
  PAYOUT_TIMING,
  randomSwingFrame,
  retractLocalY,
  retractStart,
  SWING_FIRST_FRAME,
  SWING_LAST_FRAME,
  swingDegrees,
  TNT_BLAST,
} from "./original.ts";
import { type Offer, rollOffers, type ShopItem } from "./shop.ts";

export type { LevelBonuses };

/** How the rope and claw are currently behaving. */
export interface Claw {
  state: "swing" | "extend" | "retract" | "payout";
  /** Fractional frame in the extension, retract, or payout clip. */
  frame: number;
  /** Rope length in world pixels. */
  length: number;
  /** What the claw is holding (still drawn during the payout). */
  item: Item | null;
  /** Retract clip frames advanced per original animation frame. */
  speed: number;
  /** Frames since the payout clip started at its frame 2. */
  payoutFrame: number;
  payoutKind: "empty" | "cash" | "power" | "dynamite";
  payoutAmount: number;
  /** The empty/dynamite fast retract path (`stickBonus` in the original). */
  stickBonus: boolean;
}

export interface Player {
  /** The winch's x position; the rope pivots here. */
  x: number;
  /** Fractional frame of the swinging clip (289). */
  swingFrame: number;
  claw: Claw;
}

/** A thrown stick of dynamite homing in on the claw. */
export interface Projectile {
  x: number;
  y: number;
}

/** A blast whose hit box is still counting down toward its first test. */
export interface PendingBlast {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Original animation frames until the box appears. */
  frames: number;
}

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
  /** Whole seconds left, as the original timer clip counts. */
  timeLeft: number;
  /** Fractional original frames toward the next timer tick. */
  timer: number;
  /** Base reel-in strength for this level (10, or 12 after a drink). */
  minerStrength: number;
  /** Bag power for this level; makes every retract use the fast path. */
  temporaryStrength: boolean;
  sticks: number;
  /** Bonuses bought in the shop for this level only. */
  bonuses: LevelBonuses;
  players: Player[];
  items: Item[];
  projectiles: Projectile[];
  blasts: PendingBlast[];
  shop: { offers: Offer[] } | null;
  effects: Effect[];
  events: GameEvent[];
}

export type Input =
  | { player: number; action: "fire" | "dynamite" | "continue" }
  | { player: number; action: "buy"; item: ShopItem };

const NO_BONUSES: LevelBonuses = { clover: false, rock: false, diamond: false };

function restingClaw(): Claw {
  return {
    state: "swing",
    frame: 0,
    length: REST_LENGTH,
    item: null,
    speed: 0,
    payoutFrame: 0,
    payoutKind: "empty",
    payoutAmount: 0,
    stickBonus: false,
  };
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
    timer: 0,
    minerStrength: 10,
    temporaryStrength: false,
    sticks: 0,
    bonuses: { ...NO_BONUSES },
    players: [{
      x: WIDTH / 2,
      swingFrame: SWING_FIRST_FRAME,
      claw: restingClaw(),
    }],
    items: [],
    projectiles: [],
    blasts: [],
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
  state.timeLeft = LEVEL_SECONDS;
  state.timer = 0;
  state.temporaryStrength = false;
  state.items = loadMine(state, state.level, state.bonuses, state.sticks).items;
  state.projectiles = [];
  state.blasts = [];
  state.effects = [];
  for (const player of state.players) resetClaw(state, player);
}

/** Back to the rest pose, with the swing reset like the original C clip. */
function resetClaw(state: GameState, player: Player) {
  player.swingFrame = randomSwingFrame(randInt(state, 0, 81));
  player.claw = restingClaw();
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
  for (const input of inputs) applyInput(state, input);
  stepAnimals(state.items, state);
  for (const player of state.players) stepClaw(state, player);
  stepProjectiles(state);
  stepBlasts(state);
  stepTimer(state);
}

function applyInput(state: GameState, input: Input) {
  const player = state.players[input.player];
  if (!player) return;
  const claw = player.claw;
  if (input.action === "fire") {
    if (claw.state !== "swing") return;
    claw.state = "extend";
    claw.frame = EXTENSION_FIRST_FRAME;
    claw.length = extensionLocalY(claw.frame) * SCALE;
    state.events.push({ type: "fire" });
  } else if (input.action === "dynamite") {
    if (state.sticks <= 0 || claw.state !== "retract") return;
    state.sticks--;
    state.projectiles.push({
      // The dynMov display sits to the right of the winch.
      x: player.x + 106,
      y: PIVOT_Y - 4,
    });
  }
}

/** World angle of the rope, positive to the right. */
export function clawAngle(player: Player): number {
  return -swingDegrees(player.swingFrame) * Math.PI / 180;
}

export function clawTip(player: Player): { x: number; y: number } {
  const angle = clawAngle(player);
  return {
    x: player.x + Math.sin(angle) * player.claw.length,
    y: PIVOT_Y + Math.cos(angle) * player.claw.length,
  };
}

/** Half of the rotated claw box's axis-aligned bounding box. */
function clawHalfBox(player: Player): number {
  const angle = clawAngle(player);
  return CLAW_BOX / 2 * (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)));
}

function stepClaw(state: GameState, player: Player) {
  const claw = player.claw;
  player.swingFrame += FRAME_STEP;
  while (player.swingFrame >= SWING_LAST_FRAME + 1) {
    player.swingFrame -= SWING_LAST_FRAME + 1 - SWING_FIRST_FRAME;
  }

  if (claw.state === "swing") return;

  if (claw.state === "extend") {
    claw.frame += FRAME_STEP;
    claw.length = extensionLocalY(claw.frame) * SCALE;
    const hit = findGrab(state, player);
    if (hit) {
      grab(state, player, hit);
      return;
    }
    if (claw.frame >= EXTENSION_END_FRAME) {
      // No catch: the clip reaches up42 and the empty-return child starts.
      claw.state = "retract";
      claw.frame = EXTENSION_END_FRAME;
      claw.length = retractLocalY(claw.frame) * SCALE;
      claw.item = null;
      claw.stickBonus = true;
      claw.speed = 15;
      claw.frame += 1;
      claw.length = retractLocalY(claw.frame) * SCALE;
    }
    return;
  }

  if (claw.state === "retract") {
    claw.frame += claw.speed * FRAME_STEP;
    if (claw.frame >= PAYOUT_FRAME) {
      claw.frame = PAYOUT_FRAME;
      claw.length = PAYOUT_LENGTH;
      startPayout(player);
      return;
    }
    claw.length = retractLocalY(claw.frame) * SCALE;
    hangItem(player);
    if (claw.item && state.tick % 9 === 0) {
      state.events.push({ type: "reel" });
    }
    return;
  }

  stepPayout(state, player);
}

/** The first item (in layout order) whose box overlaps the claw's box. */
function findGrab(state: GameState, player: Player): Item | null {
  const tip = clawTip(player);
  const half = clawHalfBox(player);
  for (const item of state.items) {
    if (
      Math.abs(item.x - tip.x) <= half + item.hitW / 2 &&
      Math.abs(item.y - tip.y) <= half + item.hitH / 2
    ) {
      return item;
    }
  }
  return null;
}

function grab(state: GameState, player: Player, item: Item) {
  const claw = player.claw;
  const extensionFrame = Math.min(
    EXTENSION_LAST_FRAME,
    Math.max(EXTENSION_FIRST_FRAME, Math.round(claw.frame)),
  );
  const start = retractStart(extensionFrame);

  state.items = state.items.filter((candidate) => candidate !== item);
  claw.state = "retract";
  claw.frame = start.frame;
  claw.length = start.localY * SCALE;
  claw.item = item;
  claw.stickBonus = item.weight === -1;
  claw.speed = claw.stickBonus || state.temporaryStrength
    ? 15
    : Math.max(1, state.minerStrength - item.weight);
  // A light item leaves the clip playing for one natural frame before the
  // enterFrame handler takes over.
  if (item.weight <= 1) {
    claw.frame += 1;
    claw.length = retractLocalY(claw.frame) * SCALE;
  }

  hangItem(player);
  state.events.push({
    type: itemWeight(item) >= 3 ? "grabHeavy" : "grab",
  });

  if (item.kind === "tnt") {
    // Grabbing a barrel starts its explosion clip; the hit box appears at
    // frame 9, eight original frames later.
    addExplosion(
      state,
      item.x,
      item.y,
      Math.max(TNT_BLAST.width, TNT_BLAST.height) / 2,
    );
    scheduleBlast(state, item.x, item.y, TNT_BLAST.width, TNT_BLAST.height);
  }
}

/** Keeps the held art hanging at the claw. */
function hangItem(player: Player) {
  const item = player.claw.item;
  if (!item) return;
  const tip = clawTip(player);
  const angle = clawAngle(player);
  const drop = item.artH * 0.2 + 7;
  item.x = tip.x + Math.sin(angle) * drop;
  item.y = tip.y + Math.cos(angle) * drop;
}

function startPayout(player: Player) {
  const claw = player.claw;
  claw.state = "payout";
  claw.payoutFrame = 0;
  const price = claw.item?.price;
  if (typeof price === "number" && price > 0) {
    claw.payoutKind = "cash";
    claw.payoutAmount = price;
  } else if (price === "power" || price === "dynamite") {
    claw.payoutKind = price;
    claw.payoutAmount = 0;
  } else {
    claw.payoutKind = "empty";
    claw.payoutAmount = 0;
  }
}

function stepPayout(state: GameState, player: Player) {
  const claw = player.claw;
  const before = claw.payoutFrame;
  claw.payoutFrame += FRAME_STEP;
  const now = claw.payoutFrame;

  if (claw.payoutKind === "empty") {
    if (now >= PAYOUT_TIMING.emptyEnd) resetClaw(state, player);
    return;
  }

  if (claw.payoutKind === "cash") {
    if (
      before < PAYOUT_TIMING.cashMoney && now >= PAYOUT_TIMING.cashMoney
    ) {
      const amount = claw.payoutAmount;
      state.money += amount;
      popup(state, `+$${amount}`);
      state.events.push({ type: amount >= 300 ? "cashBig" : "cash" });
    }
    if (now >= PAYOUT_TIMING.cashEnd) resetClaw(state, player);
    return;
  }

  if (claw.payoutKind === "power") {
    if (before < PAYOUT_TIMING.powerGrant && now >= PAYOUT_TIMING.powerGrant) {
      state.temporaryStrength = true;
      popup(state, "Strength!");
      state.events.push({ type: "bonus" });
    }
    if (now >= PAYOUT_TIMING.powerEnd) resetClaw(state, player);
    return;
  }

  if (
    before < PAYOUT_TIMING.dynamiteStick && now >= PAYOUT_TIMING.dynamiteStick
  ) {
    state.sticks++;
    popup(state, "+1 Dynamite!");
    state.events.push({ type: "bonus" });
  }
  if (now >= PAYOUT_TIMING.dynamiteEnd) resetClaw(state, player);
}

function stepProjectiles(state: GameState) {
  const player = state.players[0];
  if (!player) {
    state.projectiles = [];
    return;
  }
  const tip = clawTip(player);
  const half = clawHalfBox(player);
  const homing = 1 - (1 - DYNAMITE_HOMING) ** FRAME_STEP;
  const survivors: Projectile[] = [];

  for (const projectile of state.projectiles) {
    projectile.x += (tip.x - projectile.x) * homing;
    projectile.y += (tip.y - projectile.y) * homing;
    const hit = Math.abs(projectile.x - tip.x) <= half + 6 &&
      Math.abs(projectile.y - tip.y) <= half + 6;
    if (!hit) {
      survivors.push(projectile);
      continue;
    }

    addExplosion(
      state,
      projectile.x,
      projectile.y,
      Math.max(DYNAMITE_BLAST.width, DYNAMITE_BLAST.height) / 2,
    );
    scheduleBlast(
      state,
      projectile.x,
      projectile.y,
      DYNAMITE_BLAST.width,
      DYNAMITE_BLAST.height,
    );
    const claw = player.claw;
    if (claw.state === "retract") {
      claw.item = null;
      claw.stickBonus = true;
      claw.speed = 15;
    }
  }
  state.projectiles = survivors;
}

function scheduleBlast(
  state: GameState,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  state.blasts.push({ x, y, width, height, frames: BLAST_DELAY_FRAMES });
}

function stepBlasts(state: GameState) {
  if (state.blasts.length === 0) return;
  for (const blast of state.blasts) blast.frames -= FRAME_STEP;
  const due = state.blasts.filter((blast) => blast.frames <= 0);
  state.blasts = state.blasts.filter((blast) => blast.frames > 0);
  for (const blast of due) resolveBlast(state, blast);
}

function resolveBlast(state: GameState, blast: PendingBlast) {
  const caught = state.items.filter((item) =>
    Math.abs(item.x - blast.x) <= blast.width / 2 + item.hitW / 2 &&
    Math.abs(item.y - blast.y) <= blast.height / 2 + item.hitH / 2
  );
  if (caught.length === 0) return;
  state.items = state.items.filter((item) => !caught.includes(item));
  state.events.push({ type: "explode" });
  for (const item of caught) {
    if (item.kind !== "tnt") continue;
    // A caught barrel starts its own explosion clip where it stands.
    addExplosion(
      state,
      item.x,
      item.y,
      Math.max(TNT_BLAST.width, TNT_BLAST.height) / 2,
    );
    scheduleBlast(state, item.x, item.y, TNT_BLAST.width, TNT_BLAST.height);
  }
}

function addExplosion(state: GameState, x: number, y: number, radius: number) {
  state.effects.push({
    type: "explosion",
    x,
    y,
    radius,
    ttl: 47,
    maxTtl: 47,
  });
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

function stepTimer(state: GameState) {
  state.timer += FRAME_STEP;
  // One displayed second per 18 frames, stretched to 21 with ten seconds or
  // less. At zero, while a cash payout is busy, the clip waits 18 frames and
  // checks again instead of ending the level.
  const period = state.timeLeft <= 0 ? 18 : state.timeLeft <= 10 ? 21 : 18;
  if (state.timer < period) return;
  state.timer -= period;
  if (state.timeLeft > 0) state.timeLeft--;
  if (state.timeLeft <= 0 && !isBusy(state)) endLevel(state);
}

/** True while a cash payout holds the timer at zero (the original `/:busy`). */
export function isBusy(state: GameState): boolean {
  return state.players.some((player) =>
    player.claw.state === "payout" &&
    player.claw.payoutKind === "cash" &&
    player.claw.payoutFrame >= 2
  );
}

function endLevel(state: GameState) {
  state.items = [];
  state.projectiles = [];
  state.blasts = [];
  state.effects = [];
  state.temporaryStrength = false;
  for (const player of state.players) player.claw = restingClaw();

  if (state.money < state.goal) {
    state.phase = "gameOver";
    state.events.push({ type: "gameOver" });
    return;
  }

  // The original shop entry clears the level bonuses and base strength before
  // the shop rolls; purchases then apply to the next level only.
  state.minerStrength = 10;
  state.bonuses = { ...NO_BONUSES };
  state.shop = {
    offers: rollOffers(state, state.level, state.sticks),
  };
  state.phase = "shop";
  state.events.push({ type: "levelClear" });
}

function stepShop(state: GameState, inputs: Input[]) {
  for (const input of inputs) {
    if (input.action === "buy") {
      buy(state, input.item);
    } else if (input.action === "continue") {
      state.shop = null;
      state.level++;
      startLevel(state);
      return;
    }
  }
}

function buy(state: GameState, item: ShopItem) {
  const offer = state.shop?.offers.find((candidate) => candidate.item === item);
  if (!offer?.available || offer.sold) return;
  // The original never blocks a purchase: the price is simply subtracted.
  state.money -= offer.price;
  offer.sold = true;
  if (item === "dynamite") {
    state.sticks++;
  } else if (item === "strength") {
    state.minerStrength += 2;
  } else if (item === "clover") {
    state.bonuses.clover = true;
  } else if (item === "book") {
    state.bonuses.rock = true;
  } else {
    state.bonuses.diamond = true;
  }
  state.events.push({ type: "buy" });
}
