import { DEFENDERS, ENEMIES } from "./catalog.ts";
import {
  DEATH_TICKS,
  ENEMY_ATTACK_CD,
  ENEMY_TARGET_X,
  SLOT_X,
  SLOT_YS,
  TICK_RATE,
} from "./config.ts";
import { addFloater, addRing } from "./effects.ts";
import type {
  DefenderDef,
  DefenderState,
  EnemyState,
  GameState,
  ProjectileState,
  WeaponKind,
} from "./types.ts";

const FIRE_TICKS = 150;
const FIRE_INTERVAL = 30;

export function stepCombat(state: GameState): void {
  stepDefenders(state);
  stepEnemies(state);
  stepProjectiles(state);
  stepFires(state);
}

function stepDefenders(state: GameState): void {
  for (const defender of state.defenders) {
    const def = DEFENDERS[defender.type];
    if (defender.anim > 0) defender.anim--;
    if (defender.cooldown > 0) {
      defender.cooldown--;
      continue;
    }
    const target = findTarget(state, def);
    if (!target) {
      defender.targetId = null;
      continue;
    }
    defender.targetId = target.id;
    fire(state, defender, def, target);
    defender.cooldown = Math.trunc(
      def.interval[defender.level - 1] * TICK_RATE,
    );
    defender.anim = def.attackTicks;
  }
}

/** Focus the nearest threat that is not already covered by incoming damage. */
function findTarget(
  state: GameState,
  def: DefenderDef,
): EnemyState | null {
  const range = def.range;
  let best: EnemyState | null = null;
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    if (enemy.x >= range) continue;
    if (enemy.hp - enemy.reserved <= 0) continue;
    if (!best || enemy.x < best.x) best = enemy;
  }
  return best;
}

function fire(
  state: GameState,
  defender: DefenderState,
  def: DefenderDef,
  target: EnemyState,
): void {
  const level = defender.level;
  const power = def.power[level - 1];
  const effect = level - 1;
  const startX = SLOT_X + def.muzzleX;
  const startY = SLOT_YS[defender.slot] + def.muzzleY;
  const targetX = target.x;
  const targetY = target.y - 30;
  const distance = Math.hypot(targetX - startX, targetY - startY);
  const duration = projectileTicks(def.weapon, distance);
  // A defender steps before the enemies, so an enemy that just reached the
  // wall can still carry last tick's velocity. It is standing still now.
  const leadX = target.attacking ? 0 : target.vx;
  const leadY = target.attacking ? 0 : target.vy;
  // Thrown weapons promise their damage up front so the next defender aims at
  // something that will still be alive when this one lands.
  if (def.reserves) target.reserved += power;
  state.projectiles.push({
    id: state.nextId++,
    kind: def.weapon,
    x: startX,
    y: startY,
    startX,
    startY,
    targetId: target.id,
    targetX: targetX + leadX * duration,
    targetY: targetY + leadY * duration,
    duration,
    elapsed: 0,
    arc: arcHeight(def.weapon, distance),
    power,
    effect,
    rotation: 0,
    spin: spinOf(def.weapon),
  });
  state.events.push(def.weapon);
}

function projectileTicks(kind: WeaponKind, distance: number): number {
  switch (kind) {
    case "rifle":
      return 4;
    case "catapult":
      return Math.max(1, Math.round(10 + (distance / 400) * 10));
    default:
      return Math.max(1, Math.round(15 + (distance / 400) * 15));
  }
}

function arcHeight(kind: WeaponKind, distance: number): number {
  switch (kind) {
    case "rifle":
      return 0;
    case "catapult":
      return 18 + distance * 0.1;
    default:
      return 24 + distance * 0.12;
  }
}

function spinOf(kind: WeaponKind): number {
  switch (kind) {
    case "slipper":
    case "bottle":
      return 12;
    case "dumbbell":
    case "cracker":
      return 6;
    default:
      return 0;
  }
}

function stepEnemies(state: GameState): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive) {
      enemy.death++;
      continue;
    }
    if (enemy.x - ENEMY_TARGET_X > enemy.range) {
      const factor = enemy.slow > 0 ? 1 / 3 : 1;
      if (enemy.slow > 0) enemy.slow--;
      enemy.x += enemy.vx * factor;
      enemy.y += enemy.vy * factor;
      continue;
    }
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.attacking = true;
    enemy.attackCd--;
    if (enemy.attackCd > 0) continue;
    enemy.attackCd = ENEMY_ATTACK_CD;
    hitHouse(state);
  }
  // Fade finished dead bodies away.
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (!enemy.alive && enemy.death >= DEATH_TICKS) state.enemies.splice(i, 1);
  }
}

