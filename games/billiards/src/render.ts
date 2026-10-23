// Draws the table, balls, aim guide and cue on the canvas. The table itself is
// painted once to an offscreen canvas; each frame draws the balls on top.
import { aimGuide } from "./aim.ts";
import {
  BallPainter,
  NUMBER_UP,
  type Quat,
  randomQuat,
  spin,
} from "./balls.ts";
import { canPlace, type Game, poses } from "./game.ts";
import {
  CUSHION_WIDTH,
  HEIGHT,
  RAIL_WIDTH,
  SCALE,
  toCanvas,
  WIDTH,
} from "./layout.ts";
import { BALL_RADIUS as R } from "./physics/constants.ts";
import { TABLE } from "./physics/table.ts";
import type { Session } from "./session.ts";

const BALL_PX = R * SCALE;
const TRAY_BALL_PX = 12;
const TRAY_Y = 52;

const L = TABLE.length / 2;
const W = TABLE.width / 2;

export class Renderer {
  private readonly table: HTMLCanvasElement;
  private readonly balls: BallPainter;
  private readonly trayBalls: BallPainter;
  private orientations = new Map<number, Quat>();
  private game: Game | null = null;

  constructor(private readonly ctx: CanvasRenderingContext2D, scale: number) {
    this.table = paintTable(scale);
    this.balls = new BallPainter(BALL_PX * scale);
    this.trayBalls = new BallPainter(TRAY_BALL_PX * scale);
  }

