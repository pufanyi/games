import { assert, assertEquals } from "@std/assert";
import { ENEMIES } from "../content/enemies.ts";
import { levelById } from "../content/levels.ts";
import { reduceDamage } from "./effects.ts";
import {
  canBeBlocked,
  cleanupEnemies,
  damageEnemy,
  spawnEnemy,
  updateEnemy,
} from "./enemy.ts";
import type { Difficulty } from "./types.ts";
import { createWorld } from "./world.ts";

function makeWorld(difficulty: Difficulty = "normal") {
  const level = levelById(1);
  assert(level, "level 1 must exist");
  return createWorld({ level, mode: "campaign", difficulty });
}

Deno.test("armour reduces physical damage, half of it for elemental", () => {
  const fatOrc = ENEMIES.fatOrc; // 30% armour, no magic armour
  assertEquals(fatOrc.armor, 30);
  assertEquals(reduceDamage(fatOrc, "physical", 100), 70);
  assertEquals(reduceDamage(fatOrc, "elemental", 100), 85);
  assertEquals(reduceDamage(fatOrc, "magic", 100), 100);
  assertEquals(reduceDamage(fatOrc, "ignore", 100), 100);
  // Armour-piercing reduces the armour itself, not the damage roll.
  assertEquals(reduceDamage(fatOrc, "physical", 100, 10), 80);
  assertEquals(reduceDamage(fatOrc, "physical", 100, 40), 100);
});

Deno.test("difficulty scales enemy health only", () => {
  const goblin = ENEMIES.goblin;
  assertEquals(
    spawnEnemy(makeWorld("easy"), "goblin", 0, 0)?.hp,
    Math.round(goblin.health * 0.8),
  );
  assertEquals(
    spawnEnemy(makeWorld("normal"), "goblin", 0, 0)?.hp,
    goblin.health,
  );
  assertEquals(
    spawnEnemy(makeWorld("hard"), "goblin", 0, 0)?.hp,
    Math.round(goblin.health * 1.2),
  );
});

Deno.test("killing an enemy pays its bounty and keeps a corpse for deadTime", () => {
  const world = makeWorld();
  const cash = world.cash;
  const goblin = spawnEnemy(world, "goblin", 0, 0);
  assert(goblin);
  damageEnemy(world, goblin, 1000, "ignore");
  assertEquals(goblin.state, "dead");
  assertEquals(world.stats.kills, 1);
  assertEquals(world.cash, cash + ENEMIES.goblin.gold);

  for (let i = 0; i < ENEMIES.goblin.deadTime - 1; i++) {
    updateEnemy(world, goblin);
  }
  cleanupEnemies(world);
  assert(world.enemies.includes(goblin), "corpse stays while it fades");

  updateEnemy(world, goblin);
  cleanupEnemies(world);
  assert(!world.enemies.includes(goblin), "corpse is removed after deadTime");
});

Deno.test("enemies that reach the end cost lives and still pay gold", () => {
  const world = makeWorld();
  const lives = world.lives;
  const cash = world.cash;
  const goblin = spawnEnemy(world, "goblin", 0, 0);
  assert(goblin);
  goblin.distance = goblin.lane.leakAt - 0.1;
  updateEnemy(world, goblin);
  assertEquals(world.lives, lives - ENEMIES.goblin.cost);
  assertEquals(world.cash, cash + ENEMIES.goblin.gold);
  assertEquals(world.stats.leaked, 1);
  assert(!world.enemies.includes(goblin));
});

Deno.test("ogres and bosses cannot be blocked, goblins can", () => {
  const world = makeWorld();
  const goblin = spawnEnemy(world, "goblin", 0, 0);
  const ogre = spawnEnemy(world, "ogre", 0, 0);
  const boss = spawnEnemy(world, "bossBandit", 0, 0);
  assert(goblin && ogre && boss);
  assert(canBeBlocked(goblin));
  assert(!canBeBlocked(ogre));
  assert(!canBeBlocked(boss));
});

Deno.test("an enemy walks along its lane", () => {
  const world = makeWorld();
  const goblin = spawnEnemy(world, "goblin", 0, 0);
  assert(goblin);
  const start = { x: goblin.x, y: goblin.y };
  updateEnemy(world, goblin);
  assertEquals(goblin.distance, ENEMIES.goblin.speed);
  assert(goblin.x !== start.x || goblin.y !== start.y);
});
