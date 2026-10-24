import { assert, assertEquals } from "@std/assert";
import { CARD_ORDER, DEFENDERS } from "./catalog.ts";
import { CARD_MAX_LEVEL } from "./config.ts";
import { cardState, purchase } from "./shop.ts";
import { createGame } from "./sim.ts";

Deno.test("deploying costs 100 and fills a slot", () => {
  const state = createGame(1);
  state.money = 100;
  assert(purchase(state, "grandma"));
  assertEquals(state.money, 0);
  assertEquals(state.defenders.length, 1);
  assertEquals(state.defenders[0].type, "grandma");
  assertEquals(state.defenders[0].level, 1);
  assertEquals(state.defenders[0].slot, 0);
  assert(!purchase(state, "grandpa"), "no money for a second member");
  assertEquals(state.defenders.length, 1);
});

Deno.test("the house holds four family members", () => {
  const state = createGame(1);
  state.money = 10_000;
  for (const type of ["grandma", "grandpa", "muscle", "tinker"] as const) {
    assert(purchase(state, type));
  }
  assertEquals(state.defenders.map((defender) => defender.slot), [0, 1, 2, 3]);
  assert(!purchase(state, "auntie"));
  assertEquals(state.defenders.length, 4);
});

Deno.test("upgrading keeps the same defender and charges the next price", () => {
  const state = createGame(1);
  state.money = 10_000;
  purchase(state, "grandma");
  const before = state.defenders[0];
  assert(purchase(state, "grandma"));
  assertEquals(state.defenders[0].level, 2);
  assertEquals(state.defenders[0].id, before.id);
  assertEquals(state.money, 10_000 - 100 - 200);
  state.money = 0;
  assert(!purchase(state, "grandma"));
});

Deno.test("unbought cards have no stars and maxed cards cannot spend money", () => {
  for (const type of CARD_ORDER) {
    const state = createGame(1);
    state.money = 10_000;
    assertEquals(cardState(state, type).level, 0);
    for (let level = 0; level < CARD_MAX_LEVEL; level++) {
      assert(purchase(state, type));
    }
    const money = 10_000 -
      DEFENDERS[type].cost.reduce((sum, cost) => sum + cost, 0);
    assertEquals(state.money, money);
    assertEquals(cardState(state, type).level, CARD_MAX_LEVEL);
    assert(cardState(state, type).maxed);
    assert(!cardState(state, type).affordable);
    assert(!purchase(state, type));
    assertEquals(state.money, money);
  }
});

Deno.test("a full house can still upgrade its deployed family", () => {
  const state = createGame(1);
  state.money = 10_000;
  for (const type of CARD_ORDER.slice(0, 4)) purchase(state, type);
  assert(cardState(state, "auntie").blocked);
  assert(!cardState(state, "auntie").affordable);
  assert(cardState(state, "grandma").affordable);
  assert(purchase(state, "grandma"));
  assertEquals(state.defenders.length, 4);
  assertEquals(cardState(state, "grandma").level, 2);
});
