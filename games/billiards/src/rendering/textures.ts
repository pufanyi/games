import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

import { BALL_COLORS, ballColor } from "./colors.ts";
import { TABLE } from "../physics/table.ts";

function surface(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Texture canvas is unavailable");
  return { canvas, ctx };
}

/** Original procedural textures: no remote images or borrowed game assets. */
export function ballTexture(id: number): CanvasTexture {
  const { canvas, ctx } = surface(512, 256);
  ctx.fillStyle = id > 8 ? BALL_COLORS[0] : ballColor(id);
  ctx.fillRect(0, 0, 512, 256);
  if (id > 8) {
    ctx.fillStyle = ballColor(id);
    ctx.fillRect(0, 80, 512, 96);
  }
  for (const x of [128, 384]) {
    ctx.beginPath();
    ctx.arc(x, 128, id ? 30 : 6, 0, Math.PI * 2);
    ctx.fillStyle = id ? BALL_COLORS[0] : "#b92e2b";
    ctx.fill();
    if (id) {
      ctx.fillStyle = "#15171a";
      ctx.font = "bold 36px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(id), x, 130);
    }
  }
  if (!id) {
    ctx.fillStyle = "#b92e2b";
    for (const [x, y] of [[0, 128], [256, 128], [128, 42], [384, 214]]) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function clothTexture(): CanvasTexture {
  const { canvas, ctx } = surface(128, 128);
  ctx.fillStyle = "#a6b6ab";
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) {
    for (let x = 0; x < 128; x += 2) {
      ctx.fillStyle = (x + y) % 4 ? "#91a398" : "#bec9c1";
      ctx.fillRect(x, y, 1, 2);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(12, 6);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function woodTexture(): CanvasTexture {
  const { canvas, ctx } = surface(512, 128);
  ctx.fillStyle = "#50301e";
  ctx.fillRect(0, 0, 512, 128);
  for (let y = 0; y < 128; y++) {
    ctx.strokeStyle = `rgba(${y % 3 ? "140, 90, 49" : "25, 12, 8"}, 0.3)`;
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      ctx.lineTo(x, y + Math.sin(x / 65 + y / 9) * 2);
    }
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

/** ShapeGeometry uses world XY as UV; map pocket cutouts onto those meters. */
export function pocketMask(): CanvasTexture {
  const { canvas, ctx } = surface(1024, 512);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = "#000";
  for (const p of TABLE.pockets) {
    ctx.beginPath();
    ctx.arc((p.x + 2) * 256, (1 - p.y) * 256, p.radius * 256, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.repeat.set(0.25, 0.5);
  texture.offset.set(0.5, 0.5);
  return texture;
}
