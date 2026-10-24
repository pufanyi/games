// The stage: a warm city skyline over a huge excavation pit, with the Ding
// family home clinging to the near wall. Every shape is original Canvas art.
import { DEFENDERS } from "../game/catalog.ts";
import { HEIGHT, LEAF, SLOT_X, SLOT_YS, WIDTH } from "../game/config.ts";
import type { GameState } from "../game/types.ts";
import { drawDefender } from "./actors.ts";
import {
  type Ctx,
  ellipse,
  fillRound,
  groundShadow,
  hash,
  line,
  outlinedText,
  roundRect,
} from "./paint.ts";

const HOUSE = {
  left: 14,
  right: 198,
  roofY: 58,
  baseY: 340,
  windowWidth: 86,
  windowHeight: 48,
} as const;

export function drawBackground(ctx: Ctx, time: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, 150);
  sky.addColorStop(0, "#f7dca8");
  sky.addColorStop(0.55, "#f0b96d");
  sky.addColorStop(1, "#e39a4e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, 150);

  // Low sun behind the buildings.
  const glow = ctx.createRadialGradient(566, 54, 4, 566, 54, 90);
  glow.addColorStop(0, "rgba(255, 246, 194, 0.95)");
  glow.addColorStop(1, "rgba(255, 226, 150, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(440, 0, 240, 160);

  drawSkyline(ctx);
  drawSkylineDetails(ctx, time);
  drawPit(ctx);
}

function drawSkyline(ctx: Ctx): void {
  ctx.save();
  let x = -24;
  let index = 0;
  while (x < WIDTH + 30) {
    const width = 32 + Math.floor(hash(index, 1) * 46);
    const height = 34 + Math.floor(hash(index, 2) * 62);
    const bottom = 118;
    ctx.fillStyle = index % 3 === 0 ? "#b9c6c4" : "#c9d3cf";
    ctx.fillRect(x, bottom - height, width, height);
    ctx.fillStyle = "rgba(90, 108, 106, 0.35)";
    for (let wy = bottom - height + 8; wy < bottom - 8; wy += 10) {
      for (let wx = x + 6; wx < x + width - 6; wx += 9) {
        if (hash(wx, wy) > 0.25) ctx.fillRect(wx, wy, 4, 5);
      }
    }
    // Roof lip so the flat silhouettes read as buildings.
    ctx.fillStyle = "#a5b3b0";
    ctx.fillRect(x - 1, bottom - height - 2, width + 2, 3);
    x += width + 5;
    index++;
  }

  // Retaining wall and hazard band at the lip of the pit.
  ctx.fillStyle = "#6d6a62";
  ctx.fillRect(0, 118, WIDTH, 14);
  ctx.fillStyle = "#8a857a";
  ctx.fillRect(0, 118, WIDTH, 4);
  for (let sx = 0; sx < WIDTH; sx += 26) {
    ctx.fillStyle = hash(sx, 7) > 0.5 ? "#d9b447" : "#3b3730";
    ctx.beginPath();
    ctx.moveTo(sx, 124);
    ctx.lineTo(sx + 12, 124);
    ctx.lineTo(sx + 6, 131);
    ctx.lineTo(sx - 6, 131);
    ctx.closePath();
    ctx.fill();
  }

  // Two cranes on the skyline.
  crane(ctx, 550, 118, 1);
  crane(ctx, 300, 118, 0.72);
  ctx.restore();
}

function crane(ctx: Ctx, x: number, baseY: number, scale: number): void {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#8a6b4a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -86);
  ctx.lineTo(-34, -86);
  ctx.moveTo(0, -86);
  ctx.lineTo(46, -76);
  ctx.moveTo(0, -70);
  ctx.lineTo(-26, -38);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-34, -86);
  ctx.lineTo(-34, -70);
  ctx.stroke();
  ctx.fillStyle = "#6f5438";
  ctx.fillRect(-2, -92, 4, 6);
  ctx.restore();
}

