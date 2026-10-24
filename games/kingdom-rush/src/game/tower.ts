import { TOWER_TIERS } from "../content/towers.ts";
import type { TowerTierDefinition, TowerType, Vec } from "../content/types.ts";
import {
  isSpecialization,
  tierCap,
  TOWER_TREE,
  type TowerTierInfo,
} from "../content/tower_tree.ts";
import {
  BUILD_TICKS,
  RANGE_RATIO,
  SELL_PERCENT,
  TOWER_Y_OFFSET,
  TOWERS,
} from "./constants.ts";
import { clamp, inEllipse } from "./geometry.ts";
import { spawnArrow, spawnBolt, spawnBomb } from "./projectiles.ts";
import {
  createBarracksSoldiers,
  rallyPosts,
  removeTowerSoldiers,
  upgradeSoldiers,
} from "./soldier.ts";
import type { Enemy, Tower, TowerSlot, World } from "./types.ts";

export function towerStats(type: TowerType, tier: string): TowerTierDefinition {
  return TOWER_TIERS[type][tier];
}

export function tierLevel(type: TowerType, tier: string): number {
  const entry = TOWER_TREE[type].find((item) => item.key === tier);
  return entry?.level ?? 1;
}

/** Which tiers a tower may be upgraded to right now, respecting the level caps. */
export function upgradeOptions(world: World, tower: Tower): TowerTierInfo[] {
  const cap = world.unlockCaps[tower.type];
  return TOWER_TREE[tower.type].filter((tier) => {
    if (tower.level === 3) return tier.level === 4 || tier.level === 5;
    if (tower.level >= 4) return false;
    return tier.level === tower.level + 1;
  }).filter((tier) => tier.level <= tierCap(cap));
}

export function canBuild(
  world: World,
  slot: TowerSlot,
  type: TowerType,
): boolean {
  if (slot.tower || world.status !== "playing") return false;
  if (towerCap(world, type) < 1) return false;
  return world.cash >= towerStats(type, "level1").cost;
}

function towerCap(world: World, type: TowerType): number {
  return tierCap(world.unlockCaps[type]);
}

function initialRally(slot: TowerSlot): Vec {
  if (slot.rally) return { x: slot.rally.x, y: slot.rally.y };
  return { x: slot.x, y: slot.y };
}

export function createTower(
  world: World,
  slot: TowerSlot,
  type: TowerType,
  tier: string,
  free: boolean,
): Tower | null {
  const stats = towerStats(type, tier);
  if (!stats) return null;
  const level = tierLevel(type, tier);
  const rally = initialRally(slot);
  const charge = TOWERS[type].charge;
  const tower: Tower = {
    id: world.nextId++,
    type,
    slot,
    x: slot.x,
    y: slot.y,
    tier,
    level,
    stats,
    invested: free ? 0 : stats.cost,
    buildTicks: free ? 0 : BUILD_TICKS,
    rangeWidth: stats.range ?? 0,
    rangeHeight: (stats.range ?? 0) * RANGE_RATIO,
    reloadCounter: 0,
    ready: false,
    charging: false,
    chargeCounter: 0,
    chargeTicks: charge.ticks,
    shootTicks: charge.shootTick,
    target: null,
    soldiers: [],
    rally,
    shots: 0,
  };
  if (!free) world.cash -= stats.cost;
  slot.tower = tower;
  world.towers.push(tower);
  if (tower.buildTicks === 0) onBuilt(world, tower);
  return tower;
}

function onBuilt(world: World, tower: Tower): void {
  tower.buildTicks = 0;
  tower.ready = tower.type !== "barracks";
  if (tower.type === "barracks") createBarracksSoldiers(world, tower);
}

/** Buy a tower on an empty slot. */
export function buildTower(
  world: World,
  slotId: number,
  type: TowerType,
): Tower | null {
  const slot = world.slots.find((item) => item.id === slotId);
  if (!slot || !canBuild(world, slot, type)) return null;
  return createTower(world, slot, type, "level1", false);
}

/**
 * Upgrade to one of the tiers from `upgradeOptions`; the caller normally passes
 * the tier key the player picked.
 */
export function upgradeTower(
  world: World,
  towerId: number,
  tier: string,
): boolean {
  const tower = world.towers.find((item) => item.id === towerId);
  if (!tower || world.status !== "playing") return false;
  const option = upgradeOptions(world, tower).find((item) => item.key === tier);
  if (!option) return false;
  const stats = towerStats(tower.type, tier);
  if (!stats) return false;
  if (world.cash < stats.cost) return false;

  world.cash -= stats.cost;
  tower.invested += stats.cost;
  tower.tier = tier;
  tower.level = option.level;
  tower.stats = stats;
  tower.buildTicks = 0;
  tower.rangeWidth = stats.range ?? tower.rangeWidth;
  tower.rangeHeight = tower.rangeWidth * RANGE_RATIO;
  tower.reloadCounter = 0;
  tower.ready = tower.type !== "barracks";
  tower.charging = false;
  tower.chargeCounter = 0;
  tower.target = null;
  if (tower.type === "barracks") upgradeSoldiers(tower);
  return true;
}

