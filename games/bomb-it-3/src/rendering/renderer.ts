import {
  CHARACTERS,
  ITEM_ICONS,
  ITEM_LABELS,
  MODES,
} from "../content/catalog.ts";
import { BOX, COLS, PIT, ROWS, VECTORS, WALL } from "../game/types.ts";
import type { State } from "../game/types.ts";
import {
  crate,
  ellipse,
  INK,
  label,
  palette,
  pickup,
  robot,
  rounded,
} from "./paint.ts";
const TILE = 27, LEFT = 133, TOP = 43;
const at = (x: number, y: number) => ({
  x: LEFT + x * TILE + TILE / 2,
  y: TOP + y * TILE + TILE / 2,
});
export function render(c: CanvasRenderingContext2D, s: State) {
  const colors = palette(s);
  c.clearRect(0, 0, 600, 450);
  const bg = c.createLinearGradient(0, 0, 600, 450);
  bg.addColorStop(0, "#1d3c50");
  bg.addColorStop(1, "#142c40");
  c.fillStyle = bg;
  c.fillRect(0, 0, 600, 450);
  label(c, "BOMB IT", 12, 20, 18, "#fff1c9");
  label(c, "3", 105, 20, 22, "#f7c457");
  label(
    c,
    MODES.find((m) => m.id === s.settings.mode)?.title.toUpperCase() ?? "",
    140,
    20,
    12,
    "#d3e9ed",
  );
  const seconds = Math.max(0, Math.ceil(s.time / 30));
  label(
    c,
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
    365,
    20,
    17,
    seconds < 30 ? "#ff9a8d" : "#fff1c9",
    "center",
  );
  label(c, `LEVEL ${s.level} / ${s.settings.levels}`, 12, 53, 11, "#a4c3cd");
  for (const p of s.players) {
    const y = 72 + p.id * 78, color = CHARACTERS[p.character];
    rounded(c, 9, y, 113, 71, 10, p.alive ? "#ffffff0e" : "#ffffff05");
    rounded(c, 9, y, 4, 71, 2, color.color);
    robot(c, 33, y + 35, p.character, 28, s.tick, p);
    label(
      c,
      p.human ? `PLAYER ${p.id + 1}` : color.name.toUpperCase(),
      54,
      y + 14,
      9,
      color.color,
    );
    label(
      c,
      s.settings.mode === "race"
        ? `${p.checkpoints} / 13 flags`
        : s.settings.mode === "arcade"
        ? `${p.score} pts`
        : `${p.kills} / 10`,
      54,
      y + 29,
      11,
      "#fff3da",
    );
    label(
      c,
      p.human ? `♥ ${p.lives}` : p.alive ? "CPU" : "OUT",
      54,
      y + 44,
      10,
      "#b2cbd3",
    );
    label(
      c,
      p.alive
        ? `${ITEM_ICONS[p.weapon]} ${
          p.ammo < 0 ? "∞" : p.ammo
        }   B${p.capacity}  +${p.power}`
        : "Waiting…",
      20,
      y + 60,
      10,
      "#b2cbd3",
    );
  }
  label(c, colors.title, 14, 400, 10, "#fff1c9");
  label(c, s.settings.difficulty.toUpperCase(), 14, 416, 9, "#89aebb");
  label(c, "P / ESC  PAUSE", 14, 437, 8, "#89aebb");
  c.save();
  c.beginPath();
  c.rect(LEFT, TOP, TILE * COLS, TILE * ROWS);
  c.clip();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const pos = at(x, y), t = s.tiles[y * COLS + x];
      c.fillStyle = (x + y) % 2 ? colors.floor : colors.light;
      c.fillRect(pos.x - TILE / 2, pos.y - TILE / 2, TILE, TILE);
      c.strokeStyle = "#ffffff15";
      c.lineWidth = 0.5;
      c.strokeRect(pos.x - TILE / 2, pos.y - TILE / 2, TILE, TILE);
      if (t === PIT) {
        rounded(c, pos.x - 13, pos.y - 13, 26, 26, 3, "#16374d");
        rounded(c, pos.x - 11, pos.y - 9, 22, 17, 3, "#102536");
        if (s.theme === "water") {
          c.strokeStyle = "#68c6de";
          c.beginPath();
          c.moveTo(pos.x - 8, pos.y + Math.sin(s.tick / 10 + x));
          c.quadraticCurveTo(pos.x, pos.y + 5, pos.x + 8, pos.y);
          c.stroke();
        }
      }
    }
  }
  for (const f of s.features) {
    const pos = at(f.x, f.y);
    if (f.kind === "Rail") {
      c.strokeStyle = "#4d5c56";
      c.lineWidth = 2;
      c.strokeRect(pos.x - 8, pos.y - 12, 16, 24);
      for (let i = -9; i <= 9; i += 6) {
        c.beginPath();
        c.moveTo(pos.x - 10, pos.y + i);
        c.lineTo(pos.x + 10, pos.y + i);
        c.stroke();
      }
    }
    if (f.kind === "SlideSwitch") {
      ellipse(c, pos.x, pos.y, 11, 9, "#f3cc69", INK);
      label(c, "↔", pos.x, pos.y, 16, INK, "center");
    }
    if (f.kind === "PropBornPosition") {
      ellipse(c, pos.x, pos.y, 10, 6, "#ffffff55");
      label(c, "+", pos.x, pos.y, 15, "#ffffff99", "center");
    }
    if (f.kind === "JumpTable" || f.kind === "WaterSlide") {
      const v = VECTORS[f.direction];
      c.save();
      c.translate(pos.x, pos.y);
      c.rotate(Math.atan2(v.y, v.x));
      rounded(
        c,
        -12,
        -10,
        24,
        20,
        4,
        f.kind === "JumpTable" ? "#e2ad72" : "#56b7d2",
        "#ffffff88",
      );
      label(c, "»", 0, 0, 20, "#fff4cc", "center");
      c.restore();
    }
  }
  if (s.settings.mode === "race") {
    for (const p of s.players) {
      const route = s.routes[p.character],
        target = route[p.checkpoints % route.length];
      if (!target) continue;
      const pos = at(target.x, target.y);
      c.strokeStyle = "#fff5d5";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(pos.x - 6, pos.y + 9);
      c.lineTo(pos.x - 6, pos.y - 14);
      c.stroke();
      rounded(
        c,
        pos.x - 6,
        pos.y - 14,
        17,
        11,
        2,
        CHARACTERS[p.character].color,
        INK,
      );
      label(c, String(p.id + 1), pos.x + 2, pos.y - 8, 9, INK, "center");
      ellipse(c, pos.x, pos.y + 8, 11, 4, `${CHARACTERS[p.character].color}66`);
    }
  }
  for (const item of s.pickups) {
    if (item.delay === 0) {
      const p = at(item.x, item.y);
      pickup(c, p.x, p.y, item.kind, s.tick);
    }
  }
  for (const f of s.fire) {
    const p = at(f.x, f.y);
    c.globalAlpha = Math.min(1, f.ttl / 5);
    rounded(
      c,
      p.x - 12,
      p.y - 12,
      24,
      24,
      8,
      f.kind === "water"
        ? "#b5f9ffbb"
        : f.kind === "laser"
        ? "#f8a9ff"
        : "#ff8f39",
    );
    rounded(
      c,
      p.x - 7,
      p.y - 7,
      14,
      14,
      5,
      f.kind === "water" ? "#efffff" : "#fff6b8",
    );
    c.globalAlpha = 1;
  }
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = s.tiles[y * COLS + x], pos = at(x, y);
      if (t === WALL) {
        c.lineWidth = 1;
        rounded(c, pos.x - 13, pos.y - 17, 26, 30, 4, colors.wall, "#263b4b55");
        rounded(c, pos.x - 11, pos.y - 16, 22, 9, 3, "#ffffff33");
        if (s.theme === "farm") {
          ellipse(c, pos.x - 5, pos.y - 9, 7, 6, "#93b563");
          ellipse(c, pos.x + 5, pos.y - 10, 7, 7, "#afd17e");
        }
        if (s.theme === "city" && x % 2 === 0) {
          rounded(c, pos.x - 7, pos.y - 8, 5, 7, 1, "#ffe6a9");
        }
      } else if (t === BOX) crate(c, pos.x, pos.y, s.theme);
    }
    for (const b of s.bombs.filter((b) => b.y === y)) {
      const p = at(b.x, b.y),
        pulse = 1 + Math.sin(s.tick * (b.fuse < 20 ? 1 : 0.3)) * 0.08;
      ellipse(c, p.x, p.y + 7, 11, 4, "#263b4b35");
      c.lineWidth = 1.5;
      ellipse(
        c,
        p.x,
        p.y,
        10 * pulse,
        10 * pulse,
        b.fuse < 15 ? "#d9534b" : "#344659",
        "#1f2f40",
      );
      ellipse(c, p.x - 3, p.y - 4, 3, 2, "#ffffff80");
      label(c, "✦", p.x + 5, p.y - 13, 13, "#ffeb8a", "center");
    }
    for (const f of s.features.filter((f) => Math.round(f.y) === y)) {
      const p = at(f.x, f.y);
      if (f.kind === "SheepRobot") {
        ellipse(c, p.x, p.y, 11, 9, "#fff4d9", INK);
        ellipse(c, p.x + 7, p.y - 4, 6, 5, "#75675b", INK);
        ellipse(c, p.x + 9, p.y - 5, 1, 1, "white");
      }
      if (f.kind === "Tram") {
        rounded(c, p.x - 13, p.y - 16, 26, 27, 5, "#d47755", INK);
        rounded(c, p.x - 9, p.y - 11, 18, 10, 3, "#ade1e8", INK);
      }
    }
    for (const p of s.players.filter((p) => p.alive && Math.round(p.y) === y)) {
      const pos = at(p.x, p.y);
      robot(c, pos.x, pos.y + 5, p.character, 25, s.tick, p);
      if (p.human) {
        label(c, `P${p.id + 1}`, pos.x, pos.y - 25, 8, "#fffbea", "center");
      }
    }
  }
  for (const shot of s.projectiles) {
    const p = at(shot.x, shot.y);
    ellipse(
      c,
      p.x,
      p.y,
      6,
      6,
      shot.kind === "bowling" ? "#8d69ad" : "#ffa557",
      INK,
    );
  }
  c.restore();
  c.strokeStyle = "#ffffff44";
  c.lineWidth = 1;
  c.strokeRect(LEFT, TOP, TILE * COLS, TILE * ROWS);
}
export function accessibleStatus(s: State) {
  return `Level ${s.level}. ${Math.ceil(s.time / 30)} seconds remaining. ${
    s.players.filter((p) => p.human).map((p) =>
      `Player ${p.id + 1}: ${p.score} points, ${p.lives} lives, ${
        ITEM_LABELS[p.weapon]
      }`
    ).join(". ")
  }`;
}
