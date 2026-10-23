// The backdrop: a golden-hour sky with drifting clouds, distant mesas, and
// layered dirt. The static parts are painted once into offscreen canvases.
import { GROUND_Y, HEIGHT, WIDTH } from "./level.ts";
import { blobPath, circlePath, type Ctx, hash, INK, ink } from "./paint.ts";

interface Layers {
  scale: number;
  sky: HTMLCanvasElement;
  ground: HTMLCanvasElement;
}

let layers: Layers | null = null;

function paint(scale: number, draw: (ctx: Ctx) => void): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * scale;
  canvas.height = HEIGHT * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not supported");
  ctx.scale(scale, scale);
  draw(ctx);
  return canvas;
}

/** Draws everything behind the items. */
export function drawScenery(ctx: Ctx, tick: number) {
  const scale = ctx.getTransform().a;
  if (!layers || layers.scale !== scale) {
    layers = {
      scale,
      sky: paint(scale, paintSky),
      ground: paint(scale, paintGround),
    };
  }
  ctx.drawImage(layers.sky, 0, 0, WIDTH, HEIGHT);
  drawClouds(ctx, tick);
  ctx.drawImage(layers.ground, 0, 0, WIDTH, HEIGHT);
}

function paintSky(ctx: Ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, "#f7b955");
  sky.addColorStop(0.6, "#fcd98a");
  sky.addColorStop(1, "#fff0c9");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, GROUND_Y);

  // Low sun with a soft glow.
  const sunX = 668;
  const sunY = 64;
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 110);
  glow.addColorStop(0, "rgb(255 250 220 / 0.9)");
  glow.addColorStop(1, "rgb(255 240 200 / 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, GROUND_Y);
  circlePath(ctx, sunX, sunY, 24);
  ctx.fillStyle = "#fff6d6";
  ctx.fill();
}

const CLOUDS = [
  { x: 60, y: 30, size: 1, speed: 6 },
  { x: 330, y: 52, size: 0.7, speed: 9 },
  { x: 560, y: 22, size: 0.85, speed: 4 },
];

function drawClouds(ctx: Ctx, tick: number) {
  const span = WIDTH + 200;
  for (const cloud of CLOUDS) {
    const x = ((cloud.x + (tick / 60) * cloud.speed) % span) - 100;
    const s = cloud.size;
    ctx.fillStyle = "rgb(255 252 240 / 0.92)";
    ctx.beginPath();
    for (
      const [dx, dy, r] of [[0, 0, 18], [20, -8, 22], [42, 0, 17], [
        22,
        6,
        16,
      ]]
    ) {
      ctx.moveTo(x + dx * s + r * s, cloud.y + dy * s);
      ctx.arc(x + dx * s, cloud.y + dy * s, r * s, 0, Math.PI * 2);
    }
    ctx.fill();
    // Flat, slightly shaded underside.
    ctx.fillStyle = "rgb(240 200 150 / 0.35)";
    ctx.fillRect(x - 18 * s, cloud.y + 8 * s, 78 * s, 6 * s);
  }
}

/** A mesa skyline: flat tops and steep sides. */
function mesas(ctx: Ctx, base: number, color: string, seed: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, base);
  let x = 0;
  let i = 0;
  while (x < WIDTH) {
    const width = 60 + hash(seed + i) * 120;
    const height = 12 + hash(seed + i + 50) * 38;
    const slope = 10 + hash(seed + i + 90) * 14;
    ctx.lineTo(x + slope, base - height);
    ctx.lineTo(x + width - slope, base - height);
    ctx.lineTo(x + width, base);
    x += width + hash(seed + i + 120) * 40;
    ctx.lineTo(x, base);
    i++;
  }
  ctx.lineTo(WIDTH, base);
  ctx.closePath();
  ctx.fill();
}

const STRATA = ["#b9773d", "#a0632f", "#874f25", "#6d3d1c", "#522c13"];

