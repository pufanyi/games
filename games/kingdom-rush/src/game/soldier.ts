import type {
  PowerDefinition,
  TowerTierDefinition,
  Vec,
} from "../content/types.ts";
import { POWERS } from "../content/powers.ts";
import {
  DIFFICULTY,
  RANGE_RATIO,
  SOLDIER,
  soldierChargeTicks,
} from "./constants.ts";
import { addEffect } from "./effects.ts";
import { canBeBlocked, damageEnemy, dodgeAttack } from "./enemy.ts";
import { inEllipse } from "./geometry.ts";
import type { Enemy, Soldier, Tower, World } from "./types.ts";

const SOLDIER_COUNT = 3;

/** The three posts around a rally point: a 40x28 ellipse, as in the original. */
export function rallyPosts(rally: Vec): Vec[] {
  const posts: Vec[] = [];
  for (let i = 0; i < SOLDIER_COUNT; i++) {
    const angle = ((180 + i * 120) * Math.PI) / 180;
    posts.push({
      x: rally.x + Math.cos(angle) * 20,
      y: rally.y + 10 + Math.sin(angle) * 14,
    });
  }
  return posts;
}

function makeSoldier(
  world: World,
  stats: TowerTierDefinition,
  tower: Tower | null,
  start: Vec,
  post: Vec,
  rallyCenter: Vec,
  rallyRange: number,
  level: number,
  expiresIn: number | null,
): Soldier {
  const health = Math.round(
    (stats.health ?? 50) * DIFFICULTY[world.difficulty].soldierHealth,
  );
  return {
    id: world.nextId++,
    tower,
    x: start.x,
    y: start.y,
    facing: 1,
    hp: health,
    maxHp: health,
    armor: stats.armor ?? 0,
    minDamage: stats.minDamage ?? 1,
    maxDamage: stats.maxDamage ?? 3,
    attackReload: stats.reload ?? 30,
    reloadCounter: 0,
    charging: false,
    chargeCounter: 0,
    chargeTicks: soldierChargeTicks(level),
    damageAt: SOLDIER.damageAt,
    state: "walking",
    target: null,
    blocking: false,
    fightingPosition: 0,
    destination: post,
    post,
    rallyCenter,
    rallyRange,
    rangeWidth: stats.range ?? 100,
    rangeHeight: (stats.range ?? 100) * RANGE_RATIO,
    speed: SOLDIER.speed,
    regen: stats.regen ?? 0,
    regenReload: stats.regenReload ?? 30,
    regenCounter: 0,
    respawnTicks: 0,
    expiresIn,
    level,
  };
}

/** Three soldiers, one on each post around the rally point. */
export function createBarracksSoldiers(world: World, tower: Tower): void {
  const posts = rallyPosts(tower.rally);
  tower.soldiers = [];
  for (let i = 0; i < SOLDIER_COUNT; i++) {
    const slot: Vec = { x: tower.x, y: tower.y - 1 };
    const soldier = makeSoldier(
      world,
      tower.stats,
      tower,
      slot,
      posts[i],
      { x: tower.rally.x, y: tower.rally.y + 10 },
      tower.stats.rangeRally ?? 230,
      tower.level,
      null,
    );
    soldier.destination = posts[i];
    soldier.state = "walking";
    world.soldiers.push(soldier);
    tower.soldiers.push(soldier);
  }
}

/** Two farmers dropped by the reinforcement power; they leave after a while. */
export function createReinforcements(world: World, x: number, y: number): void {
  const stats: PowerDefinition = POWERS.reinforcementLevel1;
  const center = { x, y };
  const offsets = [
    [7, 7],
    [-7, -7],
  ];
  for (const [dx, dy] of offsets) {
    const start = { x: x + dx, y: y + dy };
    const soldier = makeSoldier(
      world,
      {
        cost: 0,
        health: stats.health,
        armor: stats.armor,
        minDamage: stats.minDamage,
        maxDamage: stats.maxDamage,
        reload: stats.reload,
        regen: stats.regen,
        regenReload: stats.regenReload,
        range: stats.range,
        rangeRally: stats.range,
      },
      null,
      start,
      start,
      center,
      stats.range ?? 100,
      1,
      stats.lifeTime ?? 600,
    );
    soldier.state = "idle";
    world.soldiers.push(soldier);
  }
}

