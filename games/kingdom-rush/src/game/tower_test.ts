import { assert, assertEquals } from "@std/assert";
import { levelById } from "../content/levels.ts";
import { BUILD_TICKS, RANGE_RATIO, SELL_PERCENT } from "./constants.ts";
import { spawnEnemy } from "./enemy.ts";
import { inEllipse } from "./geometry.ts";
import { pointAt } from "./lane.ts";
import { tick } from "./simulation.ts";
import {
  buildTower,
  sellTower,
  setRally,
  upgradeOptions,
  upgradeTower,
} from "./tower.ts";
import type { TowerSlot, World } from "./types.ts";
import { createWorld } from "./world.ts";

function makeWorld(levelId = 4): World {
  const level = levelById(levelId);
  assert(level, `level ${levelId} must exist`);
  return createWorld({ level, mode: "campaign", difficulty: "normal" });
}

function emptySlot(world: World): TowerSlot {
  const slot = world.slots.find((item) => !item.tower);
  assert(slot, "the level needs an empty slot");
  return slot;
}

Deno.test("building costs gold and finishes after the build delay", () => {
  const world = makeWorld();
  const slot = emptySlot(world);
  const cash = world.cash;
  const tower = buildTower(world, slot.id, "archer");
  assert(tower);
  assertEquals(world.cash, cash - tower.stats.cost);
  assertEquals(tower.buildTicks, BUILD_TICKS);
  assert(!tower.ready);

  for (let i = 0; i < BUILD_TICKS; i++) tick(world);
  assertEquals(tower.buildTicks, 0);
  assert(tower.ready);
  assertEquals(slot.tower, tower);
});

Deno.test("you cannot build without enough gold", () => {
  const world = makeWorld();
  const slot = emptySlot(world);
  world.cash = 0;
  assertEquals(buildTower(world, slot.id, "archer"), null);
  assertEquals(slot.tower, null);
});

Deno.test("upgrades follow the level's tower caps", () => {
  const world = makeWorld(4); // caps every family at level 3
  const slot = emptySlot(world);
  const tower = buildTower(world, slot.id, "archer");
  assert(tower);
  assertEquals(upgradeOptions(world, tower).map((option) => option.key), [
    "level2",
  ]);

  assert(upgradeTower(world, tower.id, "level2"));
  assertEquals(tower.level, 2);
  assert(upgradeTower(world, tower.id, "level3"));
  assertEquals(tower.level, 3);
  assertEquals(upgradeOptions(world, tower), []);

  // Specializations branch off level 3: cap 4 unlocks one branch, cap 5 both.
  world.unlockCaps.archer = 4;
  assertEquals(
    upgradeOptions(world, tower).map((option) => option.key),
    ["ranger"],
  );
  world.unlockCaps.archer = 5;
  assertEquals(
    upgradeOptions(world, tower).map((option) => option.key),
    ["ranger", "musketeer"],
  );
  // Picking a branch replaces the tower with its specialization; tier 5 is the
  // second branch, which is the end of the line for either one.
  assert(upgradeTower(world, tower.id, "musketeer"));
  assertEquals(tower.level, 5);
  assertEquals(upgradeOptions(world, tower), []);
});

Deno.test("selling returns the configured share of what was spent", () => {
  const world = makeWorld();
  const slot = emptySlot(world);
  const tower = buildTower(world, slot.id, "archer");
  assert(tower);
  assert(upgradeTower(world, tower.id, "level2"));
  const invested = tower.invested;
  const cash = world.cash;
  assert(sellTower(world, tower.id));
  assertEquals(world.cash, cash + Math.round(invested * SELL_PERCENT));
  assertEquals(slot.tower, null);
  assert(!world.towers.includes(tower));
});

