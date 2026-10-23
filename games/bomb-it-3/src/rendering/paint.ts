import { CHARACTERS, ITEM_ICONS, THEMES } from "../content/catalog.ts";
import type { Item, Player, State, Theme } from "../game/types.ts";
export const INK = "#263b4b";
export function rounded(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke = "",
) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}
export function ellipse(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  stroke = "",
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}
export function label(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = INK,
  align: CanvasTextAlign = "left",
) {
  c.font = `900 ${size}px 'Trebuchet MS', sans-serif`;
  c.textAlign = align;
  c.textBaseline = "middle";
  c.fillStyle = color;
  c.fillText(text, x, y);
}
export function robot(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  character: number,
  size: number,
  tick: number,
  player?: Player,
) {
  c.save();
  c.translate(x, y);
  c.scale(size / 34, size / 34);
  c.lineWidth = 1.8;
  if (player && !player.alive) c.globalAlpha = 0.24;
  const skin = CHARACTERS[character];
  const bob = player?.moving
    ? Math.sin(tick * 0.6) * 1.4
    : Math.sin(tick * 0.06 + character) * 0.5;
  ellipse(c, 0, 10, 12, 4, "#23334530");
  if (player?.ride) {
    const color = player.ride === "horse"
      ? "#dba165"
      : player.ride === "hovercraft"
      ? "#f4d364"
      : skin.dark;
    ellipse(c, 0, 6, 17, 8, color, INK);
    if (player.ride === "horse") {
      ellipse(c, 13, -1, 5, 8, color, INK);
      ellipse(c, 14, -3, 1, 1.5, INK);
    } else {
      for (const dx of [-11, 11]) rounded(c, dx - 3, 6, 6, 8, 2, "#263b4b");
      rounded(c, -9, 0, 18, 5, 2, "#ffffff70");
    }
    c.translate(0, -5);
  }
  c.translate(0, bob);
  const stride = player?.moving ? Math.sin(tick * 0.65) * 2 : 0;
  rounded(c, -9, 5 + stride, 8, 6, 3, skin.dark, INK);
  rounded(c, 2, 5 - stride, 8, 6, 3, skin.dark, INK);
  const gradient = c.createLinearGradient(-10, -8, 10, 10);
  gradient.addColorStop(0, skin.color);
  gradient.addColorStop(1, skin.dark);
  c.fillStyle = gradient;
  c.beginPath();
  c.roundRect(-10, -9, 20, 18, 7);
  c.fill();
  c.strokeStyle = INK;
  c.stroke();
  ellipse(c, -12, -1 - stride, 4, 5, skin.color, INK);
  ellipse(c, 12, -1 + stride, 4, 5, skin.color, INK);
  rounded(c, -13, -25, 26, 23, 10, skin.color, INK);
  rounded(c, -10, -21, 20, 14, 7, "#fff2d4", INK);
  rounded(c, -9, -24, 13, 3, 2, "#ffffff88");
  const back = player?.direction === "up",
    look = player?.direction === "left"
      ? -2
      : player?.direction === "right"
      ? 2
      : 0;
  if (back) rounded(c, -7, -18, 14, 9, 3, skin.dark);
  else {
    ellipse(c, -4 + look, -15, 1.8, 3, INK);
    ellipse(c, 4 + look, -15, 1.8, 3, INK);
    ellipse(c, -4.5 + look, -16, 0.6, 1, "white");
    ellipse(c, 3.5 + look, -16, 0.6, 1, "white");
    c.strokeStyle = "#b95a5c";
    c.lineWidth = 1;
    c.beginPath();
    c.arc(look, -11, 2, 0, Math.PI);
    c.stroke();
    ellipse(c, -8, -11, 2, 1, "#f5b2a3");
    ellipse(c, 8, -11, 2, 1, "#f5b2a3");
  }
  c.strokeStyle = INK;
  c.lineWidth = 1.8;
  if (character === 0) {
    rounded(c, -4, -30, 8, 7, 3, "#fff4b7", INK);
    ellipse(c, 0, -30, 3, 3, "#f8cd58", INK);
  }
  if (character === 1) {
    ellipse(c, -10, -25, 6, 4, "#fff0a9", INK);
    ellipse(c, 0, -27, 6, 4, "#fff0a9", INK);
    ellipse(c, -5, -25, 3, 3, "#f26fa4", INK);
  }
  if (character === 2) {
    c.fillStyle = "#fff1c1";
    c.beginPath();
    c.moveTo(-7, -24);
    c.lineTo(0, -33);
    c.lineTo(7, -24);
    c.closePath();
    c.fill();
    c.stroke();
  }
  if (character === 3) {
    ellipse(c, -3, -28, 3, 7, "#5aab50", INK);
    c.rotate(0.3);
    ellipse(c, 4, -28, 3, 6, "#b6e681", INK);
    c.rotate(-0.3);
  }
  if (player?.weapon && player.weapon !== "bomb") {
    rounded(
      c,
      9,
      -3,
      12,
      6,
      2,
      player.weapon === "water" ? "#6ee4ec" : "#afb9cc",
      INK,
    );
    label(c, ITEM_ICONS[player.weapon], 15, -1, 7, INK, "center");
  }
  if (
    player?.shield ||
    (player && player.invincible > 0 && player.invincible % 8 < 5)
  ) {
    c.lineWidth = 1.5;
    c.strokeStyle = player.shield ? "#6fdff8" : "#ffe69b";
    c.beginPath();
    c.ellipse(0, -9, 20, 27, 0, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
}
export function pickup(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: Item,
  tick: number,
) {
  c.save();
  c.translate(x, y + Math.sin(tick / 8) * 1.5);
  c.lineWidth = 1.2;
  ellipse(c, 0, 7, 9, 3, "#263b4b20");
  rounded(c, -10, -11, 20, 20, 5, "#fff8cf", "#b68b49");
  rounded(c, -7, -8, 14, 4, 2, "#ffffff");
  label(
    c,
    ITEM_ICONS[kind],
    0,
    0,
    13,
    kind === "life" ? "#f1758b" : "#4c86ad",
    "center",
  );
  c.restore();
}
export function crate(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: Theme,
) {
  c.lineWidth = 1.3;
  if (theme === "water") {
    rounded(c, x - 11, y - 13, 23, 23, 5, "#f8c95f", "#a37544");
    rounded(c, x - 8, y - 10, 17, 7, 2, "#ffe7a1");
    ellipse(c, x, y + 1, 5, 5, "#de9844");
  } else if (theme === "shop") {
    rounded(c, x - 11, y - 14, 23, 24, 3, "#ee8ba1", "#ab6576");
    rounded(c, x - 2, y - 14, 5, 24, 1, "#fce5a2");
    rounded(c, x - 11, y - 7, 23, 4, 1, "#fce5a2");
  } else {
    rounded(
      c,
      x - 12,
      y - 14,
      24,
      25,
      3,
      theme === "farm" ? "#ca9858" : "#9e8ca1",
      "#796349",
    );
    rounded(c, x - 9, y - 11, 18, 3, 1, "#ffffff45");
    c.strokeStyle = "#795b45";
    c.beginPath();
    c.moveTo(x - 8, y - 8);
    c.lineTo(x + 8, y + 7);
    c.moveTo(x + 8, y - 8);
    c.lineTo(x - 8, y + 7);
    c.stroke();
    for (const dx of [-9, 9]) {
      for (const dy of [-10, 8]) ellipse(c, x + dx, y + dy, 1, 1, "#685d4e");
    }
  }
}
export function palette(s: State) {
  return THEMES.find((t) => t.id === s.theme) ?? THEMES[0];
}
