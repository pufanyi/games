import type { TowerSlot, World } from "../game/types.ts";
import type { Vec } from "../content/types.ts";
import { createRng } from "../game/rng.ts";
import { type Theme, themeFor } from "./theme.ts";

export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;

/** Static background layers are painted once per world, at twice the size. */
const BACKGROUND_SCALE = 2;

type DecorKind = "tree" | "pine" | "rock" | "bush" | "flower";

interface Decor {
  kind: DecorKind;
  x: number;
  y: number;
  size: number;
  tint: number;
}

const backgrounds = new WeakMap<World, HTMLCanvasElement>();
const decorations = new WeakMap<World, Decor[]>();

function distanceToLanes(world: World, x: number, y: number): number {
  let best = Infinity;
  for (const path of world.lanes) {
    for (const lane of path) {
      for (let i = 0; i < lane.points.length; i += 2) {
        const point = lane.points[i];
        const d = Math.hypot(point.x - x, point.y - y);
        if (d < best) best = d;
      }
    }
  }
  return best;
}

function makeDecorations(world: World): Decor[] {
  const rng = createRng(world.levelId * 9176 + 31);
  const items: Decor[] = [];
  const slots = world.slots;
  const goals = world.level.goals;
  for (let attempt = 0; attempt < 900 && items.length < 74; attempt++) {
    const x = rng.range(16, WORLD_WIDTH - 16);
    const y = rng.range(16, WORLD_HEIGHT - 16);
    if (distanceToLanes(world, x, y) < 40) continue;
    if (slots.some((slot) => Math.hypot(slot.x - x, slot.y - y) < 38)) {
      continue;
    }
    if (goals.some(([gx, gy]) => Math.hypot(gx - x, gy - y) < 70)) continue;
    if (
      world.level.spawns.some((path) =>
        path.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 60)
      )
    ) continue;
    const roll = rng.next();
    const kind: DecorKind = roll < 0.34
      ? "tree"
      : roll < 0.52
      ? "pine"
      : roll < 0.68
      ? "rock"
      : roll < 0.86
      ? "bush"
      : "flower";
    items.push({
      kind,
      x,
      y,
      size: kind === "tree" || kind === "pine"
        ? rng.range(0.75, 1.3)
        : rng.range(0.7, 1.4),
      tint: Math.floor(rng.next() * 3),
    });
  }
  return items;
}

function getDecorations(world: World): Decor[] {
  let items = decorations.get(world);
  if (!items) {
    items = makeDecorations(world);
    decorations.set(world, items);
  }
  return items;
}

function roadLine(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec[],
): void {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i];
    const next = points[i + 1];
    ctx.quadraticCurveTo(
      point.x,
      point.y,
      (point.x + next.x) / 2,
      (point.y + next.y) / 2,
    );
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

