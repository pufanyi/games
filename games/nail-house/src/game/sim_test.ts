import { assert, assertEquals } from "@std/assert";
import { ENEMIES } from "./catalog.ts";
import { LEAF, MAX_HP } from "./config.ts";
import { aliveCount, createGame, purchase, step, tapLeaf } from "./sim.ts";
import type { EnemyState, GameState } from "./types.ts";

/**
 * A quiet stage with no waves, so a test can place its own enemies and watch
 * one weapon at a time. Survival mode turns off the win countdown.
 */
function arena(seed = 7): GameState {
  const state = createGame(1, seed);
  state.waves = [];
  state.survival = true;
  state.spawns = 1;
  return state;
}

function addEnemy(
  state: GameState,
  x: number,
  y = 355,
  hp = 100,
): EnemyState {
  const enemy: EnemyState = {
    id: state.nextId++,
    type: "grunt",
    x,
    y,
    targetX: 120,
    targetY: 355,
    vx: -1,
    vy: 0,
    range: 20,
    hp,
    maxHp: hp,
    reserved: 0,
    alive: true,
    slow: 0,
    attacking: false,
    attackCd: 30,
    death: -1,
    seed: 0.5,
  };
  state.enemies.push(enemy);
  return enemy;
}

function run(state: GameState, ticks: number) {
  for (let i = 0; i < ticks; i++) step(state);
}

Deno.test("the same seed produces the same wave timing", () => {
  const a = createGame(3, 99);
  const b = createGame(3, 99);
  run(a, 400);
  run(b, 400);
  assertEquals(
    a.enemies.map((
      enemy,
    ) => [enemy.type, Math.round(enemy.x), Math.round(enemy.y)]),
    b.enemies.map((
      enemy,
    ) => [enemy.type, Math.round(enemy.x), Math.round(enemy.y)]),
  );
});

Deno.test("the first enemy of the first wave appears one tick in", () => {
  const state = createGame(1, 1);
  step(state);
  assertEquals(state.enemies.length, 1);
  assertEquals(state.spawns, 1);
});

Deno.test("deploying costs 100 and fills a slot", () => {
  const state = arena();
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
  const state = arena();
  state.money = 10_000;
  for (const type of ["grandma", "grandpa", "muscle", "tinker"] as const) {
    assert(purchase(state, type));
  }
  assertEquals(state.defenders.map((defender) => defender.slot), [0, 1, 2, 3]);
  assert(!purchase(state, "auntie"));
  assertEquals(state.defenders.length, 4);
});

Deno.test("upgrading keeps the same defender and charges the next price", () => {
  const state = arena();
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

Deno.test("a rifle shot hits its target after the tracer lands", () => {
  const state = arena();
  state.money = 100;
  purchase(state, "grandpa");
  const enemy = addEnemy(state, 300);
  run(state, 6);
  assertEquals(enemy.hp, 100 - 22);
  assert(state.projectiles.length === 0);
});

Deno.test("promised damage keeps other weapons from overkilling", () => {
  const state = arena();
  state.money = 10_000;
  purchase(state, "grandma");
  const covered = addEnemy(state, 250, 355, 10);
  covered.reserved = 10;
  const open = addEnemy(state, 300, 355, 100);
  run(state, 1);
  assertEquals(state.projectiles.length, 1);
  assertEquals(state.projectiles[0].targetId, open.id);
});

Deno.test("firecrackers damage every enemy inside the blast", () => {
  const state = arena();
  state.money = 100;
  purchase(state, "kid");
  // Level 1 blast radius is 45 + 6 * 0 = 45 px.
  const center = addEnemy(state, 250, 355, 100);
  const near = addEnemy(state, 260, 345, 100);
  const far = addEnemy(state, 400, 355, 100);
  run(state, 30);
  assertEquals(center.hp, 90);
  assertEquals(near.hp, 90);
  assertEquals(far.hp, 100);
});

Deno.test("dumbbells slow enemies around the impact", () => {
  const state = arena();
  state.money = 100;
  purchase(state, "muscle");
  const center = addEnemy(state, 250, 355, 100);
  const near = addEnemy(state, 300, 355, 100);
  run(state, 30);
  assertEquals(center.hp, 75);
  assert(center.slow > 0);
  assert(near.slow > 0);
  // The slow expires after 30 ticks and normal speed resumes.
  run(state, 40);
  assertEquals(center.slow, 0);
});

Deno.test("fire bottles burn for five damage ticks", () => {
  const state = arena();
  state.money = 100;
  purchase(state, "auntie");
  // Standing at the wall, so the puddle keeps covering it.
  const enemy = addEnemy(state, 130, 355, 100);
  enemy.vx = 0;
  // Fire once, then keep the auntie from stacking a second puddle.
  run(state, 2);
  state.defenders[0].cooldown = 100_000;
  // The bottle takes ~20 ticks to land; the fire lives 150 more.
  run(state, 180);
  // Level 1 power is 2 and the fire lands five times.
  assertEquals(enemy.hp, 100 - 10);
});

Deno.test("enemies stop at their range and then hit the house every second", () => {
  const state = arena();
  const enemy = addEnemy(state, 300, 355, 100);
  enemy.vx = -1;
  assertEquals(enemy.vy, 0);
  run(state, 200);
  assert(enemy.attacking);
  assert(state.hp < MAX_HP, "the house took damage");
  assert(state.hp >= MAX_HP - 6);
});

Deno.test("the house falls when hit points run out", () => {
  const state = arena();
  state.hp = 1;
  const enemy = addEnemy(state, 140);
  enemy.range = 100;
  run(state, 60);
  assertEquals(state.hp, 0);
  assertEquals(state.phase, "lost");
});

Deno.test("a cleared stage is won after the one second grace period", () => {
  const state = createGame(1, 1);
  state.waves = [];
  state.spawns = 1;
  run(state, 10);
  assertEquals(state.phase, "playing");
  run(state, 30);
  assertEquals(state.phase, "won");
});

Deno.test("survival mode never declares a win", () => {
  const state = createGame(7, 1);
  state.waves = [];
  state.spawns = 1;
  run(state, 200);
  assertEquals(state.phase, "playing");
});

Deno.test("ten taps on the vine heal one point", () => {
  const state = arena();
  state.hp = 50;
  for (let tap = 0; tap < LEAF.clicksForHeal; tap++) tapLeaf(state);
  assertEquals(state.hp, 51);
  assertEquals(state.leafClicks, 0);
});

Deno.test("the vine never heals past the maximum", () => {
  const state = arena();
  for (let tap = 0; tap < LEAF.clicksForHeal * 2; tap++) tapLeaf(state);
  assertEquals(state.hp, MAX_HP);
});

Deno.test("killing an enemy pays its bounty and counts the kill", () => {
  const state = arena();
  state.money = 100;
  purchase(state, "grandpa");
  const enemy = addEnemy(state, 300, 355, 20);
  run(state, 10);
  assertEquals(enemy.alive, false);
  assertEquals(state.money, 0 + ENEMIES.grunt.money);
  assertEquals(state.kills, 1);
  assertEquals(aliveCount(state), 0);
  // The body stays for the death pose, then disappears.
  assert(state.enemies.includes(enemy));
  run(state, 60);
  assert(!state.enemies.includes(enemy));
});
