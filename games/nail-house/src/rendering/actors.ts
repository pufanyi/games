// Vector actors for the family and the demolition crew. Every painter draws
// with its feet at (0, 0) so callers can place them on sills or on the dirt.
import type { DefenderDef, DefenderState, EnemyState } from "../game/types.ts";
import { type Ctx, ellipse, fillRound, line, roundRect } from "./paint.ts";

const SKIN = "#f0c090";
const OUTLINE = "#3a2116";

function stroke(ctx: Ctx, color = OUTLINE, width = 1.6) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

interface HeadOptions {
  x?: number;
  y?: number;
  r?: number;
  hair?: string;
  style?: "bald" | "bun" | "spiky" | "cap" | "helmet" | "scarf" | "none";
  cap?: string;
}

function head(ctx: Ctx, options: HeadOptions = {}) {
  const { x = 0, y = -52, r = 8, hair = "#3a2a20", style = "none", cap } =
    options;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = SKIN;
  ctx.fill();
  stroke(ctx);
  if (style === "bald") {
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fillStyle = "#e4d5c4";
    ctx.fill();
  } else if (style === "bun") {
    ctx.beginPath();
    ctx.arc(x, y, r + 1, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fillStyle = hair;
    ctx.fill();
    ellipse(ctx, x + r * 0.7, y - r * 0.9, r * 0.5, r * 0.5, hair);
  } else if (style === "spiky") {
    ctx.fillStyle = hair;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 4 - 2, y - r + 1);
      ctx.lineTo(x + i * 4 + 3, y - r - 7);
      ctx.lineTo(x + i * 4 + 5, y - r + 1);
      ctx.closePath();
      ctx.fill();
    }
  } else if (style === "cap" || style === "helmet") {
    ctx.beginPath();
    ctx.arc(x, y - r * 0.15, r + 1.5, Math.PI, Math.PI * 2);
    ctx.fillStyle = cap ?? "#2f6fb0";
    ctx.fill();
    stroke(ctx);
    fillRound(
      ctx,
      x - r - 1,
      y - r * 0.4,
      (r + 1) * 2,
      3,
      1.5,
      cap ?? "#2f6fb0",
    );
  } else if (style === "scarf") {
    ctx.beginPath();
    ctx.arc(x, y, r + 1, Math.PI * 0.7, Math.PI * 2.3);
    ctx.fillStyle = hair;
    ctx.fill();
  }
  ctx.fillStyle = OUTLINE;
  ellipse(ctx, x - 2.6, y + 1.4, 1, 1.2, OUTLINE);
  ellipse(ctx, x + 2.6, y + 1.4, 1, 1.2, OUTLINE);
}

function torso(
  ctx: Ctx,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  ctx.beginPath();
  roundRect(ctx, -width / 2, y, width, height, 4);
  ctx.fillStyle = color;
  ctx.fill();
  stroke(ctx);
}

function legs(ctx: Ctx, pants: string, shoe: string, stride = 0) {
  line(ctx, -4, -20, -5 - stride, -2, pants, 6);
  line(ctx, 4, -20, 5 + stride, -2, pants, 6);
  fillRound(ctx, -9 - stride, -3, 8, 4, 2, shoe);
  fillRound(ctx, 1 + stride, -3, 8, 4, 2, shoe);
}

function arm(
  ctx: Ctx,
  x: number,
  y: number,
  handX: number,
  handY: number,
  sleeve: string,
  width = 4.5,
) {
  line(ctx, x, y, handX, handY, sleeve, width);
  ellipse(ctx, handX, handY, 2.4, 2.4, SKIN);
}

function slipper(ctx: Ctx, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 3.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#e2586b";
  ctx.fill();
  stroke(ctx);
  line(ctx, -5, -2, 3, -2.5, "#f7a8b4", 1.4);
  ctx.restore();
}

