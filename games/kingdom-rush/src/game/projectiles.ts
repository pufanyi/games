import { POWERS } from "../content/powers.ts";
import { addEffect } from "./effects.ts";
import { damageEnemy } from "./enemy.ts";
import { ellipseRatio, inEllipse } from "./geometry.ts";
import { pointAt } from "./lane.ts";
import type {
  ArrowProjectile,
  BoltProjectile,
  BombProjectile,
  Enemy,
  FireballProjectile,
  Projectile,
  Tower,
  World,
} from "./types.ts";
import { RANGE_RATIO } from "./constants.ts";

const ARROW_TICKS = 17;
const ARROW_HIT_TICK = 15;
const BOMB_TICKS = 27;
const GRAVITY = 1;
const BOLT_MAX_SPEED = 10;
const FIREBALL_MAX_SPEED = 15;

function roll(world: World, min: number, max: number): number {
  return world.rng.damage(min, max);
}

function origin(tower: Tower): { x: number; y: number } {
  return { x: tower.x, y: tower.y - 42 };
}

/** The original predicts where the target will be when the shot lands. */
function predict(enemy: Enemy, ticks: number): { x: number; y: number } {
  const ahead = pointAt(enemy.lane, enemy.distance + enemy.def.speed * ticks);
  return ahead;
}

export function spawnArrow(world: World, tower: Tower, target: Enemy): void {
  const start = origin(tower);
  const aim = predict(target, ARROW_TICKS);
  const destX = aim.x + world.rng.range(-5, 5);
  const destY = aim.y + world.rng.range(-5, 5);
  const vx = (destX - start.x) / ARROW_TICKS;
  const vy = (destY - start.y - GRAVITY * ARROW_TICKS * (ARROW_TICKS / 2)) /
    ARROW_TICKS;
  const projectile: ArrowProjectile = {
    kind: "arrow",
    id: world.nextId++,
    x: start.x,
    y: start.y,
    startX: start.x,
    startY: start.y,
    vx,
    vy,
    tick: 0,
    totalTicks: ARROW_TICKS,
    target,
    minDamage: tower.stats.minDamage ?? 1,
    maxDamage: tower.stats.maxDamage ?? 1,
    done: false,
  };
  world.projectiles.push(projectile);
}

export function spawnBolt(world: World, tower: Tower, target: Enemy): void {
  const start = origin(tower);
  const projectile: BoltProjectile = {
    kind: "bolt",
    id: world.nextId++,
    x: start.x,
    y: start.y,
    speed: 1,
    target,
    destX: target.x,
    destY: target.y,
    minDamage: tower.stats.minDamage ?? 1,
    maxDamage: tower.stats.maxDamage ?? 1,
    done: false,
  };
  world.projectiles.push(projectile);
}

export function spawnBomb(world: World, tower: Tower, target: Enemy): void {
  const start = origin(tower);
  const aim = target.state === "blocked"
    ? { x: target.x, y: target.y }
    : pointAt(target.lane, target.distance + target.lane.spacing);
  const destX = aim.x + world.rng.range(-4, 4);
  const destY = aim.y + world.rng.range(-4, 4);
  const vx = (destX - start.x) / BOMB_TICKS;
  const vy = (destY - start.y - GRAVITY * BOMB_TICKS * (BOMB_TICKS / 2)) /
    BOMB_TICKS;
  const area = tower.stats.area ?? 65;
  const projectile: BombProjectile = {
    kind: "bomb",
    id: world.nextId++,
    x: start.x,
    y: start.y,
    startX: start.x,
    startY: start.y,
    vx,
    vy,
    tick: 0,
    totalTicks: BOMB_TICKS,
    destX,
    destY,
    areaWidth: area * 1.5,
    areaHeight: area,
    minDamage: tower.stats.minDamage ?? 1,
    maxDamage: tower.stats.maxDamage ?? 1,
    done: false,
  };
  world.projectiles.push(projectile);
}

/**
 * The fireball power is a short rain: the original's controller drops one
 * fireball every ten frames for 31 frames, each landing near the click.
 */
export function spawnFireballRain(world: World, x: number, y: number): void {
  for (let i = 0; i < 3; i++) {
    const targetX = x + world.rng.range(-15, 15);
    const targetY = y + world.rng.range(-15, 15);
    const projectile: FireballProjectile = {
      kind: "fireball",
      id: world.nextId++,
      x: targetX - 40,
      y: -30,
      speed: 8,
      targetX,
      targetY,
      minDamage: POWERS.fireball.minDamage ?? 30,
      maxDamage: POWERS.fireball.maxDamage ?? 60,
      delay: i * 10,
      done: false,
    };
    world.projectiles.push(projectile);
  }
}

function updateArrow(world: World, arrow: ArrowProjectile): void {
  arrow.tick++;
  arrow.x = arrow.startX + arrow.tick * arrow.vx;
  arrow.y = arrow.startY + arrow.tick * arrow.vy +
    (GRAVITY * arrow.tick * arrow.tick) / 2;
  const target = arrow.target;
  if (
    target?.active && target.state !== "dead" &&
    arrow.tick >= ARROW_HIT_TICK &&
    Math.hypot(target.x - arrow.x, target.y - arrow.y) < 28
  ) {
    const damage = roll(world, arrow.minDamage, arrow.maxDamage);
    damageEnemy(world, target, damage, "physical");
    addEffect(world, "hit", target.x, target.y - 10, { life: 8, radius: 6 });
    arrow.done = true;
    return;
  }
  if (arrow.tick >= arrow.totalTicks) arrow.done = true;
}