function drawSkylineDetails(ctx: Ctx, time: number): void {
  // A thin drift of dust above the pit.
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 5; i++) {
    const x = ((time * (6 + i * 2) + i * 150) % (WIDTH + 120)) - 60;
    ellipse(ctx, x, 138 + i * 9, 34, 5, "#fff2cf");
  }
  ctx.restore();
}

function drawPit(ctx: Ctx): void {
  const dirt = ctx.createLinearGradient(0, 132, 0, HEIGHT);
  dirt.addColorStop(0, "#c9973a");
  dirt.addColorStop(0.45, "#d8a848");
  dirt.addColorStop(1, "#a9761f");
  ctx.fillStyle = dirt;
  ctx.fillRect(0, 132, WIDTH, HEIGHT - 132);

  // Broad dig terraces, lighter where the sun hits them.
  ctx.save();
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 6; i++) {
    const y = 160 + i * 56;
    ctx.strokeStyle = i % 2 === 0 ? "#f0c66c" : "#8f621a";
    ctx.lineWidth = 5 + i;
    ctx.beginPath();
    ctx.ellipse(
      390,
      y + 40,
      360 - i * 10,
      34,
      0,
      Math.PI * 1.02,
      Math.PI * 1.98,
    );
    ctx.stroke();
  }
  ctx.restore();

  // Stones and clods.
  for (let i = 0; i < 90; i++) {
    const x = hash(i, 11) * WIDTH;
    const y = 146 + hash(i, 12) * (HEIGHT - 150);
    const r = 1 + hash(i, 13) * 3.4;
    ctx.globalAlpha = 0.25 + hash(i, 14) * 0.25;
    ellipse(ctx, x, y, r, r * 0.6, hash(i, 15) > 0.5 ? "#8a5c16" : "#ecc776");
  }
  ctx.globalAlpha = 1;

  // Right-hand pit wall with a few planks and barrels.
  ctx.fillStyle = "#8d5f1b";
  ctx.fillRect(WIDTH - 30, 132, 30, HEIGHT - 132);
  ctx.fillStyle = "#a97b2e";
  for (let y = 150; y < HEIGHT; y += 46) {
    ctx.fillRect(WIDTH - 26, y, 20, 5);
  }

  drawPitProps(ctx);
}

/** Site clutter that sells the excavation without crowding the play lane. */
function drawPitProps(ctx: Ctx): void {
  // Barrels against the right wall.
  for (
    const [x, y, color] of [
      [606, 322, "#a5482f"],
      [628, 344, "#3f6f8a"],
      [588, 350, "#8a6a34"],
    ] as const
  ) {
    groundShadow(ctx, x, y + 10, 11, 0.18);
    fillRound(ctx, x - 8, y - 10, 16, 20, 3, color);
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(x - 8, y - 4, 16, 2.5);
    ctx.fillRect(x - 8, y + 4, 16, 2.5);
    ellipse(ctx, x, y - 10, 8, 2.6, "rgba(255, 235, 190, 0.3)");
  }

  // Planks leaning on the pit wall.
  ctx.save();
  ctx.translate(316, 318);
  ctx.rotate(-0.42);
  fillRound(ctx, 0, 0, 54, 7, 1.5, "#c99a55");
  fillRound(ctx, 4, 10, 50, 6, 1.5, "#b98a45");
  ctx.restore();

  // Traffic cones and a couple of rubble heaps.
  for (
    const [x, y] of [
      [356, 306],
      [466, 402],
      [276, 440],
    ] as const
  ) {
    groundShadow(ctx, x, y + 2, 8, 0.16);
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x + 8, y + 2);
    ctx.lineTo(x - 8, y + 2);
    ctx.closePath();
    ctx.fillStyle = "#e2703a";
    ctx.fill();
    ctx.fillStyle = "#f4e6c8";
    ctx.fillRect(x - 5, y - 5, 10, 3);
    fillRound(ctx, x - 9, y + 2, 18, 4, 1.5, "#b34e26");
  }
  for (
    const [x, y] of [
      [386, 362],
      [534, 300],
    ] as const
  ) {
    for (let i = 0; i < 3; i++) {
      ellipse(
        ctx,
        x + (i - 1) * 7,
        y + (i % 2) * 3,
        7 + hash(x + i, 61) * 3,
        4 + hash(y + i, 62) * 2,
        i % 2 === 0 ? "#8a5c16" : "#b9852c",
      );
    }
  }
}

