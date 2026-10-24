import { ENEMIES } from "../content/enemies.ts";
import { DIFFICULTY } from "./constants.ts";
import { addEffect, reduceDamage } from "./effects.ts";
import { headingAt, pointAt } from "./lane.ts";
import type { DamageType, Enemy, Soldier, World } from "./types.ts";

export function enemyDefinition(key: string) {
  return ENEMIES[key];
}

/** Whether this enemy can be stopped by soldiers. Flying enemies cannot. */
export function canBeBlocked(enemy: Enemy): boolean {
  return enemy.def.canBeBlocked;
}

/**
 * Spawn one enemy on a lane of `pathIndex`. `laneIndex` is only used by spawn
 * groups with a fixed sub-path.
 */
export function spawnEnemy(
  world: World,
  key: string,
  pathIndex: number,
  laneIndex?: number,
): Enemy | undefined {
  const definition = ENEMIES[key];
  const lanes = world.lanes[pathIndex];
  if (!definition || !lanes || lanes.length === 0) return undefined;

  const lane = lanes[
    laneIndex !== undefined && laneIndex < lanes.length
      ? laneIndex
      : world.rng.int(0, lanes.length - 1)
  ];

  const hp = Math.round(
    definition.health * DIFFICULTY[world.difficulty].enemyHealth,
  );
  const start = pointAt(lane, 0);
  const enemy: Enemy = {
    id: world.nextId++,
    key,
    def: definition,
    lane,
    distance: 0,
    x: start.x,
    y: start.y,
    facing: 1,
    hp,
    maxHp: hp,
    active: false,
    state: "walking",
    fightStarted: false,
    blocker: null,
    helpers: [],
    reloadCounter: 0,
    charging: false,
    chargeCounter: 0,
    attackDodged: false,
    deadTicks: 0,
    regenCounter: 0,
    speedMultiplier: 1,
  };
  world.enemies.push(enemy);
  return enemy;
}

/** Drop a soldier's claim on an enemy when it dies or is released. */
function releaseSoldiers(enemy: Enemy): void {
  if (enemy.blocker) {
    enemy.blocker.target = null;
    enemy.blocker.blocking = false;
    enemy.blocker.state = "idle";
    enemy.blocker = null;
  }
  for (const helper of enemy.helpers) {
    if (helper.target === enemy) {
      helper.target = null;
      helper.state = "idle";
    }
  }
  enemy.helpers = [];
}

/** Apply damage of the given type, resolving death, bounty and the corpse timer. */
export function damageEnemy(
  world: World,
  enemy: Enemy,
  amount: number,
  type: DamageType,
  armorReduction = 0,
): void {
  if (enemy.state === "dead") return;
  enemy.hp -= reduceDamage(enemy.def, type, amount, armorReduction);
  if (enemy.hp > 0) return;

  enemy.hp = 0;
  enemy.state = "dead";
  enemy.active = false;
  enemy.deadTicks = 0;
  enemy.fightStarted = false;
  releaseSoldiers(enemy);

  world.cash += enemy.def.gold;
  world.stats.kills++;
  world.stats.earned += enemy.def.gold;
  addEffect(world, "coin", enemy.x, enemy.y, {
    life: 16,
    radius: enemy.def.gold,
  });
  if (enemy.def.size >= 1) {
    addEffect(world, "hit", enemy.x, enemy.y, { life: 14, radius: 20 });
  }
}

/** The original lets dodging enemies avoid a soldier's blow. */
export function dodgeAttack(enemy: Enemy, world: World): boolean {
  if (enemy.def.dodge <= 0) return false;
  return world.rng.next() * 100 <= enemy.def.dodge;
}

