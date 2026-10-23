// Shared drawing helpers for the cartoon style: everything gets a dark ink
// outline, a gradient body, and a highlight, like classic Flash vector art.

export type Ctx = CanvasRenderingContext2D;

/** Outline color for every sprite. */
export const INK = "#3a2312";
/** The display font; falls back to the system's rounded font until loaded. */
export const FONT = '"Lilita One", ui-rounded, "SF Pro Rounded", system-ui';

/**
 * Fixed pseudo-random numbers for decoration (blob outlines, cracks, debris),
 * so shapes stay the same from frame to frame.
 */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Strokes `path` (or the current path) with the ink outline. */
export function ink(ctx: Ctx, width = 2, path?: Path2D) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (path) ctx.stroke(path);
  else ctx.stroke();
}

/** Sets the current path to a circle. */
export function circlePath(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

/**
 * A smooth, lumpy outline around (x, y): a nugget or a rock. The same `seed`
 * always gives the same shape. Returned as a Path2D so it can be filled,
 * clipped to, and outlined without being redrawn.
 */
export function blobPath(
  x: number,
  y: number,
  r: number,
  seed: number,
  roughness: number,
  points = 9,
) {
  const corners = Array.from({ length: points }, (_, i) => {
    const angle = (i / points) * Math.PI * 2 + hash(seed) * 0.6;
    const radius = r * (1 - roughness + hash(seed * 31 + i) * roughness * 1.4);
    return { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
  });
  const mid = (i: number) => {
    const a = corners[i % points];
    const b = corners[(i + 1) % points];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  const path = new Path2D();
  const start = mid(points - 1);
  path.moveTo(start.x, start.y);
  for (let i = 0; i < points; i++) {
    const end = mid(i);
    path.quadraticCurveTo(corners[i].x, corners[i].y, end.x, end.y);
  }
  path.closePath();
  return path;
}

/** Shades the bottom-right inside `shape`, as if lit from the top left. */
export function shadeInside(
  ctx: Ctx,
  shape: Path2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  ctx.save();
  ctx.clip(shape);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + r * 0.45, y + r * 0.55, r * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A glossy highlight: a small tilted oval and a dot, top left. */
export function gloss(ctx: Ctx, x: number, y: number, r: number, alpha = 0.85) {
  ctx.fillStyle = `rgb(255 255 255 / ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(
    x - r * 0.38,
    y - r * 0.38,
    r * 0.3,
    r * 0.15,
    -0.7,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  circlePath(ctx, x - r * 0.05, y - r * 0.58, r * 0.07);
  ctx.fill();
}

/** A four-pointed twinkle. */
export function sparkle(
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  alpha = 1,
) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#fffdf0";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = i % 2 === 0 ? size : size * 0.22;
    ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Text with an ink outline, drawn at the current alignment. */
export function outlinedText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  size: number,
  fill: string | CanvasGradient,
  outline = Math.max(3, size * 0.18),
) {
  ctx.font = `${size}px ${FONT}`;
  ctx.lineJoin = "round";
  ctx.lineWidth = outline;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** A wooden board: rounded plank with grain lines and nails. */
export function woodBoard(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
) {
  const wood = ctx.createLinearGradient(x, y, x, y + h);
  wood.addColorStop(0, "#d69a5c");
  wood.addColorStop(1, "#a86d38");
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgb(110 60 20 / 0.28)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const gy = y + h * (0.2 + i * 0.22);
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.bezierCurveTo(
      x + w * 0.3,
      gy + (hash(seed + i) - 0.5) * 8,
      x + w * 0.7,
      gy + (hash(seed + i + 9) - 0.5) * 8,
      x + w,
      gy,
    );
    ctx.stroke();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ink(ctx, 2.5);
  for (
    const [nx, ny] of [[x + 9, y + 9], [x + w - 9, y + 9], [
      x + 9,
      y + h - 9,
    ], [x + w - 9, y + h - 9]]
  ) {
    circlePath(ctx, nx, ny, 2.4);
    ctx.fillStyle = "#6b4a2a";
    ctx.fill();
  }
}