/** Sell a tower back for a share of everything spent on it. */
export function sellTower(world: World, towerId: number): boolean {
  const tower = world.towers.find((item) => item.id === towerId);
  if (!tower || world.status !== "playing") return false;
  world.cash += Math.round(tower.invested * SELL_PERCENT);
  removeTowerSoldiers(world, tower);
  tower.slot.tower = null;
  world.towers = world.towers.filter((item) => item !== tower);
  return true;
}

/** Move a barracks rally point; soldiers return to the new posts. */
export function setRally(
  world: World,
  towerId: number,
  x: number,
  y: number,
): boolean {
  const tower = world.towers.find((item) => item.id === towerId);
  if (tower?.type !== "barracks" || world.status !== "playing") {
    return false;
  }
  const range = tower.stats.rangeRally ?? 230;
  const center = { x: tower.x, y: tower.y + TOWER_Y_OFFSET };
  // Clamp the click to the rally ellipse rather than rejecting it outright.
  let rx = x;
  let ry = y;
  if (!inEllipse(center, range, range * RANGE_RATIO, { x: rx, y: ry })) {
    const dx = (rx - center.x) / (range / 2);
    const dy = (ry - center.y) / ((range * RANGE_RATIO) / 2);
    const length = Math.hypot(dx, dy) || 1;
    rx = center.x + (dx / length) * (range / 2) * 0.98;
    ry = center.y + (dy / length) * ((range * RANGE_RATIO) / 2) * 0.98;
  }
  tower.rally = { x: clamp(rx, 0, 800), y: clamp(ry, 0, 600) };
  const posts = rallyPosts(tower.rally);
  tower.soldiers.forEach((soldier, index) => {
    soldier.post = posts[index % posts.length];
    soldier.rallyCenter = { x: tower.rally.x, y: tower.rally.y + 10 };
    soldier.destination = soldier.post;
  });
  return true;
}

/** The enemy furthest along its lane, matching the original's target choice. */
export function findTarget(world: World, tower: Tower): Enemy | null {
  let best: Enemy | null = null;
  const flying = tower.type === "engineer";
  for (const enemy of world.enemies) {
    if (!enemy.active || enemy.state === "dead") continue;
    if (flying && enemy.def.isFlying) continue;
    if (
      !inEllipse(
        { x: tower.x, y: tower.y + TOWER_Y_OFFSET },
        tower.rangeWidth,
        tower.rangeHeight,
        enemy,
      )
    ) {
      continue;
    }
    if (!best || enemy.distance > best.distance) best = enemy;
  }
  return best;
}

function fire(world: World, tower: Tower, target: Enemy): void {
  tower.shots++;
  switch (tower.type) {
    case "archer":
      spawnArrow(world, tower, target);
      break;
    case "mage":
      spawnBolt(world, tower, target);
      break;
    case "engineer":
      spawnBomb(world, tower, target);
      break;
    case "barracks":
      break;
  }
}

export function updateTower(world: World, tower: Tower): void {
  if (tower.buildTicks > 0) {
    tower.buildTicks--;
    if (tower.buildTicks === 0) onBuilt(world, tower);
    return;
  }
  if (tower.type === "barracks") return;

  if (tower.charging) {
    tower.chargeCounter++;
    const target = tower.target;
    if (tower.chargeCounter === tower.shootTicks) {
      let shot = target?.active && target.state !== "dead" ? target : null;
      if (!shot) shot = findTarget(world, tower);
      if (shot) fire(world, tower, shot);
    }
    if (tower.chargeCounter >= tower.chargeTicks) {
      tower.charging = false;
      tower.chargeCounter = 0;
      tower.ready = false;
      tower.reloadCounter = 0;
      tower.target = null;
    }
    return;
  }

  if (tower.ready) {
    const target = findTarget(world, tower);
    if (target) {
      tower.target = target;
      tower.charging = true;
      tower.chargeCounter = 0;
    }
    return;
  }

  const totalReload = tower.stats.reload ?? 30;
  const wait = Math.max(0, totalReload - tower.chargeTicks);
  tower.reloadCounter++;
  if (tower.reloadCounter >= wait) {
    tower.reloadCounter = 0;
    tower.ready = true;
  }
}

/** Barracks never shoot; this keeps the specialization flag close to the data. */
export function isSpecialized(tower: Tower): boolean {
  return isSpecialization(tower.type, tower.tier);
}