export function drawDefender(
  ctx: Ctx,
  defender: DefenderState,
  def: DefenderDef,
  tick: number,
): void {
  const attack = defender.anim > 0
    ? Math.min(1, defender.anim / Math.max(1, def.attackTicks))
    : 0;
  const bob = Math.sin((tick + defender.id * 11) * 0.05) * 0.6;
  ctx.save();
  ctx.translate(0, bob);
  switch (def.id) {
    case "grandma": {
      legs(ctx, "#7c4a63", "#5b3a2c");
      torso(ctx, -42, 22, 22, "#3f8f8a");
      ctx.beginPath();
      ctx.moveTo(-11, -22);
      ctx.lineTo(11, -22);
      ctx.lineTo(8, -34);
      ctx.lineTo(-8, -34);
      ctx.closePath();
      ctx.fillStyle = "#2f6d69";
      ctx.fill();
      head(ctx, { style: "bun", hair: "#d8cfc4", y: -51 });
      arm(ctx, 8, -39, 13 + attack * 3, -30 - attack * 14, "#3f8f8a");
      arm(ctx, -9, -39, -13 - attack * 10, -46 - attack * 6, "#3f8f8a");
      slipper(ctx, -13 - attack * 12, -50 - attack * 8, -attack * 2.2);
      break;
    }
    case "grandpa": {
      legs(ctx, "#6a6257", "#3f2a1d", attack * 2);
      torso(ctx, -42, 24, 22, "#c9c0aa");
      head(ctx, { style: "bald", hair: "#cfc5b8", y: -52 });
      arm(ctx, 9, -39, 15 + attack * 4, -34, "#c9c0aa");
      arm(ctx, -9, -39, -2, -32 - attack * 3, "#c9c0aa");
      ctx.save();
      ctx.translate(4 + attack * 2, -33);
      ctx.rotate(-0.18 - attack * 0.35);
      fillRound(ctx, -4, -2.5, 26, 5, 2.5, "#6b4327");
      fillRound(ctx, 20, -1.5, 16, 3, 1.5, "#4b3a2a");
      ctx.restore();
      break;
    }
    case "muscle": {
      legs(ctx, "#3e5d8a", "#57351f", attack);
      torso(ctx, -44, 30, 24, "#c1453c");
      head(ctx, { style: "none", hair: "#221610", y: -54, r: 8.5 });
      ctx.fillStyle = "#221610";
      ctx.beginPath();
      ctx.arc(0, -58, 8.2, Math.PI, Math.PI * 2);
      ctx.fill();
      const handY = attack > 0 ? -68 - attack * 6 : -32;
      arm(ctx, 12, -41, 15, handY, "#c1453c", 5.5);
      arm(ctx, -12, -41, -15, handY, "#c1453c", 5.5);
      ctx.save();
      ctx.translate(0, handY);
      line(ctx, -14, 0, 14, 0, "#4d4d55", 3);
      ellipse(ctx, -15, 0, 5, 7, "#33333b");
      ellipse(ctx, 15, 0, 5, 7, "#33333b");
      ctx.restore();
      break;
    }
    case "tinker": {
      legs(ctx, "#545b6b", "#2f2a24");
      torso(ctx, -42, 22, 22, "#7b8f5a");
      head(ctx, { style: "cap", cap: "#2f6fb0", y: -52 });
      arm(ctx, 9, -39, 14, -30 - attack * 12, "#7b8f5a");
      arm(ctx, -9, -39, -13, -32 - attack * 4, "#7b8f5a");
      ctx.save();
      ctx.translate(10, -38 - attack * 10);
      line(ctx, 0, 4, 0, -14, "#7b5230", 2.6);
      line(ctx, -5, -14, 5, -14, "#7b5230", 2.4);
      line(ctx, 0, -8, -6, -2, "#cfc9a8", 1.4);
      ctx.restore();
      break;
    }
    case "auntie": {
      legs(ctx, "#5f4a72", "#442f22");
      ctx.beginPath();
      ctx.ellipse(0, -32, 15, 16, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#8e5a9e";
      ctx.fill();
      stroke(ctx);
      head(ctx, { style: "scarf", hair: "#e08a3c", y: -52, r: 8.5 });
      arm(ctx, 13, -38, 18 + attack * 3, -42 - attack * 6, "#8e5a9e");
      arm(ctx, -13, -38, -18, -32 - attack * 3, "#8e5a9e");
      ctx.save();
      ctx.translate(18 + attack * 3, -42 - attack * 6);
      ctx.rotate(attack * 0.8);
      fillRound(ctx, -3, -10, 6, 14, 2, "#3d8b4a");
      fillRound(ctx, -2, -14, 4, 5, 1, "#2c6b38");
      ctx.restore();
      break;
    }
    case "kid": {
      ctx.scale(0.88, 0.88);
      legs(ctx, "#d9a43a", "#7a4a2c");
      torso(ctx, -36, 18, 18, "#e0c04a");
      head(ctx, { style: "spiky", hair: "#2a1a12", y: -44, r: 7.2 });
      arm(ctx, 7, -31, 11 + attack * 2, -28 - attack * 12, "#e0c04a");
      arm(ctx, -7, -31, -11, -26, "#e0c04a");
      ctx.save();
      ctx.translate(11 + attack * 2, -28 - attack * 12);
      ctx.rotate(-0.5);
      fillRound(ctx, -2.2, -9, 4.4, 10, 1.6, "#cf3b30");
      line(ctx, 0, -10, 2, -14, "#6b5a45", 1.2);
      ctx.fillStyle = "#ffd447";
      ellipse(ctx, 2, -15, 1.4, 1.4, "#ffd447");
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

export function drawEnemy(ctx: Ctx, enemy: EnemyState, tick: number): void {
  const wobble = Math.sin((tick + enemy.seed * 40) * 0.35) * 1.6;
  const attackBob = enemy.attacking
    ? Math.sin((tick + enemy.seed * 20) * 0.9) * 2
    : 0;
  ctx.save();
  ctx.translate(0, wobble + attackBob);
  switch (enemy.type) {
    case "grunt": {
      legs(ctx, "#2b2b30", "#191919", wobble);
      torso(ctx, -40, 20, 20, "#b78a5a");
      head(ctx, { style: "spiky", hair: "#e0731f", y: -50, r: 7.6 });
      arm(ctx, 8, -36, 13, -27, "#b78a5a", 4);
      arm(ctx, -8, -36, -13, -27, "#b78a5a", 4);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * 13, -27);
        ctx.rotate(side * 0.4 - attackBob * 0.15);
        fillRound(ctx, -1.5, -8, 3, 9, 1, "#4b3a2a");
        ctx.beginPath();
        ctx.moveTo(-3.5, -8);
        ctx.lineTo(3.5, -8);
        ctx.lineTo(0, -16);
        ctx.closePath();
        ctx.fillStyle = "#d6d9dd";
        ctx.fill();
        stroke(ctx);
        ctx.restore();
      }
      break;
    }
    case "brute": {
      legs(ctx, "#3f3f45", "#26221c", wobble);
      torso(ctx, -48, 30, 26, "#8a8a8a");
      head(ctx, { style: "scarf", hair: "#c03b32", y: -59, r: 9 });
      arm(ctx, 13, -44, 19, -32, "#8a8a8a", 5);
      arm(ctx, -13, -44, -19, -32, "#8a8a8a", 5);
      ctx.save();
      ctx.translate(0, -26);
      ctx.rotate(enemy.attacking ? -0.6 : -1.15);
      line(ctx, 0, 0, 0, -34, "#6b4327", 4);
      fillRound(ctx, -11, -46, 22, 13, 4, "#5c5f68");
      stroke(ctx);
      ctx.restore();
      break;
    }
    case "worker": {
      legs(ctx, "#2f5f9e", "#22364f", wobble);
      torso(ctx, -40, 22, 22, "#2f6fb0");
      head(ctx, { style: "cap", cap: "#2f6fb0", y: -50 });
      arm(ctx, 9, -36, 15, -30, "#2f6fb0");
      arm(ctx, -9, -36, -14, -32, "#2f6fb0");
      ctx.save();
      ctx.translate(14, -30);
      ctx.rotate(-0.5 + attackBob * 0.1);
      line(ctx, 0, 0, 0, -36, "#8a6234", 3);
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(5, 0);
      ctx.lineTo(3, 8);
      ctx.lineTo(-3, 8);
      ctx.closePath();
      ctx.fillStyle = "#9aa0a8";
      ctx.fill();
      stroke(ctx);
      ctx.restore();
      break;
    }
    case "biker": {
      ctx.translate(0, -2);
      for (const x of [-15, 15]) {
        ctx.beginPath();
        ctx.arc(x, -10, 10, 0, Math.PI * 2);
        ctx.strokeStyle = "#3d3d44";
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ellipse(ctx, x, -10, 2, 2, "#3d3d44");
      }
      line(ctx, -15, -10, 2, -20, "#4b4b52", 2.4);
      line(ctx, 2, -20, 15, -10, "#4b4b52", 2.4);
      line(ctx, -4, -20, 6, -20, "#4b4b52", 2.4);
      line(ctx, -15, -10, 0, -4, "#4b4b52", 2);
      fillRound(ctx, -24, -27, 13, 12, 2, "#a97c46");
      stroke(ctx);
      legs(ctx, "#232326", "#151515", wobble * 0.3);
      torso(ctx, -38, 20, 19, "#2b2b30");
      head(ctx, { style: "cap", cap: "#1d1d1f", y: -48, r: 7.4 });
      line(ctx, 8, -34, 14, -24, "#2b2b30", 4);
      break;
    }
    case "breaker": {
      legs(ctx, "#5f7a3f", "#3a2a18", wobble);
      torso(ctx, -40, 27, 23, "#c99a62");
      head(ctx, { style: "helmet", cap: "#e0b429", y: -52, r: 8 });
      arm(ctx, 10, -36, 16, -30, "#c99a62", 5);
      arm(ctx, -10, -36, -16, -30, "#c99a62", 5);
      ctx.save();
      ctx.translate(0, -22);
      const shake = enemy.attacking ? Math.sin(tick * 2.4) * 1.8 : 0;
      ctx.translate(shake, 0);
      fillRound(ctx, -7, -9, 14, 12, 3, "#5f6368");
      fillRound(ctx, -4, -14, 8, 6, 2, "#4a4d52");
      line(ctx, 0, 3, 0, 12, "#9aa0a8", 3);
      ctx.restore();
      break;
    }
    case "excavator": {
      ctx.translate(0, -3);
      fillRound(ctx, -30, -16, 60, 16, 5, "#45454b");
      for (let i = 0; i < 5; i++) {
        ellipse(ctx, -22 + i * 11, -3, 5, 4, "#2c2c30");
      }
      fillRound(ctx, -26, -34, 34, 19, 4, "#e6a92c");
      stroke(ctx);
      fillRound(ctx, -22, -32, 14, 12, 2, "#7a5636");
      fillRound(ctx, 8, -31, 14, 14, 2, "#c98c1f");
      ctx.save();
      ctx.translate(10, -32);
      const swing = enemy.attacking ? Math.sin(tick * 0.6) * 0.25 : 0;
      ctx.rotate(-0.35 + swing);
      line(ctx, 0, 0, 26, -22, "#e6a92c", 7);
      line(ctx, 26, -22, 42, -6, "#e6a92c", 5);
      line(ctx, 42, -6, 42, 12, "#4a4a50", 1.6);
      ellipse(ctx, 42, 18, 9, 9, "#2f2f34");
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}
