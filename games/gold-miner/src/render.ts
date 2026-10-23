// Draws a GameState onto a 2D canvas. Reads the state, never changes it.
import { GROUND_Y, HEIGHT, type Item, WIDTH } from "./level.ts";
import {
  clawTip,
  type GameState,
  PIVOT_Y,
  type Player,
  TICK_RATE,
} from "./sim.ts";

type Ctx = CanvasRenderingContext2D;

const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif';

/**
 * Fixed pseudo-random numbers for decoration (pebbles, blob outlines), so the
 * scenery doesn't flicker between frames.
 */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Scattered pebbles in the dirt, computed once. */
const PEBBLES = Array.from({ length: 70 }, (_, i) => ({
  x: hash(i) * WIDTH,
  y: GROUND_Y + 20 + hash(i + 100) * (HEIGHT - GROUND_Y - 20),
  r: 1.5 + hash(i + 200) * 3,
}));

export function draw(ctx: Ctx, state: GameState) {
  drawBackground(ctx);
  for (const item of state.items) drawItem(ctx, item, state.tick);
  for (const player of state.players) drawPlayer(ctx, player, state.tick);
  drawEffects(ctx, state);
  drawHud(ctx, state);
}

function drawBackground(ctx: Ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, "#fde7a7");
  sky.addColorStop(1, "#f6c46a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, GROUND_Y);

  const dirt = ctx.createLinearGradient(0, GROUND_Y, 0, HEIGHT);
  dirt.addColorStop(0, "#a8692f");
  dirt.addColorStop(0.45, "#80491f");
  dirt.addColorStop(1, "#4f2a12");
  ctx.fillStyle = dirt;
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

  // Darker strata.
  ctx.fillStyle = "rgb(0 0 0 / 0.07)";
  for (let band = 0; band < 4; band++) {
    const y = GROUND_Y + 80 + band * 110;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= WIDTH; x += 40) {
      ctx.lineTo(x, y + Math.sin(x / 90 + band * 2) * 10);
    }
    ctx.lineTo(WIDTH, y + 36);
    for (let x = WIDTH; x >= 0; x -= 40) {
      ctx.lineTo(x, y + 36 + Math.sin(x / 70 + band) * 8);
    }
    ctx.fill();
  }

  ctx.fillStyle = "rgb(255 255 255 / 0.08)";
  for (const pebble of PEBBLES) {
    ctx.beginPath();
    ctx.arc(pebble.x, pebble.y, pebble.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grass lip along the top of the dirt.
  ctx.fillStyle = "#6c9a3a";
  ctx.fillRect(0, GROUND_Y - 4, WIDTH, 8);
}

function drawPlayer(ctx: Ctx, player: Player, tick: number) {
  const { claw } = player;
  const x = player.x;
  const reeling = claw.state === "retract";

  // Platform and winch frame.
  ctx.fillStyle = "#6b4423";
  ctx.fillRect(x - 46, GROUND_Y - 10, 92, 10);
  ctx.strokeStyle = "#4a2d14";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 18, GROUND_Y - 10);
  ctx.lineTo(x, PIVOT_Y - 14);
  ctx.lineTo(x + 18, GROUND_Y - 10);
  ctx.stroke();

  // Winch wheel; spins while reeling in.
  const spin = reeling ? tick * 0.35 : 0;
  ctx.fillStyle = "#8a5a2b";
  ctx.beginPath();
  ctx.arc(x, PIVOT_Y - 14, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3d250f";
  ctx.lineWidth = 2;
  for (let spoke = 0; spoke < 3; spoke++) {
    const a = spin + (spoke * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(a) * 10, PIVOT_Y - 14 - Math.sin(a) * 10);
    ctx.lineTo(x + Math.cos(a) * 10, PIVOT_Y - 14 + Math.sin(a) * 10);
    ctx.stroke();
  }

  drawMiner(ctx, x + 40, GROUND_Y - 10, reeling, tick);

  // Rope and claw.
  const tip = clawTip(player);
  ctx.strokeStyle = "#2b1b0d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, PIVOT_Y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();

  if (claw.item) drawItem(ctx, claw.item, tick);
  drawClaw(ctx, tip.x, tip.y, claw.angle, claw.item !== null);
}

/** The miner, standing at (x, feetY), working the crank when `reeling`. */
function drawMiner(
  ctx: Ctx,
  x: number,
  feetY: number,
  reeling: boolean,
  tick: number,
) {
  const bob = reeling ? Math.sin(tick * 0.35) * 2 : 0;
  // Legs.
  ctx.fillStyle = "#3b4a6b";
  ctx.fillRect(x - 9, feetY - 22, 7, 22);
  ctx.fillRect(x + 2, feetY - 22, 7, 22);
  // Body.
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.roundRect(x - 13, feetY - 48 + bob, 26, 28, 6);
  ctx.fill();
  // Arm reaching to the crank.
  ctx.strokeStyle = "#c0392b";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 10, feetY - 40 + bob);
  ctx.lineTo(x - 26, feetY - 44 + Math.sin(tick * 0.35) * (reeling ? 5 : 0));
  ctx.stroke();
  ctx.lineCap = "butt";
  // Head, beard, and helmet.
  ctx.fillStyle = "#f2c9a0";
  ctx.beginPath();
  ctx.arc(x, feetY - 58 + bob, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8b5a2b";
  ctx.beginPath();
  ctx.arc(x, feetY - 53 + bob, 9, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = "#f1c40f";
  ctx.beginPath();
  ctx.arc(x, feetY - 62 + bob, 12, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 15, feetY - 63 + bob, 30, 3);
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(x - 4, feetY - 59 + bob, 1.5, 0, Math.PI * 2);
  ctx.arc(x + 4, feetY - 59 + bob, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawClaw(
  ctx: Ctx,
  x: number,
  y: number,
  angle: number,
  closed: boolean,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-angle);
  ctx.strokeStyle = "#5d6d7e";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  const spread = closed ? 0.25 : 0.7;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(
      side * 14 * Math.sin(spread + 0.6),
      10,
      side * 6 * Math.sin(spread),
      18,
    );
    ctx.stroke();
  }
  ctx.fillStyle = "#34495e";
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** An irregular rounded outline, stable per item id. */
function blob(ctx: Ctx, item: Item, roughness: number) {
  const points = 10;
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = item.r *
      (1 - roughness + hash(item.id * 13 + (i % points)) * roughness);
    const px = item.x + Math.cos(a) * r;
    const py = item.y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawItem(ctx: Ctx, item: Item, tick: number) {
  const { x, y, r } = item;
  switch (item.kind) {
    case "goldSmall":
    case "goldMedium":
    case "goldLarge": {
      const fill = ctx.createRadialGradient(
        x - r / 3,
        y - r / 3,
        r / 6,
        x,
        y,
        r,
      );
      fill.addColorStop(0, "#fff3a3");
      fill.addColorStop(0.5, "#f5c518");
      fill.addColorStop(1, "#b7860b");
      ctx.fillStyle = fill;
      blob(ctx, item, 0.18);
      ctx.fill();
      ctx.strokeStyle = "#8a6508";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case "rockSmall":
    case "rockLarge": {
      const fill = ctx.createRadialGradient(
        x - r / 3,
        y - r / 3,
        r / 6,
        x,
        y,
        r,
      );
      fill.addColorStop(0, "#b3b6b7");
      fill.addColorStop(1, "#5f6466");
      ctx.fillStyle = fill;
      blob(ctx, item, 0.28);
      ctx.fill();
      ctx.strokeStyle = "#404446";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case "diamond":
      drawDiamond(ctx, x, y, r, tick + item.id * 17);
      break;
    case "bag":
      ctx.fillStyle = "#b9884d";
      ctx.beginPath();
      ctx.ellipse(x, y + 3, r, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 6, y - r * 0.7);
      ctx.lineTo(x - 9, y - r - 4);
      ctx.lineTo(x + 9, y - r - 4);
      ctx.lineTo(x + 6, y - r * 0.7);
      ctx.fill();
      ctx.fillStyle = "#6e4b22";
      ctx.fillRect(x - 7, y - r * 0.8, 14, 3);
      ctx.fillStyle = "#fff8e7";
      ctx.font = `bold ${r}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", x, y + 4);
      break;
    case "bone":
      ctx.fillStyle = "#efe6d2";
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(hash(item.id) * Math.PI);
      ctx.fillRect(-r * 0.7, -3, r * 1.4, 6);
      for (const [bx, by] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        ctx.beginPath();
        ctx.arc(bx * r * 0.7, by * 3.5, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    case "tnt":
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      ctx.roundRect(x - r * 0.8, y - r, r * 1.6, r * 2, 5);
      ctx.fill();
      ctx.fillStyle = "#7b241c";
      ctx.fillRect(x - r * 0.8, y - r * 0.6, r * 1.6, 3);
      ctx.fillRect(x - r * 0.8, y + r * 0.6 - 3, r * 1.6, 3);
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${r * 0.7}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TNT", x, y + 1);
      break;
    case "mole":
      drawMole(ctx, item, tick);
      break;
  }
}

/** `phase` offsets the sparkle so diamonds twinkle out of sync. */
function drawDiamond(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  phase: number,
) {
  const fill = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  fill.addColorStop(0, "#e8fdff");
  fill.addColorStop(0.5, "#6fe3f5");
  fill.addColorStop(1, "#2a9fd6");
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y - r * 0.2);
  ctx.lineTo(x, y + r * 1.1);
  ctx.lineTo(x - r, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1b6f99";
  ctx.lineWidth = 1;
  ctx.stroke();

  const twinkle = Math.max(0, Math.sin(phase / 12));
  if (twinkle > 0.6) {
    ctx.strokeStyle = `rgb(255 255 255 / ${(twinkle - 0.6) * 2.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.4, y - r * 0.9);
    ctx.lineTo(x - r * 0.4, y - r * 0.1);
    ctx.moveTo(x - r * 0.8, y - r * 0.5);
    ctx.lineTo(x, y - r * 0.5);
    ctx.stroke();
  }
}

function drawMole(ctx: Ctx, item: Item, tick: number) {
  const { x, y, r } = item;
  const facing = (item.vx ?? 1) >= 0 ? 1 : -1;
  const stride = Math.sin(tick * 0.4 + item.id) * 2;

  ctx.fillStyle = "#4e342e";
  for (const foot of [-0.5, 0.5]) {
    ctx.beginPath();
    ctx.ellipse(
      x + foot * r + stride * foot,
      y + r * 0.7,
      4,
      3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = "#6d4c41";
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.2, r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8a5c2";
  ctx.beginPath();
  ctx.arc(x + facing * r * 1.15, y - 1, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x + facing * r * 0.65, y - r * 0.3, 1.8, 0, Math.PI * 2);
  ctx.fill();

  if (item.carrying) {
    drawDiamond(ctx, x + facing * (r * 1.2 + 9), y + 2, 7, tick + item.id * 17);
  }
}

function drawEffects(ctx: Ctx, state: GameState) {
  for (const effect of state.effects) {
    const t = 1 - effect.ttl / effect.maxTtl;
    if (effect.type === "explosion") {
      const fill = ctx.createRadialGradient(
        effect.x,
        effect.y,
        0,
        effect.x,
        effect.y,
        effect.radius * (0.4 + t * 0.6),
      );
      fill.addColorStop(0, `rgb(255 245 200 / ${1 - t})`);
      fill.addColorStop(0.5, `rgb(255 150 30 / ${0.8 * (1 - t)})`);
      fill.addColorStop(1, "rgb(200 40 0 / 0)");
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = 1 - t;
      ctx.font = `bold 26px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#5c3b0a";
      ctx.strokeText(effect.text, effect.x, effect.y - t * 30);
      ctx.fillStyle = "#fff7c2";
      ctx.fillText(effect.text, effect.x, effect.y - t * 30);
      ctx.globalAlpha = 1;
    }
  }
}

function drawHud(ctx: Ctx, state: GameState) {
  ctx.textBaseline = "top";
  ctx.font = `bold 20px ${FONT}`;

  ctx.textAlign = "left";
  ctx.fillStyle = state.money >= state.goal ? "#1e7a34" : "#5c3b0a";
  ctx.fillText(`Money $${state.money}`, 16, 14);
  ctx.fillStyle = "#5c3b0a";
  ctx.fillText(`Goal  $${state.goal}`, 16, 40);

  const boosts = [];
  if (state.boosts.strength) boosts.push("Strength");
  if (state.boosts.clover) boosts.push("Clover");
  if (state.boosts.book) boosts.push("Rock book");
  if (state.boosts.polish) boosts.push("Polish");
  if (boosts.length > 0) {
    ctx.font = `600 14px ${FONT}`;
    ctx.fillStyle = "#7a5212";
    ctx.fillText(boosts.join(" · "), 16, 68);
  }

  ctx.textAlign = "right";
  ctx.font = `bold 20px ${FONT}`;
  const seconds = Math.ceil(state.timeLeft / TICK_RATE);
  ctx.fillStyle = seconds <= 10 ? "#c0392b" : "#5c3b0a";
  ctx.fillText(`Time ${seconds}`, WIDTH - 16, 14);
  ctx.fillStyle = "#5c3b0a";
  ctx.fillText(`Level ${state.level}`, WIDTH - 16, 40);

  // Dynamite sticks next to the miner's platform.
  const baseX = state.players[0].x - 60;
  for (let i = 0; i < Math.min(state.dynamite, 8); i++) {
    const sx = baseX - i * 9;
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(sx - 3, GROUND_Y - 30, 6, 20);
    ctx.strokeStyle = "#5c3b0a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, GROUND_Y - 30);
    ctx.lineTo(sx + 2, GROUND_Y - 35);
    ctx.stroke();
  }
}