function updateBolt(world: World, bolt: BoltProjectile): void {
  const target = bolt.target?.active && bolt.target.state !== "dead"
    ? bolt.target
    : null;
  if (target) {
    bolt.destX = target.x;
    bolt.destY = target.y - 6;
  }
  bolt.speed += Math.ceil(bolt.speed * 0.05);
  if (bolt.speed > BOLT_MAX_SPEED) bolt.speed = BOLT_MAX_SPEED;
  const dx = bolt.destX - bolt.x;
  const dy = bolt.destY - bolt.y;
  const length = Math.hypot(dx, dy);
  if (length <= bolt.speed) {
    bolt.x = bolt.destX;
    bolt.y = bolt.destY;
    if (target) {
      const damage = roll(world, bolt.minDamage, bolt.maxDamage);
      damageEnemy(world, target, damage, "magic");
      addEffect(world, "hit", bolt.x, bolt.y, { life: 10, radius: 10 });
    }
    bolt.done = true;
    return;
  }
  bolt.x += (dx / length) * bolt.speed;
  bolt.y += (dy / length) * bolt.speed;
}

function explodeBomb(world: World, bomb: BombProjectile): void {
  addEffect(world, "explosion", bomb.destX, bomb.destY, {
    life: 18,
    radius: bomb.areaWidth / 2,
  });
  for (const enemy of world.enemies) {
    if (!enemy.active || enemy.state === "dead") continue;
    if (
      !inEllipse(
        { x: bomb.destX, y: bomb.destY },
        bomb.areaWidth,
        bomb.areaHeight,
        enemy,
      )
    ) {
      continue;
    }
    const ratio = Math.min(
      1,
      ellipseRatio(
        { x: bomb.destX, y: bomb.destY },
        bomb.areaWidth,
        bomb.areaHeight,
        enemy,
      ),
    );
    const damage = Math.floor(
      bomb.maxDamage - ratio * (bomb.maxDamage - bomb.minDamage),
    );
    damageEnemy(world, enemy, damage, "elemental");
  }
}

function updateBomb(world: World, bomb: BombProjectile): void {
  bomb.tick++;
  bomb.x = bomb.startX + bomb.tick * bomb.vx;
  bomb.y = bomb.startY + bomb.tick * bomb.vy +
    (GRAVITY * bomb.tick * bomb.tick) / 2;
  if (bomb.tick >= bomb.totalTicks) {
    bomb.x = bomb.destX;
    bomb.y = bomb.destY;
    explodeBomb(world, bomb);
    bomb.done = true;
  }
}

function updateFireball(world: World, fireball: FireballProjectile): void {
  if (fireball.delay > 0) {
    fireball.delay--;
    return;
  }
  fireball.speed += Math.ceil(fireball.speed * 0.05);
  if (fireball.speed > FIREBALL_MAX_SPEED) fireball.speed = FIREBALL_MAX_SPEED;
  const dx = fireball.targetX - fireball.x;
  const dy = fireball.targetY - fireball.y;
  const length = Math.hypot(dx, dy);
  if (length <= fireball.speed) {
    fireball.x = fireball.targetX;
    fireball.y = fireball.targetY;
    const width = POWERS.fireball.range ?? 100;
    const height = width * RANGE_RATIO;
    const center = { x: fireball.x, y: fireball.y };
    addEffect(world, "fireball", fireball.x, fireball.y, {
      life: 20,
      radius: width / 2,
    });
    for (const enemy of world.enemies) {
      if (!enemy.active || enemy.state === "dead") continue;
      if (!inEllipse(center, width, height, enemy)) continue;
      const damage = roll(world, fireball.minDamage, fireball.maxDamage);
      damageEnemy(world, enemy, damage, "ignore");
    }
    fireball.done = true;
    return;
  }
  fireball.x += (dx / length) * fireball.speed;
  fireball.y += (dy / length) * fireball.speed;
}

export function updateProjectiles(world: World): void {
  for (const projectile of world.projectiles) {
    switch (projectile.kind) {
      case "arrow":
        updateArrow(world, projectile);
        break;
      case "bolt":
        updateBolt(world, projectile);
        break;
      case "bomb":
        updateBomb(world, projectile);
        break;
      case "fireball":
        updateFireball(world, projectile);
        break;
    }
  }
}

export function cleanupProjectiles(world: World): void {
  world.projectiles = world.projectiles.filter((projectile) =>
    !projectile.done
  );
}

/** Lightning strikes one enemy under the cursor for 1-500 armour-ignoring damage. */
export function castLightning(world: World, x: number, y: number): boolean {
  if (world.powers.lightning > 0 || world.status !== "playing") return false;
  let target: Enemy | null = null;
  for (const enemy of world.enemies) {
    if (!enemy.active || enemy.state === "dead") continue;
    if (Math.hypot(enemy.x - x, enemy.y - y) > 26) continue;
    if (!target || target.y < enemy.y) target = enemy;
  }
  if (!target) return false;
  const damage = roll(
    world,
    POWERS.lightning.minDamage ?? 1,
    POWERS.lightning.maxDamage ?? 500,
  );
  damageEnemy(world, target, damage, "ignore");
  addEffect(world, "lightning", target.x, target.y - 20, {
    life: 16,
    radius: 26,
  });
  world.powers.lightning = POWERS.lightning.coolDown ?? 750;
  return true;
}

export type { Projectile };
