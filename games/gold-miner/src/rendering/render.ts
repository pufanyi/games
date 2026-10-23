// Draws a GameState onto a 2D canvas. Reads the state, never changes it.
import { GROUND_Y, WIDTH } from "../game/config.ts";
import {
  circlePath,
  type Ctx,
  FONT,
  hash,
  INK,
  ink,
  outlinedText,
  sparkle,
  woodBoard,
} from "./paint.ts";
import { drawScenery } from "./scenery.ts";
import {
  clawTip,
  type Effect,
  type GameState,
  type Player,
} from "../game/sim.ts";
import { PIVOT_Y, TICK_RATE } from "../game/config.ts";
import { drawItem, drawPocket } from "./sprites.ts";

/** Radius of the pulley wheel; the rope leaves its bottom at PIVOT_Y. */
const PULLEY_R = 11;
/** The crank the miner turns, at hip height between pulley and miner. */
const CRANK = { dx: 26, y: GROUND_Y - 30, r: 8 };

export function draw(ctx: Ctx, state: GameState) {
  drawScenery(ctx, state.tick);
  for (const item of state.items) drawPocket(ctx, item);
  for (const item of state.items) drawItem(ctx, item, state.tick);
  for (const player of state.players) drawPlayer(ctx, player, state.tick);
  for (const effect of state.effects) drawEffect(ctx, effect);
  drawHud(ctx, state);
}

function drawPlayer(ctx: Ctx, player: Player, tick: number) {
  const { claw, x } = player;
  const reeling = claw.state === "retract";
  // Turns while the rope moves; the pulley and crank follow it.
  const turn = claw.state === "swing" ? 0 : claw.length * 0.08;
  const pulleyY = PIVOT_Y - PULLEY_R;

  drawScaffold(ctx, x);

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

  const crankX = x + CRANK.dx;
  drawBelt(ctx, x, pulleyY, crankX, CRANK.y);
  drawPulley(ctx, x, pulleyY, turn);
  drawCrank(ctx, crankX, CRANK.y, turn);
  const hand = {
    x: crankX + Math.cos(turn) * CRANK.r,
    y: CRANK.y + Math.sin(turn) * CRANK.r,
  };
  drawMiner(ctx, x + 48, GROUND_Y - 12, hand, reeling, tick);

  if (claw.item) drawItem(ctx, claw.item, tick);
  drawClaw(ctx, tip.x, tip.y, claw.angle, claw.item !== null);
}

function drawScaffold(ctx: Ctx, x: number) {
  const top = PIVOT_Y - PULLEY_R;
  // A-frame legs.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 34, GROUND_Y - 10);
    ctx.lineTo(x + side * 4, top - 4);
    ctx.lineTo(x + side * 10, top - 4);
    ctx.lineTo(x + side * 42, GROUND_Y - 10);
    ctx.closePath();
    ctx.fillStyle = "#8d5a2b";
    ctx.fill();
    ink(ctx, 2);
  }
  // Cross brace.
  ctx.beginPath();
  ctx.roundRect(x - 24, GROUND_Y - 34, 48, 6, 2);
  ctx.fillStyle = "#a06a36";
  ctx.fill();
  ink(ctx, 2);

  // Plank platform.
  const plank = ctx.createLinearGradient(0, GROUND_Y - 14, 0, GROUND_Y);
  plank.addColorStop(0, "#c48a4f");
  plank.addColorStop(1, "#8d5a2b");
  ctx.fillStyle = plank;
  ctx.beginPath();
  ctx.roundRect(x - 64, GROUND_Y - 14, 128, 12, 3);
  ctx.fill();
  ink(ctx, 2);
  ctx.strokeStyle = "rgb(58 35 18 / 0.5)";
  ctx.lineWidth = 1.5;
  for (const px of [-32, 0, 32]) {
    ctx.beginPath();
    ctx.moveTo(x + px, GROUND_Y - 13);
    ctx.lineTo(x + px, GROUND_Y - 3);
    ctx.stroke();
  }
}