/** Apply a barracks upgrade to the soldiers already on the field. */
export function upgradeSoldiers(tower: Tower): void {
  for (const soldier of tower.soldiers) {
    const healthRatio = soldier.maxHp > 0 ? soldier.hp / soldier.maxHp : 1;
    const maxHp = tower.stats.health ?? soldier.maxHp;
    soldier.maxHp = maxHp;
    soldier.hp = Math.max(1, Math.round(maxHp * healthRatio));
    soldier.armor = tower.stats.armor ?? soldier.armor;
    soldier.minDamage = tower.stats.minDamage ?? soldier.minDamage;
    soldier.maxDamage = tower.stats.maxDamage ?? soldier.maxDamage;
    soldier.attackReload = tower.stats.reload ?? soldier.attackReload;
    soldier.regen = tower.stats.regen ?? soldier.regen;
    soldier.regenReload = tower.stats.regenReload ?? soldier.regenReload;
    soldier.level = tower.level;
    soldier.chargeTicks = soldierChargeTicks(tower.level);
  }
}

export function removeTowerSoldiers(world: World, tower: Tower): void {
  for (const soldier of tower.soldiers) {
    releaseEnemy(soldier);
    const index = world.soldiers.indexOf(soldier);
    if (index >= 0) world.soldiers.splice(index, 1);
  }
  tower.soldiers = [];
}

function releaseEnemy(soldier: Soldier): void {
  const enemy = soldier.target;
  if (enemy) {
    if (enemy.blocker === soldier) enemy.blocker = null;
    enemy.helpers = enemy.helpers.filter((item) => item !== soldier);
  }
  soldier.target = null;
  soldier.blocking = false;
}

/** Soldiers engage anything inside their rally ellipse that can be blocked. */
function findEnemy(world: World, soldier: Soldier): Enemy | null {
  if (soldier.blocking) return soldier.target;
  let fresh: Enemy | null = null;
  let blocked: Enemy | null = null;
  for (const enemy of world.enemies) {
    if (!enemy.active || enemy.state === "dead" || !canBeBlocked(enemy)) {
      continue;
    }
    if (
      !inEllipse(
        soldier.rallyCenter,
        soldier.rangeWidth,
        soldier.rangeHeight,
        enemy,
      )
    ) {
      continue;
    }
    if (!enemy.blocker) {
      // `Soldier.findEnemy` takes the least advanced enemy in range, so idle
      // soldiers spread out along a stream of arrivals instead of all running
      // at the leader.
      if (!fresh || enemy.distance < fresh.distance) fresh = enemy;
    } else if (enemy.blocker !== soldier) {
      if (!blocked || enemy.distance < blocked.distance) blocked = enemy;
    }
  }
  if (fresh) return fresh;
  if (blocked && blocked.helpers.length < 2) return blocked;
  return null;
}

/** A point beside the enemy where this soldier stands and swings. */
function fightingSpot(enemy: Enemy, soldier: Soldier): Vec {
  const index = soldier.fightingPosition;
  const offset = index === 1 ? 6 : index === 2 ? 6 : 0;
  const lift = index === 1 ? 6 : index === 2 ? -6 : 0;
  return { x: enemy.x + offset, y: enemy.y + lift };
}

/**
 * Claim an enemy: the first soldier stops it and stands in front, up to two
 * more soldiers join as helpers. Mirrors the original, which blocks the enemy
 * as soon as a soldier picks it, before the soldier has walked over.
 */
function claimEnemy(soldier: Soldier, enemy: Enemy): void {
  soldier.target = enemy;
  if (!enemy.blocker) {
    enemy.blocker = soldier;
    enemy.state = "blocked";
    enemy.fightStarted = false;
    enemy.charging = false;
    enemy.chargeCounter = 0;
    enemy.reloadCounter = 0;
    enemy.helpers = enemy.helpers.filter((item) => item !== soldier);
    soldier.blocking = true;
    soldier.fightingPosition = 0;
  } else {
    if (!enemy.helpers.includes(soldier)) enemy.helpers.push(soldier);
    soldier.blocking = false;
    soldier.fightingPosition = enemy.helpers.length;
  }
  // The first swing starts as soon as the soldier arrives.
  soldier.reloadCounter = Math.max(
    0,
    soldier.attackReload - soldier.chargeTicks,
  );
}