export function drawPedestal(ctx: Ctx): void {
  ctx.save();
  // The cliff the house sits on.
  ctx.beginPath();
  ctx.moveTo(-12, HEIGHT);
  ctx.lineTo(-12, 336);
  ctx.lineTo(214, 336);
  ctx.lineTo(252, 372);
  ctx.lineTo(286, HEIGHT);
  ctx.closePath();
  const cliff = ctx.createLinearGradient(0, 336, 0, HEIGHT);
  cliff.addColorStop(0, "#b5822f");
  cliff.addColorStop(0.6, "#8f611c");
  cliff.addColorStop(1, "#6d4712");
  ctx.fillStyle = cliff;
  ctx.fill();
  ctx.strokeStyle = "#6d4712";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Strata and cracks on the cliff face.
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 7; i++) {
    const y = 360 + i * 22;
    ctx.strokeStyle = i % 2 === 0 ? "#d8a448" : "#5f3d0d";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(150 + i * 14, y - 4 + i);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 12; i++) {
    const x = 12 + hash(i, 31) * 210;
    const y = 360 + hash(i, 32) * 120;
    line(ctx, x, y, x + 8 - hash(i, 33) * 16, y + 10, "#5b3a0e", 1.2);
  }

  // Grass tuft along the rim.
  for (let x = -6; x < 218; x += 11) {
    const lean = hash(x, 41) * 6 - 3;
    line(ctx, x, 338, x + lean, 330 - hash(x, 42) * 6, "#6f8a3a", 2);
  }
  // Rubble at the foot of the cliff.
  for (let i = 0; i < 10; i++) {
    const x = 206 + hash(i, 51) * 80;
    const y = 372 + hash(i, 52) * 60;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(hash(i, 53) * Math.PI);
    fillRound(ctx, -5, -3, 10, 6, 2, "#a54331");
    ctx.restore();
  }
  ctx.restore();
}