function drawPulley(ctx: Ctx, x: number, y: number, turn: number) {
  circlePath(ctx, x, y, PULLEY_R + 3);
  ctx.fillStyle = "#6d6a66";
  ctx.fill();
  ink(ctx, 2);
  circlePath(ctx, x, y, PULLEY_R - 2);
  ctx.fillStyle = "#9e9a94";
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (let spoke = 0; spoke < 3; spoke++) {
    const a = turn + (spoke * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(
      x - Math.cos(a) * (PULLEY_R - 2),
      y - Math.sin(a) * (PULLEY_R - 2),
    );
    ctx.lineTo(
      x + Math.cos(a) * (PULLEY_R - 2),
      y + Math.sin(a) * (PULLEY_R - 2),
    );
    ctx.stroke();
  }
  circlePath(ctx, x, y, 3.5);
  ctx.fillStyle = "#e0c060";
  ctx.fill();
  ink(ctx, 1.5);
}

/** The drive belt from the crank up to the pulley. */
function drawBelt(ctx: Ctx, px: number, py: number, cx: number, cy: number) {
  ctx.strokeStyle = "#2b1a0c";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(px + 2, py - PULLEY_R);
  ctx.lineTo(cx + 2, cy - CRANK.r);
  ctx.moveTo(px - 2, py + PULLEY_R);
  ctx.lineTo(cx - 2, cy + CRANK.r);
  ctx.stroke();
}

/** A small wheel on a post, with a handle the miner holds. */
function drawCrank(ctx: Ctx, x: number, y: number, turn: number) {
  ctx.beginPath();
  ctx.roundRect(x - 3, y, 6, GROUND_Y - 14 - y, 2);
  ctx.fillStyle = "#8d5a2b";
  ctx.fill();
  ink(ctx, 1.5);
  circlePath(ctx, x, y, CRANK.r);
  ctx.fillStyle = "#8a8680";
  ctx.fill();
  ink(ctx, 2);
  const hx = x + Math.cos(turn) * CRANK.r;
  const hy = y + Math.sin(turn) * CRANK.r;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(hx, hy);
  ctx.strokeStyle = "#4b4844";
  ctx.lineWidth = 3;
  ctx.stroke();
  circlePath(ctx, hx, hy, 2.5);
  ctx.fillStyle = "#c62828";
  ctx.fill();
  ink(ctx, 1.2);
}

/** A bearded prospector at (x, feetY), cranking the winch at `hand`. */
function drawMiner(
  ctx: Ctx,
  x: number,
  feetY: number,
  hand: { x: number; y: number },
  reeling: boolean,
  tick: number,
) {
  const bob = reeling ? Math.abs(Math.sin(tick * 0.25)) * -2 : 0;
  const hip = feetY - 22;
  const shoulder = { x: x - 6, y: feetY - 44 + bob };

  // Boots and legs (overalls).
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(x + side * 6 - 5, hip, 10, 18, 3);
    ctx.fillStyle = "#3d5a99";
    ctx.fill();
    ink(ctx, 2);
    ctx.beginPath();
    ctx.roundRect(x + side * 6 - 6 + side * 2, feetY - 6, 13, 7, 3);
    ctx.fillStyle = "#4e2f1a";
    ctx.fill();
    ink(ctx, 2);
  }

  // Back arm hanging.
  limb(ctx, x + 8, feetY - 42 + bob, x + 13, feetY - 26 + bob, "#c0392b");

  // Torso: red shirt under an overall bib.
  ctx.beginPath();
  ctx.roundRect(x - 13, feetY - 48 + bob, 26, 28, 8);
  ctx.fillStyle = "#c0392b";
  ctx.fill();
  ink(ctx, 2);
  ctx.beginPath();
  ctx.roundRect(x - 9, feetY - 38 + bob, 18, 18, 3);
  ctx.fillStyle = "#4a6db3";
  ctx.fill();
  ink(ctx, 1.5);
  for (const bx of [-5, 5]) {
    circlePath(ctx, x + bx, feetY - 35 + bob, 1.6);
    ctx.fillStyle = "#f4c430";
    ctx.fill();
  }

  // Front arm on the crank.
  limb(ctx, shoulder.x, shoulder.y, hand.x, hand.y, "#c0392b");
  circlePath(ctx, hand.x, hand.y, 4);
  ctx.fillStyle = "#f2c094";
  ctx.fill();
  ink(ctx, 1.5);

  // Head.
  const hy = feetY - 60 + bob;
  circlePath(ctx, x, hy, 12);
  ctx.fillStyle = "#f5c99b";
  ctx.fill();
  ink(ctx, 2);
  // Beard and mustache.
  ctx.beginPath();
  ctx.moveTo(x - 11, hy + 1);
  ctx.quadraticCurveTo(x - 12, hy + 15, x, hy + 17);
  ctx.quadraticCurveTo(x + 12, hy + 15, x + 11, hy + 1);
  ctx.quadraticCurveTo(x, hy + 7, x - 11, hy + 1);
  ctx.fillStyle = "#e9e2d4";
  ctx.fill();
  ink(ctx, 1.5);
  ctx.beginPath();
  ctx.ellipse(x - 4, hy + 3, 5, 2.5, 0.3, 0, Math.PI * 2);
  ctx.ellipse(x + 4, hy + 3, 5, 2.5, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = "#d8d0c0";
  ctx.fill();
  // Nose, eyes, cheeks.
  circlePath(ctx, x + 1, hy, 3.2);
  ctx.fillStyle = "#e8a37a";
  ctx.fill();
  ink(ctx, 1.2);
  ctx.fillStyle = INK;
  for (const ex of [-5, 5]) {
    circlePath(ctx, x + ex, hy - 2.5, 1.7);
    ctx.fill();
  }
  ctx.fillStyle = "rgb(240 120 100 / 0.45)";
  for (const cx of [-8, 8]) {
    circlePath(ctx, x + cx, hy + 0.5, 2.5);
    ctx.fill();
  }

  // Hard hat with a lamp.
  ctx.beginPath();
  ctx.arc(x, hy - 8, 13, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = "#f4c430";
  ctx.fill();
  ink(ctx, 2);
  ctx.beginPath();
  ctx.roundRect(x - 17, hy - 10, 34, 4, 2);
  ctx.fillStyle = "#e0ad1c";
  ctx.fill();
  ink(ctx, 1.5);
  circlePath(ctx, x, hy - 15, 4);
  ctx.fillStyle = "#fff8d0";
  ctx.fill();
  ink(ctx, 1.5);
}

/** An arm or leg: a thick colored stroke with an ink edge. */
function limb(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
) {
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5.5;
  ctx.stroke();
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
  const spread = closed ? 0.2 : 0.75;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 3, 2);
    ctx.quadraticCurveTo(
      side * 17 * Math.sin(spread + 0.5),
      12,
      side * 7 * Math.sin(spread),
      21,
    );
    ctx.lineTo(side * 2 * Math.sin(spread), 18);
    ctx.lineCap = "round";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = "#8f9ba6";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = "#d7dee4";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.roundRect(-7, -5, 14, 9, 3);
  ctx.fillStyle = "#6f7c88";
  ctx.fill();
  ink(ctx, 2);
  circlePath(ctx, 0, 0, 2.4);
  ctx.fillStyle = "#e0c060";
  ctx.fill();
  ctx.restore();
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

  // Dynamite sticks on the left end of the platform.
  const baseX = state.players[0].x - 56;
  const shown = Math.min(state.dynamite, 6);
  for (let i = 0; i < shown; i++) {
    const sx = baseX - i * 9;
    ctx.beginPath();
    ctx.roundRect(sx - 3.5, GROUND_Y - 36, 7, 22, 2);
    ctx.fillStyle = "#d84330";
    ctx.fill();
    ink(ctx, 1.5);
    ctx.beginPath();
    ctx.moveTo(sx, GROUND_Y - 36);
    ctx.quadraticCurveTo(sx + 2, GROUND_Y - 41, sx + 4, GROUND_Y - 42);
    ink(ctx, 1.2);
  }
  if (state.dynamite > shown) {
    ctx.textAlign = "right";
    outlinedText(
      ctx,
      `×${state.dynamite}`,
      baseX - shown * 9,
      GROUND_Y - 26,
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
