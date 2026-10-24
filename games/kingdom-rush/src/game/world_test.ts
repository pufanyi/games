import { assert, assertEquals } from "@std/assert";
import { levelById, LEVELS } from "../content/levels.ts";
import type { GameMode } from "./types.ts";
import { createWorld, slotAt, towerAt } from "./world.ts";
import { buildTower } from "./tower.ts";

function makeWorld(levelId = 1) {
  const level = levelById(levelId);
  assert(level, `level ${levelId} must exist`);
  return createWorld({ level, mode: "campaign", difficulty: "normal" });
}

Deno.test("level 1 starts with the original campaign numbers", () => {
  const world = makeWorld();
  assertEquals(world.levelId, 1);
  assertEquals(world.lives, 20);
  assertEquals(world.maxLives, 20);
  assertEquals(world.cash, 265);
  assertEquals(world.slots.length, 8);
  assertEquals(world.totalWaves, 7);
  assertEquals(world.unlockCaps, {
    archer: 1,
    mage: 1,
    engineer: 1,
    barracks: 1,
  });
  assertEquals(world.available, { fireball: false, reinforcements: false });
  assert(world.waitingForStart);
  assertEquals(world.status, "playing");
});

Deno.test("every lane has a usable engagement window", () => {
  const world = makeWorld(3);
  for (const paths of world.lanes) {
    for (const lane of paths) {
      assert(lane.engageAt > 0, `engageAt must be past the start`);
      assert(
        lane.engageAt < lane.leakAt && lane.leakAt < lane.total,
        `leakAt must sit between engagement and the road's end`,
      );
      assert(lane.points.length >= 2);
    }
  }
});

Deno.test("every stage and mode builds a playable world", () => {
  const modes: GameMode[] = ["campaign", "heroic", "iron"];
  for (const level of LEVELS) {
    for (const mode of modes) {
      const world = createWorld({ level, mode, difficulty: "normal" });
      assert(world.lanes.length > 0, `level ${level.id} ${mode} needs lanes`);
      for (const paths of world.lanes) {
        assert(paths.length > 0, `level ${level.id} ${mode} has an empty road`);
      }
      assert(world.slots.length > 0, `level ${level.id} ${mode} needs slots`);
      assert(world.totalWaves > 0, `level ${level.id} ${mode} needs waves`);
      assert(world.modeData.waves.length > 0);
      assert(
        Object.values(world.unlockCaps).some((cap) => cap >= 1),
        `level ${level.id} ${mode} needs at least one tower family`,
      );
      // Every goal is the map's exit marker, so it must lie on the board.
      for (const [x, y] of level.goals) {
        assert(x >= 0 && x <= 800 && y >= 0 && y <= 600);
      }
    }
  }
});

Deno.test("Iron Challenge caps fall back to the level's unlock levels", () => {
  const level1 = levelById(1);
  assert(level1);
  const iron1 = createWorld({
    level: level1,
    mode: "iron",
    difficulty: "normal",
  });
  // Level 1 Iron offers artillery and barracks only.
  assertEquals(iron1.unlockCaps, {
    archer: 0,
    mage: 0,
    engineer: 1,
    barracks: 1,
  });

  const level7 = levelById(7);
  assert(level7);
  const iron7 = createWorld({
    level: level7,
    mode: "iron",
    difficulty: "normal",
  });
  // Raw caps are 5/4/0/0; the level replaces 0 with 5/4/0/4.
  assertEquals(iron7.unlockCaps, {
    archer: 5,
    mage: 4,
    engineer: 0,
    barracks: 4,
  });

  const level8 = levelById(8);
  assert(level8);
  const iron8 = createWorld({
    level: level8,
    mode: "iron",
    difficulty: "normal",
  });
  assertEquals(iron8.unlockCaps, {
    archer: 0,
    mage: 4,
    engineer: 4,
    barracks: 5,
  });
});

Deno.test("slotAt and towerAt pick the nearest target inside the radius", () => {
  const world = makeWorld();
  const slot = world.slots[0];
  const near = slotAt(world, { x: slot.x + 6, y: slot.y - 4 });
  assertEquals(near?.id, slot.id);
  assertEquals(slotAt(world, { x: -200, y: -200 }), null);

  const tower = buildTower(world, slot.id, "archer");
  assert(tower);
  assertEquals(towerAt(world, { x: slot.x, y: slot.y })?.id, tower.id);
  assertEquals(towerAt(world, { x: -200, y: -200 }), null);
});

Deno.test("prebuilt iron-mode towers do not cost gold", () => {
  const level = levelById(1);
  assert(level);
  const iron = level.modes.iron;
  const prebuilt = iron.towers.filter((slot) => slot.prebuilt);
  if (prebuilt.length === 0) return;
  const world = createWorld({ level, mode: "iron", difficulty: "normal" });
  assertEquals(world.cash, iron.cash);
  assertEquals(world.towers.length, prebuilt.length);
  assert(world.towers.every((tower) => tower.invested === 0));
});
