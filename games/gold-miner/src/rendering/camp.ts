// The miner's camp on the surface: the plank platform over the shaft, the reel
// the rope winds onto, the prospector cranking it, and the ore cart that fills
// up as the money nears the goal.
import { GROUND_Y, PIVOT_Y, REST_LENGTH } from "../game/config.ts";
import { itemWeight } from "../game/items.ts";
import type { GameState, Player } from "../game/sim.ts";
import {
  blobPath,
  circlePath,
  type Ctx,
  gloss,
  hash,
  INK,
  ink,
  sparkle,
} from "./paint.ts";

/** The reel drum; the rope leaves its underside at PIVOT_Y. */
const DRUM = { r: 12, half: 21 };
const DRUM_Y = PIVOT_Y - DRUM.r;
/** Top of the planks the miner stands on. */
export const DECK_Y = GROUND_Y - 13;
/** Where the miner stands, right of the reel. */
const MINER_DX = 58;
/** The crank sits on the reel's right end and turns in depth, so it bobs. */
const CRANK = { dx: DRUM.half + 9, r: 9 };

type Mood = "idle" | "strain" | "happy" | "sad";

interface Point {
  x: number;
  y: number;
}

/**
 * How the miner feels: thrilled or let down by the last payout for a moment,
 * straining while he hauls something heavy, calm otherwise.
 */
function moodOf(state: GameState, player: Player): Mood {
  for (const effect of state.effects) {
    if (effect.type !== "popup" || effect.maxTtl - effect.ttl > 45) continue;
    const cash = /^\+\$(\d+)/.exec(effect.text);
    return cash && Number(cash[1]) < 30 ? "sad" : "happy";
  }
  const { claw } = player;
  if (claw.state === "retract" && claw.item && itemWeight(claw.item) >= 5) {
    return "strain";
  }
  return "idle";
}

/** The rope's turn so far: the reel and crank follow how much is paid out. */
function turnOf(player: Player) {
  return (player.claw.length - REST_LENGTH) / DRUM.r;
}

/** Platform, shaft, and reel: everything the rope hangs in front of. */
export function drawRig(ctx: Ctx, player: Player) {
  const { x } = player;
  // The shaft opening under the reel.
  const shaft = ctx.createLinearGradient(0, DECK_Y, 0, GROUND_Y + 12);
  shaft.addColorStop(0, "#1c0e04");
  shaft.addColorStop(1, "rgb(28 14 4 / 0)");
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.ellipse(x, GROUND_Y + 1, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const [from, to] of [[x - 84, x - 13], [x + 13, x + 92]]) {
    plank(ctx, from, to, DECK_Y, from);
  }
  for (const side of [-1, 1]) trestle(ctx, x + side * (DRUM.half + 3));
  drum(ctx, x, turnOf(player), player.claw.length);
}

function plank(ctx: Ctx, from: number, to: number, y: number, seed: number) {
  // Posts under the deck, sunk into the grass.
  for (const px of [from + 6, to - 6]) {
    ctx.beginPath();
    ctx.roundRect(px - 3, y + 6, 6, GROUND_Y - y, 1.5);
    ctx.fillStyle = "#6e4320";
    ctx.fill();
    ink(ctx, 1.5);
  }
  const wood = ctx.createLinearGradient(0, y, 0, y + 9);
  wood.addColorStop(0, "#d39a5e");
  wood.addColorStop(1, "#97602f");
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.roundRect(from, y, to - from, 9, 2.5);
  ctx.fill();
  ink(ctx, 2);
  // Board seams and nail heads.
  ctx.strokeStyle = "rgb(58 35 18 / 0.5)";
  ctx.lineWidth = 1.2;
  ctx.fillStyle = "#5a3a1c";
  for (let sx = from + 22 + hash(seed) * 10; sx < to - 8; sx += 26) {
    ctx.beginPath();
    ctx.moveTo(sx, y + 1.5);
    ctx.lineTo(sx, y + 7.5);
    ctx.stroke();
    ctx.fillRect(sx - 4, y + 3.5, 1.6, 1.6);
    ctx.fillRect(sx + 2.5, y + 3.5, 1.6, 1.6);
  }
  ctx.strokeStyle = "rgb(255 230 190 / 0.35)";
  ctx.beginPath();
  ctx.moveTo(from + 3, y + 2);
  ctx.lineTo(to - 3, y + 2);
  ctx.stroke();
}

