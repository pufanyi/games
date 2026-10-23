import { assert, assertEquals } from "@std/assert";
import { levelById } from "../content/levels.ts";
import { spawnEnemy } from "../game/enemy.ts";
import type { TowerSlot } from "../game/types.ts";
import { emptyProgress, recordWin, unlocked } from "./progress.ts";
import {
  advance,
  beginLevel,
  build,
  chooseDifficulty,
  createSession,
  interrupt,
  movePointer,
  pressPointer,
  quitToSelect,
  retryLevel,
  sameView,
  sell,
  sendWave,
  type Session,
  setAim,
  setSpeed,
  togglePause,
  upgrade,
  viewOf,
} from "./session.ts";

/** A fresh session whose progress does not depend on the test machine. */
function makeSession(): Session {
  const session = createSession();
  session.progress = emptyProgress();
  return session;
}

function emptySlot(session: Session): TowerSlot {
  const world = session.world;
  assert(world, "a level must be running");
  const slot = world.slots.find((item) => !item.tower);
  assert(slot, "the level needs an empty slot");
  return slot;
}

Deno.test("levels unlock in order and per mode", () => {
  const progress = emptyProgress();
  assert(unlocked(progress, 1, "campaign"));
  assert(!unlocked(progress, 2, "campaign"));
  assert(!unlocked(progress, 1, "heroic"));

  recordWin(progress, 1, "campaign");
  assert(unlocked(progress, 2, "campaign"));
  assert(unlocked(progress, 1, "heroic"));
  assert(!unlocked(progress, 1, "iron"));
  assert(!unlocked(progress, 2, "heroic"));

  recordWin(progress, 1, "heroic");
  assert(unlocked(progress, 1, "iron"));
});

Deno.test("beginLevel opens a stage and refuses locked ones", () => {
  const session = makeSession();
  assert(beginLevel(session, 2, "campaign") === false);
  assertEquals(session.screen, "select");

  assert(beginLevel(session, 1, "campaign"));
  assertEquals(session.screen, "game");
  assertEquals(session.levelId, 1);
  assertEquals(session.world?.lives, 20);
  assertEquals(session.world?.cash, 265);
  assertEquals(session.world?.waitingForStart, true);

  // Heroic has to be won on the same level first.
  assert(!beginLevel(session, 1, "heroic"));
});

Deno.test("tapping a slot offers tower types and building selects the tower", () => {
  const session = makeSession();
  beginLevel(session, 1, "campaign");
  const slot = emptySlot(session);

  movePointer(session, { x: slot.x, y: slot.y });
  assertEquals(session.hoveredSlotId, slot.id);
  pressPointer(session, { x: slot.x, y: slot.y });
  assertEquals(session.selectedSlotId, slot.id);

  const view = viewOf(session);
  assertEquals(view.buildOptions.length, 4);
  assert(view.buildOptions.every((option) => option.cost > 0));

  const cash = session.world?.cash ?? 0;
  build(session, "archer");
  const tower = session.world?.towers[0];
  assert(tower, "the archer tower should exist");
  assertEquals(tower.type, "archer");
  assertEquals(session.selectedSlotId, null);
  assertEquals(session.selectedTowerId, tower.id);
  assertEquals(session.world?.cash, cash - tower.stats.cost);

  const towerView = viewOf(session).selectedTower;
  assert(towerView);
  assertEquals(towerView.name, "Archer Tower");
  assertEquals(towerView.level, 1);
  assert(towerView.upgrades.length === 0, "level 1 caps at the first tier");
});

Deno.test("upgrading and selling update gold and selection", () => {
  const session = makeSession();
  for (const levelId of [1, 2, 3]) {
    recordWin(session.progress, levelId, "campaign");
  }
  beginLevel(session, 4, "campaign");
  // Level 4 lets the families reach tier 3.
  const world = session.world;
  assert(world);
  const slot = emptySlot(session);
  world.cash = 2000;
  pressPointer(session, { x: slot.x, y: slot.y });
  build(session, "barracks");
  const tower = session.world?.towers[0];
  assert(tower);

  const before = session.world?.cash ?? 0;
  const upgradeView = viewOf(session).selectedTower?.upgrades[0];
  assert(upgradeView, "a level 2 upgrade should be offered");
  upgrade(session, upgradeView.key);
  assertEquals(tower.level, 2);
  assertEquals(session.world?.cash, before - upgradeView.cost);

  const cash = session.world?.cash ?? 0;
  const sellView = viewOf(session).selectedTower;
  assert(sellView);
  sell(session);
  assertEquals(session.selectedTowerId, null);
  assertEquals(session.world?.towers.length, 0);
  assertEquals(session.world?.cash, cash + sellView.sell);
});