function drawRoads(
  ctx: CanvasRenderingContext2D,
  world: World,
  theme: Theme,
): void {
  for (const path of world.lanes) {
    const lane = path[Math.min(1, path.length - 1)];
    if (!lane) continue;
    // The three lanes are parallel rows of the same road; the middle row is
    // its centreline.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.save();
    ctx.translate(2, 3);
    roadLine(ctx, lane.points);
    ctx.strokeStyle = "rgba(24, 30, 18, 0.28)";
    ctx.lineWidth = 54;
    ctx.stroke();
    ctx.restore();

    roadLine(ctx, lane.points);
    ctx.strokeStyle = theme.roadEdge;
    ctx.lineWidth = 50;
    ctx.stroke();

    roadLine(ctx, lane.points);
    ctx.strokeStyle = theme.road;
    ctx.lineWidth = 42;
    ctx.stroke();

    // Wheel ruts and scattered stones make the road feel travelled.
    ctx.save();
    ctx.setLineDash([10, 18]);
    roadLine(ctx, lane.points);
    ctx.strokeStyle = theme.roadLine;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const rng = createRng(lane.points.length * 13 + world.levelId);
    ctx.fillStyle = theme.roadLine;
    for (let i = 0; i < lane.points.length; i += 3) {
      const point = lane.points[i];
      if (rng.next() > 0.5) continue;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(
        point.x + rng.range(-10, 10),
        point.y + rng.range(-8, 8),
        rng.range(1, 2.5),
        rng.range(0.8, 1.6),
        rng.range(0, Math.PI),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawStone(
  ctx: CanvasRenderingContext2D,
  slot: TowerSlot,
  theme: Theme,
): void {
  ctx.save();
  ctx.translate(slot.x, slot.y);
  ctx.fillStyle = "rgba(20, 30, 20, 0.22)";
  ctx.beginPath();
  ctx.ellipse(2, 4, 21, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = theme.stoneDark;
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = theme.stone;
  ctx.beginPath();
  ctx.ellipse(0, -2, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -3, 14, 6.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Four corner stones around the base.
  ctx.fillStyle = theme.stoneDark;
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(angle) * 17,
      Math.sin(angle) * 8,
      3,
      2,
      angle,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  decor: Decor,
  theme: Theme,
): void {
  const scale = decor.size;
  ctx.save();
  ctx.translate(decor.x, decor.y);
  ctx.fillStyle = "rgba(20, 35, 15, 0.25)";
  ctx.beginPath();
  ctx.ellipse(3, 3, 12 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  if (decor.kind === "pine") {
    ctx.fillStyle = theme.trunk;
    ctx.fillRect(-1.6 * scale, -6 * scale, 3.2 * scale, 8 * scale);
    const tones = [theme.foliageDark, theme.foliage, theme.foliageLight];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = tones[(i + decor.tint) % 3];
      ctx.beginPath();
      ctx.moveTo(0, (-26 + i * 7) * scale);
      ctx.lineTo((-11 + i * 2) * scale, (-8 + i * 7) * scale);
      ctx.lineTo((11 - i * 2) * scale, (-8 + i * 7) * scale);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillStyle = theme.trunk;
    ctx.fillRect(-2 * scale, -9 * scale, 4 * scale, 11 * scale);
    const tones = [theme.foliageDark, theme.foliage, theme.foliageLight];
    const blobs = [
      [-7, -17, 9],
      [7, -18, 9],
      [0, -24, 10],
      [-1, -14, 9],
    ];
    for (let i = 0; i < blobs.length; i++) {
      const [bx, by, br] = blobs[i];
      ctx.fillStyle = tones[(i + decor.tint) % 3];
      ctx.beginPath();
      ctx.arc(bx * scale, by * scale, br * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawRock(
  ctx: CanvasRenderingContext2D,
  decor: Decor,
  theme: Theme,
): void {
  const scale = decor.size;
  ctx.save();
  ctx.translate(decor.x, decor.y);
  ctx.fillStyle = "rgba(20, 30, 20, 0.22)";
  ctx.beginPath();
  ctx.ellipse(2, 2, 9 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.stoneDark;
  ctx.beginPath();
  ctx.moveTo(-8 * scale, 0);
  ctx.lineTo(-4 * scale, -7 * scale);
  ctx.lineTo(3 * scale, -9 * scale);
  ctx.lineTo(8 * scale, -3 * scale);
  ctx.lineTo(6 * scale, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = theme.stone;
  ctx.beginPath();
  ctx.moveTo(-5 * scale, -3 * scale);
  ctx.lineTo(-2 * scale, -7 * scale);
  ctx.lineTo(3 * scale, -7.5 * scale);
  ctx.lineTo(5 * scale, -3 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBush(
  ctx: CanvasRenderingContext2D,
  decor: Decor,
  theme: Theme,
): void {
  const scale = decor.size;
  ctx.save();
  ctx.translate(decor.x, decor.y);
  ctx.fillStyle = "rgba(20, 35, 15, 0.2)";
  ctx.beginPath();
  ctx.ellipse(2, 2, 9 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  const tones = [theme.foliageDark, theme.foliage, theme.foliageLight];
  const blobs = [[-5, -3, 5], [4, -4, 5], [0, -7, 5.5]];
  for (let i = 0; i < blobs.length; i++) {
    const [bx, by, br] = blobs[i];
    ctx.fillStyle = tones[(i + decor.tint) % 3];
    ctx.beginPath();
    ctx.arc(bx * scale, by * scale, br * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFlowers(
  ctx: CanvasRenderingContext2D,
  decor: Decor,
  theme: Theme,
): void {
  ctx.save();
  ctx.translate(decor.x, decor.y);
  ctx.strokeStyle = theme.foliageDark;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 5 * decor.size;
    const y = (i % 2) * -2;
    ctx.beginPath();
    ctx.moveTo(x, y + 3);
    ctx.lineTo(x, y - 3);
    ctx.stroke();
    ctx.fillStyle = theme.flower;
    ctx.beginPath();
    ctx.arc(x, y - 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(x, y - 4, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSpawn(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: Theme,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(15, 15, 12, 0.28)";
  ctx.beginPath();
  ctx.ellipse(2, 5, 24, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.stoneDark;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#17151a";
  ctx.beginPath();
  ctx.ellipse(0, -2, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(190, 60, 40, 0.55)";
  ctx.beginPath();
  ctx.ellipse(-5, -4, 2, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(5, -4, 2, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintBackground(world: World): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WORLD_WIDTH * BACKGROUND_SCALE;
  canvas.height = WORLD_HEIGHT * BACKGROUND_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(BACKGROUND_SCALE, BACKGROUND_SCALE);
  const theme = themeFor(world.levelId);
  const rng = createRng(world.levelId * 7247 + 5);

  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  gradient.addColorStop(0, theme.fieldTop);
  gradient.addColorStop(1, theme.fieldBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Soft patches of lighter ground.
  for (let i = 0; i < 18; i++) {
    const x = rng.range(-40, WORLD_WIDTH + 40);
    const y = rng.range(-40, WORLD_HEIGHT + 40);
    const radius = rng.range(45, 130);
    ctx.fillStyle = theme.patch;
    ctx.globalAlpha = 0.13;
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      radius,
      radius * rng.range(0.45, 0.8),
      rng.range(0, 3),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Grass texture.
  for (let i = 0; i < 320; i++) {
    const x = rng.range(0, WORLD_WIDTH);
    const y = rng.range(0, WORLD_HEIGHT);
    ctx.strokeStyle = rng.next() > 0.5 ? theme.foliage : theme.foliageLight;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rng.range(-2, 2), y - rng.range(2, 5));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const slot of world.slots) drawStone(ctx, slot, theme);
  drawRoads(ctx, world, theme);

  const decor = getDecorations(world);
  decor.sort((a, b) => a.y - b.y);
  for (const item of decor) {
    switch (item.kind) {
      case "tree":
        drawTree(ctx, item, theme);
        break;
      case "pine":
        drawTree(ctx, item, theme);
        break;
      case "rock":
        drawRock(ctx, item, theme);
        break;
      case "bush":
        drawBush(ctx, item, theme);
        break;
      case "flower":
        drawFlowers(ctx, item, theme);
        break;
    }
  }

  world.level.goals.forEach(([x, y], index) => {
    const lane = world.lanes[index]?.[0];
    drawGoalOriented(ctx, x, y, lane, theme);
  });
  world.level.spawns.forEach((path) => {
    const [x, y] = path[0];
    drawSpawn(ctx, x, y, theme);
  });

  // Darken the outer edge so the field reads as a vignette behind the HUD.
  const vignette = ctx.createRadialGradient(
    WORLD_WIDTH / 2,
    WORLD_HEIGHT / 2,
    220,
    WORLD_WIDTH / 2,
    WORLD_HEIGHT / 2,
    540,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(10, 14, 8, 0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  return canvas;
}

function drawGoalOriented(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  lane: { points: Vec[] } | undefined,
  theme: Theme,
): void {
  let heading = 0;
  if (lane && lane.points.length > 2) {
    const a = lane.points[lane.points.length - 2];
    const b = lane.points[lane.points.length - 1];
    heading = Math.atan2(b.y - a.y, b.x - a.x);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  drawGoalBody(ctx, theme);
  ctx.restore();
}

function drawGoalBody(ctx: CanvasRenderingContext2D, theme: Theme): void {
  ctx.fillStyle = "rgba(15, 20, 15, 0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 8, 32, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = theme.stoneDark;
  ctx.fillRect(-20, -26, 12, 32);
  ctx.fillRect(8, -26, 12, 32);
  ctx.fillStyle = theme.stone;
  ctx.fillRect(-19, -25, 9, 30);
  ctx.fillRect(9, -25, 9, 30);
  ctx.beginPath();
  ctx.moveTo(-8, 5);
  ctx.lineTo(-8, -10);
  ctx.quadraticCurveTo(0, -22, 8, -10);
  ctx.lineTo(8, 5);
  ctx.closePath();
  ctx.fillStyle = "#3a3430";
  ctx.fill();

  ctx.fillStyle = theme.stone;
  for (const x of [-20, -13, 8, 15]) ctx.fillRect(x, -30, 5, 6);
  ctx.fillStyle = "#d8cfb4";
  ctx.fillRect(-14, -6, 5, 11);
  ctx.fillRect(9, -6, 5, 11);

  ctx.strokeStyle = "#5c4a2e";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(0, -44);
  ctx.stroke();
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.moveTo(0, -44);
  ctx.lineTo(14, -40);
  ctx.lineTo(0, -34);
  ctx.closePath();
  ctx.fill();
}

export function backgroundFor(world: World): HTMLCanvasElement {
  let canvas = backgrounds.get(world);
  if (!canvas) {
    canvas = paintBackground(world);
    backgrounds.set(world, canvas);
  }
  return canvas;
}
