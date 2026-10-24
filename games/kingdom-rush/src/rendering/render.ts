// Draws one frame of a level: the cached background, then every entity sorted
// by depth, then flying things and effects on top. Reads the world, never
// changes it.
import type { World } from "../game/types.ts";
import {
  drawEffect,
  drawEnemy,
  drawGoalGlow,
  drawOverlays,
  drawProjectile,
  drawSoldier,
  drawSpawnGlow,
  drawTower,
  type OverlayState,
  rallyPole,
} from "./figures.ts";
import { backgroundFor, WORLD_HEIGHT, WORLD_WIDTH } from "./terrain.ts";

interface Drawable {
  y: number;
  paint: () => void;
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  world: World,
  overlay: OverlayState,
): void {
  const tick = world.tick;
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.drawImage(backgroundFor(world), 0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  drawSpawnGlow(ctx, world, tick);
  drawGoalGlow(ctx, world, tick);

  const items: Drawable[] = [];
  for (const tower of world.towers) {
    items.push({ y: tower.y, paint: () => drawTower(ctx, tower, tick) });
    if (tower.type === "barracks") {
      const { x, y } = tower.rally;
      items.push({ y, paint: () => rallyPole(ctx, x, y, tick) });
    }
  }
  for (const enemy of world.enemies) {
    items.push({ y: enemy.y, paint: () => drawEnemy(ctx, enemy, tick) });
  }
  for (const soldier of world.soldiers) {
    if (soldier.state === "dead") continue;
    items.push({ y: soldier.y, paint: () => drawSoldier(ctx, soldier, tick) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const item of items) item.paint();

  // Projectiles and effects stay above the sorted layer so a bomb never hides
  // behind the tower that fired it.
  for (const projectile of world.projectiles) drawProjectile(ctx, projectile);
  for (const effect of world.effects) drawEffect(ctx, effect);

  drawOverlays(ctx, world, overlay, tick);
}
