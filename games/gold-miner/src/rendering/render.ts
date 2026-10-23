// Draws a GameState onto a 2D canvas. Reads the state, never changes it.
import { WIDTH } from "../game/config.ts";
import {
  circlePath,
  type Ctx,
  FONT,
  hash,
  ink,
  outlinedText,
  sparkle,
  woodBoard,
} from "./paint.ts";
import { DECK_Y, drawCamp, drawRig } from "./camp.ts";
import { drawClaw } from "./claw.ts";
import { drawScenery } from "./scenery.ts";
import {
  clawTip,
  type Effect,
  type GameState,
  type Player,
} from "../game/sim.ts";
import { PIVOT_Y, TICK_RATE } from "../game/config.ts";
import { drawItem, drawPocket } from "./sprites.ts";

export function draw(ctx: Ctx, state: GameState) {
  drawScenery(ctx, state.tick);
  for (const item of state.items) drawPocket(ctx, item);
  for (const item of state.items) drawItem(ctx, item, state.tick);
  for (const player of state.players) drawPlayer(ctx, state, player);
  for (const effect of state.effects) drawEffect(ctx, effect);
  drawHud(ctx, state);
}

function drawPlayer(ctx: Ctx, state: GameState, player: Player) {
  const { claw, x } = player;
  drawRig(ctx, player);

  // Rope: a dark core with a twisted highlight that moves as it winds.
  const tip = clawTip(player);
  ctx.lineCap = "round";
  ctx.strokeStyle = "#4a2e14";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(x, PIVOT_Y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.strokeStyle = "#b08250";
  ctx.lineWidth = 1.4;
  ctx.setLineDash([3, 4]);
  ctx.lineDashOffset = -claw.length;
  ctx.stroke();
  ctx.setLineDash([]);

  drawCamp(ctx, state, player);
  const held = claw.item;
  drawClaw(
    ctx,
    tip.x,
    tip.y,
    claw.angle,
    held
      ? () => {
        // Drawn a little below where it hangs in the simulation, so it sits
        // down in the jaws' grip instead of hiding behind the housing.
        const drop = held.r * 0.2 + 7;
        ctx.save();
        ctx.translate(Math.sin(claw.angle) * drop, Math.cos(claw.angle) * drop);
        drawItem(ctx, held, state.tick);
        ctx.restore();
      }
      : undefined,
  );
}

function drawEffect(ctx: Ctx, effect: Effect) {
  const t = 1 - effect.ttl / effect.maxTtl;
  if (effect.type === "explosion") {
    drawExplosion(ctx, effect.x, effect.y, effect.radius, t);
    return;
  }
  // Money popup: pops in, then floats up and fades.
  const pop = 1 + Math.max(0, 0.45 - t * 4);
  const y = effect.y - t * 34;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (1 - t) * 2);
  ctx.translate(effect.x, y);
  ctx.scale(pop, pop);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const gold = ctx.createLinearGradient(0, -14, 0, 14);
  gold.addColorStop(0, "#fff7c0");
  gold.addColorStop(1, "#f2b215");
  outlinedText(ctx, effect.text, 0, 0, 30, gold, 6);
  ctx.restore();
}

function drawExplosion(
  ctx: Ctx,
  x: number,
  y: number,
  radius: number,
  t: number,
) {
  const seed = Math.round(x * 7 + y * 13);

  // Smoke puffs rising behind the blast.
  for (let i = 0; i < 6; i++) {
    const a = hash(seed + i) * Math.PI * 2;
    const d = radius * (0.25 + t * 0.55);
    circlePath(
      ctx,
      x + Math.cos(a) * d,
      y + Math.sin(a) * d - t * 30,
      radius * (0.18 + t * 0.2),
    );
    ctx.fillStyle = `rgb(90 80 70 / ${0.45 * (1 - t)})`;
    ctx.fill();
  }

  // Fireball and flash.
  const fire = ctx.createRadialGradient(
    x,
    y,
    0,
    x,
    y,
    radius * (0.45 + t * 0.55),
  );
  fire.addColorStop(0, `rgb(255 250 210 / ${1 - t})`);
  fire.addColorStop(0.45, `rgb(255 170 40 / ${0.9 * (1 - t)})`);
  fire.addColorStop(1, "rgb(220 60 10 / 0)");
  ctx.fillStyle = fire;
  circlePath(ctx, x, y, radius);
  ctx.fill();

  // Shock ring.
  circlePath(ctx, x, y, radius * (0.3 + t * 0.8));
  ctx.strokeStyle = `rgb(255 235 180 / ${0.8 * (1 - t)})`;
  ctx.lineWidth = 4 * (1 - t) + 1;
  ctx.stroke();

  // Flying debris with gravity.
  for (let i = 0; i < 12; i++) {
    const a = hash(seed + i * 3) * Math.PI * 2;
    const speed = 0.5 + hash(seed + i * 5);
    const dx = Math.cos(a) * radius * speed * t;
    const dy = Math.sin(a) * radius * speed * t + t * t * 60;
    const size = 2 + hash(seed + i * 7) * 4;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.translate(x + dx, y + dy);
    ctx.rotate(t * 8 + i);
    ctx.fillStyle = i % 3 === 0 ? "#ffcc33" : "#7a4a22";
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }
  if (t < 0.3) sparkle(ctx, x, y, radius * 0.5, 1 - t / 0.3);
}