Deno.test("sendWave starts the first wave, then advance runs fixed ticks", () => {
  const session = makeSession();
  beginLevel(session, 1, "campaign");
  const world = session.world;
  assert(world);
  assertEquals(viewOf(session).waveView.action, "start");

  sendWave(session);
  assertEquals(world.waitingForStart, false);
  assertEquals(world.waveNumber, 1);
  assert(["wait", "send"].includes(viewOf(session).waveView.action));

  setSpeed(session, 2);
  assertEquals(world.speed, 2);
  advance(session, 0.1);
  assertEquals(world.tick, 6);

  // Pausing freezes the simulation; interrupting also drops the aim.
  togglePause(session);
  advance(session, 0.2);
  assertEquals(world.tick, 6);
  assertEquals(viewOf(session).paused, true);
  togglePause(session);
  advance(session, 0.1);
  assertEquals(world.tick, 12);

  setSpeed(session, 3);
  interrupt(session);
  assertEquals(session.paused, true);
  assertEquals(session.aim, null);
});

Deno.test("lightning only fires on an enemy and then cools down", () => {
  const session = makeSession();
  beginLevel(session, 1, "campaign");
  const world = session.world;
  assert(world);

  setAim(session, "lightning");
  assertEquals(session.aim, "lightning");
  // A tap on empty ground keeps the power armed.
  pressPointer(session, { x: 400, y: 300 });
  assertEquals(session.aim, "lightning");
  assertEquals(world.powers.lightning, 0);

  const enemy = spawnEnemy(world, "goblin", 0, 0);
  assert(enemy);
  enemy.x = 400;
  enemy.y = 300;
  enemy.active = true;
  enemy.hp = 1;
  pressPointer(session, { x: 402, y: 301 });
  assertEquals(session.aim, null);
  assert(world.powers.lightning > 0);
  assertEquals(enemy.hp, 0);
  assertEquals(world.stats.kills, 1);
});

Deno.test("powers the level does not offer cannot be armed", () => {
  const session = makeSession();
  beginLevel(session, 1, "campaign"); // level 1 has no fireball or militia
  setAim(session, "fireball");
  assertEquals(session.aim, null);
  setAim(session, "reinforcements");
  assertEquals(session.aim, null);

  const view = viewOf(session);
  assertEquals(view.powers.fireball.available, false);
  assertEquals(view.powers.lightning.available, true);
});

Deno.test("difficulty and views follow the session", () => {
  const session = makeSession();
  chooseDifficulty(session, "hard");
  beginLevel(session, 1, "campaign");
  assertEquals(session.difficulty, "hard");
  assertEquals(session.world?.difficulty, "hard");
  // Hard multiplies enemy health by 1.2.
  const world = session.world;
  assert(world);
  const goblin = spawnEnemy(world, "goblin", 0, 0);
  assert(goblin);
  assertEquals(goblin.maxHp, Math.round(goblin.def.health * 1.2));

  const view = viewOf(session);
  assertEquals(view.levelLabel, "Level 1");
  assertEquals(view.modeLabel, "Campaign");
  assert(
    sameView(view, viewOf(session)),
    "the same world yields the same view",
  );
  world.cash += 1;
  assert(!sameView(view, viewOf(session)));
});

Deno.test("quitting returns to the picker and retry restarts the stage", () => {
  const session = makeSession();
  beginLevel(session, 1, "campaign");
  const firstWorld = session.world;
  assert(firstWorld);
  quitToSelect(session);
  assertEquals(session.screen, "select");
  assertEquals(session.world, null);
  assertEquals(viewOf(session).buildOptions, []);

  beginLevel(session, 1, "campaign");
  assert(session.world && session.world !== firstWorld);
  session.world.cash = 1;
  retryLevel(session);
  assertEquals(session.world?.cash, 265);
});

Deno.test("the level picker knows the stage data", () => {
  const level = levelById(1);
  assert(level);
  assertEquals(level.modes.campaign.waves.length > 0, true);
  assertEquals(level.modes.iron.waves.length > 0, true);
});
