import { assert, assertEquals, assertFalse } from "@std/assert";
import layouts from "../content/layouts.json" with { type: "json" };
import { aiInput, dangerMap, reachable } from "./ai.ts";
import { attack, collect, explode, hit, plantBomb } from "./combat.ts";
import { canStand, move, updateBombMotion } from "./movement.ts";
import {
  createGame,
  DEFAULT_SETTINGS,
  finishRound,
  nextRound,
} from "./state.ts";
import { step } from "./simulation.ts";
import { BOX, COLS, index, PIT, WALL } from "./types.ts";
import type { Input, Mode, State } from "./types.ts";
const idle: Input = { direction: null, action: false };
function arena(mode: Mode = "arcade"): State {
  const s = createGame(
    { ...DEFAULT_SETTINGS, mode, players: 2, enemies: 0 },
    42,
  );
  s.tiles = Array.from({ length: 255 }, (_, i) => {
    const x = i % COLS, y = Math.floor(i / COLS);
    return x === 0 || x === 16 || y === 0 || y === 14 ? WALL : 0;
  });
  s.hidden.fill(null);
  s.features = [];
  s.pickups = [];
  for (const p of s.players) {
    p.invincible = 0;
    p.human = true;
    p.ride = null;
  }
  return s;
}
Deno.test("bombs allow departure, block re-entry, and respect capacity", () => {
  const s = arena(), p = s.players[0];
  assert(plantBomb(s, p));
  assertFalse(plantBomb(s, p));
  for (let i = 0; i < 12; i++) {
    move(s, p, "right");
    updateBombMotion(s);
  }
  assert(p.x > 2);
  assertFalse(canStand(s, p, 1, 1));
  assertFalse(plantBomb(s, p));
  collect(s, p, "capacity");
  assert(plantBomb(s, p));
});
Deno.test("blast stops at the first box and solid walls; exposed items survive until the fire ends", () => {
  const s = arena(), p = s.players[0];
  p.x = 5;
  p.y = 5;
  p.power = 5;
  s.tiles[index(7, 5)] = BOX;
  s.hidden[index(7, 5)] = "power";
  s.tiles[index(5, 4)] = WALL;
  plantBomb(s, p);
  explode(s, s.bombs[0]);
  assertEquals(s.tiles[index(7, 5)], 0);
  assertEquals(s.pickups[0].kind, "power");
  assert(s.pickups[0].delay > 0);
  assertFalse(s.fire.some((f) => f.x === 8 && f.y === 5));
  assertFalse(s.fire.some((f) => f.x === 5 && f.y === 4));
});
Deno.test("chain reaction consumes every linked bomb once", () => {
  const s = arena(), p = s.players[0];
  p.power = 3;
  p.capacity = 4;
  p.x = 3;
  p.y = 5;
  plantBomb(s, p);
  p.x = 5;
  plantBomb(s, p);
  p.x = 7;
  plantBomb(s, p);
  explode(s, s.bombs[0]);
  assertEquals(s.bombs.length, 0);
  assertEquals(s.events.filter((e) => e.kind === "blast").length, 3);
});
Deno.test("danger prediction includes chain reactions before the remote bomb's own fuse", () => {
  const s = arena(), p = s.players[0];
  p.power = 3;
  p.capacity = 2;
  p.x = 3;
  p.y = 5;
  plantBomb(s, p);
  s.bombs[0].fuse = 3;
  p.x = 6;
  plantBomb(s, p);
  assertEquals(dangerMap(s).get(index(8, 5))?.[0].start, 3);
});
Deno.test("shields and vehicles absorb a hit, invincibility suppresses repeat damage", () => {
  const s = arena(), p = s.players[0];
  collect(s, p, "shield");
  collect(s, p, "car");
  hit(s, p, 1);
  assert(p.alive);
  assertFalse(p.shield);
  assertEquals(p.ride, "car");
  hit(s, p, 1);
  assertEquals(p.ride, "car");
  p.invincible = 0;
  hit(s, p, 1);
  assertEquals(p.ride, null);
  p.invincible = 0;
  hit(s, p, 1);
  assertFalse(p.alive);
  assertEquals(s.players[1].kills, 1);
});
Deno.test("water pushes instead of dealing direct damage and credits a fall", () => {
  const s = arena("water"), [a, b] = s.players;
  a.x = 2;
  a.y = 5;
  a.direction = "right";
  b.x = 3;
  b.y = 5;
  s.tiles[index(5, 5)] = PIT;
  attack(s, a);
  assert(b.alive);
  assert(b.x > 3);
  assertEquals(a.kills, 0);
  for (let i = 0; i < 20 && b.alive; i++) {
    a.cooldown = 0;
    attack(s, a);
  }
  assertFalse(b.alive);
  assertEquals(a.kills, 1);
  assert(b.respawn > 0);
});
Deno.test("battle starts with a reusable hammer and ends at ten eliminations", () => {
  const s = arena("battle"), [a, b] = s.players;
  assertEquals(a.weapon, "hammer");
  a.x = 2;
  a.y = 2;
  a.direction = "right";
  b.x = 3;
  b.y = 2;
  a.kills = 9;
  attack(s, a);
  assertEquals(a.ammo, -1);
  assertEquals(a.kills, 10);
  assertEquals(s.status, "won");
});
Deno.test("limited weapons revert to the mode's default after two uses", () => {
  const s = arena("battle"), p = s.players[0];
  collect(s, p, "laser");
  attack(s, p);
  assertEquals(p.ammo, 1);
  p.cooldown = 0;
  attack(s, p);
  assertEquals(p.weapon, "hammer");
  assertEquals(p.ammo, -1);
});
Deno.test("respawn remains inside the arena and avoids a burning spawn", () => {
  const s = arena("battle"), p = s.players[0];
  hit(s, p, 1);
  p.respawn = 1;
  s.fire.push({ ...p.spawn, owner: 1, ttl: 10, kind: "fire" });
  step(s, [idle, idle]);
  assert(p.alive);
  assert(p.invincible > 0);
  assertFalse(p.x === p.spawn.x && p.y === p.spawn.y);
});
Deno.test("arcade two-player team continues while either human survives", () => {
  const s = arena();
  s.settings.enemies = 1;
  const enemy = structuredClone(s.players[1]);
  enemy.id = 2;
  enemy.human = false;
  enemy.x = 10;
  enemy.y = 10;
  s.players.push(enemy);
  hit(s, s.players[0], 2);
  step(s, [idle, idle]);
  assertEquals(s.status, "playing");
  hit(s, enemy, 1);
  step(s, [idle, idle]);
  assertEquals(s.status, "won");
});
Deno.test("failed rounds consume campaign lives; winning rounds advance and preserve totals", () => {
  const s = arena();
  s.players[0].score = 123;
  finishRound(s, false);
  assertEquals(s.players[0].lives, 2);
  const retry = nextRound(s);
  assertEquals(retry.level, 1);
  assertEquals(retry.players[0].score, 123);
  finishRound(retry, true);
  const next = nextRound(retry);
  assertEquals(next.level, 2);
  assertEquals(next.players[0].lives, 2);
  assert(next.players[0].score > 123);
});
Deno.test("the same seed and inputs reproduce the complete simulation", () => {
  const a = createGame(DEFAULT_SETTINGS, 12345),
    b = createGame(DEFAULT_SETTINGS, 12345);
  for (let i = 0; i < 900; i++) {
    const input: Input = {
      direction: i % 100 < 50 ? "right" : "down",
      action: i % 60 === 0,
    };
    step(a, [input]);
    step(b, [input]);
  }
  assertEquals(a, b);
});
Deno.test("AI declines to bomb a sealed dead end", () => {
  const s = arena(), p = s.players[0];
  p.human = false;
  p.x = 3;
  p.y = 3;
  for (const [x, y] of [[2, 3], [3, 2], [3, 4]]) s.tiles[index(x, y)] = WALL;
  s.tiles[index(4, 3)] = BOX;
  assertFalse(aiInput(s, p).action);
});
Deno.test("all 48 reference layouts are well formed; every race route is connected", () => {
  assertEquals(layouts.length, 48);
  for (const l of layouts) {
    assertEquals(l.rows.length, 15);
    for (const row of l.rows) assertEquals(row.length, 17);
  }
  const seen = new Set<string>();
  for (const theme of ["farm", "shop", "city", "water"] as const) {
    for (let seed = 1; seed < 100; seed++) {
      const s = createGame(
        { ...DEFAULT_SETTINGS, mode: "race", theme },
        seed * 7539,
      );
      if (seen.has(s.layout)) {
        continue;
      }
      seen.add(s.layout);
      const reachableCells = reachable(s, s.players[0].spawn);
      for (const route of s.routes) {
        assertEquals(route.length, 4);
        for (const p of route) {
          assert(
            reachableCells.has(index(p.x, p.y)),
            `${s.layout}: unreachable flag`,
          );
        }
      }
    }
  }
  assertEquals(seen.size, 16);
});
Deno.test("computer drivers finish all 16 race layouts, including current-driven corners", () => {
  const seen = new Set<string>();
  for (const theme of ["farm", "shop", "city", "water"] as const) {
    for (let seed = 1; seed < 100; seed++) {
      const s = createGame(
        { ...DEFAULT_SETTINGS, mode: "race", theme },
        seed * 7539,
      );
      if (seen.has(s.layout)) {
        continue;
      }
      seen.add(s.layout);
      for (const p of s.players) p.human = false;
      while (s.status === "playing" && s.tick < 5400) step(s, []);
      assert(
        s.players.some((p) => p.checkpoints >= 13),
        `${s.layout}: drivers stuck`,
      );
    }
  }
  assertEquals(seen.size, 16);
});
Deno.test("race flags must be reached in sequence; hits stun without eliminating the driver", () => {
  const s = arena("race"), p = s.players[0];
  s.routes[p.character] = [{ x: 2, y: 2 }, { x: 4, y: 2 }];
  p.x = 4;
  p.y = 2;
  step(s, [idle, idle]);
  assertEquals(p.checkpoints, 0);
  p.x = 2;
  step(s, [idle, idle]);
  assertEquals(p.checkpoints, 1);
  hit(s, p, 1);
  assert(p.alive);
  assert(p.stun > 0);
});
Deno.test("movement realigns a rider leaving a slide without crossing walls", () => {
  const s = arena(), p = s.players[0];
  p.x = 5.47;
  p.y = 5;
  for (let i = 0; i < 10; i++) move(s, p, "up");
  assert(Math.abs(p.x - 5) < 0.01);
  assert(p.y < 5);
  s.tiles[index(5, 3)] = WALL;
  for (let i = 0; i < 50; i++) move(s, p, "up");
  assert(p.y > 3.5);
});
