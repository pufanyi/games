import { assert, assertEquals } from "@std/assert";
import { goalFor } from "./level.ts";
import { type Kind, KINDS } from "./items.ts";
import {
  createGame,
  type GameEvent,
  type GameState,
  type Input,
  itemValue,
  step,
} from "./sim.ts";
import {
  LEVEL_SECONDS,
  PIVOT_Y,
  REST_LENGTH,
  SWING_LIMIT,
  TICK_RATE,
} from "./config.ts";

/** A game with one item straight below the miner and the claw pointing at it. */
function aimedAt(kind: Kind, depth = 300) {
  const state = createGame(1);
  const player = state.players[0];
  state.items = [
    { id: 999, kind, x: player.x, y: PIVOT_Y + depth, r: KINDS[kind].r },
  ];
  player.claw.angle = 0;
  return state;
}

/** Fires and steps until the claw is back; returns the ticks it took. */
function fireAndWait(state: GameState) {
  step(state, [{ player: 0, action: "fire" }]);
  let ticks = 1;
  while (state.players[0].claw.state !== "swing" && ticks < 10_000) {
    step(state);
    ticks++;
  }
  return ticks;
}

/** Runs out the level clock. */
function finishLevel(state: GameState) {
  state.timeLeft = 1;
  step(state);
}

Deno.test("same seed builds the same mine", () => {
  assertEquals(createGame(42), createGame(42));
  assert(
    JSON.stringify(createGame(42).items) !==
      JSON.stringify(createGame(43).items),
  );
});

Deno.test("items don't overlap and every level can reach its goal", () => {
  for (let seed = 1; seed <= 25; seed++) {
    const state = createGame(seed);
    for (let level = 1; level <= 8; level++) {
      const { items } = state;
      for (const a of items) {
        for (const b of items) {
          if (a === b) continue;
          assert(Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r, "overlap");
        }
      }
      const value = items.reduce(
        (sum, item) => sum + KINDS[item.kind].value,
        0,
      );
      const needed = goalFor(level) - (level > 1 ? goalFor(level - 1) : 0);
      assert(value >= needed, `seed ${seed} level ${level}: ${value}`);

      state.money = state.goal;
      finishLevel(state);
      step(state, [{ player: 0, action: "continue" }]);
    }
  }
});

Deno.test("the claw swings within its limits", () => {
  const state = createGame(7);
  let min = 0;
  let max = 0;
  for (let i = 0; i < TICK_RATE * 10; i++) {
    step(state);
    min = Math.min(min, state.players[0].claw.angle);
    max = Math.max(max, state.players[0].claw.angle);
  }
  assertEquals(max, SWING_LIMIT);
  assertEquals(min, -SWING_LIMIT);
});

Deno.test("grabbing gold pays out when it reaches the top", () => {
  const state = aimedAt("goldSmall");
  fireAndWait(state);
  assertEquals(state.money, KINDS.goldSmall.value);
  assertEquals(state.items.length, 0);
  assertEquals(state.players[0].claw.length, REST_LENGTH);
});

Deno.test("heavy items reel in more slowly", () => {
  const light = fireAndWait(aimedAt("goldSmall"));
  const heavy = fireAndWait(aimedAt("goldHuge"));
  assert(heavy > light * 2, `light ${light}, heavy ${heavy}`);
});

Deno.test("firing is ignored while the claw is out", () => {
  const state = aimedAt("goldSmall");
  step(state, [{ player: 0, action: "fire" }]);
  const events: GameEvent[] = [];
  for (let i = 0; i < 5; i++) {
    step(state, [{ player: 0, action: "fire" }]);
    events.push(...state.events);
  }
  assertEquals(events.filter((e) => e.type === "fire"), []);
});

Deno.test("a miss comes back empty", () => {
  const state = aimedAt("goldSmall", 900);
  fireAndWait(state);
  assertEquals(state.money, 0);
  assertEquals(state.items.length, 1);
});

Deno.test("dynamite destroys what the claw is holding", () => {
  const state = aimedAt("rockLarge");
  state.dynamite = 1;
  step(state, [{ player: 0, action: "fire" }]);
  while (state.players[0].claw.state !== "retract") step(state);
  step(state, [{ player: 0, action: "dynamite" }]);
  assertEquals(state.players[0].claw.item, null);
  assertEquals(state.dynamite, 0);
  fireAndWait(state);
  assertEquals(state.money, 0);
});

Deno.test("TNT blows up nearby items", () => {
  const state = aimedAt("tnt");
  const { x, y } = state.items[0];
  state.items.push(
    { id: 1, kind: "goldLarge", x: x + 70, y, r: KINDS.goldLarge.r },
    { id: 2, kind: "diamond", x: x - 400, y, r: KINDS.diamond.r },
  );
  fireAndWait(state);
  assertEquals(state.items.map((item) => item.kind), ["diamond"]);
  assertEquals(state.money, 0);
});

Deno.test("missing the goal ends the game", () => {
  const state = createGame(3);
  for (let i = 0; i < LEVEL_SECONDS * TICK_RATE; i++) step(state);
  assertEquals(state.phase, "gameOver");
});