  /** `dt` is the real time since the last frame, for rolling the balls. */
  draw(session: Session, dt: number) {
    const { ctx } = this;
    const { game } = session;
    if (game !== this.game) {
      // A new rack: every ball starts at a random angle, as racked.
      this.game = game;
      const random = Math.random;
      this.orientations = new Map(
        game.balls.map((b) => [b.id, randomQuat(random)]),
      );
    }
    ctx.drawImage(this.table, 0, 0, WIDTH, HEIGHT);

    const placing = game.phase === "placing" && session.mode === "game";
    if (placing && game.area === "kitchen") drawHeadString(ctx);

    const current = poses(game);
    const shown = game.balls
      .map((ball, i) => ({ id: ball.id, pose: current[i] }))
      .filter(({ pose }) => !pose.pocketed);
    for (const { id, pose } of shown) {
      const q = this.orientations.get(id);
      if (q) {
        this.orientations.set(
          id,
          spin(q, pose.wx, pose.wy, pose.wz, game.playback ? dt : 0),
        );
      }
    }

    for (const { pose } of shown) drawShadow(ctx, pose.x, pose.y);
    const aiming = session.mode === "game" && game.phase === "aiming" &&
      !session.paused;
    if (aiming) drawGuide(ctx, session);
    for (const { id, pose } of shown) {
      const [x, y] = toCanvas(pose.x, pose.y);
      const ghost = placing && id === 0;
      if (ghost) ctx.globalAlpha = 0.8;
      this.balls.draw(
        ctx,
        id,
        this.orientations.get(id) ?? NUMBER_UP,
        x,
        y,
        BALL_PX,
      );
      ctx.globalAlpha = 1;
      if (ghost && !canPlace(game)) {
        ctx.strokeStyle = "rgb(255 80 80)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, BALL_PX + 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (aiming) drawCue(ctx, session);
    this.drawTray(game);
  }

  /** Balls 1–15 across the top: potted ones lit, the rest dim. */
  private drawTray(game: Game) {
    const { ctx } = this;
    const gap = TRAY_BALL_PX * 2 + 6;
    const left = WIDTH / 2 - gap * 7;
    for (let id = 1; id <= 15; id++) {
      const x = left + (id - 1) * gap;
      const potted = game.balls.some((b) =>
        b.id === id && b.motion === "pocketed"
      );
      ctx.globalAlpha = potted ? 1 : 0.22;
      this.trayBalls.draw(ctx, id, NUMBER_UP, x, TRAY_Y, TRAY_BALL_PX);
    }
    ctx.globalAlpha = 1;
  }
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const [px, py] = toCanvas(x, y);
  const g = ctx.createRadialGradient(
    px + 3,
    py + 4,
    BALL_PX * 0.3,
    px + 3,
    py + 4,
    BALL_PX * 1.25,
  );
  g.addColorStop(0, "rgb(0 0 0 / 0.45)");
  g.addColorStop(1, "rgb(0 0 0 / 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px + 3, py + 4, BALL_PX * 1.25, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeadString(ctx: CanvasRenderingContext2D) {
  const [x, top] = toCanvas(-TABLE.length / 4, W);
  const [, bottom] = toCanvas(0, -W);
  ctx.save();
  ctx.strokeStyle = "rgb(255 255 255 / 0.35)";
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  ctx.restore();
}

function drawGuide(ctx: CanvasRenderingContext2D, session: Session) {
  const { game } = session;
  const cue = game.balls[0];
  const dx = Math.cos(session.aim);
  const dy = Math.sin(session.aim);
  const guide = aimGuide(game.balls, dx, dy);
  const [cx, cy] = toCanvas(cue.x, cue.y);
  const [gx, gy] = toCanvas(guide.x, guide.y);
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgb(255 255 255 / 0.55)";
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(gx, gy);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(gx, gy, BALL_PX, 0, Math.PI * 2);
  ctx.stroke();
  if (guide.target) {
    const [tx, ty] = toCanvas(guide.target.x, guide.target.y);
    const reach = 0.35 * SCALE;
    ctx.strokeStyle = "rgb(255 255 255 / 0.8)";
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + guide.objectX * reach, ty - guide.objectY * reach);
    ctx.stroke();
    ctx.strokeStyle = "rgb(255 255 255 / 0.3)";
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + guide.cueX * reach * 0.7, gy - guide.cueY * reach * 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

/** The cue behind the cue ball, pulled back while the power bar is dragged. */
function drawCue(ctx: CanvasRenderingContext2D, session: Session) {
  const cue = session.game.balls[0];
  const [cx, cy] = toCanvas(cue.x, cue.y);
  const pull = session.pulling ? 0.01 + session.power * 0.2 : 0.01;
  // A raised cue looks shorter from above.
  const length = 1.45 * Math.cos((session.elevation * Math.PI) / 180);
  const near = (R + pull) * SCALE;
  const far = near + length * SCALE;
  ctx.save();
  ctx.translate(cx, cy);
  // Canvas y points down, so the angle flips.
  ctx.rotate(-session.aim + Math.PI);
  ctx.shadowColor = "rgb(0 0 0 / 0.5)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;
  // Tapered from a 13 mm tip to a 30 mm butt.
  const tip = 0.0065 * SCALE;
  const butt = 0.015 * SCALE;
  const wood = ctx.createLinearGradient(near, 0, far, 0);
  wood.addColorStop(0, "#f3e6c8");
  wood.addColorStop(0.55, "#e0c48e");
  wood.addColorStop(0.58, "#2a1408");
  wood.addColorStop(0.7, "#5b2b12");
  wood.addColorStop(0.72, "#e8d9b0");
  wood.addColorStop(0.74, "#2a1408");
  wood.addColorStop(1, "#1a0c05");
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(near, -tip);
  ctx.lineTo(far, -butt);
  ctx.lineTo(far, butt);
  ctx.lineTo(near, tip);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";
  // Ferrule and chalked tip.
  ctx.fillStyle = "#fbfaf5";
  ctx.fillRect(near, -tip, 0.022 * SCALE, tip * 2);
  ctx.fillStyle = "#3b6fb6";
  ctx.fillRect(near, -tip, 0.006 * SCALE, tip * 2);
  ctx.restore();
}

/** The table, rails, pockets and sights, painted once at device scale. */
function paintTable(scale: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * scale;
  canvas.height = HEIGHT * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(scale, scale);

  const room = ctx.createRadialGradient(
    WIDTH / 2,
    HEIGHT / 2,
    100,
    WIDTH / 2,
    HEIGHT / 2,
    WIDTH * 0.7,
  );
  room.addColorStop(0, "#2a1d14");
  room.addColorStop(1, "#0c0806");
  ctx.fillStyle = room;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Wooden rail.
  const outer = CUSHION_WIDTH + RAIL_WIDTH;
  const [fx, fy] = toCanvas(-L - outer, W + outer);
  const fw = (L + outer) * 2 * SCALE;
  const fh = (W + outer) * 2 * SCALE;
  ctx.shadowColor = "rgb(0 0 0 / 0.6)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  const wood = ctx.createLinearGradient(0, fy, 0, fy + fh);
  wood.addColorStop(0, "#7a4320");
  wood.addColorStop(0.5, "#5a2e14");
  wood.addColorStop(1, "#43210d");
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.roundRect(fx, fy, fw, fh, 0.06 * SCALE);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgb(255 220 170 / 0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rubber cushions, then the cloth inside their noses.
  const [kx, ky] = toCanvas(-L - CUSHION_WIDTH, W + CUSHION_WIDTH);
  ctx.fillStyle = "#0c5b38";
  ctx.fillRect(
    kx,
    ky,
    (L + CUSHION_WIDTH) * 2 * SCALE,
    (W + CUSHION_WIDTH) * 2 * SCALE,
  );
  const cloth = ctx.createRadialGradient(
    WIDTH / 2,
    toCanvas(0, 0)[1],
    50,
    WIDTH / 2,
    toCanvas(0, 0)[1],
    L * SCALE,
  );
  cloth.addColorStop(0, "#1f9160");
  cloth.addColorStop(1, "#137049");
  ctx.fillStyle = cloth;
  ctx.beginPath();
  for (const [x, y] of outline()) ctx.lineTo(...toCanvas(x, y));
  ctx.closePath();
  ctx.fill();
  // A soft highlight along the cushion noses.
  ctx.strokeStyle = "rgb(255 255 255 / 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pocket holes: a ball drops once its center is over one.
  for (const pocket of TABLE.pockets) {
    const [px, py] = toCanvas(pocket.x, pocket.y);
    const r = pocket.radius * SCALE;
    const hole = ctx.createRadialGradient(px, py, r * 0.2, px, py, r);
    hole.addColorStop(0, "#000");
    hole.addColorStop(1, "#151210");
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sights: three diamonds between each pair of pockets.
  const sight = (x: number, y: number) => {
    const [px, py] = toCanvas(x, y);
    ctx.fillStyle = "#efe6d2";
    ctx.beginPath();
    ctx.moveTo(px, py - 4);
    ctx.lineTo(px + 3, py);
    ctx.lineTo(px, py + 4);
    ctx.lineTo(px - 3, py);
    ctx.closePath();
    ctx.fill();
  };
  const rail = CUSHION_WIDTH + RAIL_WIDTH / 2;
  for (const k of [1, 2, 3, 5, 6, 7]) {
    const x = -L + (k * TABLE.length) / 8;
    sight(x, W + rail);
    sight(x, -W - rail);
  }
  for (const k of [-1, 0, 1]) {
    sight(-L - rail, (k * TABLE.width) / 4);
    sight(L + rail, (k * TABLE.width) / 4);
  }

  // Head and foot spots.
  ctx.fillStyle = "rgb(255 255 255 / 0.35)";
  for (const x of [-TABLE.length / 4, TABLE.length / 4]) {
    const [px, py] = toCanvas(x, 0);
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

/**
 * The cloth's outline along the cushion noses: in at each pocket along one
 * jaw, across its far end, and out along the other.
 */
function outline(): [number, number][] {
  return TABLE.cushions.flatMap((c, i): [number, number][] =>
    i % 3 === 0
      ? [[c.ax, c.ay], [c.bx, c.by]]
      : i % 3 === 1
      ? [[c.bx, c.by], [c.ax, c.ay]]
      : []
  );
}