function paintGround(ctx: Ctx) {
  mesas(ctx, GROUND_Y - 6, "rgb(214 140 92 / 0.55)", 3);
  mesas(ctx, GROUND_Y - 2, "rgb(184 108 66 / 0.75)", 11);

  // Dirt strata, each with a wavy top edge.
  const bandHeight = (HEIGHT - GROUND_Y) / STRATA.length;
  for (const [band, color] of STRATA.entries()) {
    const top = GROUND_Y + band * bandHeight;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT);
    ctx.lineTo(0, top);
    for (let x = 0; x <= WIDTH; x += 20) {
      const wave = band === 0
        ? 0
        : Math.sin(x / 70 + band * 1.7) * 7 + Math.sin(x / 23 + band) * 2;
      ctx.lineTo(x, top + wave);
    }
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  // Speckle texture.
  for (let i = 0; i < 420; i++) {
    const x = hash(i * 3.1) * WIDTH;
    const y = GROUND_Y + 10 + hash(i * 7.7) * (HEIGHT - GROUND_Y - 10);
    const light = hash(i * 1.3) > 0.5;
    ctx.fillStyle = light ? "rgb(255 230 190 / 0.10)" : "rgb(40 15 0 / 0.18)";
    ctx.fillRect(x, y, 2 + hash(i) * 2, 2 + hash(i + 3) * 2);
  }

  // Embedded pebbles.
  for (let i = 0; i < 26; i++) {
    const x = hash(i + 500) * WIDTH;
    const y = GROUND_Y + 30 + hash(i + 600) * (HEIGHT - GROUND_Y - 40);
    const r = 3 + hash(i + 700) * 5;
    const pebble = blobPath(x, y, r, i + 800, 0.3, 6);
    ctx.fillStyle = "rgb(120 90 70 / 0.55)";
    ctx.fill(pebble);
    ctx.strokeStyle = "rgb(40 20 5 / 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke(pebble);
  }

  // Roots hanging from the grass.
  ctx.strokeStyle = "rgb(70 40 15 / 0.45)";
  ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const x = 30 + hash(i + 900) * (WIDTH - 60);
    const length = 18 + hash(i + 950) * 26;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 2);
    ctx.quadraticCurveTo(
      x + (hash(i + 990) - 0.5) * 20,
      GROUND_Y + length / 2,
      x + (hash(i + 999) - 0.5) * 24,
      GROUND_Y + length,
    );
    ctx.stroke();
  }

  // A couple of fossils for anyone who looks closely.
  ammonite(ctx, 120, 525, 11);
  ammonite(ctx, 705, 395, 8);

  // Darker toward the bottom corners.
  const vignette = ctx.createRadialGradient(
    WIDTH / 2,
    GROUND_Y + 120,
    120,
    WIDTH / 2,
    GROUND_Y + 160,
    560,
  );
  vignette.addColorStop(0, "rgb(0 0 0 / 0)");
  vignette.addColorStop(1, "rgb(20 8 0 / 0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

  grass(ctx);
}

function ammonite(ctx: Ctx, x: number, y: number, r: number) {
  ctx.strokeStyle = "rgb(230 200 160 / 0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let t = 0; t < Math.PI * 5; t += 0.2) {
    const radius = r * (t / (Math.PI * 5));
    ctx.lineTo(x + Math.cos(t) * radius, y + Math.sin(t) * radius);
  }
  ctx.stroke();
}

function grass(ctx: Ctx) {
  const top = GROUND_Y - 5;
  ctx.fillStyle = "#7cb342";
  ctx.fillRect(0, top, WIDTH, 9);
  ctx.fillStyle = "#558b2f";
  ctx.fillRect(0, top + 6, WIDTH, 4);
  ctx.beginPath();
  ctx.moveTo(0, top + 10);
  ctx.lineTo(WIDTH, top + 10);
  ink(ctx, 2);

  // Tufts.
  ctx.fillStyle = "#8bc34a";
  for (let i = 0; i < 46; i++) {
    const x = hash(i + 1200) * WIDTH;
    const h = 5 + hash(i + 1300) * 7;
    ctx.beginPath();
    ctx.moveTo(x - 5, top + 2);
    ctx.lineTo(x - 2, top - h);
    ctx.lineTo(x, top);
    ctx.lineTo(x + 3, top - h * 0.8);
    ctx.lineTo(x + 5, top + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