export function drawHouse(ctx: Ctx, state: GameState): void {
  const shake = state.shake > 0
    ? Math.sin(state.tick * 2.7) * Math.min(3, state.shake * 0.4)
    : 0;
  ctx.save();
  ctx.translate(shake, 0);
  groundShadow(ctx, 104, 340, 104, 0.28);

  // Facade.
  ctx.beginPath();
  roundRect(
    ctx,
    HOUSE.left,
    HOUSE.roofY + 18,
    HOUSE.right - HOUSE.left,
    HOUSE.baseY - HOUSE.roofY - 18,
    5,
  );
  const wall = ctx.createLinearGradient(0, 76, 0, HOUSE.baseY);
  wall.addColorStop(0, "#b04b36");
  wall.addColorStop(1, "#8d3526");
  ctx.fillStyle = wall;
  ctx.fill();

  // Brick courses.
  ctx.save();
  ctx.beginPath();
  roundRect(
    ctx,
    HOUSE.left,
    HOUSE.roofY + 18,
    HOUSE.right - HOUSE.left,
    HOUSE.baseY - HOUSE.roofY - 18,
    5,
  );
  ctx.clip();
  for (let row = 0; row < 38; row++) {
    const y = 80 + row * 7;
    ctx.globalAlpha = 0.18;
    line(ctx, HOUSE.left, y, HOUSE.right, y, "#4d1a11", 1);
    for (let x = HOUSE.left + (row % 2) * 9; x < HOUSE.right; x += 18) {
      ctx.globalAlpha = 0.16;
      line(ctx, x, y, x, y + 6, "#4d1a11", 1);
    }
  }
  ctx.globalAlpha = 1;
  // Sunlit right edge.
  ctx.fillStyle = "rgba(255, 206, 122, 0.12)";
  ctx.fillRect(HOUSE.right - 22, 76, 22, HOUSE.baseY - 76);
  ctx.restore();

  // Roof slab and tiles.
  fillRound(
    ctx,
    HOUSE.left - 9,
    HOUSE.roofY,
    HOUSE.right - HOUSE.left + 18,
    15,
    4,
    "#6f2a1e",
  );
  ctx.fillStyle = "#8d3a28";
  for (let x = HOUSE.left - 7; x < HOUSE.right + 7; x += 13) {
    ctx.beginPath();
    ctx.arc(x + 6, HOUSE.roofY + 15, 6.5, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  // Chimney and its brick cap.
  fillRound(ctx, 156, 32, 18, 28, 2, "#7c3527");
  fillRound(ctx, 153, 29, 24, 6, 2, "#5f271c");
  if (state.hp < 70 || state.phase === "lost") drawChimneySmoke(ctx, state);

  // Awning over the top floor.
  const awningY = 74;
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#3f8f6a" : "#e8e0c4";
    ctx.beginPath();
    ctx.moveTo(28 + i * 13, awningY);
    ctx.lineTo(41 + i * 13, awningY);
    ctx.lineTo(38 + i * 13, awningY + 15);
    ctx.lineTo(31 + i * 13, awningY + 15);
    ctx.closePath();
    ctx.fill();
  }
  fillRound(ctx, 26, awningY - 4, 158, 5, 2, "#2f6d51");

  // Floors, sills, and windows.
  drawFloorSlab(ctx, 140);
  drawFloorSlab(ctx, 198);
  drawFloorSlab(ctx, 260);

  drawWindow(ctx, state, 0);
  drawWindow(ctx, state, 1);
  drawWindow(ctx, state, 2);
  drawDoor(ctx, state, 3);

  // Family name plaque and demolition notice.
  ctx.save();
  ctx.translate(148, 108);
  ctx.rotate(-0.05);
  fillRound(ctx, 0, 0, 38, 20, 2, "#f1e2bd");
  ctx.strokeStyle = "#6f2a1e";
  ctx.lineWidth = 2;
  roundRect(ctx, 0, 0, 38, 20, 2);
  ctx.stroke();
  ctx.fillStyle = "#8d3526";
  ctx.font = '700 11px "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DING", 19, 10);
  ctx.restore();

  ctx.save();
  ctx.translate(160, 272);
  ctx.rotate(0.08);
  fillRound(ctx, 0, 0, 26, 30, 2, "#efe6cf");
  ctx.fillStyle = "#8d3526";
  for (let i = 0; i < 4; i++) ctx.fillRect(4, 5 + i * 6, 18, 2);
  ctx.beginPath();
  ctx.arc(13, 24, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Pickets along the base.
  drawFence(ctx);
  ctx.restore();
}

function drawFloorSlab(ctx: Ctx, y: number): void {
  fillRound(ctx, 22, y, 168, 5, 2, "#d8c39a");
  ctx.fillStyle = "rgba(70, 30, 20, 0.35)";
  ctx.fillRect(22, y + 5, 168, 2);
  for (const x of [34, 178]) {
    ctx.fillStyle = "#b9a37c";
    ctx.fillRect(x, y - 2, 4, 9);
  }
}

function drawWindow(ctx: Ctx, state: GameState, slot: number): void {
  const cx = SLOT_X;
  const cy = SLOT_YS[slot];
  const w = HOUSE.windowWidth;
  const h = HOUSE.windowHeight;
  const left = cx - w / 2;
  const top = cy - h / 2;
  fillRound(ctx, left - 6, top - 5, w + 12, h + 10, 4, "#f0dcae");
  fillRound(ctx, left - 3, top - 2, w + 6, h + 4, 2, "#b9936a");
  const glow = ctx.createLinearGradient(0, top, 0, top + h);
  glow.addColorStop(0, "#5a3728");
  glow.addColorStop(1, "#382018");
  ctx.fillStyle = glow;
  ctx.fillRect(left, top, w, h);
  // Window crossbars.
  ctx.fillStyle = "#e8d5ab";
  ctx.fillRect(cx - 1.5, top, 3, h);
  ctx.fillRect(left, cy - 1.5, w, 3);
  ctx.fillStyle = "rgba(255, 205, 130, 0.14)";
  ctx.fillRect(left, top, w, h * 0.4);

  const defender = state.defenders.find((d) => d.slot === slot);
  if (defender) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(left - 1, top - 1, w + 2, h + 2);
    ctx.clip();
    ctx.translate(cx, top + h + 2);
    ctx.scale(0.8, 0.8);
    drawDefender(ctx, defender, DEFENDERS[defender.type], state.tick);
    ctx.restore();
  } else {
    // Empty window: a warm interior, two soft side curtains, and a pot plant.
    ctx.fillStyle = "rgba(255, 208, 138, 0.2)";
    ctx.fillRect(left, top + h * 0.45, w, h * 0.55);
    ctx.fillStyle = "rgba(240, 220, 174, 0.14)";
    for (let i = 0; i < 2; i++) {
      const sx = i === 0 ? left + 5 : left + w - 20;
      ctx.beginPath();
      ctx.moveTo(sx, top);
      ctx.quadraticCurveTo(sx + 4, top + h * 0.55, sx + 1, top + h);
      ctx.lineTo(sx + 13, top + h);
      ctx.quadraticCurveTo(sx + 11, top + h * 0.55, sx + 15, top);
      ctx.closePath();
      ctx.fill();
    }
    fillRound(ctx, cx - 7, top + h - 9, 14, 10, 2, "#a8532f");
    ctx.strokeStyle = "#5f8f3a";
    ctx.lineWidth = 1.4;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 3, top + h - 9);
      ctx.quadraticCurveTo(cx + i * 8, top + h - 16, cx + i * 9, top + h - 20);
      ctx.stroke();
    }
  }

  // Sill.
  fillRound(ctx, left - 9, top + h + 3, w + 18, 6, 2, "#d8c39a");
  ctx.fillStyle = "rgba(80, 40, 24, 0.3)";
  ctx.fillRect(left - 4, top + h, w + 8, 2);
}

