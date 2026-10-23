import { RACE_SPEED, RIDE_SPEED } from "../content/catalog.ts";
import { BOX, cell, PIT, sameCell, tile, VECTORS, WALL } from "./types.ts";
import type { Direction, Player, State } from "./types.ts";
export function canStand(
  s: State,
  p: Player,
  x: number,
  y: number,
  pushed = false,
): boolean {
  const radius = 0.25;
  for (const dx of [-radius, radius]) {
    for (const dy of [-radius, radius]) {
      const cx = Math.floor(x + dx + 0.5), cy = Math.floor(y + dy + 0.5);
      const t = tile(s, cx, cy);
      if (
        t === WALL || t === BOX ||
        (t === PIT && !pushed && p.ride !== "hovercraft")
      ) return false;
      if (
        s.bombs.some((b) => b.x === cx && b.y === cy && !b.pass.includes(p.id))
      ) return false;
    }
  }
  return true;
}
export function move(
  s: State,
  p: Player,
  direction: Direction,
  amount?: number,
  pushed = false,
) {
  const v = VECTORS[direction];
  if (!pushed) p.direction = direction;
  let speed = p.ride
    ? (s.settings.mode === "race" ? RACE_SPEED[p.ride] : RIDE_SPEED[p.ride])
    : p.speed;
  if (!p.human && s.settings.mode === "race") {
    speed *= { easy: 1, normal: 1.05, hard: 1.06 }[s.settings.difficulty];
  }
  const distance = amount ?? speed / 12;
  const perpendicular = v.x ? p.y : p.x;
  const center = Math.round(perpendicular);
  let x = p.x, y = p.y;
  if (!pushed && Math.abs(perpendicular - center) >= 0.24) {
    const shift = Math.sign(center - perpendicular) *
      Math.min(distance, Math.abs(center - perpendicular));
    const nx = x + (v.y ? shift : 0), ny = y + (v.x ? shift : 0);
    if (canStand(s, p, nx, ny)) {
      p.x = nx;
      p.y = ny;
      p.moving = true;
    } else p.moving = false;
    return;
  }
  // A small turn window keeps the original grid readable without requiring pixel-perfect keys.
  if (!pushed && Math.abs(perpendicular - center) < 0.24) {
    if (v.x) y = center;
    else x = center;
  }
  const steps = Math.ceil(distance / 0.1);
  for (let i = 0; i < steps; i++) {
    const nx = x + v.x * distance / steps, ny = y + v.y * distance / steps;
    if (!canStand(s, p, nx, ny, pushed)) {
      if (p.kick && !pushed) {
        const ahead = {
          x: Math.round(nx + v.x * 0.3),
          y: Math.round(ny + v.y * 0.3),
        };
        const bomb = s.bombs.find((b) => sameCell(b, ahead) && !sameCell(b, p));
        if (bomb) bomb.direction = direction;
      }
      break;
    }
    x = nx;
    y = ny;
  }
  p.moving = Math.abs((x - p.x) * v.x + (y - p.y) * v.y) > 0.001;
  p.x = x;
  p.y = y;
}
export function updateBombMotion(s: State) {
  for (const b of s.bombs) {
    b.pass = b.pass.filter((id) => {
      const p = s.players[id];
      return p.alive && Math.abs(p.x - b.x) < 0.78 &&
        Math.abs(p.y - b.y) < 0.78;
    });
    if (!b.direction || ++b.slide < 3) continue;
    b.slide = 0;
    const v = VECTORS[b.direction], x = b.x + v.x, y = b.y + v.y;
    if (
      tile(s, x, y) !== 0 || s.bombs.some((other) =>
        other !== b && other.x === x && other.y === y
      ) || s.players.some((p) => p.alive && sameCell(p, { x, y }))
    ) b.direction = null;
    else {
      b.x = x;
      b.y = y;
      b.pass = [];
    }
  }
}
export function safeSpawn(s: State, p: Player) {
  const candidates = [
    p.spawn,
    ...s.tiles.flatMap((t, i) =>
      t === 0 ? [{ x: i % 17, y: Math.floor(i / 17) }] : []
    ),
  ];
  const spot = candidates.find((c) =>
    canStand(s, p, c.x, c.y) && !s.fire.some((f) => sameCell(f, c)) &&
    !s.players.some((other) => other !== p && other.alive && sameCell(other, c))
  );
  if (!spot) return false;
  Object.assign(p, cell(spot));
  return true;
}