function moveToward(soldier: Soldier, target: Vec): boolean {
  const dx = target.x - soldier.x;
  const dy = target.y - soldier.y;
  const length = Math.hypot(dx, dy);
  if (length <= soldier.speed) {
    soldier.x = target.x;
    soldier.y = target.y;
    return true;
  }
  soldier.x += (dx / length) * soldier.speed;
  soldier.y += (dy / length) * soldier.speed;
  if (Math.abs(dx) > 0.5) soldier.facing = dx >= 0 ? 1 : -1;
  return false;
}

export function updateSoldier(world: World, soldier: Soldier): void {
  if (soldier.expiresIn !== null) {
    soldier.expiresIn--;
    if (soldier.expiresIn <= 0) {
      releaseEnemy(soldier);
      soldier.state = "dead";
      soldier.hp = 0;
      return;
    }
  }

  if (soldier.state === "dead") {
    if (!soldier.tower) return;
    soldier.respawnTicks--;
    if (soldier.respawnTicks > 0) return;
    const tower = soldier.tower;
    soldier.x = tower.x;
    soldier.y = tower.y - 1;
    soldier.hp = soldier.maxHp;
    soldier.state = "walking";
    soldier.destination = soldier.post;
    soldier.charging = false;
    soldier.chargeCounter = 0;
    soldier.reloadCounter = 0;
    return;
  }

  // Regeneration only happens while standing guard, matching the original.
  if (
    soldier.state === "idle" && soldier.regen > 0 && soldier.hp < soldier.maxHp
  ) {
    soldier.regenCounter++;
    if (soldier.regenCounter >= soldier.regenReload) {
      soldier.regenCounter = 0;
      soldier.hp = Math.min(soldier.maxHp, soldier.hp + soldier.regen);
    }
  }

  if (soldier.target) {
    const enemy = soldier.target;
    if (enemy.state === "dead" || !enemy.active) {
      releaseEnemy(soldier);
    } else if (!enemy.blocker && canBeBlocked(enemy)) {
      // The soldier that blocked this enemy died; take over.
      claimEnemy(soldier, enemy);
    }
  }
  if (!soldier.target) {
    const found = findEnemy(world, soldier);
    if (found) claimEnemy(soldier, found);
  }

  const enemy = soldier.target;
  if (!enemy) {
    soldier.blocking = false;
    soldier.state = "walking";
    const arrived = moveToward(soldier, soldier.post);
    if (arrived) soldier.state = "idle";
    soldier.charging = false;
    soldier.chargeCounter = 0;
    soldier.reloadCounter = 0;
    return;
  }

  const spot = fightingSpot(enemy, soldier);
  if (!moveToward(soldier, spot)) {
    soldier.state = "walking";
    soldier.charging = false;
    soldier.chargeCounter = 0;
    return;
  }

  soldier.state = "fighting";
  soldier.facing = enemy.x >= soldier.x ? 1 : -1;
  attackEnemy(world, soldier, enemy);
}

function attackEnemy(world: World, soldier: Soldier, enemy: Enemy): void {
  if (!soldier.charging) {
    soldier.reloadCounter++;
    if (soldier.reloadCounter < soldier.attackReload - soldier.chargeTicks) {
      return;
    }
    soldier.charging = true;
    soldier.chargeCounter = 0;
  }
  soldier.chargeCounter++;
  if (soldier.chargeCounter === soldier.damageAt) {
    if (dodgeAttack(enemy, world)) {
      addEffect(world, "miss", enemy.x, enemy.y - 10, { life: 12, radius: 6 });
      return;
    }
    const damage = world.rng.damage(soldier.minDamage, soldier.maxDamage);
    damageEnemy(world, enemy, damage, "physical");
    addEffect(world, "hit", enemy.x, enemy.y - 8, { life: 8, radius: 6 });
  }
  if (soldier.chargeCounter >= soldier.chargeTicks) {
    soldier.charging = false;
    soldier.chargeCounter = 0;
    soldier.reloadCounter = 0;
  }
}

export function cleanupSoldiers(world: World): void {
  world.soldiers = world.soldiers.filter((soldier) => {
    if (soldier.expiresIn !== null && soldier.expiresIn <= 0) return false;
    return true;
  });
}
