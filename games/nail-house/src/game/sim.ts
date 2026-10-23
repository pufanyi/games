// Deterministic 30 Hz simulation. Every number here comes from the decompiled
// ActionScript (`src/Game.as`, `src/Grid.as`, `src/attacker`, `src/defender`,
// and `src/weapon`); see DESIGN.md and CALIBRATION.md for the mapping.
import { DEFENDERS, ENEMIES } from "./catalog.ts";
import {
  ENEMY_ATTACK_CD,
  ENEMY_SPAWN_X,
  ENEMY_SPAWN_Y_MAX,
  ENEMY_SPAWN_Y_MIN,
  ENEMY_TARGET_X,
  ENEMY_TARGET_Y,
  LEAF,
  MAX_DEFENDERS,
  MAX_HP,
  SLOT_X,
  SLOT_YS,
  START_MONEY,
  TICK_RATE,
} from "./config.ts";
import { levelSpec } from "./levels.ts";
import { Rng } from "./rng.ts";
import type {
  DefenderDef,
  DefenderId,
  DefenderState,
  EnemyId,
  EnemyState,
  FloaterState,
  GameState,
  ProjectileState,
  RingState,
  SoundName,
  WaveState,
  WeaponKind,
} from "./types.ts";

/** Ticks a body stays on stage after a kill, while it fades out. */
export const DEATH_TICKS = 36;
/** The original waited one second after the last defender kill. */
const WIN_DELAY = TICK_RATE;
/** Fire bottles burn for 150 ticks at five damage ticks. */
const FIRE_TICKS = 150;
const FIRE_INTERVAL = 30;
/** Highest card level in the original shop. */
export const CARD_MAX_LEVEL = 5;

export function createGame(level: number, seed: number): GameState {
  const spec = levelSpec(level);
  const waves: WaveState[] = spec.waves.map((wave) => ({
    ...wave,
    remaining: wave.count,
    cd: 0,
  }));
  return {
    seed,
    level: spec.level,
    survival: spec.survival,
    tick: 0,
    phase: "playing",
    hp: MAX_HP,
    money: START_MONEY,
    defenders: [],
    enemies: [],
    projectiles: [],
    fires: [],
    rings: [],
    floaters: [],
    waves,
    spawns: 0,
    kills: 0,
    spent: 0,
    shake: 0,
    leafClicks: 0,
    leafFlash: 0,
    winCountdown: -1,
    nextId: 1,
    events: [],
    rng: new Rng(seed),
  };
}

// ---------------------------------------------------------------------------
// Card stats. A card levels up in place: one card per family member, so the
// deployed defender and the card always share a level.

export function cooldownTicks(def: DefenderDef, level: number): number {
  // `int(speed * 30)` in Friend1.setStat.
  return Math.trunc(def.interval[level - 1] * TICK_RATE);
}

export function defenderOf(
  state: GameState,
  type: DefenderId,
): DefenderState | undefined {
  return state.defenders.find((defender) => defender.type === type);
}

/** Price of the next action: deploy at level 1, or upgrade to level + 1. */
export function nextCost(def: DefenderDef, level: number): number {
  return def.cost[Math.min(level, CARD_MAX_LEVEL - 1)];
}

/**
 * Card state for the shop: whether the member is out, its level, and what the
 * next click costs. Mirrors `Grid.showStat`.
 */
export interface CardState {
  deployed: boolean;
  level: number;
  cost: number;
  affordable: boolean;
  maxed: boolean;
  blocked: boolean;
}

export function cardState(state: GameState, type: DefenderId): CardState {
  const def = DEFENDERS[type];
  const deployed = defenderOf(state, type);
  const level = deployed?.level ?? 1;
  const maxed = deployed !== undefined && deployed.level >= CARD_MAX_LEVEL;
  // A member who is not out yet costs the deploy price, not the first upgrade.
  const cost = deployed ? nextCost(def, deployed.level) : def.cost[0];
  const blocked = !deployed && state.defenders.length >= MAX_DEFENDERS;
  return {
    deployed: deployed !== undefined,
    level,
    cost,
    affordable: !maxed && !blocked && state.money >= cost,
    maxed,
    blocked,
  };
}

/**
 * Deploy or upgrade a family member. Returns whether money changed hands; the
 * shop stays open either way so the player can pick something affordable.
 */
