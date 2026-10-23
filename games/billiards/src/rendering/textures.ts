import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

import { BALL_COLORS, ballColor } from "./colors.ts";

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
  const { canvas, ctx } = surface(1024, 512);
  ctx.fillStyle = id > 8 ? BALL_COLORS[0] : ballColor(id);
  ctx.fillRect(0, 0, 1024, 512);
  if (id > 8) {
    ctx.fillStyle = ballColor(id);
    ctx.fillRect(0, 160, 1024, 192);
  }
  for (const x of [256, 768]) {
    ctx.beginPath();
    ctx.arc(x, 256, id ? 60 : 12, 0, Math.PI * 2);
    ctx.fillStyle = id ? BALL_COLORS[0] : "#b92e2b";
    ctx.fill();
    if (id) {
      ctx.fillStyle = "#15171a";
      ctx.font = "bold 72px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(id), x, 260);
      if (id === 6 || id === 9) ctx.fillRect(x - 18, 300, 36, 5);
    }
  }
  if (!id) {
    ctx.fillStyle = "#b92e2b";
    for (const [x, y] of [[0, 256], [512, 256], [256, 84], [768, 428]]) {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Fine, low-contrast fibre noise, tinted by the material color. Small enough
 * per texel that it reads as cloth rather than a pattern at any distance.
 */
export function clothTexture(): CanvasTexture {
  const size = 512;
  const { canvas, ctx } = surface(size, size);
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 214 + (Math.random() - 0.5) * 34;
    image.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(image, 0, 0);
  // Short fibres lying with the nap, toward the head of the table.
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.strokeStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},${
      0.05 + Math.random() * 0.05
    })`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3 + Math.random() * 6, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  // UVs are meters; one tile covers 40 cm.
  texture.repeat.set(2.5, 2.5);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Dark varnished hardwood; UVs run along each rail. */
export function woodTexture(): CanvasTexture {
  const { canvas, ctx } = surface(1024, 256);
  const base = ctx.createLinearGradient(0, 0, 0, 256);
  base.addColorStop(0, "#4a2a18");
  base.addColorStop(0.5, "#5a3420");
  base.addColorStop(1, "#46271a");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 256);
  for (let y = 0; y < 256; y += 1.5) {
    const light = Math.random() < 0.55;
    ctx.strokeStyle = light
      ? `rgba(150, 96, 56, ${0.12 + Math.random() * 0.16})`
      : `rgba(24, 11, 6, ${0.15 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.2;
    const phase = Math.random() * 6;
    ctx.beginPath();
    for (let x = 0; x <= 1024; x += 16) {
      const wave = Math.sin(x / 140 + phase) * 3 + Math.sin(x / 37 + y) * 0.8;
      if (x) ctx.lineTo(x, y + wave);
      else ctx.moveTo(x, y + wave);
    }
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}