function drawDoor(ctx: Ctx, state: GameState, slot: number): void {
  const cx = SLOT_X;
  const cy = SLOT_YS[slot] + 6;
  const w = 74;
  const h = 70;
  const left = cx - w / 2;
  const top = cy - h / 2;
  fillRound(ctx, left - 5, top - 5, w + 10, h + 8, 3, "#e8d5ab");
  fillRound(ctx, left, top, w, h, 2, "#5c3524");
  ctx.fillStyle = "#4a2a1c";
  for (let i = 1; i < 4; i++) {
    ctx.fillRect(left + 5 + i * 15, top + 4, 2, h - 8);
  }
  // Little glass pane.
  fillRound(ctx, left + 10, top + 8, w - 20, 22, 2, "#33201a");
  ctx.fillStyle = "rgba(255, 210, 140, 0.25)";
  ctx.fillRect(left + 12, top + 10, (w - 24) / 2 - 1, 18);
  // Handle.
  ellipse(ctx, left + w - 12, top + h * 0.55, 2.5, 2.5, "#e0b54a");
  // Demolition spray mark.
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = "#d94b3a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(left + w - 18, top + h - 18, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(left + w - 23, top + h - 23);
  ctx.lineTo(left + w - 13, top + h - 13);
  ctx.moveTo(left + w - 13, top + h - 23);
  ctx.lineTo(left + w - 23, top + h - 13);
  ctx.stroke();
  ctx.restore();

  const defender = state.defenders.find((d) => d.slot === slot);
  if (defender) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(left + 2, top + 2, w - 4, h - 4);
    ctx.clip();
    ctx.translate(cx, top + h + 2);
    ctx.scale(0.78, 0.78);
    drawDefender(ctx, defender, DEFENDERS[defender.type], state.tick);
    ctx.restore();
  }
  fillRound(ctx, left - 7, top + h, w + 14, 6, 2, "#c8b184");
}