/** Movement and combat for one enemy; called once per simulation tick. */
export function updateEnemy(world: World, enemy: Enemy): void {
  if (enemy.state === "dead") {
    enemy.deadTicks++;
    return;
  }

  const regen = enemy.def.regenerateHealPoints ?? 0;
  const regenTime = enemy.def.regenerateTime ?? 1;
  if (regen > 0 && enemy.hp < enemy.maxHp) {
    enemy.regenCounter++;
    if (enemy.regenCounter >= regenTime) {
      enemy.regenCounter = 0;
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + regen);
    }
  }

  // A blocked enemy holds its ground. It swings back once the soldier in front
  // of it has reached its fighting spot; before that it just waits.
  if (enemy.state === "blocked") {
    const blocker = enemy.blocker;
    if (!blocker || blocker.state === "dead" || blocker.hp <= 0) {
      enemy.blocker = null;
      enemy.state = "walking";
      enemy.fightStarted = false;
      enemy.charging = false;
      enemy.chargeCounter = 0;
      enemy.reloadCounter = 0;
    } else if (blocker.state === "fighting" && blocker.target === enemy) {
      // The original starts the blocked enemy's first swing the moment the
      // soldier reaches it, rather than after a full reload.
      if (!enemy.fightStarted) {
        enemy.fightStarted = true;
        enemy.charging = true;
        enemy.chargeCounter = 0;
      }
      updateFight(world, enemy);
      return;
    } else {
      return;
    }
  }

  enemy.distance += enemy.def.speed * enemy.speedMultiplier;
  const position = pointAt(enemy.lane, enemy.distance);
  enemy.x = position.x;
  enemy.y = position.y;
  const heading = headingAt(enemy.lane, enemy.distance);
  enemy.facing = Math.cos(heading) >= 0 ? 1 : -1;
  enemy.active = enemy.distance >= enemy.lane.engageAt &&
    enemy.distance < enemy.lane.disengageAt;

  if (enemy.distance >= enemy.lane.leakAt) leakEnemy(world, enemy);
}

function updateFight(world: World, enemy: Enemy): void {
  const soldier = enemy.blocker;
  if (!soldier || soldier.state === "dead" || soldier.hp <= 0) {
    enemy.blocker = null;
    enemy.state = "walking";
    enemy.fightStarted = false;
    enemy.charging = false;
    enemy.chargeCounter = 0;
    return;
  }
  if (enemy.charging) {
    enemy.chargeCounter++;
    if (enemy.chargeCounter >= enemy.def.attackChargeTime) {
      enemy.charging = false;
      enemy.chargeCounter = 0;
      hitSoldier(world, enemy, soldier);
    }
    return;
  }
  enemy.reloadCounter++;
  // The original subtracts the wind-up from the reload when it reads the
  // settings, so a full attack cycle lasts `attackReloadTime` ticks.
  const wait = Math.max(
    0,
    enemy.def.attackReloadTime - enemy.def.attackChargeTime,
  );
  if (enemy.reloadCounter >= wait) {
    enemy.reloadCounter = 0;
    enemy.charging = true;
    enemy.chargeCounter = 0;
  }
}

function hitSoldier(world: World, enemy: Enemy, soldier: Soldier): void {
  const roll = world.rng.damage(enemy.def.minDamage, enemy.def.maxDamage);
  const taken = roll - (soldier.armor * roll) / 100;
  soldier.hp -= taken;
  addEffect(world, "hit", soldier.x, soldier.y, { life: 8, radius: 6 });
  if (soldier.hp > 0) return;

  soldier.hp = 0;
  soldier.state = "dead";
  soldier.respawnTicks = soldier.tower ? soldierRespawn(soldier) : 10;
  soldier.charging = false;
  soldier.chargeCounter = 0;
  soldier.target = null;
  soldier.blocking = false;
  enemy.blocker = null;
  enemy.state = "walking";
  enemy.fightStarted = false;
  enemy.charging = false;
  enemy.chargeCounter = 0;
}

function soldierRespawn(soldier: Soldier): number {
  return Math.round(soldier.tower?.stats.respawn ?? 300);
}

function leakEnemy(world: World, enemy: Enemy): void {
  world.enemies = world.enemies.filter((item) => item !== enemy);
  releaseSoldiers(enemy);
  world.lives = Math.max(0, world.lives - enemy.def.cost);
  // The original still pays the bounty when an enemy escapes.
  world.cash += enemy.def.gold;
  world.stats.leaked++;
  const end = enemy.lane.points[enemy.lane.points.length - 1];
  addEffect(world, "miss", end.x, end.y, { life: 30, radius: 24 });
  if (world.lives <= 0) world.status = "lost";
}

export function cleanupEnemies(world: World): void {
  world.enemies = world.enemies.filter((enemy) =>
    enemy.state !== "dead" || enemy.deadTicks < enemy.def.deadTime
  );
}
