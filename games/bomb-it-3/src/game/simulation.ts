import { aiInput } from "./ai.ts";
import {
  attack,
  collect,
  explode,
  hit,
  opposite,
  updateProjectiles,
} from "./combat.ts";
import { BASE_WEAPON, itemPool } from "../content/catalog.ts";
import { canStand, move, safeSpawn, updateBombMotion } from "./movement.ts";
import { emptyCell, finishRound } from "./state.ts";
import {
  cell,
  DIRECTIONS,
  PIT,
  random,
  sameCell,
  tile,
  VECTORS,
} from "./types.ts";
import type { Input, Player, State } from "./types.ts";
function features(s: State, p: Player) {
  if (p.featureCooldown > 0) return;
  for (const f of s.features) {
    if (!sameCell(p, f)) continue;
    if (f.kind === "JumpTable") {
      const v = VECTORS[f.direction];
      for (let n = 3; n >= 1; n--) {
        if (canStand(s, p, f.x + n * v.x, f.y + n * v.y)) {
          p.x = f.x + n * v.x;
          p.y = f.y + n * v.y;
          break;
        }
      }
      p.featureCooldown = 20;
    } else if (f.kind === "WaterSlide") {
      const v = VECTORS[f.direction];
      const offset = v.x ? f.y - p.y : f.x - p.x;
      if (Math.abs(offset) > 0.01) {
        const shift = Math.sign(offset) * Math.min(0.17, Math.abs(offset));
        const x = p.x + (v.y ? shift : 0), y = p.y + (v.x ? shift : 0);
        if (canStand(s, p, x, y)) {
          p.x = x;
          p.y = y;
        }
      } else move(s, p, f.direction, 0.17, true);
    } else if (f.kind === "SlideSwitch") {
      for (const slide of s.features) {
        if (slide.kind === "WaterSlide") {
          slide.direction = opposite[slide.direction];
        }
      }
      p.featureCooldown = 30;
    } else if (f.kind === "SheepRobot") {
      move(s, p, opposite[p.direction], 0.25);
      p.featureCooldown = 10;
    } else if (f.kind === "Tram") hit(s, p, -1);
  }
}
function updateFeatures(s: State) {
  const rails = s.features.filter((f) => f.kind === "Rail");
  for (const f of s.features) {
    if (f.kind === "Tram" && s.tick % 15 === 0 && rails.length) {
      f.phase = (f.phase + 1) % rails.length;
      f.x = rails[f.phase].x;
      f.y = rails[f.phase].y;
    }
    if (f.kind === "SheepRobot" && s.tick % 15 === 0) {
      const d = DIRECTIONS[Math.floor(random(s) * 4)], v = VECTORS[d];
      if (
        tile(s, f.x + v.x, f.y + v.y) === 0 &&
        Math.abs(f.x + v.x - f.origin.x) + Math.abs(f.y + v.y - f.origin.y) < 4
      ) {
        f.x += v.x;
        f.y += v.y;
      }
    }
  }
}
export function step(s: State, inputs: Input[]) {
  if (s.status !== "playing") return;
  s.events = [];
  s.tick++;
  s.time--;
  s.fire = s.fire.filter((f) => --f.ttl > 0);
  for (const item of s.pickups) if (item.delay > 0) item.delay--;
  updateBombMotion(s);
  updateFeatures(s);
  for (const b of [...s.bombs]) if (--b.fuse <= 0) explode(s, b);
  for (const p of s.players) {
    if (p.invincible > 0) p.invincible--;
    if (p.cooldown > 0) p.cooldown--;
    if (p.featureCooldown > 0) p.featureCooldown--;
    if (p.stun > 0) {
      p.stun--;
      continue;
    }
    if (!p.alive) {
      if (p.respawn > 0 && --p.respawn === 0) {
        if (safeSpawn(s, p)) {
          p.alive = true;
          p.invincible = 60;
          p.weapon = BASE_WEAPON[s.settings.mode];
          p.ammo = -1;
        } else p.respawn = 1;
      }
      continue;
    }
    const input = p.human ? inputs[p.id] : aiInput(s, p);
    p.lastX = p.x;
    p.lastY = p.y;
    p.moving = false;
    const onSlide = s.features.some((f) =>
      f.kind === "WaterSlide" && sameCell(f, p)
    );
    if (input?.direction && !onSlide) move(s, p, input.direction);
    p.stuck = input?.direction && !p.moving ? p.stuck + 1 : 0;
    if (input?.action) attack(s, p);
    features(s, p);
    if (
      tile(s, Math.round(p.x), Math.round(p.y)) === PIT &&
      p.ride !== "hovercraft"
    ) hit(s, p, p.id, true);
    for (const pickup of [...s.pickups]) {
      if (!pickup.delay && sameCell(pickup, p)) {
        collect(s, p, pickup.kind);
        s.pickups.splice(s.pickups.indexOf(pickup), 1);
      }
    }
    if (s.settings.mode === "race") {
      const route = s.routes[p.character],
        target = route[p.checkpoints % route.length];
      if (target && sameCell(p, target)) {
        p.checkpoints++;
        p.score += 1000;
        s.events.push({ kind: "checkpoint", ...cell(p), owner: p.id });
        if (p.checkpoints >= 13) finishRound(s, p.human);
      }
    }
  }
  updateProjectiles(s);
  for (const p of s.players) {
    for (const f of s.fire) {
      if (f.kind !== "water" && sameCell(f, p)) {
        // A directional weapon cannot hit its wielder; bomb fire intentionally can.
        if (f.kind === "laser" && f.owner === p.id) continue;
        hit(s, p, f.owner);
      }
    }
  }
  if (s.settings.mode === "arcade") {
    if (!s.players.some((p) => p.human && p.alive)) finishRound(s, false);
    else if (!s.players.some((p) => !p.human && p.alive)) finishRound(s, true);
  }
  const spawnEvery = s.settings.mode === "water"
    ? 400
    : s.settings.mode === "race"
    ? 90
    : 200;
  if (s.tick % spawnEvery === 0 && s.pickups.length < 12) {
    const pads = s.features.filter((f) =>
      f.kind === "PropBornPosition" && tile(s, f.x, f.y) === 0 &&
      !s.pickups.some((i) => sameCell(i, f))
    );
    const pos = pads.length
      ? pads[Math.floor(random(s) * pads.length)]
      : emptyCell(s);
    const pool = itemPool(s.settings.mode, s.theme);
    if (pos) {
      s.pickups.push({
        x: pos.x,
        y: pos.y,
        kind: pool[Math.floor(random(s) * pool.length)],
        delay: 0,
      });
    }
  }
  if (s.time <= 0 && s.status === "playing") {
    const score = (p: Player) =>
      s.settings.mode === "race"
        ? p.checkpoints
        : s.settings.mode === "arcade"
        ? Number(p.alive)
        : p.kills;
    const human = Math.max(...s.players.filter((p) => p.human).map(score));
    const ai = Math.max(0, ...s.players.filter((p) => !p.human).map(score));
    finishRound(s, human >= ai);
  }
}