function drawFence(ctx: Ctx): void {
  const y = 324;
  fillRound(ctx, 8, y - 4, 190, 4, 2, "#efe6cf");
  fillRound(ctx, 8, y + 12, 190, 4, 2, "#efe6cf");
  for (let x = 10; x <= 194; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, y + 16);
    ctx.lineTo(x, y - 4);
    ctx.lineTo(x + 3, y - 9);
    ctx.lineTo(x + 6, y - 4);
    ctx.lineTo(x + 6, y + 16);
    ctx.closePath();
    ctx.fillStyle = "#f4ecd7";
    ctx.fill();
    ctx.strokeStyle = "rgba(90, 60, 30, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Climbing vine trailing up the right side.
  ctx.strokeStyle = "#4e7a35";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(196, 324);
  ctx.bezierCurveTo(206, 296, 190, 274, 198, 248);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    ellipse(ctx, 197 + (i % 2 === 0 ? 4 : -4), 312 - i * 14, 4, 2.4, "#5f943f");
  }
}

function drawChimneySmoke(ctx: Ctx, state: GameState): void {
  const amount = state.phase === "lost" ? 7 : 4;
  for (let i = 0; i < amount; i++) {
    const drift = (state.tick * 0.35 + i * 23) % 90;
    ctx.globalAlpha = (1 - drift / 90) * (state.phase === "lost" ? 0.5 : 0.3);
    ellipse(
      ctx,
      165 + drift * 0.9 + Math.sin(drift * 0.1) * 6,
      30 - drift * 0.72,
      7 + drift * 0.16,
      6 + drift * 0.12,
      "#5b5049",
    );
  }
  ctx.globalAlpha = 1;
}

export function drawLeaf(ctx: Ctx, state: GameState, time: number): void {
  const { x, y } = LEAF;
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
  ctx.save();
  // Halo, brighter while the vine is one tap from healing.
  ctx.globalAlpha = 0.2 + pulse * 0.14;
  ellipse(ctx, x, y, 32, 25, "#d9f07a");
  ctx.globalAlpha = 1;

  // Stem and leaves.
  ctx.strokeStyle = "#4e7a35";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 18);
  ctx.quadraticCurveTo(x + 2, y + 5, x + 4, y - 12);
  ctx.stroke();
  leafShape(ctx, x - 9, y + 3, -0.55, "#6f9c3f", 1.1);
  leafShape(ctx, x + 7, y - 10, 0.4, "#8bbf4d", 1.1);
  leafShape(ctx, x + 17, y + 5, 0.95, "#6f9c3f", 1.05);

  // Big tappable leaf.
  leafShape(
    ctx,
    x,
    y - 2,
    -0.2,
    state.leafFlash > 0 ? "#d8ef8a" : "#9ccf56",
    1.7,
  );

  // Ten-tap progress ring.
  if (state.leafClicks > 0) {
    ctx.strokeStyle = "#e8f6b0";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      24,
      -Math.PI / 2,
      -Math.PI / 2 + (Math.PI * 2 * state.leafClicks) / LEAF.clicksForHeal,
    );
    ctx.stroke();
  }
  if (state.leafFlash > 0) {
    outlinedText(ctx, "+1", x + 18, y - 20, 13, "#d8f58a");
  }
  ctx.restore();
}

function leafShape(
  ctx: Ctx,
  x: number,
  y: number,
  angle: number,
  color: string,
  scale = 1,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-10, 3, -9, -8, 0, -11);
  ctx.bezierCurveTo(9, -8, 10, 3, 0, 6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#3f6329";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