function hitHouse(state: GameState): void {
  if (state.phase !== "playing") return;
  state.hp = Math.max(0, state.hp - 1);
  state.shake = Math.max(state.shake, 8);
  state.events.push("house-hit");
}

function stepProjectiles(state: GameState): void {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const shot = state.projectiles[i];
    shot.elapsed++;
    const progress = shot.elapsed / shot.duration;
    shot.x = shot.startX + (shot.targetX - shot.startX) * progress;
    shot.y = shot.startY + (shot.targetY - shot.startY) * progress -
      Math.sin(Math.PI * progress) * shot.arc;
    shot.rotation += shot.spin;
    if (shot.elapsed < shot.duration) continue;
    land(state, shot);
    state.projectiles.splice(i, 1);
  }
}

function land(state: GameState, shot: ProjectileState): void {
  const target = shot.targetId === null
    ? undefined
    : state.enemies.find((enemy) => enemy.id === shot.targetId);
  state.events.push("impact");
  // Slipper, dumbbell, and catapult promised this damage at launch.
  const reserved = shot.kind === "slipper" || shot.kind === "dumbbell" ||
    shot.kind === "catapult";
  if (reserved && target?.alive) {
    target.reserved = Math.max(0, target.reserved - shot.power);
  }
  switch (shot.kind) {
    case "rifle":
    case "slipper":
    case "catapult":
      if (target?.alive) damage(state, target, shot.power);
      break;
    case "dumbbell": {
      if (target?.alive) damage(state, target, shot.power);
      const radius = 90 + 10 * shot.effect;
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        if (
          Math.hypot(enemy.x - shot.targetX, enemy.y - shot.targetY) < radius
        ) {
          enemy.slow = 30;
        }
      }
      addRing(state, shot.targetX, shot.targetY, radius, "#c9b15f", 3);
      break;
    }
    case "cracker": {
      const radius = 45 + 6 * shot.effect;
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        if (
          Math.hypot(enemy.x - shot.targetX, enemy.y - shot.targetY) < radius
        ) {
          damage(state, enemy, shot.power);
        }
      }
      addRing(state, shot.targetX, shot.targetY, radius, "#ffb347", 3);
      break;
    }
    case "bottle": {
      const radius = 45 + 7 * shot.effect;
      state.fires.push({
        id: state.nextId++,
        x: shot.targetX,
        y: shot.targetY,
        radius,
        power: shot.power,
        ticksLeft: FIRE_TICKS,
        nextTick: 1,
      });
      addRing(state, shot.targetX, shot.targetY, radius, "#ff7a3c", 2);
      break;
    }
  }
}

function stepFires(state: GameState): void {
  for (let i = state.fires.length - 1; i >= 0; i--) {
    const fire = state.fires[i];
    fire.nextTick--;
    if (fire.nextTick <= 0) {
      fire.nextTick = FIRE_INTERVAL;
      let burned = false;
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        if (Math.hypot(enemy.x - fire.x, enemy.y - fire.y) < fire.radius) {
          damage(state, enemy, fire.power);
          burned = true;
        }
      }
      if (burned) state.events.push("burn");
    }
    fire.ticksLeft--;
    if (fire.ticksLeft <= 0) state.fires.splice(i, 1);
  }
}

function damage(state: GameState, enemy: EnemyState, amount: number): void {
  if (!enemy.alive) return;
  enemy.hp -= amount;
  addFloater(
    state,
    enemy.x,
    enemy.y - 42,
    String(Math.round(amount)),
    "#fff3c4",
    13,
  );
  if (enemy.hp > 0) return;
  enemy.hp = 0;
  enemy.alive = false;
  enemy.death = 0;
  const def = ENEMIES[enemy.type];
  state.kills++;
  state.money += def.money;
  addFloater(
    state,
    enemy.x,
    enemy.y - 64,
    `$${def.money}`,
    "#ffd447",
    15,
  );
  state.events.push("death", "coin");
}