export function purchase(state: GameState, type: DefenderId): boolean {
  if (state.phase !== "playing") return false;
  const def = DEFENDERS[type];
  const deployed = defenderOf(state, type);
  if (!deployed) {
    if (state.defenders.length >= MAX_DEFENDERS) {
      state.events.push("error");
      return false;
    }
    const cost = def.cost[0];
    if (state.money < cost) {
      state.events.push("error");
      return false;
    }
    state.money -= cost;
    state.spent += cost;
    state.defenders.push({
      id: state.nextId++,
      type,
      level: 1,
      slot: state.defenders.length,
      cooldown: 0,
      targetId: null,
      anim: 0,
    });
    state.events.push("deploy", "click");
    return true;
  }
  if (deployed.level >= CARD_MAX_LEVEL) {
    state.events.push("error");
    return false;
  }
  const cost = nextCost(def, deployed.level);
  if (state.money < cost) {
    state.events.push("error");
    return false;
  }
  state.money -= cost;
  state.spent += cost;
  deployed.level++;
  deployed.anim = def.attackTicks;
  state.events.push("upgrade", "click");
  return true;
}

/**
 * The vine at the foot of the house heals one point per ten taps
 * (`game3_fla.Timeline_29.onClick`), never above the maximum.
 */
export function tapLeaf(state: GameState): void {
  if (state.phase !== "playing") return;
  state.leafFlash = 12;
  state.leafClicks++;
  if (state.leafClicks < LEAF.clicksForHeal) {
    state.events.push("click");
    return;
  }
  state.leafClicks = 0;
  if (state.hp >= MAX_HP) return;
  state.hp++;
  state.events.push("heal");
  addFloater(state, LEAF.x + 22, LEAF.y - 16, "+1 HP", "#a8e063", 15);
}

// ---------------------------------------------------------------------------
// The tick.

export function step(state: GameState): void {
  state.events.length = 0;
  if (state.phase !== "playing") return;
  state.tick++;
  if (state.shake > 0) state.shake--;
  if (state.leafFlash > 0) state.leafFlash--;

  stepDefenders(state);
  stepEnemies(state);
  stepProjectiles(state);
  stepFires(state);
  spawnWaves(state);
  ageEffects(state);
  checkEnd(state);
}

function stepDefenders(state: GameState): void {
  for (const defender of state.defenders) {
    const def = DEFENDERS[defender.type];
    if (defender.anim > 0) defender.anim--;
    if (defender.cooldown > 0) {
      defender.cooldown--;
      continue;
    }
    const target = findTarget(state, def, defender);
    if (!target) {
      defender.targetId = null;
      continue;
    }
    defender.targetId = target.id;
    fire(state, defender, def, target);
    defender.cooldown = cooldownTicks(def, defender.level);
    defender.anim = def.attackTicks;
  }
}

/**
 * `Friend1.findNearest` measures `enemy.x - this.x`, where `this.x` is the
 * defender inside its window clip (always 0). Range therefore applies to the
 * enemy's stage x, and the leftmost enemy wins; a target whose promised damage
 * already covers its HP is skipped (`hp2 > 0` in the original).
 */
function findTarget(
  state: GameState,
  def: DefenderDef,
  defender: DefenderState,
): EnemyState | null {
  const range = def.range[defender.level - 1];
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
  const effect = def.effect[level - 1];
  const startX = SLOT_X + def.muzzleX;
  const startY = SLOT_YS[defender.slot] + def.muzzleY;
  const spread = def.weapon === "dumbbell" || def.weapon === "cracker"
    ? 0
    : state.rng.range(-10, 0);
  const targetX = target.x + spread;
  const targetY = target.y - 30 + state.rng.range(-10, 0);
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
  state.events.push(soundOf(def.weapon));
}