function drawHud(ctx: Ctx, state: GameState) {
  const reached = state.money >= state.goal;
  ctx.textBaseline = "middle";

  // Money and goal board, top left.
  woodBoard(ctx, 10, 10, 172, 64, 1);
  coin(ctx, 34, 32, 10);
  ctx.textAlign = "left";
  outlinedText(
    ctx,
    `$${state.money}`,
    52,
    32,
    26,
    reached ? "#c8f58a" : "#fff4d6",
    5,
  );
  outlinedText(ctx, `Goal $${state.goal}`, 24, 58, 16, "#ffe2a8", 4);
  if (reached) sparkle(ctx, 164, 26, 8, 0.6 + Math.sin(state.tick / 8) * 0.4);

  // Active boosts, under the board.
  const boosts = (
    [
      ["strength", "Strength", "#e57373"],
      ["clover", "Clover", "#81c784"],
      ["book", "Rock book", "#a1887f"],
      ["polish", "Polish", "#4fc3f7"],
    ] as const
  ).filter(([key]) => state.boosts[key]);
  let bx = 12;
  ctx.font = `13px ${FONT}`;
  for (const [, label, color] of boosts) {
    const w = ctx.measureText(label).width + 16;
    ctx.beginPath();
    ctx.roundRect(bx, 80, w, 20, 10);
    ctx.fillStyle = color;
    ctx.fill();
    ink(ctx, 1.5);
    ctx.textAlign = "center";
    outlinedText(ctx, label, bx + w / 2, 90.5, 13, "#fffaf0", 3);
    bx += w + 6;
  }

  // Time and level board, top right.
  const seconds = Math.ceil(state.timeLeft / TICK_RATE);
  const urgent = seconds <= 10;
  woodBoard(ctx, WIDTH - 152, 10, 142, 64, 2);
  clock(ctx, WIDTH - 128, 32, 10, state.timeLeft);
  ctx.textAlign = "left";
  const pulse = urgent ? 1 + Math.max(0, Math.sin(state.tick / 5)) * 0.08 : 1;
  ctx.save();
  ctx.translate(WIDTH - 110, 32);
  ctx.scale(pulse, pulse);
  outlinedText(
    ctx,
    String(seconds),
    0,
    0,
    26,
    urgent ? "#ff8a7a" : "#fff4d6",
    5,
  );
  ctx.restore();
  outlinedText(ctx, `Level ${state.level}`, WIDTH - 138, 58, 16, "#ffe2a8", 4);

  // Dynamite sticks standing on the left end of the deck.
  const baseX = state.players[0].x - 42;
  const shown = Math.min(state.dynamite, 6);
  for (let i = 0; i < shown; i++) {
    const sx = baseX - i * 7.5;
    const top = DECK_Y - 21;
    ctx.beginPath();
    ctx.roundRect(sx - 3.5, top, 7, 21, 2);
    const paper = ctx.createLinearGradient(sx - 3.5, 0, sx + 3.5, 0);
    paper.addColorStop(0, "#f06a52");
    paper.addColorStop(1, "#b52a1c");
    ctx.fillStyle = paper;
    ctx.fill();
    ink(ctx, 1.5);
    ctx.fillStyle = "#f3e2b8";
    ctx.fillRect(sx - 3, top + 8, 6, 4);
    ctx.beginPath();
    ctx.moveTo(sx, top);
    ctx.quadraticCurveTo(sx + 2, top - 5, sx + 4, top - 6);
    ink(ctx, 1.2);
  }
  if (state.dynamite > shown) {
    ctx.textAlign = "right";
    outlinedText(
      ctx,
      `×${state.dynamite}`,
      baseX - shown * 7.5,
      DECK_Y - 10,
      15,
      "#fff4d6",
      3,
    );
  }
}

function coin(ctx: Ctx, x: number, y: number, r: number) {
  circlePath(ctx, x, y, r);
  const gold = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, r);
  gold.addColorStop(0, "#fff3a0");
  gold.addColorStop(1, "#e0a10c");
  ctx.fillStyle = gold;
  ctx.fill();
  ink(ctx, 2);
  ctx.textAlign = "center";
  ctx.fillStyle = "#a86a05";
  ctx.font = `${r * 1.4}px ${FONT}`;
  ctx.fillText("$", x, y + 1);
}

/** A clock face whose hand sweeps once per level. */
function clock(ctx: Ctx, x: number, y: number, r: number, timeLeft: number) {
  circlePath(ctx, x, y, r);
  ctx.fillStyle = "#fff8e6";
  ctx.fill();
  ink(ctx, 2);
  const a = -Math.PI / 2 + (timeLeft / (60 * TICK_RATE)) * Math.PI * 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
  ink(ctx, 2);
}
