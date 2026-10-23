// Item sprites: gold, rocks, diamonds, bags, bones, TNT, and moles.
import type { Item } from "../game/items.ts";
import {
  blobPath,
  circlePath,
  type Ctx,
  FONT,
  gloss,
  hash,
  INK,
  ink,
  shadeInside,
  sparkle,
} from "./paint.ts";

/** A dark hollow in the dirt behind an item that's still buried. */
export function drawPocket(ctx: Ctx, item: Item) {
  if (item.kind === "mole") {
    // The tunnel it patrols.
    const from = (item.minX ?? item.x) - item.r * 1.6;
    const to = (item.maxX ?? item.x) + item.r * 1.6;
    ctx.fillStyle = "rgb(35 15 0 / 0.26)";
    ctx.beginPath();
    ctx.roundRect(from, item.y - item.r * 0.95, to - from, item.r * 2, item.r);
    ctx.fill();
    return;
  }
  ctx.fillStyle = "rgb(35 15 0 / 0.32)";
  ctx.beginPath();
  ctx.ellipse(
    item.x + 2,
    item.y + 4,
    item.r * 1.12,
    item.r * 1.02,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

export function drawItem(ctx: Ctx, item: Item, tick: number) {
  switch (item.kind) {
    case "goldSmall":
    case "goldMedium":
    case "goldLarge":
    case "goldHuge":
      return drawGold(ctx, item, tick);
    case "rockSmall":
    case "rockLarge":
      return drawRock(ctx, item);
    case "diamond":
      return drawDiamond(ctx, item.x, item.y, item.r, tick + item.id * 37);
    case "bag":
      return drawBag(ctx, item);
    case "bone":
      return drawBone(ctx, item);
    case "tnt":
      return drawTnt(ctx, item, tick);
    case "mole":
      return drawMole(ctx, item, tick);
  }
}

function drawGold(ctx: Ctx, item: Item, tick: number) {
  const { x, y, r, id } = item;
  const shape = blobPath(x, y, r, id, 0.24);
  const fill = ctx.createRadialGradient(
    x - r * 0.35,
    y - r * 0.4,
    r * 0.1,
    x,
    y,
    r * 1.15,
  );
  fill.addColorStop(0, "#fff6b8");
  fill.addColorStop(0.35, "#ffd23f");
  fill.addColorStop(0.8, "#e5a00d");
  fill.addColorStop(1, "#b8720a");
  ctx.fillStyle = fill;
  ctx.fill(shape);
  shadeInside(ctx, shape, x, y, r, "rgb(150 75 0 / 0.28)");
  ink(ctx, r > 30 ? 2.5 : 2, shape);

  // A few facet lines on the bigger nuggets.
  if (r > 18) {
    ctx.strokeStyle = "rgb(150 85 0 / 0.45)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const a = hash(id * 5 + i) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
      ctx.lineTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
      ctx.stroke();
    }
  }
  // Pitted, like real nuggets: dark dents with a lit lower lip.
  for (let i = 0; i < Math.min(4, Math.floor(r / 9)); i++) {
    const px = x + (hash(id * 9 + i) - 0.4) * r * 0.9;
    const py = y + (hash(id * 13 + i) - 0.3) * r * 0.8;
    const size = 1.4 + r * 0.04;
    ctx.fillStyle = "rgb(170 95 0 / 0.45)";
    ctx.beginPath();
    ctx.ellipse(px, py, size * 1.3, size, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgb(255 250 200 / 0.6)";
    ctx.beginPath();
    ctx.ellipse(
      px + 0.6,
      py + size * 0.9,
      size,
      size * 0.4,
      -0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  gloss(ctx, x, y, r);

  const twinkle = Math.sin(tick / 22 + id * 1.7);
  if (twinkle > 0.85) {
    sparkle(ctx, x + r * 0.45, y - r * 0.5, 4 + r * 0.15, (twinkle - 0.85) * 6);
  }
}

function drawRock(ctx: Ctx, item: Item) {
  const { x, y, r, id } = item;
  const shape = blobPath(x, y, r, id, 0.32, 8);
  const fill = ctx.createRadialGradient(
    x - r * 0.3,
    y - r * 0.35,
    r * 0.1,
    x,
    y,
    r * 1.1,
  );
  fill.addColorStop(0, "#d5d0c6");
  fill.addColorStop(0.55, "#9c958a");
  fill.addColorStop(1, "#6b655b");
  ctx.fillStyle = fill;
  ctx.fill(shape);

  // Chipped planes: a lit face up and left of a ridge point, a shadowed one
  // down and right, so it reads as hard stone rather than a soft lump.
  const ridge = { x: x - r * 0.05 + (hash(id * 7) - 0.5) * r * 0.3, y };
  const tilt = hash(id * 3) * 0.5;
  ctx.save();
  ctx.clip(shape);
  ctx.fillStyle = "rgb(255 255 255 / 0.2)";
  ctx.beginPath();
  ctx.moveTo(ridge.x, ridge.y);
  ctx.lineTo(x - r * 1.2, y + r * (0.05 + tilt * 0.3));
  ctx.lineTo(x - r * 1.2, y - r * 1.2);
  ctx.lineTo(x + r * (0.25 + tilt), y - r * 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgb(40 30 20 / 0.24)";
  ctx.beginPath();
  ctx.moveTo(ridge.x, ridge.y);
  ctx.lineTo(x + r * 1.2, y - r * (0.15 + tilt * 0.4));
  ctx.lineTo(x + r * 1.2, y + r * 1.2);
  ctx.lineTo(x - r * (0.05 + tilt * 0.4), y + r * 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgb(58 35 18 / 0.3)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - r * 1.2, y + r * (0.05 + tilt * 0.3));
  ctx.lineTo(ridge.x, ridge.y);
  ctx.lineTo(x + r * (0.25 + tilt), y - r * 1.2);
  ctx.moveTo(ridge.x, ridge.y);
  ctx.lineTo(x - r * (0.05 + tilt * 0.4), y + r * 1.2);
  ctx.stroke();
  ctx.restore();
  ink(ctx, r > 25 ? 2.5 : 2, shape);

  // Cracks and flecks.
  ctx.strokeStyle = "rgb(58 35 18 / 0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const a = hash(id * 3) * Math.PI * 2;
  ctx.moveTo(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75);
  ctx.lineTo(
    x + Math.cos(a + 0.4) * r * 0.25,
    y + Math.sin(a + 0.4) * r * 0.25,
  );
  ctx.lineTo(x + Math.cos(a + 0.2) * r * 0.05, y + Math.sin(a - 0.3) * r * 0.1);
  ctx.stroke();
  ctx.fillStyle = "rgb(255 255 255 / 0.35)";
  for (let i = 0; i < 3; i++) {
    const fx = x + (hash(id + i * 7) - 0.5) * r;
    const fy = y + (hash(id + i * 11) - 0.5) * r;
    ctx.fillRect(fx, fy, 2, 2);
  }
  gloss(ctx, x, y, r * 0.8, 0.4);
}

/** A cut gem: table, crown, and pavilion facets. */
export function drawDiamond(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  phase: number,
) {
  const tl = { x: x - r * 0.5, y: y - r * 0.6 };
  const tr = { x: x + r * 0.5, y: y - r * 0.6 };
  const gl = { x: x - r, y: y - r * 0.12 };
  const gr = { x: x + r, y: y - r * 0.12 };
  const gm = { x, y: y - r * 0.12 };
  const bottom = { x, y: y + r * 1.05 };
  const glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2.2);
  glow.addColorStop(0, "rgb(190 245 255 / 0.55)");
  glow.addColorStop(1, "rgb(190 245 255 / 0)");
  ctx.fillStyle = glow;
  circlePath(ctx, x, y, r * 2.2);
  ctx.fill();
  const facets: [string, { x: number; y: number }[]][] = [
    ["#e9fdff", [tl, tr, gm]],
    ["#b5f2fd", [tl, gm, gl]],
    ["#7fdcf3", [tr, gr, gm]],
    ["#56c6ea", [gl, gm, bottom]],
    ["#2c9fd3", [gm, gr, bottom]],
  ];
  for (const [color, points] of facets) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  for (const p of [tl, tr, gr, bottom, gl]) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ink(ctx, r > 8 ? 2 : 1.5);

  const twinkle = Math.sin(phase / 14);
  sparkle(ctx, x - r * 0.2, y - r * 0.45, r * 0.9, (twinkle - 0.4) * 1.6);
}

function drawBag(ctx: Ctx, item: Item) {
  const { x, y, r } = item;
  // Sack body.
  ctx.beginPath();
  ctx.moveTo(x - r * 0.45, y - r * 0.55);
  ctx.bezierCurveTo(x - r * 1.25, y - r * 0.1, x - r * 1.15, y + r, x, y + r);
  ctx.bezierCurveTo(
    x + r * 1.15,
    y + r,
    x + r * 1.25,
    y - r * 0.1,
    x + r * 0.45,
    y - r * 0.55,
  );
  ctx.closePath();
  const fill = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  fill.addColorStop(0, "#e8bd7c");
  fill.addColorStop(1, "#a8743a");
  ctx.fillStyle = fill;
  ctx.fill();
  ink(ctx);

  // A stitched patch on the burlap.
  ctx.save();
  ctx.translate(x + r * 0.55, y + r * 0.5);
  ctx.rotate(0.3);
  ctx.beginPath();
  ctx.rect(-r * 0.24, -r * 0.2, r * 0.48, r * 0.4);
  ctx.fillStyle = "#c08447";
  ctx.fill();
  ink(ctx, 1.2);
  ctx.setLineDash([1.6, 1.6]);
  ctx.strokeStyle = "rgb(58 35 18 / 0.7)";
  ctx.lineWidth = 0.9;
  ctx.strokeRect(-r * 0.16, -r * 0.12, r * 0.32, r * 0.24);
  ctx.setLineDash([]);
  ctx.restore();

  // Gathered neck and tie.
  ctx.beginPath();
  ctx.moveTo(x - r * 0.45, y - r * 0.55);
  ctx.lineTo(x - r * 0.6, y - r * 1.05);
  ctx.lineTo(x - r * 0.2, y - r * 0.85);
  ctx.lineTo(x, y - r * 1.1);
  ctx.lineTo(x + r * 0.2, y - r * 0.85);
  ctx.lineTo(x + r * 0.6, y - r * 1.05);
  ctx.lineTo(x + r * 0.45, y - r * 0.55);
  ctx.closePath();
  ctx.fillStyle = "#d9a866";
  ctx.fill();
  ink(ctx, 1.5);
  ctx.fillStyle = "#8a4b1d";
  ctx.beginPath();
  ctx.roundRect(x - r * 0.55, y - r * 0.68, r * 1.1, r * 0.22, 3);
  ctx.fill();
  ink(ctx, 1.5);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${r * 1.05}px ${FONT}`;
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.strokeText("?", x, y + r * 0.25);
  ctx.fillStyle = "#fff4cf";
  ctx.fillText("?", x, y + r * 0.25);
}

function drawBone(ctx: Ctx, item: Item) {
  const { x, y, r, id } = item;
  // Some of the clutter is a skull instead.
  if (hash(id * 13) > 0.55) return drawSkull(ctx, item);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(hash(id) * Math.PI);
  const shaft = r * 0.75;
  ctx.beginPath();
  ctx.roundRect(-shaft, -3.5, shaft * 2, 7, 3);
  for (const [bx, by] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    ctx.moveTo(bx * shaft + 5, by * 4);
    ctx.arc(bx * shaft, by * 4, 5, 0, Math.PI * 2);
  }
  // Outline behind the fill, so the overlapping knobs read as one shape.
  ink(ctx, 3.5);
  ctx.fillStyle = "#f4ecd8";
  ctx.fill();
  ctx.fillStyle = "rgb(160 130 90 / 0.4)";
  ctx.fillRect(-shaft, 1, shaft * 2, 2.5);
  ctx.restore();
}

function drawSkull(ctx: Ctx, item: Item) {
  const { x, y, r, id } = item;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((hash(id * 5) - 0.5) * 0.9);
  ctx.scale(r / 14, r / 14);
  // Cranium and jaw as one outline.
  const skull = new Path2D();
  skull.arc(0, -2, 11, Math.PI * 0.8, Math.PI * 2.2);
  skull.lineTo(7, 8);
  skull.lineTo(5.5, 12);
  skull.quadraticCurveTo(0, 14.5, -5.5, 12);
  skull.lineTo(-7, 8);
  skull.closePath();
  const bone = ctx.createRadialGradient(-4, -6, 1, 0, 0, 14);
  bone.addColorStop(0, "#fffaf0");
  bone.addColorStop(1, "#d8ccb0");
  ctx.fillStyle = bone;
  ctx.fill(skull);
  ink(ctx, 2, skull);
  ctx.fillStyle = INK;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 4.3, 1, 3.1, 3.6, side * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.lineTo(1.6, 8);
  ctx.lineTo(-1.6, 8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  for (const tx of [-2.6, 0, 2.6]) {
    ctx.moveTo(tx, 9.8);
    ctx.lineTo(tx, 12.6);
  }
  ctx.moveTo(-4.5, 10.8);
  ctx.lineTo(4.5, 10.8);
  ink(ctx, 1);
  // A hairline crack across the crown.
  ctx.beginPath();
  ctx.moveTo(3, -12.5);
  ctx.lineTo(1.5, -9);
  ctx.lineTo(3.5, -7);
  ink(ctx, 1);
  ctx.restore();
}

function drawTnt(ctx: Ctx, item: Item, tick: number) {
  const { x, y, r } = item;
  const w = r * 0.85;
  // Barrel with bulging sides.
  ctx.beginPath();
  ctx.moveTo(x - w * 0.85, y - r);
  ctx.quadraticCurveTo(x - w * 1.15, y, x - w * 0.85, y + r);
  ctx.lineTo(x + w * 0.85, y + r);
  ctx.quadraticCurveTo(x + w * 1.15, y, x + w * 0.85, y - r);
  ctx.closePath();
  const fill = ctx.createLinearGradient(x - w, y, x + w, y);
  fill.addColorStop(0, "#a82a1d");
  fill.addColorStop(0.4, "#e2533e");
  fill.addColorStop(1, "#8f2216");
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgb(90 20 10 / 0.5)";
  ctx.lineWidth = 1.5;
  for (const sx of [-0.45, 0, 0.45]) {
    ctx.beginPath();
    ctx.moveTo(x + w * sx, y - r);
    ctx.lineTo(x + w * sx, y + r);
    ctx.stroke();
  }
  ctx.fillStyle = "#4b3a33";
  ctx.fillRect(x - w * 1.2, y - r * 0.72, w * 2.4, 3.5);
  ctx.fillRect(x - w * 1.2, y + r * 0.62, w * 2.4, 3.5);
  ctx.restore();
  ink(ctx);

  // Label.
  ctx.fillStyle = "#fff1d0";
  ctx.beginPath();
  ctx.roundRect(x - w * 0.8, y - r * 0.32, w * 1.6, r * 0.62, 3);
  ctx.fill();
  ink(ctx, 1.5);
  ctx.fillStyle = "#b3261b";
  ctx.font = `${r * 0.55}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("TNT", x, y + 1);

  // Fuse with a flickering spark.
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + 4, y - r - 6, x + 8, y - r - 8);
  ink(ctx, 2);
  const flicker = 0.7 + Math.sin(tick * 0.9 + item.id) * 0.3;
  circlePath(ctx, x + 8, y - r - 8, 3.5 * flicker);
  ctx.fillStyle = "#ffb300";
  ctx.fill();
  sparkle(ctx, x + 8, y - r - 8, 6 * flicker, 0.9);
}

/**
 * A plump mole trundling along its tunnel: velvet fur, a pink star of a
 * snout, big digging paws, and eyes squeezed shut against the light.
 */
function drawMole(ctx: Ctx, item: Item, tick: number) {
  const { x, y, r, id } = item;
  const facing = (item.vx ?? 1) >= 0 ? 1 : -1;
  const stride = Math.sin(tick * 0.45 + id);
  const pink = "#f2a7b0";
  ctx.save();
  ctx.translate(x, y - Math.abs(stride) * 1.2);
  // Drawn facing right, mirrored when walking left.
  ctx.scale(facing, 1);

  // Tail.
  ctx.beginPath();
  ctx.moveTo(-r * 1.15, r * 0.15);
  ctx.quadraticCurveTo(-r * 1.6, -r * 0.05, -r * 1.75, r * 0.3);
  ink(ctx, 4);
  ctx.strokeStyle = pink;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Back feet, stepping.
  for (const [foot, phase] of [[-0.65, 1], [0.25, -1]]) {
    ctx.beginPath();
    ctx.ellipse(
      r * foot + stride * 2.2 * phase,
      r * 0.78,
      4.6,
      3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = pink;
    ctx.fill();
    ink(ctx, 1.4);
  }

  // Body and head as one silhouette: outline both, then fill both.
  const body = new Path2D();
  body.ellipse(-r * 0.15, r * 0.05, r * 1.15, r * 0.85, 0, 0, Math.PI * 2);
  body.moveTo(r * 1.4, -r * 0.15);
  body.arc(r * 0.8, -r * 0.15, r * 0.6, 0, Math.PI * 2);
  ink(ctx, 4, body);
  const fur = ctx.createRadialGradient(-r * 0.3, -r * 0.5, 2, 0, 0, r * 1.4);
  fur.addColorStop(0, "#9b7d70");
  fur.addColorStop(1, "#4b3029");
  ctx.fillStyle = fur;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = "#c9ad9c";
  ctx.beginPath();
  ctx.ellipse(r * 0.3, r * 0.62, r * 0.85, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgb(255 255 255 / 0.3)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.55, -r * 0.4, r * 0.35, r * 0.15, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Whiskers.
  ctx.beginPath();
  for (const w of [-0.4, 0, 0.4]) {
    ctx.moveTo(r * 1.5, r * 0.02);
    ctx.lineTo(r * 2.15, r * 0.06 + w * r * 0.75);
  }
  ink(ctx, 0.8);

  // Snout and nose.
  ctx.beginPath();
  ctx.ellipse(r * 1.42, -r * 0.08, r * 0.42, r * 0.26, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = pink;
  ctx.fill();
  ink(ctx, 1.5);
  circlePath(ctx, r * 1.8, -r * 0.08, 3.2);
  ctx.fillStyle = "#e0587a";
  ctx.fill();
  ink(ctx, 1.4);
  circlePath(ctx, r * 1.74, -r * 0.18, 1);
  ctx.fillStyle = "#fff";
  ctx.fill();
  // Eye squeezed shut.
  ctx.beginPath();
  ctx.arc(r * 0.82, -r * 0.4, 2.5, Math.PI * 0.15, Math.PI * 0.85);
  ink(ctx, 1.5);
  circlePath(ctx, r * 0.78, -r * 0.02, 2.6);
  ctx.fillStyle = "rgb(240 110 120 / 0.45)";
  ctx.fill();

  if (item.carrying) drawDiamond(ctx, r * 1.25, r * 0.55, 8, tick + id * 37);

  // Big digging paw out front, over anything it carries.
  ctx.beginPath();
  ctx.ellipse(r * 0.95, r * 0.62, 5, 3.6, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = pink;
  ctx.fill();
  ink(ctx, 1.4);
  ctx.beginPath();
  for (const c of [-1, 0, 1]) {
    ctx.moveTo(r * 0.95 + 3, r * 0.62 + c * 1.6);
    ctx.lineTo(r * 0.95 + 6, r * 0.62 + c * 2.2);
  }
  ink(ctx, 0.9);
  ctx.restore();
}