Deno.test("a barracks trains three soldiers that guard the rally point", () => {
  const world = makeWorld();
  const slot = emptySlot(world);
  const tower = buildTower(world, slot.id, "barracks");
  assert(tower);
  // The soldiers leave the barracks once construction finishes.
  assertEquals(tower.soldiers.length, 0);
  for (let i = 0; i < BUILD_TICKS; i++) tick(world);
  assertEquals(tower.soldiers.length, 3);
  assertEquals(world.soldiers.length, 3);
  assertEquals(tower.soldiers[0].maxHp, tower.stats.health);

  const rally = { x: slot.x + 40, y: slot.y + 20 };
  assert(setRally(world, tower.id, rally.x, rally.y));
  assertEquals(tower.rally, rally);
  for (const soldier of tower.soldiers) {
    assertEquals(soldier.rallyCenter, { x: rally.x, y: rally.y + 10 });
  }

  // A rally point outside the range is pulled back onto the ellipse.
  assert(setRally(world, tower.id, -400, -400));
  const range = tower.stats.rangeRally ?? 230;
  assert(
    inEllipse(
      { x: slot.x, y: slot.y - 10 },
      range,
      range * RANGE_RATIO,
      tower.rally,
    ),
  );
});

Deno.test("soldiers stop a blockable enemy and leave ogres walking", () => {
  const world = makeWorld();
  const slot = emptySlot(world);
  const tower = buildTower(world, slot.id, "barracks");
  assert(tower);
  for (let i = 0; i < BUILD_TICKS + 40; i++) tick(world);

  const target = nearestTo(world, tower.rally);
  const goblin = spawnAtDistance(
    world,
    "goblin",
    target.laneIndex,
    target.distance,
  );
  tick(world);
  assertEquals(goblin.state, "blocked");
  assert(goblin.blocker);

  world.enemies = [];
  const ogre = spawnAtDistance(
    world,
    "ogre",
    target.laneIndex,
    target.distance,
  );
  tick(world);
  assertEquals(ogre.state, "walking");
});

Deno.test("an archer shoots an enemy inside its range", () => {
  const world = makeWorld(9);
  const spot = nearestEmptySlotToLane(world);
  const tower = buildTower(world, spot.slot.id, "archer");
  assert(tower);
  for (let i = 0; i < BUILD_TICKS; i++) tick(world);

  spawnAtDistance(world, "goblin", spot.laneIndex, spot.distance);
  let fired = false;
  for (let i = 0; i < 90 && !fired; i++) {
    tick(world);
    fired = world.projectiles.some((projectile) => projectile.kind === "arrow");
  }
  assert(fired, "the archer should fire an arrow at a target in range");
});

/** The lane point closest to a position. */
function nearestTo(world: World, near: { x: number; y: number }) {
  let best = { laneIndex: 0, distance: 0, gap: Infinity };
  for (let laneIndex = 0; laneIndex < world.lanes[0].length; laneIndex++) {
    const lane = world.lanes[0][laneIndex];
    for (
      let distance = lane.engageAt;
      distance < lane.disengageAt;
      distance += 5
    ) {
      const point = pointAt(lane, distance);
      const gap = Math.hypot(point.x - near.x, point.y - near.y);
      if (gap < best.gap) best = { laneIndex, distance, gap };
    }
  }
  return best;
}

/** The empty slot with the closest lane point, and that point. */
function nearestEmptySlotToLane(world: World) {
  let best = {
    slot: world.slots[0],
    laneIndex: 0,
    distance: 0,
    gap: Infinity,
  };
  for (const slot of world.slots) {
    if (slot.tower) continue;
    const near = nearestTo(world, slot);
    if (near.gap < best.gap) best = { slot, ...near };
  }
  return best;
}

function spawnAtDistance(
  world: World,
  key: string,
  laneIndex: number,
  distance: number,
) {
  const enemy = spawnEnemy(world, key, 0, laneIndex);
  assert(enemy, `could not spawn ${key}`);
  enemy.distance = distance;
  enemy.active = true;
  const point = pointAt(enemy.lane, distance);
  enemy.x = point.x;
  enemy.y = point.y;
  return enemy;
}