Deno.test("clearing the goal opens the shop, and buying spends money", () => {
  const state = createGame(3);
  state.money = state.goal + 1000;
  finishLevel(state);
  assertEquals(state.phase, "shop");
  const offer = state.shop?.offers[0];
  assert(offer);
  const before = state.money;
  step(state, [{ player: 0, action: "buy", item: offer.item }]);
  assertEquals(state.money, before - offer.price);
  assert(offer.sold);

  step(state, [{ player: 0, action: "continue" }]);
  assertEquals(state.phase, "playing");
  assertEquals(state.level, 2);
  assertEquals(state.goal, goalFor(2));
  if (offer.item === "dynamite") assertEquals(state.dynamite, 1);
  else assert(state.boosts[offer.item]);
});

Deno.test("the state survives a JSON round trip", () => {
  const original = createGame(11);
  const copy = JSON.parse(JSON.stringify(original));
  const inputs: Input[] = [{ player: 0, action: "fire" }];
  for (let i = 0; i < 600; i++) {
    step(original, i === 30 ? inputs : []);
    step(copy, i === 30 ? inputs : []);
  }
  assertEquals(copy, original);
});

Deno.test("gold payouts have all four classic denominations", () => {
  for (
    const [kind, value] of [
      ["goldSmall", 50],
      ["goldMedium", 100],
      ["goldLarge", 250],
      ["goldHuge", 500],
    ] as const
  ) {
    const state = aimedAt(kind);
    fireAndWait(state);
    assertEquals(state.money, value);
  }
});

/** Measures only the return journey, with another item keeping the level open. */
function returnTime(kind: Kind, strength = false, weight?: number) {
  const state = aimedAt(kind);
  const claw = state.players[0].claw;
  const item = state.items[0];
  item.weight = weight;
  state.items = [{ id: 1000, kind: "bone", x: 30, y: 500, r: 14 }];
  claw.item = item;
  claw.length = REST_LENGTH + 350;
  claw.state = "retract";
  state.boosts.strength = strength;
  let ticks = 0;
  while (state.players[0].claw.state === "retract" && ticks < 3600) {
    step(state);
    ticks++;
  }
  assertEquals(state.players[0].claw.state, "swing");
  return ticks / TICK_RATE;
}

Deno.test("heavy gold takes seconds to haul and strength saves about eight", () => {
  const normal = returnTime("goldHuge");
  const boosted = returnTime("goldHuge", true);
  assert(normal >= 12 && normal <= 13);
  assert(boosted >= 4.9 && boosted <= 5.1);
  assert(normal - boosted >= 7 && normal - boosted <= 8);
  assert(returnTime("diamond") < 1);
  assert(returnTime("rockLarge") > normal);
});

Deno.test("bag weight affects hauling without changing its appearance", () => {
  assert(returnTime("bag", false, 20) > returnTime("bag", false, 1.4) * 10);
  const weights = new Set<number>();
  for (let seed = 1; seed <= 100; seed++) {
    const game = createGame(seed);
    for (const item of game.items.filter((i) => i.kind === "bag")) {
      assert(item.weight !== undefined);
      weights.add(item.weight);
      assertEquals(item.r, KINDS.bag.r);
    }
    assert(!game.items.some((i) => i.kind === "diamond"));
  }
  assertEquals(weights.size, 4);
});

Deno.test("dynamite damages nearby treasure and triggers TNT chains", () => {
  const state = aimedAt("rockLarge");
  const claw = state.players[0].claw;
  claw.item = state.items[0];
  claw.state = "retract";
  claw.length = 300;
  const { x, y } = claw.item;
  state.items = [
    { id: 1, kind: "goldSmall", x: x + 30, y, r: 13 },
    { id: 2, kind: "tnt", x: x + 50, y, r: 17 },
    { id: 3, kind: "tnt", x: x + 150, y, r: 17 },
    { id: 4, kind: "diamond", x: x + 240, y, r: 10 },
    { id: 5, kind: "diamond", x: 20, y: 550, r: 10 },
  ];
  state.dynamite = 1;
  step(state, [{ player: 0, action: "dynamite" }]);
  assertEquals(claw.item, null);
  assertEquals(state.items.map((i) => i.id), [5]);
  assertEquals(state.money, 0);
  assertEquals(state.dynamite, 0);
  assertEquals(state.events.filter((e) => e.type === "explode").length, 3);
});

Deno.test("classic shop boosts preserve diamond and rock payouts", () => {
  const state = aimedAt("diamond");
  state.boosts.polish = true;
  assertEquals(itemValue(state, state.items[0]), 900);
  state.boosts.book = true;
  assertEquals(itemValue(state, { ...state.items[0], kind: "rockSmall" }), 33);
});

Deno.test("bags can award small and large cash payouts without a clover", () => {
  let min = Infinity;
  let max = 0;
  for (let seed = 1; seed <= 2000; seed++) {
    const state = aimedAt("bag");
    state.rng = seed;
    const claw = state.players[0].claw;
    claw.item = state.items[0];
    claw.state = "retract";
    claw.length = REST_LENGTH + 1;
    state.items = [];
    step(state);
    if (state.money > 0) {
      min = Math.min(min, state.money);
      max = Math.max(max, state.money);
    }
  }
  assert(min < 20, `minimum payout: ${min}`);
  assert(max > 790, `maximum payout: ${max}`);
});
