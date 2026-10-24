// Frame composer. Rendering only reads the simulation state.
import { DEATH_TICKS } from "../game/config.ts";
import type { EnemyId, EnemyState, GameState } from "../game/types.ts";
import { drawEnemy } from "./actors.ts";
import { drawFire, drawFloater, drawProjectile, drawRing } from "./effects.ts";
import { type Ctx, ellipse, fillRound, groundShadow } from "./paint.ts";
import { drawBackground, drawHouse, drawLeaf, drawPedestal } from "./scene.ts";

/** Rough standing heights, used to park damage bars above each enemy. */
const ENEMY_HEIGHT: Record<EnemyId, number> = {
  grunt: 62,
  brute: 74,
  worker: 62,
  biker: 56,
  breaker: 62,
  excavator: 82,
};

export function draw(ctx: Ctx, state: GameState, time: number): void {
  drawBackground(ctx, time);
  drawPedestal(ctx);
  drawHouse(ctx, state);

  for (const fire of state.fires) drawFire(ctx, fire, state.tick);

  const enemies = [...state.enemies].sort((a, b) => a.y - b.y);
  for (const enemy of enemies) drawEnemyWithStatus(ctx, state, enemy);

  drawLeaf(ctx, state, time);

  for (const shot of state.projectiles) drawProjectile(ctx, shot);
  for (const ring of state.rings) drawRing(ctx, ring);
  for (const floater of state.floaters) drawFloater(ctx, floater);
}

function drawEnemyWithStatus(
  ctx: Ctx,
  state: GameState,
  enemy: EnemyState,
): void {
  const fade = enemy.alive ? 1 : Math.max(0, 1 - enemy.death / DEATH_TICKS);
  const height = ENEMY_HEIGHT[enemy.type];
  ctx.save();
  ctx.globalAlpha = fade;
  groundShadow(
    ctx,
    enemy.x,
    enemy.y + 2,
    enemy.type === "excavator" ? 26 : 15,
    0.18,
  );
  ctx.translate(enemy.x, enemy.y);
  if (!enemy.alive) {
    const progress = Math.min(1, enemy.death / DEATH_TICKS);
    ctx.translate(0, progress * 6);
    ctx.rotate(progress * 0.5);
  }
  drawEnemy(ctx, enemy, state.tick);
  ctx.restore();

  if (!enemy.alive) return;
  if (enemy.slow > 0) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    const y = enemy.y - height - 20;
    ctx.strokeStyle = "#bfe9ff";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const x = enemy.x - 6 + i * 6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2, y + 3);
      ctx.lineTo(x - 1, y + 6);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (enemy.hp >= enemy.maxHp) return;
  const width = enemy.type === "excavator" ? 54 : 30;
  const top = enemy.y - height - 12;
  ctx.save();
  fillRound(ctx, enemy.x - width / 2 - 1, top - 1, width + 2, 6, 3, "#3a2116");
  fillRound(ctx, enemy.x - width / 2, top, width, 4, 2, "#5b2a1e");
  const ratio = Math.max(0, enemy.hp / enemy.maxHp);
  const color = ratio > 0.55 ? "#7dc95a" : ratio > 0.25 ? "#e8b83a" : "#d9503f";
  ctx.fillStyle = color;
  ctx.fillRect(enemy.x - width / 2, top, width * ratio, 4);
  ctx.restore();
}

/** Idle scene behind the title and level-select screens. */
export function drawIdle(ctx: Ctx, state: GameState, time: number): void {
  drawBackground(ctx, time);
  drawPedestal(ctx);
  drawHouse(ctx, state);
  drawLeaf(ctx, state, time);

  // A couple of demolition workers loiter on the pit floor, waiting for orders.
  for (let i = 0; i < 2; i++) {
    const x = 420 + i * 104;
    const y = 392 + i * 24;
    groundShadow(ctx, x, y + 2, 14, 0.16);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.9;
    drawEnemy(
      ctx,
      {
        id: -1 - i,
        type: i === 0 ? "worker" : "brute",
        x,
        y,
        vx: 0,
        vy: 0,
        range: 0,
        hp: 100,
        maxHp: 100,
        reserved: 0,
        alive: true,
        slow: 0,
        attacking: false,
        attackCd: 30,
        death: -1,
      },
      Math.round(time * 30) + i * 9,
    );
    ctx.restore();
  }
  // Rubble dust hanging over the pit.
  ctx.save();
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 4; i++) {
    ellipse(ctx, 320 + i * 70, 300 + (i % 2) * 40, 26, 6, "#f3cf8a");
  }
  ctx.restore();
}
