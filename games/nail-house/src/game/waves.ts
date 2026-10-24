import { ENEMIES } from "./catalog.ts";
import {
  ENEMY_ATTACK_CD,
  ENEMY_ENTRANCE_YS,
  ENEMY_SPAWN_X,
  ENEMY_TARGET_X,
  ENEMY_TARGET_Y,
} from "./config.ts";
import type { EnemyId, GameState } from "./types.ts";

export function spawnWaves(state: GameState): void {
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
  // Cycle through authored entrances; buying cards never changes the route order.
  const startY = ENEMY_ENTRANCE_YS[state.spawns % ENEMY_ENTRANCE_YS.length];
  const speed = def.speed;
  const distance = ENEMY_SPAWN_X - ENEMY_TARGET_X;
  state.enemies.push({
    id: state.nextId++,
    type,
    x: ENEMY_SPAWN_X,
    y: startY,
    vx: -speed,
    vy: ((ENEMY_TARGET_Y - startY) * speed) / distance,
    range: def.range,
    hp: def.hp,
    maxHp: def.hp,
    reserved: 0,
    alive: true,
    slow: 0,
    attacking: false,
    attackCd: ENEMY_ATTACK_CD,
    death: -1,
  });
  state.spawns++;
}
