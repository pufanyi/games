import { PRE_WIN_TICKS, TICK_RATE } from "./constants.ts";
import { updateEffects } from "./effects.ts";
import { cleanupEnemies, updateEnemy } from "./enemy.ts";
import { cleanupProjectiles, updateProjectiles } from "./projectiles.ts";
import { cleanupSoldiers, updateSoldier } from "./soldier.ts";
import { updateTower } from "./tower.ts";
import type { Enemy, World } from "./types.ts";
import { updateWaves } from "./waves.ts";

function decrementCooldowns(world: World): void {
  if (world.powers.lightning > 0) world.powers.lightning--;
  if (world.powers.fireball > 0) world.powers.fireball--;
  if (world.powers.reinforcements > 0) world.powers.reinforcements--;
}

function aliveEnemies(world: World): Enemy[] {
  return world.enemies.filter((enemy) => enemy.state !== "dead");
}

function checkVictory(world: World): void {
  if (world.waveIndex < world.modeData.waves.length) return;
  if (world.activeWaves.length > 0) return;
  if (aliveEnemies(world).length > 0) {
    world.preWinTicks = 0;
    return;
  }
  world.preWinTicks++;
  if (world.preWinTicks >= PRE_WIN_TICKS) world.status = "won";
}

/**
 * Advance the simulation by one 30 Hz tick. Fast-forwarding calls this more
 * than once per animation frame; the result is identical either way.
 */
export function tick(world: World): void {
  if (world.status !== "playing") return;
  world.tick++;
  decrementCooldowns(world);

  updateWaves(world);

  for (const enemy of [...world.enemies]) updateEnemy(world, enemy);
  for (const tower of [...world.towers]) updateTower(world, tower);
  for (const soldier of [...world.soldiers]) updateSoldier(world, soldier);
  updateProjectiles(world);
  updateEffects(world);

  cleanupEnemies(world);
  cleanupSoldiers(world);
  cleanupProjectiles(world);

  checkVictory(world);
}

/** Seconds of simulated time, for the HUD. */
export function elapsedSeconds(world: World): number {
  return Math.floor(world.tick / TICK_RATE);
}
