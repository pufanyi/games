import { POWERS } from "../content/powers.ts";
import { castLightning, spawnFireballRain } from "./projectiles.ts";
import { createReinforcements } from "./soldier.ts";
import type { World } from "./types.ts";

/** Click the lightning power on a point; it only fires on an enemy. */
export function useLightning(world: World, x: number, y: number): boolean {
  if (world.powers.lightning > 0) return false;
  if (!castLightning(world, x, y)) return false;
  world.powers.lightning = POWERS.lightning.coolDown ?? 750;
  return true;
}

export function useFireball(world: World, x: number, y: number): boolean {
  if (!world.available.fireball || world.powers.fireball > 0) return false;
  if (world.status !== "playing") return false;
  spawnFireballRain(world, x, y);
  world.powers.fireball = POWERS.fireball.coolDown ?? 2400;
  return true;
}

export function useReinforcements(world: World, x: number, y: number): boolean {
  if (!world.available.reinforcements || world.powers.reinforcements > 0) {
    return false;
  }
  if (world.status !== "playing") return false;
  createReinforcements(world, x, y);
  world.powers.reinforcements = POWERS.farmers.coolDown ?? 300;
  return true;
}
