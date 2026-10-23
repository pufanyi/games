import { BASE_WEAPON } from "../content/catalog.ts";
import { move } from "./movement.ts";
import { finishRound } from "./state.ts";
import {
  BOX,
  cell,
  DIRECTIONS,
  index,
  PIT,
  sameCell,
  tile,
  VECTORS,
  WALL,
} from "./types.ts";
import type { Bomb, Direction, Item, Player, Point, State } from "./types.ts";
export function hit(s: State, p: Player, owner: number, fall = false) {
  if (!p.alive || p.invincible > 0) return;
  if (!fall && (p.shield || p.ride)) {
    if (p.shield) p.shield = false;
    else p.ride = null;
    p.invincible = 45;
    s.events.push({ kind: "hit", ...p, owner });
    return;
  }
  const source = s.players[owner];
  if (source && source !== p) {
    source.kills++;
    source.score += 100;
  } else if (source === p && s.settings.mode === "battle") {
    p.kills = Math.max(0, p.kills - 1);
  }
  s.events.push({ kind: "hit", x: p.x, y: p.y, owner });
  if (s.settings.mode === "race") {
    p.stun = 30;
    p.invincible = 60;
    return;
  }
  p.alive = false;
  p.respawn = s.settings.mode === "arcade" ? 0 : 45;
  if (
    (s.settings.mode === "battle" || s.settings.mode === "water") && source &&
    source.kills >= 10
  ) finishRound(s, source.human);
}
export function destroyBox(s: State, x: number, y: number, owner: number) {
  const i = index(x, y);
  if (s.tiles[i] !== BOX) return;
  s.tiles[i] = 0;
  const item = s.hidden[i];
  if (item) s.pickups.push({ x, y, kind: item, delay: 18 });
  s.hidden[i] = null;
  const p = s.players[owner];
  if (p && s.settings.mode === "arcade") p.score += 10;
}
export function blastCells(s: State, at: Point, power: number): Point[] {
  const points = [cell(at)];
  for (const d of DIRECTIONS) {
    const v = VECTORS[d];
    for (let n = 1; n <= power; n++) {
      const x = Math.round(at.x) + n * v.x, y = Math.round(at.y) + n * v.y;
      if (tile(s, x, y) === WALL) break;
      points.push({ x, y });
      if (tile(s, x, y) === BOX) break;
    }
  }
  return points;
}
export function explode(s: State, b: Bomb) {
  if (!s.bombs.includes(b)) return;
  s.bombs.splice(s.bombs.indexOf(b), 1);
  const cells = blastCells(s, b, b.power);
  s.events.push({ kind: "blast", x: b.x, y: b.y, owner: b.owner });
  for (const c of cells) {
    s.pickups = s.pickups.filter((p) => p.delay > 0 || !sameCell(c, p));
    destroyBox(s, c.x, c.y, b.owner);
    s.fire.push({ ...c, owner: b.owner, ttl: 17, kind: "fire" });
    for (const chained of [...s.bombs]) {
      if (sameCell(chained, c)) explode(s, chained);
    }
  }
}
export function collect(s: State, p: Player, kind: Item) {
  if (s.settings.mode === "arcade") p.score += 100;
  switch (kind) {
    case "power":
      p.power = Math.min(5, p.power + 1);
      break;
    case "capacity":
      p.capacity = Math.min(8, p.capacity + 1);
      break;
    case "speed":
      p.speed = Math.min(2.1, p.speed + 0.3);
      break;
    case "kick":
      p.kick = true;
      break;
    case "shield":
      p.shield = true;
      break;
    case "invincible":
      p.invincible = 350;
      break;
    case "life":
      if (p.human) p.lives++;
      break;
    case "horse":
    case "bike":
    case "car":
    case "hovercraft":
      p.ride = kind;
      break;
    default:
      p.weapon = kind;
      p.ammo = kind === "water" ? 175 : 2;
      break;
  }
  s.events.push({ kind: "pickup", ...cell(p), owner: p.id });
}
export function plantBomb(s: State, p: Player): boolean {
  if (
    s.bombs.filter((b) => b.owner === p.id).length >= p.capacity ||
    s.bombs.some((b) => sameCell(b, p))
  ) return false;
  const pos = cell(p);
  if (tile(s, pos.x, pos.y) !== 0) return false;
  s.bombs.push({
    ...pos,
    id: s.nextId++,
    owner: p.id,
    fuse: 62,
    power: p.power,
    pass: s.players.filter((other) => other.alive && sameCell(other, p)).map((
      other,
    ) => other.id),
    direction: null,
    slide: 0,
  });
  s.events.push({ kind: "bomb", ...pos, owner: p.id });
  return true;
}
function ray(
  s: State,
  p: Player,
  range: number,
  kind: "fire" | "laser" | "water",
) {
  const v = VECTORS[p.direction], pos = cell(p);
  for (let n = 1; n <= range; n++) {
    const x = pos.x + n * v.x, y = pos.y + n * v.y, t = tile(s, x, y);
    if (t === WALL) break;
    s.fire.push({ x, y, owner: p.id, ttl: kind === "water" ? 2 : 8, kind });
    if (t === BOX) {
      if (kind !== "water") destroyBox(s, x, y, p.id);
      break;
    }
    for (const other of s.players) {
      if (other !== p && other.alive && sameCell(other, { x, y })) {
        if (kind === "water") {
          move(s, other, p.direction, 8 / 30, true);
          if (tile(s, Math.round(other.x), Math.round(other.y)) === PIT) {
            hit(s, other, p.id, true);
          }
        } else hit(s, other, p.id);
      }
    }
    if (kind !== "water") {
      for (const b of [...s.bombs]) if (b.x === x && b.y === y) explode(s, b);
    }
  }
}
export function attack(s: State, p: Player) {
  if (!p.alive || p.cooldown > 0 || p.stun > 0) return;
  const weapon = p.weapon;
  if (weapon === "bomb") {
    if (plantBomb(s, p)) p.cooldown = 8;
    return;
  }
  p.cooldown = weapon === "water" ? 1 : weapon === "hammer" ? 18 : 24;
  if (weapon === "water") ray(s, p, 5, "water");
  else if (weapon === "laser" || weapon === "flame" || weapon === "hammer") {
    ray(
      s,
      p,
      weapon === "laser" ? 17 : weapon === "flame" ? 3 : 1,
      weapon === "laser" ? "laser" : "fire",
    );
  } else {s.projectiles.push({
      x: p.x,
      y: p.y,
      owner: p.id,
      direction: p.direction,
      kind: weapon,
      ttl: 75,
      distance: 0,
    });}
  if (weapon !== "water" || s.tick % 6 === 0) {
    s.events.push({ kind: "shot", ...cell(p), owner: p.id });
  }
  if (p.ammo > 0 && --p.ammo === 0) {
    p.weapon = BASE_WEAPON[s.settings.mode];
    p.ammo = -1;
  }
}
export function updateProjectiles(s: State) {
  for (const shot of [...s.projectiles]) {
    const v = VECTORS[shot.direction];
    shot.ttl--;
    shot.distance += 0.3;
    const x = shot.x + v.x * 0.3, y = shot.y + v.y * 0.3;
    const t = tile(s, Math.round(x), Math.round(y));
    const target = s.players.find((p) =>
      p.alive && p.id !== shot.owner && Math.hypot(p.x - x, p.y - y) < 0.5
    );
    const grenade = shot.kind === "grenade";
    const stop = shot.ttl <= 0 ||
      (grenade
        ? shot.distance >= 4 || t === WALL
        : t === WALL || t === BOX || !!target);
    if (t !== WALL && (t !== BOX || grenade)) {
      shot.x = x;
      shot.y = y;
    }
    if (stop) {
      if (shot.kind === "bowling") {
        if (target) hit(s, target, shot.owner);
        if (t === BOX) destroyBox(s, Math.round(x), Math.round(y), shot.owner);
      } else {
        const b: Bomb = {
          ...cell(shot),
          id: s.nextId++,
          owner: shot.owner,
          fuse: 0,
          power: grenade ? 2 : 1,
          pass: [],
          direction: null,
          slide: 0,
        };
        s.bombs.push(b);
        explode(s, b);
      }
      s.projectiles.splice(s.projectiles.indexOf(shot), 1);
    }
  }
}
export const opposite: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