function projectileTicks(kind: WeaponKind, distance: number): number {
  switch (kind) {
    case "rifle":
      // The SWF bullet lives for a single tick; a few more keep the tracer
      // readable at 30 Hz without changing the rifle's fixed cooldown.
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

function soundOf(kind: WeaponKind): SoundName {
  switch (kind) {
    case "slipper":
      return "slipper";
    case "rifle":
      return "rifle";
    case "dumbbell":
      return "dumbbell";
    case "catapult":
      return "catapult";
    case "bottle":
      return "bottle";
    case "cracker":
      return "cracker";
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
    // The SWF switches to the attack pose and only then starts counting down.
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

function spawnWaves(state: GameState): void {
  for (const wave of state.waves) {
    if (wave.startTime >= state.tick || wave.remaining <= 0) continue;
    if (wave.cd > 0) {
      wave.cd--;
      continue;
    }
    wave.interval = Math.max(wave.min, wave.interval - 1);
    wave.remaining--;
    wave.cd = wave.interval;
    spawnEnemy(state, wave.enemy);
  }
}

function spawnEnemy(state: GameState, type: EnemyId): void {
  const def = ENEMIES[type];
  const startY = state.rng.range(ENEMY_SPAWN_Y_MIN, ENEMY_SPAWN_Y_MAX);
  const targetY = ENEMY_TARGET_Y + state.rng.range(-15, 15);
  const speed = def.speed;
  const jitter = def.rangeJitter;
  const range = jitter === 0
    ? def.range
    : def.range + state.rng.range(-jitter, jitter);
  const distance = ENEMY_SPAWN_X - ENEMY_TARGET_X;
  state.enemies.push({
    id: state.nextId++,
    type,
    x: ENEMY_SPAWN_X,
    y: startY,
    targetX: ENEMY_TARGET_X,
    targetY,
    vx: -speed,
    // Straight diagonal walk; the SWF derives vy from the same ratio.
    vy: ((targetY - startY) * speed) / distance,
    range,
    hp: def.hp,
    maxHp: def.hp,
    reserved: 0,
    alive: true,
    slow: 0,
    attacking: false,
    attackCd: ENEMY_ATTACK_CD,
    death: -1,
    seed: state.rng.next(),
  });
  state.spawns++;
}

function damage(state: GameState, enemy: EnemyState, amount: number): void {
  if (!enemy.alive) return;
  enemy.hp -= amount;
  addFloater(
    state,
    enemy.x + state.rng.range(-8, 8),
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

function ageEffects(state: GameState): void {
  for (let i = state.floaters.length - 1; i >= 0; i--) {
    const floater = state.floaters[i];
    floater.y -= 0.55;
    floater.life--;
    if (floater.life <= 0) state.floaters.splice(i, 1);
  }
  for (let i = state.rings.length - 1; i >= 0; i--) {
    const ring = state.rings[i];
    ring.life--;
    if (ring.life <= 0) state.rings.splice(i, 1);
  }
}

function checkEnd(state: GameState): void {
  if (state.hp <= 0) {
    state.phase = "lost";
    state.events.push("lose");
    return;
  }
  if (state.survival) return;
  const alive = state.enemies.some((enemy) => enemy.alive);
  const pending = state.waves.some((wave) => wave.remaining > 0);
  if (alive || pending || state.spawns === 0) return;
  if (state.winCountdown < 0) {
    state.winCountdown = WIN_DELAY;
    return;
  }
  state.winCountdown--;
  if (state.winCountdown > 0) return;
  state.phase = "won";
  state.events.push("win");
}

// ---------------------------------------------------------------------------
// Cosmetic helpers. Rendering reads these and never writes game state.

function addFloater(
  state: GameState,
  x: number,
  y: number,
  text: string,
  color: string,
  size: number,
): void {
  const floater: FloaterState = {
    id: state.nextId++,
    x,
    y,
    text,
    color,
    life: 42,
    maxLife: 42,
    size,
  };
  state.floaters.push(floater);
}

function addRing(
  state: GameState,
  x: number,
  y: number,
  radius: number,
  color: string,
  width: number,
): void {
  const ring: RingState = {
    id: state.nextId++,
    x,
    y,
    radius: 2,
    maxRadius: radius,
    life: 18,
    maxLife: 18,
    color,
    width,
  };
  state.rings.push(ring);
}

// ---------------------------------------------------------------------------
// Read helpers for the HUD and tests.

export function aliveCount(state: GameState): number {
  return state.enemies.reduce(
    (count, enemy) => count + (enemy.alive ? 1 : 0),
    0,
  );
}

export function waveCount(state: GameState): {
  done: number;
  total: number;
} {
  const total = state.waves.reduce((sum, wave) => sum + wave.count, 0);
  return { done: state.spawns, total };
}