/** An A-shaped stand holding one end of the reel's axle. */
function trestle(ctx: Ctx, x: number) {
  ctx.beginPath();
  ctx.moveTo(x - 9, DECK_Y + 1);
  ctx.lineTo(x - 2.5, DRUM_Y - 2);
  ctx.lineTo(x + 2.5, DRUM_Y - 2);
  ctx.lineTo(x + 9, DECK_Y + 1);
  ctx.lineTo(x + 4.5, DECK_Y + 1);
  ctx.lineTo(x, DRUM_Y + 9);
  ctx.lineTo(x - 4.5, DECK_Y + 1);
  ctx.closePath();
  ctx.fillStyle = "#8d5a2b";
  ctx.fill();
  ink(ctx, 1.8);
}

/**
 * The reel seen from the front: a wooden drum between two flanges, wound with
 * rope. The windings slant, so they slide sideways as the drum turns, and the
 * coil fattens as the rope comes in.
 */
function drum(ctx: Ctx, x: number, turn: number, length: number) {
  const out = Math.min(1, (length - REST_LENGTH) / 420);
  const coil = DRUM.r - 1 - out * 4;
  const left = x - DRUM.half + 3;
  const right = x + DRUM.half - 3;

  // Wood core behind the rope.
  ctx.fillStyle = "#7a4b22";
  ctx.fillRect(left, DRUM_Y - DRUM.r + 3, right - left, (DRUM.r - 3) * 2);

  // The coil of rope.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(left, DRUM_Y - coil, right - left, coil * 2, 3);
  const rope = ctx.createLinearGradient(0, DRUM_Y - coil, 0, DRUM_Y + coil);
  rope.addColorStop(0, "#d8b07a");
  rope.addColorStop(0.45, "#b08250");
  rope.addColorStop(1, "#6e4a24");
  ctx.fillStyle = rope;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = "rgb(60 35 15 / 0.6)";
  ctx.lineWidth = 1.2;
  const spacing = 3.4;
  const shift = (((turn * 4) % spacing) + spacing) % spacing;
  for (let sx = left - 8 + shift; sx < right + 8; sx += spacing) {
    ctx.beginPath();
    ctx.moveTo(sx, DRUM_Y - coil);
    ctx.lineTo(sx - 2.5, DRUM_Y + coil);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(left, DRUM_Y - coil, right - left, coil * 2, 3);
  ink(ctx, 1.5);

  // Flanges, seen edge on.
  for (const fx of [left, right]) {
    ctx.beginPath();
    ctx.ellipse(fx, DRUM_Y, 3.2, DRUM.r + 1, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#a86d38";
    ctx.fill();
    ink(ctx, 1.8);
  }
  // Iron hubs where the axle meets the stands.
  for (const hx of [x - DRUM.half - 3, x + DRUM.half + 3]) {
    circlePath(ctx, hx, DRUM_Y, 3.4);
    ctx.fillStyle = "#6d6a66";
    ctx.fill();
    ink(ctx, 1.4);
  }
}

/** The crank grip, where the miner's hands go. */
function crankGrip(x: number, turn: number): Point {
  return {
    x: x + CRANK.dx + 2 + Math.cos(turn) * 1.5,
    y: DRUM_Y + Math.sin(turn) * CRANK.r,
  };
}

function drawCrank(ctx: Ctx, x: number, turn: number) {
  const hub = { x: x + CRANK.dx - 5, y: DRUM_Y };
  const grip = crankGrip(x, turn);
  // Axle stub out of the right stand.
  ctx.beginPath();
  ctx.moveTo(x + DRUM.half + 3, DRUM_Y);
  ctx.lineTo(hub.x, hub.y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = "#8a8680";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Arm, then the wooden handle sticking out toward the miner.
  ctx.beginPath();
  ctx.moveTo(hub.x, hub.y);
  ctx.lineTo(grip.x - 2, grip.y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5.5;
  ctx.stroke();
  ctx.strokeStyle = "#5d5a55";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(grip.x - 2, grip.y - 3, 13, 6, 3);
  ctx.fillStyle = "#c0392b";
  ctx.fill();
  ink(ctx, 1.5);
}

/**
 * The miner, the crank he turns, and his ore cart: drawn over the rope.
 */
export function drawCamp(ctx: Ctx, state: GameState, player: Player) {
  const turn = turnOf(player);
  if (state.players.length === 1) drawCart(ctx, player.x + 150, state);
  drawCrank(ctx, player.x, turn);
  drawMiner(ctx, player, moodOf(state, player), turn, state.tick);
}

/**
 * Two-bone reach from `from` to `to`, bending the elbow downward. Returns the
 * elbow; a target out of reach straightens the arm.
 */
function elbow(from: Point, to: Point, upper: number, lower: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.min(Math.hypot(dx, dy), upper + lower - 0.01);
  const a = Math.atan2(dy, dx);
  const bend = Math.acos(
    Math.max(
      -1,
      Math.min(1, (upper * upper + d * d - lower * lower) / (2 * upper * d)),
    ),
  );
  // Of the two solutions, the one below the line reads as a natural crank.
  const first = {
    x: from.x + Math.cos(a + bend) * upper,
    y: from.y + Math.sin(a + bend) * upper,
  };
  const second = {
    x: from.x + Math.cos(a - bend) * upper,
    y: from.y + Math.sin(a - bend) * upper,
  };
  return first.y > second.y ? first : second;
}

/** A thick colored stroke with an ink edge, through `points`. */
function limb(ctx: Ctx, points: Point[], color: string, width = 6) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (const p of points) ctx.lineTo(p.x, p.y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + 3.5;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function arm(
  ctx: Ctx,
  shoulder: Point,
  hand: Point,
  sleeve: string,
  skin: string,
) {
  const joint = elbow(shoulder, hand, 15, 15);
  limb(ctx, [shoulder, joint], sleeve, 7);
  // Rolled-up sleeve: a cuff at the elbow, bare forearm below.
  limb(ctx, [joint, hand], skin, 5.5);
  circlePath(ctx, joint.x, joint.y, 4.2);
  ctx.fillStyle = sleeve;
  ctx.fill();
  ink(ctx, 1.4);
  circlePath(ctx, hand.x, hand.y, 4.3);
  ctx.fillStyle = skin;
  ctx.fill();
  ink(ctx, 1.5);
}

const SKIN = "#f5c99b";
const SHIRT = "#c8402f";
const DENIM = "#3f62a8";

/**
 * A stout, bearded prospector in a hard hat, facing left toward the crank and
 * turning it with both hands. His face shows `mood`.
 */
function drawMiner(
  ctx: Ctx,
  player: Player,
  mood: Mood,
  turn: number,
  tick: number,
) {
  const grip = crankGrip(player.x, turn);
  const feet = DECK_Y;
  const strain = mood === "strain";
  // Leans into the crank and trembles under load; hops when paid well.
  const lean = strain ? -3 : 0;
  const shake = strain ? (hash(tick) - 0.5) * 1.2 : 0;
  let lift = player.claw.state === "swing"
    ? Math.sin(tick / 40) * 0.6
    : Math.sin(turn) * 1.2;
  if (mood === "happy") lift = -Math.abs(Math.sin(tick * 0.35)) * 3;
  const x = player.x + MINER_DX;
  const body = { x: x + lean + shake, y: feet - 36 + lift };

  // Legs and boots, the front (left) one stepping toward the reel.
  for (const [dx, foot] of [[6, 4], [-5, strain ? -5 : -2]]) {
    const hip = { x: body.x + dx * 0.8, y: feet - 22 + lift };
    const ankle = { x: x + dx + foot * 0.5, y: feet - 5 };
    limb(ctx, [hip, ankle], DENIM, 8);
    ctx.beginPath();
    ctx.moveTo(ankle.x + 5, feet - 7);
    ctx.lineTo(ankle.x + 5, feet);
    ctx.lineTo(ankle.x - 9, feet);
    ctx.quadraticCurveTo(ankle.x - 10, feet - 6, ankle.x - 3, feet - 7);
    ctx.closePath();
    ctx.fillStyle = "#4e2f1a";
    ctx.fill();
    ink(ctx, 1.8);
  }

  // Back arm, behind the body.
  arm(
    ctx,
    { x: body.x + 7, y: body.y - 9 },
    { x: grip.x + 7, y: grip.y },
    "#9e2f22",
    "#dba57a",
  );

  // Torso: a round belly in a plaid shirt under denim overalls.
  const torso = new Path2D();
  torso.ellipse(body.x, body.y, 14, 16, 0, 0, Math.PI * 2);
  const shirt = ctx.createLinearGradient(
    body.x - 14,
    body.y - 16,
    body.x + 10,
    body.y + 14,
  );
  shirt.addColorStop(0, "#e2594a");
  shirt.addColorStop(1, "#9e2f22");
  ctx.fillStyle = shirt;
  ctx.fill(torso);
  ctx.save();
  ctx.clip(torso);
  ctx.strokeStyle = "rgb(90 20 10 / 0.35)";
  ctx.lineWidth = 1.6;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(body.x + i * 5, body.y - 17);
    ctx.lineTo(body.x + i * 5, body.y + 17);
    ctx.moveTo(body.x - 15, body.y + i * 5);
    ctx.lineTo(body.x + 15, body.y + i * 5);
    ctx.stroke();
  }
  // Overall bib and the trousers it joins.
  ctx.beginPath();
  ctx.roundRect(body.x - 10, body.y - 7, 19, 30, 4);
  ctx.fillStyle = DENIM;
  ctx.fill();
  ink(ctx, 1.5);
  ctx.beginPath();
  ctx.roundRect(body.x - 6, body.y - 3, 10, 7, 2);
  ctx.strokeStyle = "rgb(20 30 70 / 0.55)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
  ink(ctx, 2, torso);
  // Straps and brass buttons.
  for (const sx of [-8, 6]) {
    ctx.beginPath();
    ctx.moveTo(body.x + sx, body.y - 6);
    ctx.lineTo(body.x + sx * 0.7 + 1, body.y - 15);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.5;
    ctx.stroke();
    ctx.strokeStyle = DENIM;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    circlePath(ctx, body.x + sx, body.y - 5, 1.8);
    ctx.fillStyle = "#f4c430";
    ctx.fill();
  }

  drawHead(ctx, body.x - 2, body.y - 26, mood, tick);

  // Front arm, over the beard.
  arm(ctx, { x: body.x - 2, y: body.y - 5 }, grip, SHIRT, SKIN);

  if (strain) sweat(ctx, body.x + 9, body.y - 38, tick);
}

function drawHead(ctx: Ctx, hx: number, hy: number, mood: Mood, tick: number) {
  // Ear (back side), then the face.
  circlePath(ctx, hx + 11, hy + 1, 3.8);
  ctx.fillStyle = "#e9b285";
  ctx.fill();
  ink(ctx, 1.5);
  circlePath(ctx, hx, hy, 13);
  const face = ctx.createRadialGradient(hx - 4, hy - 4, 2, hx, hy, 13);
  face.addColorStop(0, "#fcdcb4");
  face.addColorStop(1, "#eab184");
  ctx.fillStyle = face;
  ctx.fill();
  if (mood === "strain") {
    ctx.fillStyle = "rgb(230 70 50 / 0.3)";
    ctx.fill();
  }
  ink(ctx, 2);

  // A fluffy white beard: outline every puff first, then fill them, so the
  // overlaps merge into one cloud.
  const puffs = [
    [-10, 7, 5.5],
    [-6, 13, 6.5],
    [1, 15, 7],
    [8, 11, 6],
    [10.5, 5, 4.5],
    [-2, 20, 5.5],
    [-9, 15, 5],
  ];
  ctx.beginPath();
  for (const [dx, dy, r] of puffs) {
    ctx.moveTo(hx + dx + r, hy + dy);
    ctx.arc(hx + dx, hy + dy, r, 0, Math.PI * 2);
  }
  ink(ctx, 3.6);
  const beard = ctx.createLinearGradient(0, hy, 0, hy + 24);
  beard.addColorStop(0, "#ffffff");
  beard.addColorStop(1, "#d9d2c4");
  ctx.fillStyle = beard;
  ctx.fill();

  // Mouth, peeking out from under the mustache.
  const mouth = { x: hx - 5, y: hy + 11 };
  if (mood === "happy") {
    ctx.beginPath();
    ctx.moveTo(mouth.x - 5, mouth.y - 1);
    ctx.quadraticCurveTo(mouth.x, mouth.y + 9, mouth.x + 5, mouth.y - 1);
    ctx.closePath();
    ctx.fillStyle = "#6b1f16";
    ctx.fill();
    ink(ctx, 1.4);
    ctx.beginPath();
    ctx.ellipse(mouth.x, mouth.y + 3.5, 2.6, 1.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#e57373";
    ctx.fill();
  } else if (mood === "strain") {
    ctx.beginPath();
    ctx.roundRect(mouth.x - 5, mouth.y - 1, 10, 5, 1.5);
    ctx.fillStyle = "#fffaf0";
    ctx.fill();
    ink(ctx, 1.4);
    ctx.beginPath();
    for (const tx of [-2, 1.5]) {
      ctx.moveTo(mouth.x + tx, mouth.y - 1);
      ctx.lineTo(mouth.x + tx, mouth.y + 4);
    }
    ctx.moveTo(mouth.x - 5, mouth.y + 1.5);
    ctx.lineTo(mouth.x + 5, mouth.y + 1.5);
    ink(ctx, 0.9);
  } else if (mood === "sad") {
    ctx.beginPath();
    ctx.arc(mouth.x, mouth.y + 5, 4, Math.PI * 1.15, Math.PI * 1.85);
    ink(ctx, 1.8);
  }

  // Mustache: two swoops under the nose.
  ctx.beginPath();
  for (const [dx, tilt] of [[-9, 0.35], [-1, -0.25]]) {
    ctx.moveTo(hx + dx + 5.5, hy + 7);
    ctx.ellipse(hx + dx, hy + 7, 5.5, 3.2, tilt, 0, Math.PI * 2);
  }
  ink(ctx, 3.2);
  ctx.fillStyle = "#ece6da";
  ctx.fill();

  // A big round nose.
  circlePath(ctx, hx - 10, hy + 2.5, 4.8);
  ctx.fillStyle = "#f0a07a";
  ctx.fill();
  ink(ctx, 1.6);
  circlePath(ctx, hx - 11.4, hy + 1, 1.4);
  ctx.fillStyle = "rgb(255 255 255 / 0.8)";
  ctx.fill();

  // Cheek.
  circlePath(ctx, hx + 3.5, hy + 3, 3);
  ctx.fillStyle = "rgb(240 110 90 / 0.4)";
  ctx.fill();

  eyes(ctx, hx, hy, mood, tick);

  // Bushy brows: worried slants when sad, knitted when straining.
  const tilt = mood === "sad" ? 0.35 : mood === "strain" ? -0.35 : 0;
  ctx.fillStyle = "#f4f0e8";
  for (const [dx, side] of [[-8, -1], [1, 1]]) {
    ctx.save();
    ctx.translate(hx + dx, hy - 6);
    ctx.rotate(tilt * side);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.8, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ink(ctx, 1.2);
    ctx.restore();
  }

  hardHat(ctx, hx, hy);
}

function eyes(ctx: Ctx, hx: number, hy: number, mood: Mood, tick: number) {
  const blink = tick % 210 < 7;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (const [dx, side] of [[-7.5, -1], [1.5, 1]]) {
    const ex = hx + dx;
    const ey = hy - 1.5;
    ctx.beginPath();
    if (mood === "happy") {
      ctx.arc(ex, ey + 1.5, 2.4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === "strain") {
      // Squeezed shut: > <
      ctx.moveTo(ex - 2.2 * side, ey - 2);
      ctx.lineTo(ex + 1.6 * side, ey);
      ctx.lineTo(ex - 2.2 * side, ey + 2);
      ctx.stroke();
    } else if (blink) {
      ctx.moveTo(ex - 2, ey + 0.5);
      ctx.lineTo(ex + 2, ey + 0.5);
      ctx.stroke();
    } else {
      // Whites, and a pupil looking toward the reel.
      ctx.ellipse(ex, ey, 2.5, 3.1, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ink(ctx, 1.1);
      ctx.beginPath();
      ctx.ellipse(ex - 0.8, ey + 0.3, 1.4, 1.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    }
  }
}

/** A yellow hard hat with a brim out front and a lamp. */
function hardHat(ctx: Ctx, hx: number, hy: number) {
  const top = hy - 9.5;
  ctx.beginPath();
  ctx.moveTo(hx - 13.5, top);
  ctx.bezierCurveTo(hx - 13.5, top - 17, hx + 13.5, top - 17, hx + 13.5, top);
  ctx.closePath();
  const shell = ctx.createLinearGradient(hx - 10, top - 14, hx + 8, top);
  shell.addColorStop(0, "#ffe27a");
  shell.addColorStop(1, "#e0a516");
  ctx.fillStyle = shell;
  ctx.fill();
  ink(ctx, 2);
  // Ridge down the middle.
  ctx.beginPath();
  ctx.moveTo(hx - 2, top - 12.5);
  ctx.quadraticCurveTo(hx + 1, top - 7, hx + 1, top);
  ctx.strokeStyle = "rgb(150 95 0 / 0.55)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Brim, longer in front.
  ctx.beginPath();
  ctx.roundRect(hx - 20, top - 1.5, 35, 4.5, 2.2);
  ctx.fillStyle = "#e9b522";
  ctx.fill();
  ink(ctx, 1.6);
  // Lamp.
  ctx.beginPath();
  ctx.roundRect(hx - 13, top - 10, 6, 7, 2);
  ctx.fillStyle = "#6d6a66";
  ctx.fill();
  ink(ctx, 1.4);
  circlePath(ctx, hx - 13, top - 6.5, 3);
  ctx.fillStyle = "#fff6c8";
  ctx.fill();
  ink(ctx, 1.4);
  ctx.fillStyle = "rgb(255 255 255 / 0.7)";
  ctx.beginPath();
  ctx.ellipse(hx - 4, top - 10, 3.5, 1.6, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

/** Two drops flying off his brow, on a loop. */
function sweat(ctx: Ctx, x: number, y: number, tick: number) {
  for (const offset of [0, 14]) {
    const p = ((tick + offset) % 28) / 28;
    const dx = 3 + p * 12;
    const dy = -4 * p + 16 * p * p;
    ctx.save();
    ctx.globalAlpha = 1 - p * 0.8;
    ctx.translate(x + dx + offset * 0.2, y + dy);
    ctx.rotate(-0.6 + p);
    ctx.beginPath();
    ctx.moveTo(0, -4.5);
    ctx.quadraticCurveTo(3.2, 0, 0, 2.6);
    ctx.quadraticCurveTo(-3.2, 0, 0, -4.5);
    ctx.fillStyle = "#bfe9ff";
    ctx.fill();
    ink(ctx, 1.1);
    ctx.restore();
  }
}

/**
 * An ore cart on a stub of track. The heap of gold in it grows with the money
 * earned toward this level's goal, and glints once the goal is met.
 */
function drawCart(ctx: Ctx, x: number, state: GameState) {
  const rail = GROUND_Y - 4;
  // Track: ties and a rail.
  ctx.fillStyle = "#6e4320";
  for (let tx = x - 40; tx <= x + 40; tx += 13) {
    ctx.fillRect(tx - 3, rail - 1, 6, 5);
  }
  ctx.beginPath();
  ctx.moveTo(x - 46, rail);
  ctx.lineTo(x + 46, rail);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.strokeStyle = "#9e9a94";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // The heap, drawn first so the cart's rim hides its base.
  const progress = state.goal > 0 ? Math.min(1, state.money / state.goal) : 0;
  const rim = rail - 26;
  if (progress > 0) {
    const nuggets = Math.ceil(progress * 9);
    for (let i = 0; i < nuggets; i++) {
      const row = i < 5 ? 0 : i < 8 ? 1 : 2;
      const inRow = row === 0 ? i : row === 1 ? i - 5 : 0;
      const across = row === 0 ? 5 : row === 1 ? 3 : 1;
      const nx = x + (inRow - (across - 1) / 2) * 7.5;
      const ny = rim - 3 - row * 5;
      const shape = blobPath(nx, ny, 5, i + 40, 0.25, 7);
      ctx.fillStyle = i % 3 === 0 ? "#ffe066" : "#f5b818";
      ctx.fill(shape);
      ink(ctx, 1.3, shape);
    }
    if (progress >= 1) {
      sparkle(ctx, x - 8, rim - 9, 6, 0.5 + Math.sin(state.tick / 9) * 0.5);
      sparkle(ctx, x + 12, rim - 4, 4, 0.5 + Math.cos(state.tick / 11) * 0.5);
    }
  }

  // Body: a tapered iron tub with riveted bands.
  ctx.beginPath();
  ctx.moveTo(x - 25, rim);
  ctx.lineTo(x + 25, rim);
  ctx.lineTo(x + 20, rail - 7);
  ctx.lineTo(x - 20, rail - 7);
  ctx.closePath();
  const iron = ctx.createLinearGradient(0, rim, 0, rail - 7);
  iron.addColorStop(0, "#8e8a84");
  iron.addColorStop(1, "#4f4c48");
  ctx.fillStyle = iron;
  ctx.fill();
  ink(ctx, 2);
  ctx.beginPath();
  ctx.roundRect(x - 27, rim - 3, 54, 5, 2);
  ctx.fillStyle = "#a7a39c";
  ctx.fill();
  ink(ctx, 1.6);
  ctx.fillStyle = INK;
  for (const bx of [-14, 0, 14]) {
    ctx.fillRect(x + bx - 0.8, rim + 3, 1.6, 9);
  }
  // Wheels.
  for (const wx of [-12, 12]) {
    circlePath(ctx, x + wx, rail - 5, 5.5);
    ctx.fillStyle = "#3d3b38";
    ctx.fill();
    ink(ctx, 1.6);
    circlePath(ctx, x + wx, rail - 5, 1.8);
    ctx.fillStyle = "#c8c4bd";
    ctx.fill();
  }
  gloss(ctx, x - 6, rim + 8, 14, 0.25);
}
