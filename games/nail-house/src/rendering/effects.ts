// In-flight weapons, burning puddles, blast rings, and floating damage text.
import type {
  FireState,
  FloaterState,
  ProjectileState,
  RingState,
} from "../game/types.ts";
import { type Ctx, ellipse, fillRound, line, outlinedText } from "./paint.ts";

export function drawProjectile(ctx: Ctx, shot: ProjectileState): void {
  ctx.save();
  ctx.translate(shot.x, shot.y);
  switch (shot.kind) {
    case "rifle": {
      const progress = progressOf(shot);
      ctx.globalAlpha = 0.85 * (1 - progress) + 0.15;
      line(
        ctx,
        shot.startX - shot.x,
        shot.startY - shot.y,
        0,
        0,
        "#fff6cc",
        2,
      );
      ellipse(ctx, 0, 0, 2, 2, "#fff2a8");
      break;
    }
    case "slipper": {
      ctx.rotate(shot.rotation);
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 3.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#e2586b";
      ctx.fill();
      ctx.strokeStyle = "#7c2f3c";
      ctx.lineWidth = 1;
      ctx.stroke();
      line(ctx, -5, -2, 3, -2.5, "#f7a8b4", 1.4);
      break;
    }
    case "dumbbell": {
      ctx.rotate(shot.rotation);
      line(ctx, -12, 0, 12, 0, "#4d4d55", 3);
      ellipse(ctx, -13, 0, 5, 7, "#33333b");
      ellipse(ctx, 13, 0, 5, 7, "#33333b");
      break;
    }
    case "catapult": {
      ctx.rotate(shot.rotation);
      fillRound(ctx, -5, -3, 10, 7, 2, "#a54331");
      ctx.fillStyle = "#7c2f22";
      ctx.fillRect(-5, -3, 10, 1.5);
      break;
    }
    case "bottle": {
      ctx.rotate(shot.rotation);
      fillRound(ctx, -3, -8, 6, 12, 2, "#3d8b4a");
      fillRound(ctx, -2, -13, 4, 6, 1, "#2c6b38");
      ctx.fillStyle = "#ffb347";
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.quadraticCurveTo(5, -20, 0, -24);
      ctx.quadraticCurveTo(-5, -20, 0, -14);
      ctx.fill();
      break;
    }
    case "cracker": {
      ctx.rotate(shot.rotation);
      fillRound(ctx, -3, -6, 6, 12, 2, "#cf3b30");
      line(ctx, 0, -6, 3, -14, "#6b5a45", 1.2);
      ellipse(ctx, 3, -15, 1.6, 1.6, "#ffd447");
      break;
    }
  }
  ctx.restore();
}

function progressOf(shot: ProjectileState): number {
  return Math.min(1, shot.elapsed / Math.max(1, shot.duration));
}

export function drawFire(ctx: Ctx, fire: FireState, tick: number): void {
  const strength = Math.min(1, fire.ticksLeft / 40);
  ctx.save();
  const glow = ctx.createRadialGradient(
    fire.x,
    fire.y,
    2,
    fire.x,
    fire.y,
    fire.radius,
  );
  glow.addColorStop(0, "rgba(255, 196, 88, 0.55)");
  glow.addColorStop(0.6, "rgba(255, 118, 44, 0.35)");
  glow.addColorStop(1, "rgba(160, 60, 20, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(fire.x, fire.y, fire.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.9 * strength + 0.1;
  const flames = 5;
  for (let i = 0; i < flames; i++) {
    const angle = (i / flames) * Math.PI * 2 + tick * 0.08;
    const radius = fire.radius * (0.28 + 0.5 * ((i * 37) % 10) / 10);
    const x = fire.x + Math.cos(angle) * radius;
    const y = fire.y + Math.sin(angle) * radius * 0.5;
    const flicker = 4 + Math.sin(tick * 0.7 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 3);
    ctx.quadraticCurveTo(x - 5, y - flicker, x, y - flicker - 4);
    ctx.quadraticCurveTo(x + 5, y - flicker, x + 4, y + 3);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? "#ffb347" : "#ff6b35";
    ctx.fill();
  }
  ctx.restore();
  // Scorch mark grows on the dirt.
  ctx.globalAlpha = 0.22 * Math.min(1, fire.ticksLeft / 60 + 0.4);
  ellipse(
    ctx,
    fire.x,
    fire.y + 8,
    fire.radius * 0.55,
    fire.radius * 0.16,
    "#3a2116",
  );
  ctx.globalAlpha = 1;
}

export function drawRing(ctx: Ctx, ring: RingState): void {
  const progress = 1 - ring.life / ring.maxLife;
  const radius = ring.radius + (ring.maxRadius - ring.radius) * progress;
  ctx.save();
  ctx.globalAlpha = (1 - progress) * 0.8;
  ctx.strokeStyle = ring.color;
  ctx.lineWidth = ring.width;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawFloater(ctx: Ctx, floater: FloaterState): void {
  const fade = Math.min(1, floater.life / 12);
  ctx.save();
  ctx.globalAlpha = fade;
  outlinedText(
    ctx,
    floater.text,
    floater.x,
    floater.y,
    floater.size,
    floater.color,
  );
  ctx.restore();
}
